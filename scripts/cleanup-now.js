const mongoose = require('mongoose');

// MongoDB schemas (we'll define them inline since models are TS)
const transactionSchema = new mongoose.Schema({}, { strict: false });
const productSchema = new mongoose.Schema({}, { strict: false });
const auditLogSchema = new mongoose.Schema({}, { strict: false });
const priceHistorySchema = new mongoose.Schema({}, { strict: false });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
const PriceHistory = mongoose.models.PriceHistory || mongoose.model('PriceHistory', priceHistorySchema);

async function cleanupNow() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Show current data counts
    const transactionCount = await Transaction.countDocuments();
    const productCount = await Product.countDocuments();

    console.log('\n📊 BEFORE Cleanup:');
    console.log(`- Transactions: ${transactionCount}`);
    console.log(`- Products: ${productCount}`);

    // Get products with negative or modified inventory
    const modifiedProducts = await Product.find({
      $or: [
        { inventory: { $lt: 0 } },
        { inventory: { $ne: 10 } }
      ]
    });

    if (modifiedProducts.length > 0) {
      console.log(`- Products with modified inventory: ${modifiedProducts.length}`);
    }

    console.log('\n🧹 Starting cleanup...\n');

    // 1. Delete all transactions
    console.log('📝 Deleting transactions...');
    const deleteResult = await Transaction.deleteMany({});
    console.log(`  ✅ Deleted ${deleteResult.deletedCount} transactions`);

    // 2. Reset all product inventory to 10
    console.log('\n📦 Resetting product inventory...');
    const updateResult = await Product.updateMany(
      {},
      { $set: { inventory: 10 } }
    );
    console.log(`  ✅ Reset inventory for ${updateResult.modifiedCount} products to 10 units`);

    // 3. Clear transaction-related audit logs
    console.log('\n📋 Clearing transaction audit logs...');
    const auditResult = await AuditLog.deleteMany({
      category: 'TRANSACTION'
    });
    console.log(`  ✅ Deleted ${auditResult.deletedCount} transaction audit logs`);

    // 4. Clear excess price history (keeping initial entries only)
    console.log('\n💰 Cleaning price history...');
    const products = await Product.find({});
    let priceHistoryCleaned = 0;

    for (const product of products) {
      const oldestEntry = await PriceHistory.findOne({
        storeId: product.storeId,
        upc: product.upc
      }).sort({ timestamp: 1 });

      if (oldestEntry) {
        // Delete all except the oldest
        const deleteRes = await PriceHistory.deleteMany({
          storeId: product.storeId,
          upc: product.upc,
          _id: { $ne: oldestEntry._id }
        });
        priceHistoryCleaned += deleteRes.deletedCount;
      }
    }
    console.log(`  ✅ Removed ${priceHistoryCleaned} duplicate price history entries`);

    // Show final status
    console.log('\n=====================================');
    console.log('✨ CLEANUP COMPLETE!\n');
    console.log('📊 AFTER Cleanup:');
    console.log(`- Transactions: ${await Transaction.countDocuments()} (should be 0)`);
    console.log(`- Products: ${await Product.countDocuments()} (all with 10 inventory)`);
    console.log(`- Transaction Audit Logs: ${await AuditLog.countDocuments({ category: 'TRANSACTION' })} (should be 0)`);

    console.log('\n✅ Your POS system is ready for a fresh start!');
    console.log('📝 Default login: owner@bedstuydeli.com / bedstuy123');
    console.log('🌐 URL: https://deli-pos-system.vercel.app');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the cleanup
console.log('🧹 IMMEDIATE Deli POS Test Data Cleanup');
console.log('========================================\n');

cleanupNow();