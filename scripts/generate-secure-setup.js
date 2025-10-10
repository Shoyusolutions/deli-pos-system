const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate secure passwords
function generateSecurePassword() {
  const length = 24;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomValues = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

console.log('=== SECURE DATABASE SETUP GUIDE ===\n');
console.log('Since MongoDB Atlas free tier requires manual user creation,');
console.log('follow these steps to secure your databases:\n');

const deliPassword = generateSecurePassword();
const acroPassword = generateSecurePassword();

console.log('📋 STEP 1: Create Database Users in MongoDB Atlas\n');
console.log('1. Go to: https://cloud.mongodb.com');
console.log('2. Select your cluster: "Deli-Pos"');
console.log('3. Click "Database Access" in the left menu');
console.log('4. Click "ADD NEW DATABASE USER"\n');

console.log('=== USER 1: DELI DATABASE ===');
console.log('Username: deli_secure_user');
console.log('Password: ' + deliPassword);
console.log('Built-in Role: Select "readWrite"');
console.log('Specific Privileges: Add specific privilege');
console.log('  - Database: deli_pos_system');
console.log('  - Collection: (leave empty for all)');
console.log('  - Actions: Check "readWrite"');
console.log('✅ Click "Add User"\n');

console.log('=== USER 2: ACRO COFFEE DATABASE ===');
console.log('Username: acro_secure_user');
console.log('Password: ' + acroPassword);
console.log('Built-in Role: Select "readWrite"');
console.log('Specific Privileges: Add specific privilege');
console.log('  - Database: acro_coffee_pos');
console.log('  - Collection: (leave empty for all)');
console.log('  - Actions: Check "readWrite"');
console.log('✅ Click "Add User"\n');

// Create credentials directory
const credsDir = path.join(__dirname, '..', 'credentials');
if (!fs.existsSync(credsDir)) {
  fs.mkdirSync(credsDir, { recursive: true });
}

// Create .gitignore for credentials directory
const gitignore = '# Ignore all credential files\n*\n!.gitignore';
fs.writeFileSync(path.join(credsDir, '.gitignore'), gitignore);

// Generate Deli .env.local
const deliEnvLocal = `# Deli POS System - Secure Configuration
# Generated: ${new Date().toISOString()}

# Security
NEXTAUTH_SECRET=${crypto.randomBytes(32).toString('hex')}
NEXTAUTH_URL=http://localhost:3000

# MongoDB Atlas Connection - RESTRICTED ACCESS
# This user can ONLY access deli_pos_system database
MONGODB_URI=mongodb+srv://deli_secure_user:${deliPassword}@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos

# Store Configuration
STORE_ID=68cd95c09876bc8663a80f84
STORE_NAME=Bedstuy Deli & Grill

# JWT Configuration
JWT_SECRET=${crypto.randomBytes(32).toString('hex')}

# Remove these after changing passwords
DEFAULT_OWNER_EMAIL=owner@bedstuydeli.com
DEFAULT_OWNER_PASSWORD=ChangeThis123!
DEFAULT_CASHIER_EMAIL=cashier1@bedstuydeli.com
DEFAULT_CASHIER_PASSWORD=ChangeThis456!

# Admin Override - REMOVE IN PRODUCTION
ADMIN_OVERRIDE_PASSWORD=${generateSecurePassword()}`;

fs.writeFileSync(path.join(credsDir, 'deli.env.local'), deliEnvLocal);

// Generate ACRO .env.local
const acroEnvLocal = `# ACRO Coffee POS - Secure Configuration
# Generated: ${new Date().toISOString()}

# Security
NEXTAUTH_SECRET=${crypto.randomBytes(32).toString('hex')}
NEXTAUTH_URL=http://localhost:3000

# MongoDB Atlas Connection - RESTRICTED ACCESS
# This user can ONLY access acro_coffee_pos database
MONGODB_URI=mongodb+srv://acro_secure_user:${acroPassword}@deli-pos.mamcjur.mongodb.net/acro_coffee_pos?retryWrites=true&w=majority&appName=ACRO-Coffee

# Store Configuration
STORE_ID=68d9da3dab8eff4166c9e9fd
STORE_NAME=ACRO Coffee - Main Street

# JWT Configuration
JWT_SECRET=${crypto.randomBytes(32).toString('hex')}

# Remove these after changing passwords
DEFAULT_OWNER_EMAIL=owner@acrocoffee.com
DEFAULT_OWNER_PASSWORD=ChangeThis123!
DEFAULT_MANAGER_EMAIL=manager@acrocoffee.com
DEFAULT_MANAGER_PASSWORD=ChangeThis456!

# Admin Override - REMOVE IN PRODUCTION
ADMIN_OVERRIDE_PASSWORD=${generateSecurePassword()}`;

fs.writeFileSync(path.join(credsDir, 'acro.env.local'), acroEnvLocal);

console.log('📋 STEP 2: Update Your Applications\n');
console.log('Files generated in /credentials/');
console.log('1. Copy deli.env.local → /deli_pos_system/.env.local');
console.log('2. Copy acro.env.local → /acro_coffee_pos/.env.local\n');

console.log('📋 STEP 3: Test The New Connections\n');
console.log('Run these commands to test:');
console.log('1. cd /Users/franklinreitzas/deli_pos_system && npm run dev');
console.log('2. cd /Users/franklinreitzas/acro_coffee_pos && npm run dev\n');

console.log('📋 STEP 4: Remove Old User (AFTER testing)\n');
console.log('In MongoDB Atlas:');
console.log('1. Go to Database Access');
console.log('2. Find "delipos_user"');
console.log('3. Click trash icon to delete\n');

console.log('⚠️  CRITICAL SECURITY NOTES:');
console.log('1. Each user can ONLY access their specific database');
console.log('2. Never share credentials between stores');
console.log('3. Delete /credentials folder after copying files');
console.log('4. Change default user passwords immediately');
console.log('5. Enable 2FA on MongoDB Atlas account\n');

// Test current vulnerability
console.log('🔍 Testing current security issue...\n');
const mongoose = require('mongoose');

async function testSecurity() {
  try {
    const conn = await mongoose.createConnection(
      'mongodb+srv://delipos_user:sldkfjh291832askdj@deli-pos.mamcjur.mongodb.net/admin?retryWrites=true&w=majority'
    );

    // List all databases this user can access
    const admin = conn.db.admin();
    const dbs = await admin.listDatabases();

    console.log('⚠️  CURRENT SECURITY ISSUE:');
    console.log('User "delipos_user" has access to ALL these databases:');
    dbs.databases.forEach(db => {
      console.log(`  - ${db.name}`);
    });

    await conn.close();
    console.log('\n✅ After implementing the new users:');
    console.log('  - deli_secure_user → ONLY deli_pos_system');
    console.log('  - acro_secure_user → ONLY acro_coffee_pos');
  } catch (err) {
    console.log('Could not test current access');
  }
}

testSecurity();