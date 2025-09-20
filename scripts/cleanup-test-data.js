const mongoose = require('mongoose');
const readline = require('readline');

// MongoDB schemas (we'll define them inline since models are TS)
const transactionSchema = new mongoose.Schema({}, { strict: false });
const productSchema = new mongoose.Schema({}, { strict: false });
const auditLogSchema = new mongoose.Schema({}, { strict: false });
const priceHistorySchema = new mongoose.Schema({}, { strict: false });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
const PriceHistory = mongoose.models.PriceHistory || mongoose.model('PriceHistory', priceHistorySchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function cleanupTestData() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Show current data counts
    const transactionCount = await Transaction.countDocuments();
    const productCount = await Product.countDocuments();

    console.log('\n📊 Current Database Status:');
    console.log(`- Transactions: ${transactionCount}`);
    console.log(`- Products: ${productCount}`);

    // Get products with negative or modified inventory
    const modifiedProducts = await Product.find({
      $or: [
        { inventory: { $lt: 0 } },
        { inventory: { $ne: 10 } } // Assuming 10 was the default
      ]
    });

    if (modifiedProducts.length > 0) {
      console.log(`\n⚠️  Products with modified inventory: ${modifiedProducts.length}`);
      modifiedProducts.slice(0, 5).forEach(p => {
        console.log(`  - ${p.name}: ${p.inventory} units`);
      });
    }

    // Confirm before proceeding
    const answer = await new Promise(resolve => {
      rl.question('\n⚠️  WARNING: This will:\n' +
        '1. DELETE all transactions\n' +
        '2. RESET all product inventory to 10 units\n' +
        '3. CLEAR transaction-related audit logs\n' +
        '\nAre you sure you want to continue? (type "yes" to confirm): ', resolve);
    });

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Cleanup cancelled');
      process.exit(0);
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

    // 3. Optional: Clear transaction-related audit logs
    console.log('\n📋 Clearing transaction audit logs...');
    const auditResult = await AuditLog.deleteMany({
      category: 'TRANSACTION'
    });
    console.log(`  ✅ Deleted ${auditResult.deletedCount} transaction audit logs`);

    // 4. Optional: Clear price history (keeping initial entries only)
    console.log('\n💰 Keeping only initial price history entries...');
    // Get the earliest entry for each product
    const products = await Product.find({});
    for (const product of products) {
      const oldestEntry = await PriceHistory.findOne({
        storeId: product.storeId,
        upc: product.upc
      }).sort({ timestamp: 1 });

      if (oldestEntry) {
        // Delete all except the oldest
        await PriceHistory.deleteMany({
          storeId: product.storeId,
          upc: product.upc,
          _id: { $ne: oldestEntry._id }
        });
      }
    }
    console.log('  ✅ Price history cleaned');

    // Show final status
    console.log('\n✨ Cleanup Complete!\n');
    console.log('📊 Final Database Status:');
    console.log(`- Transactions: ${await Transaction.countDocuments()}`);
    console.log(`- Products: ${await Product.countDocuments()} (all with 10 inventory)`);
    console.log(`- Audit Logs (Transaction): ${await AuditLog.countDocuments({ category: 'TRANSACTION' })}`);

    console.log('\n✅ Your POS system is ready for a fresh start!');
    console.log('📝 Default login: owner@bedstuydeli.com / bedstuy123');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the cleanup
console.log('🧹 Deli POS Test Data Cleanup Script');
console.log('=====================================\n');

cleanupTestData();