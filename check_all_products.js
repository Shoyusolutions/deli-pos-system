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

    const categories = await Product.distinct('category');
    console.log('\n=== ALL CATEGORIES IN DATABASE ===');
    console.log(categories.sort());

    console.log('\n=== SAMPLE ITEMS FROM EACH CATEGORY ===');
    for(const cat of categories.sort()) {
      const items = await Product.find({category: cat}).limit(5).select('name price');
      if (items.length > 0) {
        console.log(`\n${cat}:`);
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