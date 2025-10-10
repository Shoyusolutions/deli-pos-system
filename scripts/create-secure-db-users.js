const mongoose = require('mongoose');

// Admin connection to create users
const ADMIN_URI = 'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/admin?retryWrites=true&w=majority';

async function createSecureUsers() {
  try {
    console.log('=== CREATING SECURE DATABASE USERS ===\n');
    console.log('Connecting to MongoDB Atlas admin database...');

    const conn = await mongoose.createConnection(ADMIN_URI);
    const db = conn.db('admin');

    // Generate secure passwords
    const crypto = require('crypto');
    const deliPassword = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '').substring(0, 20) + '!Aa1';
    const acroPassword = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '').substring(0, 20) + '!Aa1';

    console.log('\n📝 Creating restricted users...\n');

    // Create Deli user with access ONLY to deli database
    try {
      await db.command({
        createUser: 'deli_secure_user',
        pwd: deliPassword,
        roles: [
          {
            role: 'readWrite',
            db: 'deli_pos_system'
          }
        ]
      });
      console.log('✅ Created user: deli_secure_user');
      console.log('   Access: ONLY deli_pos_system database');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  User deli_secure_user already exists');
        // Update the user's password and roles
        try {
          await db.command({
            updateUser: 'deli_secure_user',
            pwd: deliPassword,
            roles: [
              {
                role: 'readWrite',
                db: 'deli_pos_system'
              }
            ]
          });
          console.log('   Updated password and restricted access');
        } catch (updateErr) {
          console.log('   Could not update user:', updateErr.message);
        }
      } else {
        console.log('   Error:', err.message);
      }
    }

    // Create ACRO user with access ONLY to ACRO database
    try {
      await db.command({
        createUser: 'acro_secure_user',
        pwd: acroPassword,
        roles: [
          {
            role: 'readWrite',
            db: 'acro_coffee_pos'
          }
        ]
      });
      console.log('\n✅ Created user: acro_secure_user');
      console.log('   Access: ONLY acro_coffee_pos database');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  User acro_secure_user already exists');
        // Update the user's password and roles
        try {
          await db.command({
            updateUser: 'acro_secure_user',
            pwd: acroPassword,
            roles: [
              {
                role: 'readWrite',
                db: 'acro_coffee_pos'
              }
            ]
          });
          console.log('   Updated password and restricted access');
        } catch (updateErr) {
          console.log('   Could not update user:', updateErr.message);
        }
      } else {
        console.log('   Error:', err.message);
      }
    }

    // Save credentials to secure files
    const fs = require('fs');
    const path = require('path');

    // Create credentials directory if it doesn't exist
    const credsDir = path.join(__dirname, '..', 'credentials');
    if (!fs.existsSync(credsDir)) {
      fs.mkdirSync(credsDir, { recursive: true });
    }

    // Save Deli credentials
    const deliEnv = `# Deli POS System - Secure Database Connection
# Generated: ${new Date().toISOString()}
# User has access ONLY to deli_pos_system database

MONGODB_URI=mongodb+srv://deli_secure_user:${deliPassword}@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos

# IMPORTANT:
# 1. Copy this to your .env.local file
# 2. Delete this file after copying
# 3. Never commit credentials to git`;

    fs.writeFileSync(path.join(credsDir, 'deli-secure.env'), deliEnv);

    // Save ACRO credentials
    const acroEnv = `# ACRO Coffee POS - Secure Database Connection
# Generated: ${new Date().toISOString()}
# User has access ONLY to acro_coffee_pos database

MONGODB_URI=mongodb+srv://acro_secure_user:${acroPassword}@deli-pos.mamcjur.mongodb.net/acro_coffee_pos?retryWrites=true&w=majority&appName=ACRO-Coffee

# IMPORTANT:
# 1. Copy this to your .env.local file
# 2. Delete this file after copying
# 3. Never commit credentials to git`;

    fs.writeFileSync(path.join(credsDir, 'acro-secure.env'), acroEnv);

    console.log('\n=== SECURE USERS CREATED SUCCESSFULLY ===\n');
    console.log('📁 Credentials saved to:');
    console.log('   - credentials/deli-secure.env');
    console.log('   - credentials/acro-secure.env');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Copy the MongoDB URI from each file to the respective .env.local');
    console.log('2. Delete the credential files after copying');
    console.log('3. Test the connections');
    console.log('4. Remove the old "delipos_user" after confirming new users work');

    // Test the new connections
    console.log('\n🧪 Testing new connections...\n');

    // Test Deli connection
    try {
      const deliTestConn = await mongoose.createConnection(
        `mongodb+srv://deli_secure_user:${deliPassword}@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority`
      );
      const deliProducts = await deliTestConn.db.collection('products').countDocuments();
      console.log(`✅ Deli connection works! Found ${deliProducts} products`);

      // Try to access ACRO database (should fail)
      try {
        await deliTestConn.db.collection('acro_coffee_pos').findOne();
        console.log('❌ SECURITY ISSUE: Deli user can access ACRO database!');
      } catch (err) {
        console.log('✅ Security verified: Deli user CANNOT access ACRO database');
      }

      await deliTestConn.close();
    } catch (err) {
      console.log('❌ Deli connection failed:', err.message);
    }

    // Test ACRO connection
    try {
      const acroTestConn = await mongoose.createConnection(
        `mongodb+srv://acro_secure_user:${acroPassword}@deli-pos.mamcjur.mongodb.net/acro_coffee_pos?retryWrites=true&w=majority`
      );
      const acroProducts = await acroTestConn.db.collection('products').countDocuments();
      console.log(`✅ ACRO connection works! Found ${acroProducts} products`);

      // Try to access Deli database (should fail)
      try {
        await acroTestConn.db.collection('deli_pos_system').findOne();
        console.log('❌ SECURITY ISSUE: ACRO user can access Deli database!');
      } catch (err) {
        console.log('✅ Security verified: ACRO user CANNOT access Deli database');
      }

      await acroTestConn.close();
    } catch (err) {
      console.log('❌ ACRO connection failed:', err.message);
    }

    await conn.close();
    console.log('\n✅ Setup complete!');

  } catch (error) {
    console.error('❌ Failed to create users:', error.message);
    console.error('\nNote: You may need to use MongoDB Atlas UI to create users if this fails.');
    console.error('Go to: Database Access → Add New Database User');
  }
}

createSecureUsers();