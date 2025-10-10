const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';

// Product schema
const productSchema = new mongoose.Schema({
  storeId: String,
  name: String,
  category: String,
  price: Number,
  inStock: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

async function backupAcroProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all Acro Coffee products
    const acroProducts = await Product.find({
      $or: [
        { category: { $in: ['ACRO SPECIALS', 'ESPRESSO DRINKS', 'COFFEE/TEA', 'BEVERAGES'] } },
        { storeId: '68d9da3dab8eff4166c9e9fd' }
      ]
    });

    console.log(`Found ${acroProducts.length} Acro Coffee products to backup`);

    // Save to JSON file
    const backupData = {
      timestamp: new Date().toISOString(),
      count: acroProducts.length,
      products: acroProducts.map(p => ({
        name: p.name,
        category: p.category,
        price: p.price,
        inStock: p.inStock !== false // default to true if not specified
      }))
    };

    const filename = `acro-coffee-backup-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));

    console.log(`\n✅ Backup saved to: ${filename}`);
    console.log('\nCategories backed up:');
    const categories = [...new Set(acroProducts.map(p => p.category))];
    categories.forEach(cat => {
      const count = acroProducts.filter(p => p.category === cat).length;
      console.log(`  ${cat}: ${count} items`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backupAcroProducts();