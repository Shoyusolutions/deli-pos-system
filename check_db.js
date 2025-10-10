const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  inStock: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

mongoose.connect('mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const totalCount = await Product.countDocuments();
    console.log('\n=== DATABASE STATUS ===');
    console.log('Total products in database:', totalCount);
    
    const categories = await Product.distinct('category');
    console.log('\nCategories found:', categories);
    
    console.log('\n=== ITEMS BY CATEGORY ===');
    for(const cat of categories.sort()) {
      const items = await Product.find({category: cat}).select('name price');
      console.log(`\n${cat}: ${items.length} items`);
      items.slice(0, 3).forEach(item => {
        console.log(`  - ${item.name} ($${item.price})`);
      });
      if(items.length > 3) {
        console.log(`  ... and ${items.length - 3} more`);
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
