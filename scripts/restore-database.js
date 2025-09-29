const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MONGODB_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups directory found.');
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  console.log('\n📁 Available backups:');
  files.forEach((file, index) => {
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const date = new Date(stats.mtime).toLocaleString();
    console.log(`${index + 1}. ${file} (${sizeMB} MB) - Modified: ${date}`);
  });

  return files;
}

async function restoreDatabase() {
  try {
    console.log('=== DATABASE RESTORE TOOL ===\n');
    console.log('⚠️  WARNING: This will replace your current database!');
    console.log('Make sure you have a recent backup before proceeding.\n');

    // List available backups
    const backups = await listBackups();
    if (backups.length === 0) {
      console.log('No backups found. Run backup-database.js first.');
      process.exit(1);
    }

    // Ask which backup to restore
    const choice = await question('\nEnter backup number to restore (or "q" to quit): ');

    if (choice.toLowerCase() === 'q') {
      console.log('Restore cancelled.');
      process.exit(0);
    }

    const backupIndex = parseInt(choice) - 1;
    if (isNaN(backupIndex) || backupIndex < 0 || backupIndex >= backups.length) {
      console.log('Invalid selection.');
      process.exit(1);
    }

    const selectedBackup = backups[backupIndex];
    const backupPath = path.join(BACKUP_DIR, selectedBackup);

    // Load backup
    console.log(`\nLoading backup: ${selectedBackup}...`);
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log(`\nBackup details:`);
    console.log(`- Created: ${backup.timestamp}`);
    console.log(`- Collections: ${Object.keys(backup.collections).join(', ')}`);

    // Show product counts
    if (backup.collections.products) {
      const products = backup.collections.products.documents;
      const deliCount = products.filter(p => p.storeId === '68cd95c09876bc8663a80f84').length;
      const coffeeCount = products.filter(p => p.storeId === '68d9da3dab8eff4166c9e9fd').length;
      console.log(`- Products: ${products.length} total (${deliCount} deli, ${coffeeCount} coffee)`);
    }

    // Confirm restore
    const confirm = await question('\n⚠️  Type "RESTORE" to proceed with restoration: ');
    if (confirm !== 'RESTORE') {
      console.log('Restore cancelled.');
      process.exit(0);
    }

    // Connect to database
    console.log('\nConnecting to database...');
    await mongoose.connect(MONGODB_URI);

    // Restore each collection
    console.log('\nRestoring collections...');
    for (const [collectionName, data] of Object.entries(backup.collections)) {
      if (data.documents.length === 0) {
        console.log(`⏭️  Skipped ${collectionName}: No documents`);
        continue;
      }

      try {
        // Create a dynamic model
        const Model = mongoose.model(
          collectionName,
          new mongoose.Schema({}, { collection: collectionName, strict: false })
        );

        // Clear existing data
        await Model.deleteMany({});

        // Insert backup data
        await Model.insertMany(data.documents);
        console.log(`✅ Restored ${collectionName}: ${data.documents.length} documents`);
      } catch (err) {
        console.log(`❌ Failed to restore ${collectionName}: ${err.message}`);
      }
    }

    console.log('\n✅ RESTORE COMPLETE!');
    console.log('Your database has been restored from the backup.');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Restore failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Run restore
restoreDatabase();