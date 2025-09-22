const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function cleanupDatabase() {
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
    
    // Delete all transactions
    const transactionsResult = await db.collection('transactions').deleteMany({});
    console.log(`✓ Deleted ${transactionsResult.deletedCount} transactions`);
    
    // Delete all products/inventory
    const productsResult = await db.collection('products').deleteMany({});
    console.log(`✓ Deleted ${productsResult.deletedCount} products`);
    
    // Optional: Also clear suppliers if needed
    const suppliersResult = await db.collection('suppliers').deleteMany({});
    console.log(`✓ Deleted ${suppliersResult.deletedCount} suppliers`);
    
    console.log('\n🎉 Database cleaned successfully for production!');
    console.log('All test data has been removed.');
    
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will DELETE ALL data from the database!');
console.log('This includes:');
console.log('- All transactions');
console.log('- All products/inventory');
console.log('- All suppliers');
console.log('');

rl.question('Are you sure you want to proceed? Type "DELETE ALL" to confirm: ', (answer) => {
  if (answer === 'DELETE ALL') {
    cleanupDatabase();
  } else {
    console.log('Cleanup cancelled.');
    process.exit(0);
  }
  rl.close();
});
