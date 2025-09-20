const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'owner', 'manager', 'cashier'], default: 'cashier' },
  storeIds: [{ type: String, ref: 'Store' }],
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Store schema
const storeSchema = new mongoose.Schema({
  name: String
});

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

async function seedUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the Bedstuy Deli store
    const bedstuyStore = await Store.findOne({ name: 'Bedstuy Deli & Grill' });
    if (!bedstuyStore) {
      console.error('Bedstuy Deli & Grill store not found. Run seed-store.js first.');
      process.exit(1);
    }

    console.log('Found store:', bedstuyStore.name);

    // Create admin user
    const adminEmail = 'admin@delisystem.com';
    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      adminUser = new User({
        email: adminEmail,
        password: hashedAdminPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        storeIds: [], // Admin has access to all stores
        isActive: true
      });
      await adminUser.save();
      console.log('Admin user created:', adminEmail);
    } else {
      console.log('Admin user already exists:', adminEmail);
    }

    // Create store owner user
    const ownerEmail = process.env.DEFAULT_OWNER_EMAIL || 'owner@defaultdeli.com';
    const ownerPassword = process.env.DEFAULT_OWNER_PASSWORD || 'changethis123';
    let ownerUser = await User.findOne({ email: ownerEmail });

    if (!ownerUser) {
      const hashedOwnerPassword = await bcrypt.hash(ownerPassword, 10);
      ownerUser = new User({
        email: ownerEmail,
        password: hashedOwnerPassword,
        firstName: 'John',
        lastName: 'Smith',
        role: 'owner',
        storeIds: [bedstuyStore._id.toString()],
        isActive: true
      });
      await ownerUser.save();
      console.log('Store owner created:', ownerEmail);
    } else {
      console.log('Store owner already exists:', ownerEmail);
    }

    // Create cashier user
    const cashierEmail = process.env.DEFAULT_CASHIER_EMAIL || 'cashier@defaultdeli.com';
    const cashierPassword = process.env.DEFAULT_CASHIER_PASSWORD || 'changethis456';
    let cashierUser = await User.findOne({ email: cashierEmail });

    if (!cashierUser) {
      const hashedCashierPassword = await bcrypt.hash(cashierPassword, 10);
      cashierUser = new User({
        email: cashierEmail,
        password: hashedCashierPassword,
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'cashier',
        storeIds: [bedstuyStore._id.toString()],
        isActive: true
      });
      await cashierUser.save();
      console.log('Cashier user created:', cashierEmail);
    } else {
      console.log('Cashier user already exists:', cashierEmail);
    }

    console.log('\n=== Login Credentials ===');
    console.log('Admin:');
    console.log('  Email: admin@delisystem.com');
    console.log('  Password: [Check .env.local]');
    console.log('\nStore Owner:');
    console.log('  Email:', ownerEmail);
    console.log('  Password: [Check .env.local for DEFAULT_OWNER_PASSWORD]');
    console.log('\nCashier:');
    console.log('  Email:', cashierEmail);
    console.log('  Password: [Check .env.local for DEFAULT_CASHIER_PASSWORD]');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedUsers();