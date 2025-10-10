const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';
const COFFEE_STORE_ID = '68d9da3dab8eff4166c9e9fd';

// Product schema
const productSchema = new mongoose.Schema({
  storeId: String,
  name: String,
  category: String,
  price: Number,
  inStock: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

async function restoreAcroAfterBackup() {
  try {
    // Read the backup file
    const backupFile = 'acro-coffee-backup-2025-09-29.json';
    if (!fs.existsSync(backupFile)) {
      console.error(`Backup file ${backupFile} not found!`);
      process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    console.log(`Found ${backupData.count} Acro Coffee products to restore`);

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete any existing coffee products (in case of duplicates)
    const deleted = await Product.deleteMany({
      category: { $in: ['ACRO SPECIALS', 'ESPRESSO DRINKS', 'COFFEE/TEA', 'BEVERAGES'] }
    });
    console.log(`Removed ${deleted.deletedCount} existing coffee products`);

    // Restore Acro Coffee products with correct store ID
    const productsToInsert = backupData.products.map(p => ({
      ...p,
      storeId: COFFEE_STORE_ID
    }));

    const inserted = await Product.insertMany(productsToInsert);
    console.log(`\n✅ Successfully restored ${inserted.length} Acro Coffee products!`);

    // Show final counts
    const deliCount = await Product.countDocuments({ storeId: '68cd95c09876bc8663a80f84' });
    const coffeeCount = await Product.countDocuments({ storeId: COFFEE_STORE_ID });

    console.log('\n=== FINAL DATABASE STATE ===');
    console.log(`Deli products: ${deliCount}`);
    console.log(`Acro Coffee products: ${coffeeCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreAcroAfterBackup();