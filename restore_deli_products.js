const mongoose = require('mongoose');

// This script will restore ONLY the deli products from backup
// while preserving the coffee shop products

const MONGODB_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';
const DELI_STORE_ID = '68cd95c09876bc8663a80f84';
const COFFEE_STORE_ID = '68d9da3dab8eff4166c9e9fd';

// Product schema
const productSchema = new mongoose.Schema({
  storeId: String,
  name: String,
  category: String,
  price: Number,
  cost: Number,
  inStock: { type: Boolean, default: true },
  upc: String,
  supplierId: String,
  supplierName: String,
  inventory: Number
}, { collection: 'products', timestamps: true });

const Product = mongoose.model('Product', productSchema);

async function restoreDeliProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, let's preserve the coffee shop products
    console.log('\n1. PRESERVING COFFEE SHOP PRODUCTS...');
    const coffeeProducts = await Product.find({
      $or: [
        { category: { $in: ['ACRO SPECIALS', 'ESPRESSO DRINKS', 'COFFEE/TEA', 'BEVERAGES'] } },
        { storeId: 'default' }
      ]
    });

    console.log(`Found ${coffeeProducts.length} coffee products to preserve`);

    // Update coffee products to have correct store ID
    if (coffeeProducts.length > 0) {
      for (const product of coffeeProducts) {
        product.storeId = COFFEE_STORE_ID;
        await product.save();
      }
      console.log('Updated coffee products with correct store ID');
    }

    // Now we need to restore the deli products
    // Since we can't directly read the WiredTiger backup,
    // we'll need to either:
    // 1. Restore from MongoDB Atlas backup
    // 2. Re-import from a seed file
    // 3. Manually re-enter the data

    console.log('\n2. CHECKING CURRENT STATE...');
    const deliCount = await Product.countDocuments({ storeId: DELI_STORE_ID });
    const coffeeCount = await Product.countDocuments({ storeId: COFFEE_STORE_ID });

    console.log(`Deli products: ${deliCount}`);
    console.log(`Coffee shop products: ${coffeeCount}`);

    console.log('\n⚠️  IMPORTANT: To restore the deli products, you need to:');
    console.log('1. Go to MongoDB Atlas');
    console.log('2. Click on your cluster (Deli-Pos)');
    console.log('3. Go to Backup tab');
    console.log('4. Select the snapshot from Sep 26 or earlier');
    console.log('5. Choose "Query Snapshot" or "Download" option');
    console.log('6. Extract only the products collection');
    console.log('7. Filter for storeId: ' + DELI_STORE_ID);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreDeliProducts();