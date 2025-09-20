const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Product schema definition (since models are TypeScript)
const productSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  upc: { type: String, required: true, index: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 },
  supplier: { type: String, required: true },
  inventory: { type: Number, required: true, default: 0, min: 0 }
}, { timestamps: true });

productSchema.index({ storeId: 1, upc: 1 }, { unique: true });
const Product = mongoose.model('Product', productSchema);

async function seedProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deli-pos');
    console.log('Connected to MongoDB');

    // Bedstuy Deli & Grill store ID
    const storeId = '6745f6a0e7b3c8d9f0123456';

    // Sample products for a deli
    const products = [
      // Beverages
      { storeId, upc: '012000001215', name: 'Coca Cola 20oz', price: 2.50, cost: 1.25, supplier: 'Coca-Cola Distributing', inventory: 48 },
      { storeId, upc: '012000001222', name: 'Pepsi 20oz', price: 2.50, cost: 1.20, supplier: 'PepsiCo Distribution', inventory: 36 },
      { storeId, upc: '012000001239', name: 'Poland Spring Water', price: 1.50, cost: 0.60, supplier: 'Nestle Waters', inventory: 72 },
      { storeId, upc: '012000001246', name: 'Red Bull Energy Drink', price: 3.99, cost: 2.10, supplier: 'Red Bull Distribution', inventory: 24 },
      { storeId, upc: '012000001253', name: 'Arizona Iced Tea', price: 1.99, cost: 0.95, supplier: 'Arizona Beverages', inventory: 48 },

      // Snacks
      { storeId, upc: '028400001212', name: 'Lays Classic Chips', price: 2.99, cost: 1.50, supplier: 'Frito-Lay Inc', inventory: 30 },
      { storeId, upc: '028400001229', name: 'Doritos Nacho Cheese', price: 2.99, cost: 1.45, supplier: 'Frito-Lay Inc', inventory: 25 },
      { storeId, upc: '028400001236', name: 'Snickers Bar', price: 1.79, cost: 0.85, supplier: 'Mars Candy Distributors', inventory: 60 },
      { storeId, upc: '028400001243', name: 'M&Ms Peanut', price: 1.79, cost: 0.82, supplier: 'Mars Candy Distributors', inventory: 45 },
      { storeId, upc: '028400001250', name: 'Oreo Cookies', price: 3.49, cost: 1.75, supplier: 'Nabisco Foods', inventory: 20 },

      // Deli Items
      { storeId, upc: '071234567890', name: 'Boars Head Turkey (per lb)', price: 12.99, cost: 7.50, supplier: 'Boars Head Provisions', inventory: 15 },
      { storeId, upc: '071234567891', name: 'Boars Head Ham (per lb)', price: 10.99, cost: 6.25, supplier: 'Boars Head Provisions', inventory: 12 },
      { storeId, upc: '071234567892', name: 'American Cheese (per lb)', price: 8.99, cost: 4.50, supplier: 'Land O Lakes', inventory: 10 },
      { storeId, upc: '071234567893', name: 'Swiss Cheese (per lb)', price: 9.99, cost: 5.25, supplier: 'Alpine Cheese Co', inventory: 8 },
      { storeId, upc: '071234567894', name: 'Salami (per lb)', price: 11.99, cost: 6.75, supplier: 'Dietz & Watson', inventory: 7 },

      // Sandwiches (ready-made)
      { storeId, upc: '080123456789', name: 'Turkey Sandwich', price: 8.99, cost: 4.25, supplier: 'In-House Kitchen', inventory: 10 },
      { storeId, upc: '080123456790', name: 'Ham & Cheese Sandwich', price: 7.99, cost: 3.75, supplier: 'In-House Kitchen', inventory: 8 },
      { storeId, upc: '080123456791', name: 'BLT Sandwich', price: 7.49, cost: 3.50, supplier: 'In-House Kitchen', inventory: 6 },
      { storeId, upc: '080123456792', name: 'Chicken Salad Sandwich', price: 8.49, cost: 4.00, supplier: 'In-House Kitchen', inventory: 5 },
      { storeId, upc: '080123456793', name: 'Italian Hero', price: 10.99, cost: 5.50, supplier: 'In-House Kitchen', inventory: 4 },

      // Household items
      { storeId, upc: '090234567890', name: 'Paper Towels', price: 3.99, cost: 2.00, supplier: 'Bounty Wholesale', inventory: 15 },
      { storeId, upc: '090234567891', name: 'Toilet Paper (4 pack)', price: 5.99, cost: 3.25, supplier: 'Charmin Supply Co', inventory: 20 },
      { storeId, upc: '090234567892', name: 'Hand Soap', price: 2.99, cost: 1.50, supplier: 'Dial Corporation', inventory: 12 },
      { storeId, upc: '090234567893', name: 'Dish Soap', price: 3.49, cost: 1.75, supplier: 'Dawn Products', inventory: 10 },
      { storeId, upc: '090234567894', name: 'Aluminum Foil', price: 4.99, cost: 2.50, supplier: 'Reynolds Wrap', inventory: 8 },

      // Low stock items for testing
      { storeId, upc: '099999999991', name: 'Premium Coffee (1lb)', price: 14.99, cost: 8.50, supplier: 'Brooklyn Roasting Co', inventory: 3 },
      { storeId, upc: '099999999992', name: 'Organic Milk (Half Gal)', price: 5.99, cost: 3.50, supplier: 'Organic Valley', inventory: 2 },
      { storeId, upc: '099999999993', name: 'Fresh Bagels (6 pack)', price: 4.99, cost: 2.25, supplier: 'Brooklyn Bagel Co', inventory: 4 },
      { storeId, upc: '099999999994', name: 'Cream Cheese', price: 3.99, cost: 2.00, supplier: 'Philadelphia Brand', inventory: 5 },
      { storeId, upc: '099999999995', name: 'Fresh Orange Juice', price: 6.99, cost: 3.75, supplier: 'Tropicana', inventory: 1 }
    ];

    // Clear existing products for this store
    await Product.deleteMany({ storeId });
    console.log('Cleared existing products');

    // Insert new products
    const inserted = await Product.insertMany(products);
    console.log(`Successfully seeded ${inserted.length} products for Bedstuy Deli & Grill`);

    // Show some stats
    const lowStock = await Product.countDocuments({ storeId, inventory: { $lte: 5 } });
    const outOfStock = await Product.countDocuments({ storeId, inventory: 0 });

    console.log(`\nInventory Stats:`);
    console.log(`- Total Products: ${inserted.length}`);
    console.log(`- Low Stock Items (≤5): ${lowStock}`);
    console.log(`- Out of Stock Items: ${outOfStock}`);

  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedProducts();