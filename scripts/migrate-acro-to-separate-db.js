const mongoose = require('mongoose');

// Source: Combined database
const SOURCE_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos';

// Destination: ACRO-specific database
const DEST_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/acro_coffee_pos?retryWrites=true&w=majority&appName=ACRO-Coffee';

const COFFEE_STORE_ID = '68d9da3dab8eff4166c9e9fd';

async function migrateAcroToSeparateDb() {
  let sourceConn, destConn;

  try {
    console.log('=== ACRO Coffee Database Migration ===\n');

    // Connect to source database
    console.log('Connecting to source database...');
    sourceConn = await mongoose.createConnection(SOURCE_URI);

    // Connect to destination database
    console.log('Connecting to destination database...');
    destConn = await mongoose.createConnection(DEST_URI);

    // Define schemas
    const productSchema = new mongoose.Schema({}, { strict: false });
    const storeSchema = new mongoose.Schema({}, { strict: false });
    const userSchema = new mongoose.Schema({}, { strict: false });
    const settingsSchema = new mongoose.Schema({}, { strict: false });

    // Source models
    const SourceProduct = sourceConn.model('Product', productSchema, 'products');
    const SourceStore = sourceConn.model('Store', storeSchema, 'stores');
    const SourceUser = sourceConn.model('User', userSchema, 'users');

    // Destination models
    const DestProduct = destConn.model('Product', productSchema, 'products');
    const DestStore = destConn.model('Store', storeSchema, 'stores');
    const DestUser = destConn.model('User', userSchema, 'users');
    const DestSettings = destConn.model('Settings', settingsSchema, 'storesettings');

    // 1. Migrate ACRO Store info
    console.log('\n1. Migrating ACRO store information...');
    const acroStore = await SourceStore.findById(COFFEE_STORE_ID);
    if (acroStore) {
      await DestStore.deleteMany({}); // Clear destination
      const newStore = new DestStore(acroStore.toObject());
      await newStore.save();
      console.log('   ✅ Store information migrated');
    } else {
      // Create new store entry
      await DestStore.create({
        _id: COFFEE_STORE_ID,
        name: 'ACRO Coffee - Main Street',
        address: '123 Main Street',
        city: 'Brooklyn',
        state: 'NY',
        zipCode: '11234',
        phone: '(555) 123-4567',
        email: 'info@acrocoffee.com',
        isActive: true,
        taxRate: 0.08875
      });
      console.log('   ✅ Store information created');
    }

    // 2. Migrate ACRO Products
    console.log('\n2. Migrating ACRO products...');
    const acroProducts = await SourceProduct.find({
      $or: [
        { storeId: COFFEE_STORE_ID },
        { category: { $in: ['ACRO SPECIALS', 'ESPRESSO DRINKS', 'COFFEE/TEA', 'BEVERAGES'] } }
      ]
    });

    if (acroProducts.length > 0) {
      await DestProduct.deleteMany({}); // Clear destination

      // Ensure all products have correct storeId
      const productsToInsert = acroProducts.map(p => {
        const product = p.toObject();
        product.storeId = COFFEE_STORE_ID;
        delete product._id; // Let MongoDB generate new IDs
        return product;
      });

      await DestProduct.insertMany(productsToInsert);
      console.log(`   ✅ Migrated ${productsToInsert.length} products`);

      // Show category breakdown
      const categories = [...new Set(productsToInsert.map(p => p.category))];
      categories.forEach(cat => {
        const count = productsToInsert.filter(p => p.category === cat).length;
        console.log(`      - ${cat}: ${count} items`);
      });
    }

    // 3. Create default users for ACRO
    console.log('\n3. Setting up ACRO users...');
    await DestUser.deleteMany({}); // Clear destination

    const acroUsers = [
      {
        email: 'owner@acrocoffee.com',
        name: 'ACRO Owner',
        role: 'owner',
        storeId: COFFEE_STORE_ID,
        isActive: true
      },
      {
        email: 'manager@acrocoffee.com',
        name: 'ACRO Manager',
        role: 'admin',
        storeId: COFFEE_STORE_ID,
        isActive: true
      },
      {
        email: 'barista1@acrocoffee.com',
        name: 'Barista 1',
        role: 'cashier',
        storeId: COFFEE_STORE_ID,
        isActive: true
      }
    ];

    for (const userData of acroUsers) {
      await DestUser.create(userData);
      console.log(`   ✅ Created user: ${userData.email}`);
    }

    // 4. Create default settings
    console.log('\n4. Creating ACRO settings...');
    await DestSettings.deleteMany({});
    await DestSettings.create({
      storeId: COFFEE_STORE_ID,
      taxRate: 0.08875,
      currency: 'USD',
      receiptHeader: 'ACRO COFFEE',
      receiptFooter: 'Thank you for your visit!',
      openingTime: '06:00',
      closingTime: '20:00',
      allowDiscounts: true,
      requirePassword: false
    });
    console.log('   ✅ Settings created');

    // 5. Summary
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log('\n📊 Summary:');
    const finalProductCount = await DestProduct.countDocuments();
    const finalUserCount = await DestUser.countDocuments();
    console.log(`   - Products: ${finalProductCount}`);
    console.log(`   - Users: ${finalUserCount}`);
    console.log(`   - Database: acro_coffee_pos`);

    console.log('\n✅ ACRO Coffee now has its own separate database!');
    console.log('\n📝 Next steps:');
    console.log('1. Update /Users/franklinreitzas/acro_coffee_pos/.env.local');
    console.log('   Keep: MONGODB_URI=...mongodb.net/acro_coffee_pos');
    console.log('2. Restart the ACRO Coffee POS application');
    console.log('3. The Deli POS will continue using deli_pos_system database');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (sourceConn) await sourceConn.close();
    if (destConn) await destConn.close();
  }
}

migrateAcroToSeparateDb();