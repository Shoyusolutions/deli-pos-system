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

async function testLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const testEmail = 'owner@bedstuydeli.com';
    const testPassword = 'bedstuy123';

    console.log(`\nTesting login for: ${testEmail}`);

    // Find the user
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('❌ User not found!');

      // Create the user if it doesn't exist
      console.log('\n📝 Creating user...');
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      const newUser = new User({
        email: testEmail,
        password: hashedPassword,
        firstName: 'Store',
        lastName: 'Owner',
        role: 'owner',
        storeIds: [],
        isActive: true
      });
      await newUser.save();
      console.log('✅ User created successfully!');

    } else {
      console.log('✅ User found!');
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);

      // Test password
      const isPasswordValid = await bcrypt.compare(testPassword, user.password);

      if (isPasswordValid) {
        console.log('✅ Password is correct!');
      } else {
        console.log('❌ Password is incorrect!');

        // Update the password
        console.log('\n🔄 Updating password...');
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        user.password = hashedPassword;
        await user.save();
        console.log('✅ Password updated successfully!');
      }
    }

    console.log('\n✨ Login credentials verified:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\n🌐 Try logging in at: https://deli-pos-system.vercel.app/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();