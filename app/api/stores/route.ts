import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Store from '@/models/Store';

export async function GET() {
  try {
    await connectMongo();
    const stores = await Store.find({ isActive: true }).sort({ name: 1 });
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { name, address, city, state, zipCode, phone, email, taxRate } = body;

    const existingStore = await Store.findOne({ name });
    if (existingStore) {
      return NextResponse.json({ error: 'Store with this name already exists' }, { status: 400 });
    }

    const store = new Store({
      name,
      address,
      city,
      state: state.toUpperCase(),
      zipCode,
      phone,
      email,
      taxRate: taxRate || 0.08,
      isActive: true
    });

    await store.save();
    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}