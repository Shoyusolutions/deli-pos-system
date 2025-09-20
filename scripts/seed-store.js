const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const storeSchema = new mongoose.Schema({
  name: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  phone: String,
  email: String,
  ownerId: String,
  isActive: Boolean,
  taxRate: Number
}, { timestamps: true });

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

async function seedStore() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if store already exists
    const existing = await Store.findOne({ name: 'Bedstuy Deli & Grill' });
    if (existing) {
      console.log('Store already exists:', existing.name);
      process.exit(0);
    }

    // Create Bedstuy Deli & Grill
    const store = new Store({
      name: 'Bedstuy Deli & Grill',
      address: '123 Bedford Ave',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11216',
      phone: '(718) 555-0123',
      email: 'info@bedstuydeli.com',
      isActive: true,
      taxRate: 0.08875 // NYC tax rate
    });

    await store.save();
    console.log('Store created successfully:', store.name);
    console.log('Store ID:', store._id);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedStore();