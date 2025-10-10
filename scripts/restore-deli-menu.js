const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Product schema
const productSchema = new mongoose.Schema({
  storeId: String,
  name: String,
  category: String,
  price: Number,
  inStock: { type: Boolean, default: true }
}, { collection: 'products', timestamps: true });

const Product = mongoose.model('Product', productSchema);

const DELI_STORE_ID = '68cd95c09876bc8663a80f84';

async function restoreDeliMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos');
    console.log('Connected to MongoDB');

    // Complete deli menu based on FOOD LISst.md
    const deliProducts = [
      // BREAKFAST
      { category: 'BREAKFAST', name: 'Egg & Cheese (Roll)', price: 4.99 },
      { category: 'BREAKFAST', name: 'Egg & Cheese (White Bread)', price: 4.99 },
      { category: 'BREAKFAST', name: 'Egg & Cheese (Wheat Bread)', price: 4.99 },
      { category: 'BREAKFAST', name: 'Bacon Egg & Cheese (Roll)', price: 5.99 },
      { category: 'BREAKFAST', name: 'Bacon Egg & Cheese (White Bread)', price: 5.99 },
      { category: 'BREAKFAST', name: 'Bacon Egg & Cheese (Wheat Bread)', price: 5.99 },
      { category: 'BREAKFAST', name: 'Turkey Sausage Egg & Cheese (Roll)', price: 5.99 },
      { category: 'BREAKFAST', name: 'Turkey Sausage Egg & Cheese (White Bread)', price: 5.99 },
      { category: 'BREAKFAST', name: 'Turkey Sausage Egg & Cheese (Wheat Bread)', price: 5.99 },
      { category: 'BREAKFAST', name: 'Roast Beef Egg & Cheese (Roll)', price: 8.99 },
      { category: 'BREAKFAST', name: 'Roast Beef Egg & Cheese (White Bread)', price: 8.99 },
      { category: 'BREAKFAST', name: 'Roast Beef Egg & Cheese (Wheat Bread)', price: 8.99 },
      { category: 'BREAKFAST', name: 'Pastrami Egg & Cheese (Roll)', price: 8.99 },
      { category: 'BREAKFAST', name: 'Pastrami Egg & Cheese (White Bread)', price: 8.99 },
      { category: 'BREAKFAST', name: 'Pastrami Egg & Cheese (Wheat Bread)', price: 8.99 },
      { category: 'BREAKFAST', name: 'Chicken Cutlet Egg & Cheese (White Bread)', price: 7.99 },
      { category: 'BREAKFAST', name: 'Chicken Cutlet Egg & Cheese (Wheat Bread)', price: 7.99 },

      // OMELETTES
      { category: 'OMELETTES', name: 'Mexican Omelette', price: 7.99 },
      { category: 'OMELETTES', name: 'Veggie Omelette', price: 7.99 },
      { category: 'OMELETTES', name: 'Create Your Own Omelette', price: 7.99 },
      { category: 'OMELETTES', name: 'Extra Egg', price: 1.50 },
      { category: 'OMELETTES', name: 'Extra Veggies', price: 1.50 },
      { category: 'OMELETTES', name: 'Add Meat to Omelette', price: 3.00 },

      // BAGELS
      { category: 'BAGELS', name: 'Bagel with Cream Cheese (Plain)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Cream Cheese (Raisin)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Cream Cheese (Wheat)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Cream Cheese (Everything)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Cream Cheese (Sesame)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Grape Jelly (Plain)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Grape Jelly (Raisin)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Grape Jelly (Wheat)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Grape Jelly (Everything)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Grape Jelly (Sesame)', price: 3.99 },
      { category: 'BAGELS', name: 'Bagel with Egg & Cheese (Plain)', price: 4.99 },
      { category: 'BAGELS', name: 'Bagel with Egg & Cheese (Raisin)', price: 4.99 },
      { category: 'BAGELS', name: 'Bagel with Egg & Cheese (Wheat)', price: 4.99 },
      { category: 'BAGELS', name: 'Bagel with Egg & Cheese (Everything)', price: 4.99 },
      { category: 'BAGELS', name: 'Bagel with Egg & Cheese (Sesame)', price: 4.99 },
      { category: 'BAGELS', name: 'Bagel with Bacon Egg & Cheese (Plain)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Bacon Egg & Cheese (Raisin)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Bacon Egg & Cheese (Wheat)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Bacon Egg & Cheese (Everything)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Bacon Egg & Cheese (Sesame)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Turkey Sausage Egg & Cheese (Plain)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Turkey Sausage Egg & Cheese (Raisin)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Turkey Sausage Egg & Cheese (Wheat)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Turkey Sausage Egg & Cheese (Everything)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Turkey Sausage Egg & Cheese (Sesame)', price: 5.99 },
      { category: 'BAGELS', name: 'Bagel with Roast Beef Egg & Cheese (Plain)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Roast Beef Egg & Cheese (Raisin)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Roast Beef Egg & Cheese (Wheat)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Roast Beef Egg & Cheese (Everything)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Roast Beef Egg & Cheese (Sesame)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Pastrami Egg & Cheese (Plain)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Pastrami Egg & Cheese (Raisin)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Pastrami Egg & Cheese (Wheat)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Pastrami Egg & Cheese (Everything)', price: 8.99 },
      { category: 'BAGELS', name: 'Bagel with Pastrami Egg & Cheese (Sesame)', price: 8.99 },

      // COLD CUTS SANDWICHES
      { category: 'COLD CUTS SANDWICHES', name: 'Roast Beef (Roll)', price: 8.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Roast Beef (Hero)', price: 9.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Pastrami (Roll)', price: 8.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Pastrami (Hero)', price: 9.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Chipotle Chicken (Roll)', price: 7.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Chipotle Chicken (Hero)', price: 8.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Honey Turkey (Roll)', price: 7.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Honey Turkey (Hero)', price: 8.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Oven Gold Turkey (Roll)', price: 7.99 },
      { category: 'COLD CUTS SANDWICHES', name: 'Oven Gold Turkey (Hero)', price: 8.99 },

      // SANDWICHES
      { category: 'SANDWICHES', name: 'Chicken Cutlet (Roll)', price: 7.99 },
      { category: 'SANDWICHES', name: 'Chicken Cutlet (Hero)', price: 8.99 },
      { category: 'SANDWICHES', name: 'Spicy Chicken Cutlet (Roll)', price: 7.99 },
      { category: 'SANDWICHES', name: 'Spicy Chicken Cutlet (Hero)', price: 8.99 },
      { category: 'SANDWICHES', name: 'Philly Cheesesteak (Roll)', price: 9.99 },
      { category: 'SANDWICHES', name: 'Philly Cheesesteak (Hero)', price: 10.99 },
      { category: 'SANDWICHES', name: 'Chopped Cheese (Roll)', price: 8.99 },
      { category: 'SANDWICHES', name: 'Chopped Cheese (Hero)', price: 9.99 },
      { category: 'SANDWICHES', name: 'Grilled Chicken (Roll)', price: 7.99 },
      { category: 'SANDWICHES', name: 'Grilled Chicken (Hero)', price: 8.99 },
      { category: 'SANDWICHES', name: 'Chipotle Chicken (Roll)', price: 7.99 },
      { category: 'SANDWICHES', name: 'Chipotle Chicken (Hero)', price: 8.99 },

      // BURGERS
      { category: 'BURGERS', name: 'American Cheese Burger', price: 7.99 },
      { category: 'BURGERS', name: 'Chicken Cheese Burger', price: 7.99 },
      { category: 'BURGERS', name: 'Turkey Burger', price: 7.99 },

      // PLATTERS
      { category: 'PLATTERS', name: 'Chicken Over Rice', price: 9.99 },
      { category: 'PLATTERS', name: 'Lamb Over Rice', price: 9.99 },
      { category: 'PLATTERS', name: 'Grilled Chicken Over Rice', price: 9.99 },
      { category: 'PLATTERS', name: 'Crispy Chicken Over Rice', price: 9.99 },

      // GYRO
      { category: 'GYRO', name: 'Chicken Gyro', price: 8.99 },
      { category: 'GYRO', name: 'Lamb Gyro', price: 8.99 },
      { category: 'GYRO', name: 'Grilled Chicken Gyro', price: 8.99 },
      { category: 'GYRO', name: 'Crispy Chicken Gyro', price: 8.99 },

      // CHEESE (By the Pound)
      { category: 'CHEESE (By the Pound)', name: 'American Cheese (1 lb)', price: 9.99 },
      { category: 'CHEESE (By the Pound)', name: 'Muenster Cheese (1 lb)', price: 9.99 },
      { category: 'CHEESE (By the Pound)', name: 'Pepper Jack Cheese (1 lb)', price: 9.99 },
      { category: 'CHEESE (By the Pound)', name: 'Mozzarella Cheese (1 lb)', price: 9.99 },
      { category: 'CHEESE (By the Pound)', name: 'Swiss Cheese (1 lb)', price: 9.99 },
      { category: 'CHEESE (By the Pound)', name: 'Provolone Cheese (1 lb)', price: 9.99 },

      // COLD CUTS (By the Pound)
      { category: 'COLD CUTS (By the Pound)', name: 'Roast Beef (1 lb)', price: 15.99 },
      { category: 'COLD CUTS (By the Pound)', name: 'Pastrami (1 lb)', price: 15.99 },
      { category: 'COLD CUTS (By the Pound)', name: 'Chipotle Chicken (1 lb)', price: 13.99 },
      { category: 'COLD CUTS (By the Pound)', name: 'Honey Turkey (1 lb)', price: 13.99 },
      { category: 'COLD CUTS (By the Pound)', name: 'Oven Gold Turkey (1 lb)', price: 13.99 },

      // SALADS
      { category: 'SALADS', name: 'Build Your Own Salad', price: 6.99 },
      { category: 'SALADS', name: 'Add Grilled Chicken', price: 3.00 },
      { category: 'SALADS', name: 'Add Lamb', price: 3.00 },
      { category: 'SALADS', name: 'Add Crispy Chicken', price: 3.00 },

      // SIDES
      { category: 'SIDES', name: 'French Fries', price: 4.99 },
      { category: 'SIDES', name: 'Seasoned Fries', price: 5.99 },
      { category: 'SIDES', name: 'Onion Rings', price: 5.99 },
      { category: 'SIDES', name: 'Mozzarella Sticks (5 pcs)', price: 5.99 },
      { category: 'SIDES', name: 'Beef Patty', price: 3.99 },

      // SAUCES
      { category: 'SAUCES', name: 'Mayo', price: 0 },
      { category: 'SAUCES', name: 'Chipotle Mayo', price: 0 },
      { category: 'SAUCES', name: 'Ranch', price: 0 },
      { category: 'SAUCES', name: 'BBQ', price: 0 },
      { category: 'SAUCES', name: 'Blue Cheese', price: 0 },
      { category: 'SAUCES', name: 'White Sauce', price: 0 },
      { category: 'SAUCES', name: 'Hot Sauce', price: 0 },
      { category: 'SAUCES', name: 'Caesar Dressing', price: 0 },
      { category: 'SAUCES', name: 'Honey Mustard', price: 0 },

      // TENDERS
      { category: 'TENDERS', name: 'Tenders Regular (3 pcs)', price: 5.99 },
      { category: 'TENDERS', name: 'Tenders Regular (5 pcs)', price: 9.99 },
      { category: 'TENDERS', name: 'Tenders Regular (8 pcs)', price: 12.99 },
      { category: 'TENDERS', name: 'Tenders Regular (12 pcs)', price: 16.99 },
      { category: 'TENDERS', name: 'Tenders Spicy (3 pcs)', price: 5.99 },
      { category: 'TENDERS', name: 'Tenders Spicy (5 pcs)', price: 9.99 },
      { category: 'TENDERS', name: 'Tenders Spicy (8 pcs)', price: 12.99 },
      { category: 'TENDERS', name: 'Tenders Spicy (12 pcs)', price: 16.99 },

      // NUGGETS
      { category: 'NUGGETS', name: 'Nuggets (4 pcs)', price: 3.99 },
      { category: 'NUGGETS', name: 'Nuggets (6 pcs)', price: 4.99 },
      { category: 'NUGGETS', name: 'Nuggets (10 pcs)', price: 6.99 },
      { category: 'NUGGETS', name: 'Nuggets (20 pcs)', price: 10.99 },

      // WINGS
      { category: 'WINGS', name: 'Wings Regular (4 pcs)', price: 8.49 },
      { category: 'WINGS', name: 'Wings Regular (6 pcs)', price: 9.49 },
      { category: 'WINGS', name: 'Wings Regular (9 pcs)', price: 12.99 },
      { category: 'WINGS', name: 'Wings Regular (12 pcs)', price: 18.99 },
      { category: 'WINGS', name: 'Wings Spicy (4 pcs)', price: 8.49 },
      { category: 'WINGS', name: 'Wings Spicy (6 pcs)', price: 9.49 },
      { category: 'WINGS', name: 'Wings Spicy (9 pcs)', price: 12.99 },
      { category: 'WINGS', name: 'Wings Spicy (12 pcs)', price: 18.99 },

      // PANINIS
      { category: 'PANINIS', name: 'Roast Beef Panini', price: 9.99 },
      { category: 'PANINIS', name: 'Turkey Panini', price: 9.99 },
      { category: 'PANINIS', name: 'Grilled Chicken Panini', price: 9.99 },
      { category: 'PANINIS', name: 'Chipotle Chicken Panini', price: 9.99 },
      { category: 'PANINIS', name: 'Buffalo Chicken Panini', price: 9.99 },
      { category: 'PANINIS', name: 'BBQ Chicken Panini', price: 9.99 },

      // QUESADILLA
      { category: 'QUESADILLA', name: 'Grilled Chicken Quesadilla', price: 9.99 },
      { category: 'QUESADILLA', name: 'Chipotle Chicken Quesadilla', price: 9.99 },
      { category: 'QUESADILLA', name: 'Buffalo Chicken Quesadilla', price: 9.99 },
      { category: 'QUESADILLA', name: 'BBQ Chicken Quesadilla', price: 9.99 },
      { category: 'QUESADILLA', name: 'Vegetable Quesadilla', price: 9.99 },

      // JUICES
      { category: 'JUICES', name: 'Orange Juice (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Orange Juice (Large)', price: 7.99 },
      { category: 'JUICES', name: 'Beet Juice (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Beet Juice (Large)', price: 7.99 },
      { category: 'JUICES', name: 'Carrot Juice (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Carrot Juice (Large)', price: 7.99 },
      { category: 'JUICES', name: 'Celery Apple Spinach Juice (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Celery Apple Spinach Juice (Large)', price: 7.99 },
      { category: 'JUICES', name: 'Lemon Apple Ginger (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Lemon Apple Ginger (Large)', price: 7.99 },
      { category: 'JUICES', name: 'Cucumber Apple Celery (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Cucumber Apple Celery (Large)', price: 7.99 },
      { category: 'JUICES', name: 'Detox (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Detox (Large)', price: 7.99 },
      { category: 'JUICES', name: 'Create Your Own Juice (Small)', price: 6.99 },
      { category: 'JUICES', name: 'Create Your Own Juice (Large)', price: 7.99 },

      // COMBO OPTION
      { category: 'COMBO', name: 'Combo (Can Soda & Fries)', price: 4.00 }
    ];

    // Add storeId and inStock to each product
    const productsWithStore = deliProducts.map(product => ({
      ...product,
      storeId: DELI_STORE_ID,
      inStock: true
    }));

    console.log(`\nPreparing to restore ${productsWithStore.length} deli menu items...`);

    // Delete existing deli products (but not coffee products)
    const deleted = await Product.deleteMany({
      storeId: DELI_STORE_ID,
      category: { $ne: 'COFFEE/TEA' } // Don't delete any coffee items that might be assigned to deli
    });
    console.log(`Removed ${deleted.deletedCount} existing deli products`);

    // Insert all deli products
    const inserted = await Product.insertMany(productsWithStore);
    console.log(`Successfully restored ${inserted.length} deli menu items!`);

    // Show category breakdown
    const categories = [...new Set(productsWithStore.map(p => p.category))];
    console.log('\nCategories restored:');
    for (const category of categories.sort()) {
      const count = productsWithStore.filter(p => p.category === category).length;
      console.log(`  ${category}: ${count} items`);
    }

    // Final count
    const totalDeli = await Product.countDocuments({ storeId: DELI_STORE_ID });
    const totalCoffee = await Product.countDocuments({ storeId: '68d9da3dab8eff4166c9e9fd' });

    console.log('\n=== FINAL DATABASE STATE ===');
    console.log(`Deli products: ${totalDeli}`);
    console.log(`Coffee shop products: ${totalCoffee}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreDeliMenu();