const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://franklinreitzas_db_user:scjBpU7VRq4C9sPS@cluster0.mongodb.net/deli_pos?retryWrites=true&w=majority';

// User schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  username: String,
  password: String,
  role: String,
  storeLocation: String,
  employeeId: String,
  permissions: [String],
  verified: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

async function initDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    const User = mongoose.model('User', userSchema);

    // Check if admin user exists
    const existingAdmin = await User.findOne({ username: 'admin' });

    if (!existingAdmin) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@delipos.com',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        storeLocation: 'Main Store',
        employeeId: 'EMP001',
        permissions: ['pos', 'inventory', 'reports', 'settings', 'users'],
        verified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await adminUser.save();
      console.log('Admin user created successfully');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('Remember to change the password after first login!');
    } else {
      console.log('Admin user already exists');
    }

    await mongoose.disconnect();
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();