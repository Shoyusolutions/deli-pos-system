import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get storeId from query params
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch statistics
    const [
      totalProducts,
      lowStockCount,
      outOfStockCount
    ] = await Promise.all([
      // Total active products
      Product.countDocuments({ storeId }),

      // Low stock items (5 or less)
      Product.countDocuments({ storeId, inventory: { $lte: 5, $gt: 0 } }),

      // Out of stock items
      Product.countDocuments({ storeId, inventory: 0 })
    ]);

    const stats = {
      todaysSales: 0, // Will be implemented when Transaction model is created
      itemsSold: 0,   // Will be implemented when Transaction model is created
      lowStockItems: lowStockCount,
      activeProducts: totalProducts
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Return default values if there's an error
    return NextResponse.json({
      todaysSales: 0,
      itemsSold: 0,
      lowStockItems: 0,
      activeProducts: 0
    });
  }
}