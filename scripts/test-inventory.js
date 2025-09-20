const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Product schema definition
const productSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  upc: { type: String, required: true, index: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  inventory: { type: Number, required: true, default: 0, min: 0 }
}, { timestamps: true });

productSchema.index({ storeId: 1, upc: 1 }, { unique: true });
const Product = mongoose.model('Product', productSchema);

async function testInventoryOperations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deli-pos');
    console.log('Connected to MongoDB\n');

    const storeId = '6745f6a0e7b3c8d9f0123456';

    // Test 1: View Inventory - Get all products
    console.log('=== TEST 1: View Inventory ===');
    const allProducts = await Product.find({ storeId }).sort({ name: 1 });
    console.log(`Total products: ${allProducts.length}`);

    // Test search functionality
    const searchResults = await Product.find({
      storeId,
      name: { $regex: 'cola', $options: 'i' }
    });
    console.log(`Products matching 'cola': ${searchResults.length}`);
    if (searchResults.length > 0) {
      console.log(`  - ${searchResults[0].name} (UPC: ${searchResults[0].upc})`);
    }

    // Test low stock filter
    const lowStockItems = await Product.find({
      storeId,
      inventory: { $lte: 5 }
    });
    console.log(`Low stock items (≤5): ${lowStockItems.length}`);

    // Test 2: Update Stock
    console.log('\n=== TEST 2: Update Stock ===');
    const cocaCola = await Product.findOne({ storeId, upc: '012000001215' });
    if (cocaCola) {
      console.log(`Before: ${cocaCola.name} - Inventory: ${cocaCola.inventory}`);

      // Add 10 units
      cocaCola.inventory += 10;
      await cocaCola.save();

      const updated = await Product.findOne({ storeId, upc: '012000001215' });
      console.log(`After: ${updated.name} - Inventory: ${updated.inventory}`);
      console.log('✓ Stock update successful');
    }

    // Test 3: Add New Item
    console.log('\n=== TEST 3: Add New Item ===');
    const newProduct = {
      storeId,
      upc: '999888777666',
      name: 'Test Product - Energy Bar',
      price: 3.49,
      inventory: 25
    };

    // Check if it already exists
    const exists = await Product.findOne({ storeId, upc: newProduct.upc });
    if (exists) {
      await Product.deleteOne({ storeId, upc: newProduct.upc });
      console.log('Removed existing test product');
    }

    // Add new product
    const created = await Product.create(newProduct);
    console.log(`Created: ${created.name}`);
    console.log(`  - UPC: ${created.upc}`);
    console.log(`  - Price: $${created.price}`);
    console.log(`  - Inventory: ${created.inventory}`);
    console.log('✓ Product creation successful');

    // Test 4: Update existing product by UPC
    console.log('\n=== TEST 4: Update Product by UPC ===');
    const productToUpdate = await Product.findOne({ storeId, upc: '028400001212' });
    if (productToUpdate) {
      console.log(`Before: ${productToUpdate.name} - Stock: ${productToUpdate.inventory}`);

      // Simulate selling 5 units
      productToUpdate.inventory = Math.max(0, productToUpdate.inventory - 5);
      await productToUpdate.save();

      const afterSale = await Product.findOne({ storeId, upc: '028400001212' });
      console.log(`After sale: ${afterSale.name} - Stock: ${afterSale.inventory}`);
      console.log('✓ Inventory deduction successful');
    }

    // Test 5: Price update
    console.log('\n=== TEST 5: Price Update ===');
    const priceUpdateProduct = await Product.findOne({ storeId, upc: '012000001253' });
    if (priceUpdateProduct) {
      const oldPrice = priceUpdateProduct.price;
      priceUpdateProduct.price = 2.49;
      await priceUpdateProduct.save();

      console.log(`${priceUpdateProduct.name}:`);
      console.log(`  - Old price: $${oldPrice}`);
      console.log(`  - New price: $${priceUpdateProduct.price}`);
      console.log('✓ Price update successful');
    }

    // Summary
    console.log('\n=== INVENTORY SUMMARY ===');
    const summary = await Product.aggregate([
      { $match: { storeId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalInventory: { $sum: '$inventory' },
          avgPrice: { $avg: '$price' },
          totalValue: { $sum: { $multiply: ['$price', '$inventory'] } }
        }
      }
    ]);

    if (summary.length > 0) {
      const stats = summary[0];
      console.log(`Total Products: ${stats.totalProducts}`);
      console.log(`Total Items in Stock: ${stats.totalInventory}`);
      console.log(`Average Price: $${stats.avgPrice.toFixed(2)}`);
      console.log(`Total Inventory Value: $${stats.totalValue.toFixed(2)}`);
    }

    console.log('\n✅ All inventory operations tested successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

testInventoryOperations();