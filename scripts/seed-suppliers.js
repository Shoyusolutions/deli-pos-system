const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supplier schema definition
const supplierSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

supplierSchema.index({ storeId: 1, name: 1 }, { unique: true });
const Supplier = mongoose.model('Supplier', supplierSchema);

async function seedSuppliers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deli-pos');
    console.log('Connected to MongoDB');

    // Bedstuy Deli & Grill store ID
    const storeId = '6745f6a0e7b3c8d9f0123456';

    // Sample suppliers for a deli
    const suppliers = [
      {
        storeId,
        name: 'Coca-Cola Distributing',
        contactPerson: 'John Martinez',
        phone: '(718) 555-2001',
        email: 'orders@cocacola-dist.com',
        address: '123 Distribution Way, Brooklyn, NY 11201',
        notes: 'Delivers Tuesdays and Fridays'
      },
      {
        storeId,
        name: 'PepsiCo Distribution',
        contactPerson: 'Sarah Johnson',
        phone: '(718) 555-2002',
        email: 'sarah.j@pepsi-dist.com',
        address: '456 Beverage Blvd, Queens, NY 11101'
      },
      {
        storeId,
        name: 'Boars Head Provisions',
        contactPerson: 'Michael Romano',
        phone: '(718) 555-2003',
        email: 'mromano@boarshead.com',
        address: '789 Deli Drive, Brooklyn, NY 11215',
        notes: 'Premium deli meats and cheeses'
      },
      {
        storeId,
        name: 'Frito-Lay Inc',
        contactPerson: 'Lisa Chen',
        phone: '(718) 555-2004',
        email: 'lchen@fritolay.com',
        address: '321 Snack Street, Brooklyn, NY 11220'
      },
      {
        storeId,
        name: 'Brooklyn Bagel Co',
        contactPerson: 'David Goldstein',
        phone: '(718) 555-2005',
        email: 'david@brooklynbagel.com',
        address: '567 Bagel Lane, Brooklyn, NY 11211',
        notes: 'Fresh daily delivery at 5 AM'
      },
      {
        storeId,
        name: 'Mars Candy Distributors',
        contactPerson: 'Emily Thompson',
        phone: '(718) 555-2006',
        email: 'ethompson@mars-dist.com',
        address: '890 Candy Court, Staten Island, NY 10301'
      },
      {
        storeId,
        name: 'Nestle Waters',
        contactPerson: 'Robert Wilson',
        phone: '(718) 555-2007',
        email: 'rwilson@nestle-waters.com',
        address: '234 Water Way, Brooklyn, NY 11232'
      },
      {
        storeId,
        name: 'In-House Kitchen',
        contactPerson: 'Maria Rodriguez',
        phone: '(718) 555-0100',
        email: 'kitchen@bedstuydeli.com',
        address: 'On-site preparation',
        notes: 'Internal supplier for prepared foods'
      },
      {
        storeId,
        name: 'Brooklyn Wholesale Foods',
        contactPerson: 'James Park',
        phone: '(718) 555-2008',
        email: 'jpark@bkwholesale.com',
        address: '456 Wholesale Ave, Brooklyn, NY 11208',
        notes: 'General grocery supplier'
      },
      {
        storeId,
        name: 'Organic Valley',
        contactPerson: 'Jennifer Green',
        phone: '(718) 555-2009',
        email: 'jgreen@organicvalley.com',
        address: '789 Organic Way, Long Island, NY 11501',
        notes: 'Organic dairy products'
      },
      {
        storeId,
        name: 'Red Bull Distribution',
        contactPerson: 'Alex Kumar',
        phone: '(718) 555-2010',
        email: 'akumar@redbull-dist.com',
        address: '111 Energy Drive, Queens, NY 11103'
      },
      {
        storeId,
        name: 'Nabisco Foods',
        contactPerson: 'Patricia White',
        phone: '(718) 555-2011',
        email: 'pwhite@nabisco.com',
        address: '222 Cookie Lane, Brooklyn, NY 11235'
      },
      {
        storeId,
        name: 'Land O Lakes',
        contactPerson: 'Thomas Brown',
        phone: '(718) 555-2012',
        email: 'tbrown@landolakes.com',
        address: '333 Dairy Road, Brooklyn, NY 11223',
        notes: 'Cheese and butter products'
      },
      {
        storeId,
        name: 'Dietz & Watson',
        contactPerson: 'Frank DiMaggio',
        phone: '(718) 555-2013',
        email: 'fdimaggio@dietzwatson.com',
        address: '444 Meat Market, Brooklyn, NY 11214',
        notes: 'Premium deli meats'
      },
      {
        storeId,
        name: 'Brooklyn Produce Market',
        contactPerson: 'Carlos Mendez',
        phone: '(718) 555-2014',
        email: 'cmendez@bkproduce.com',
        address: '555 Fresh Ave, Brooklyn, NY 11206',
        notes: 'Fresh produce daily'
      }
    ];

    // Clear existing suppliers for this store
    await Supplier.deleteMany({ storeId });
    console.log('Cleared existing suppliers');

    // Insert new suppliers
    const inserted = await Supplier.insertMany(suppliers);
    console.log(`Successfully seeded ${inserted.length} suppliers for Bedstuy Deli & Grill`);

    // Show summary
    console.log('\nSupplier Categories:');
    console.log('- Beverage Suppliers: 4');
    console.log('- Food/Snack Suppliers: 5');
    console.log('- Deli/Meat Suppliers: 3');
    console.log('- General/Other: 3');

  } catch (error) {
    console.error('Error seeding suppliers:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedSuppliers();