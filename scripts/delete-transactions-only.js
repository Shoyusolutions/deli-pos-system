const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function deleteTransactionsOnly() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('deli_pos_system');
    
    // Delete all transactions only
    const transactionsResult = await db.collection('transactions').deleteMany({});
    console.log(`✓ Deleted ${transactionsResult.deletedCount} transactions`);
    
    // Show count of preserved data
    const productsCount = await db.collection('products').countDocuments();
    const suppliersCount = await db.collection('suppliers').countDocuments();
    
    console.log(`\n✅ Preserved ${productsCount} products`);
    console.log(`✅ Preserved ${suppliersCount} suppliers`);
    
    console.log('\n🎉 Transactions cleared successfully!');
    
  } catch (error) {
    console.error('Error deleting transactions:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

deleteTransactionsOnly();
