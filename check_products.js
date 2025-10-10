const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  inStock: Boolean,
  upc: String
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

const MONGODB_URI = 'mongodb+srv://deli_secure_user:RvKJ1Q&tPBx9ln9RhciEactk@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    const totalCount = await Product.countDocuments();
    console.log('\n=== DATABASE STATUS ===');
    console.log('Total products in database:', totalCount);

    const categories = await Product.distinct('category');
    console.log('\nCategories found:', categories.sort());

    console.log('\n=== FOOD ITEMS BY CATEGORY ===');

    // Focus on food categories that need modifiers
    const foodCategories = ['SANDWICHES', 'BREAKFAST', 'BURGERS', 'QUESADILLA', 'PANINIS',
                           'PLATTERS', 'GYRO', 'WINGS', 'TENDERS', 'NUGGETS',
                           'SALADS', 'SIDES', 'BAGELS', 'OMELETTES', 'PASTRY'];

    for(const cat of foodCategories) {
      const items = await Product.find({category: cat}).select('name price');
      if (items.length > 0) {
        console.log(`\n${cat}: ${items.length} items`);
        items.forEach(item => {
          console.log(`  - "${item.name}" ($${item.price})`);
        });
      }
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });