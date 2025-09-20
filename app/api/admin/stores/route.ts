import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Store from '@/models/Store';

export async function GET(req: NextRequest) {
  try {
    // Middleware already checks for admin role
    const userRole = req.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectMongo();

    // Admin can see all stores
    const stores = await Store.find({}).sort({ name: 1 });
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}