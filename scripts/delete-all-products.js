const mongoose = require('mongoose');

// MongoDB schemas
const productSchema = new mongoose.Schema({}, { strict: false });
const priceHistorySchema = new mongoose.Schema({}, { strict: false });
const transactionSchema = new mongoose.Schema({}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const PriceHistory = mongoose.models.PriceHistory || mongoose.model('PriceHistory', priceHistorySchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

async function deleteAllProducts() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Show current counts
    console.log('\n📊 BEFORE Deletion:');
    console.log(`- Products: ${await Product.countDocuments()}`);
    console.log(`- Price History: ${await PriceHistory.countDocuments()}`);
    console.log(`- Transactions: ${await Transaction.countDocuments()}`);

    console.log('\n🗑️ Starting complete product deletion...\n');

    // 1. Delete all products
    console.log('📦 Deleting ALL products...');
    const productResult = await Product.deleteMany({});
    console.log(`  ✅ Deleted ${productResult.deletedCount} products`);

    // 2. Delete all price history (since products are gone)
    console.log('\n💰 Deleting ALL price history...');
    const priceResult = await PriceHistory.deleteMany({});
    console.log(`  ✅ Deleted ${priceResult.deletedCount} price history records`);

    // 3. Check if any transactions exist (should already be 0)
    const transactionCount = await Transaction.countDocuments();
    if (transactionCount > 0) {
      console.log('\n📝 Cleaning up any remaining transactions...');
      const txResult = await Transaction.deleteMany({});
      console.log(`  ✅ Deleted ${txResult.deletedCount} transactions`);
    }

    // Show final status
    console.log('\n=====================================');
    console.log('✨ COMPLETE WIPE SUCCESSFUL!\n');
    console.log('📊 AFTER Deletion:');
    console.log(`- Products: ${await Product.countDocuments()} (should be 0)`);
    console.log(`- Price History: ${await PriceHistory.countDocuments()} (should be 0)`);
    console.log(`- Transactions: ${await Transaction.countDocuments()} (should be 0)`);

    console.log('\n✅ Your POS system is completely empty!');
    console.log('📝 You can now add your real products through the Inventory page');
    console.log('📝 Default login: owner@bedstuydeli.com / bedstuy123');
    console.log('🌐 URL: https://deli-pos-system.vercel.app');

  } catch (error) {
    console.error('❌ Error during deletion:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the deletion
console.log('🗑️  DELETE ALL PRODUCTS FROM DELI POS');
console.log('=====================================\n');
console.log('⚠️  WARNING: This will DELETE all products permanently!\n');

deleteAllProducts();