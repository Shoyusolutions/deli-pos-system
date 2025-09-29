const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';

// Create backups directory if it doesn't exist
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for backup...\n');

    const collections = [
      'products',
      'stores',
      'users',
      'transactions',
      'storesettings',
      'suppliers',
      'pricehistories',
      'auditlogs'
    ];

    const backup = {
      timestamp: new Date().toISOString(),
      database: 'deli_pos_system',
      collections: {}
    };

    // Backup each collection
    for (const collectionName of collections) {
      try {
        const Model = mongoose.model(
          collectionName,
          new mongoose.Schema({}, { collection: collectionName, strict: false })
        );
        const documents = await Model.find({}).lean();
        backup.collections[collectionName] = {
          count: documents.length,
          documents: documents
        };
        console.log(`✅ Backed up ${collectionName}: ${documents.length} documents`);
      } catch (err) {
        console.log(`⚠️  Skipped ${collectionName}: ${err.message}`);
      }
    }

    // Generate filename with date
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `backup-${dateStr}-${timeStr}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Save backup
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    // Also save a "latest" backup for easy access
    const latestPath = path.join(BACKUP_DIR, 'latest-backup.json');
    fs.writeFileSync(latestPath, JSON.stringify(backup, null, 2));

    console.log('\n=== BACKUP COMPLETE ===');
    console.log(`📁 Saved to: ${filepath}`);
    console.log(`📁 Also saved as: ${latestPath}`);

    // Calculate backup size
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 Backup size: ${sizeMB} MB`);

    // Show product breakdown
    const products = backup.collections.products;
    if (products) {
      const deliCount = products.documents.filter(p => p.storeId === '68cd95c09876bc8663a80f84').length;
      const coffeeCount = products.documents.filter(p => p.storeId === '68d9da3dab8eff4166c9e9fd').length;
      console.log(`\n📦 Products backed up:`);
      console.log(`   - Deli products: ${deliCount}`);
      console.log(`   - Coffee products: ${coffeeCount}`);
    }

    // Clean up old backups (keep last 30 days)
    console.log('\n🧹 Cleaning old backups...');
    const files = fs.readdirSync(BACKUP_DIR);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    files.forEach(file => {
      if (file.startsWith('backup-') && file.endsWith('.json') && file !== 'latest-backup.json') {
        const filePath = path.join(BACKUP_DIR, file);
        const fileStat = fs.statSync(filePath);
        if (fileStat.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`   Removed ${cleaned} backups older than 30 days`);
    } else {
      console.log(`   No old backups to remove`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

backupDatabase();