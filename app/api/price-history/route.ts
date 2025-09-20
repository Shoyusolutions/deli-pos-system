import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import PriceHistory from '@/models/PriceHistory';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const upc = searchParams.get('upc');
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const query: any = { storeId };

    // Filter by UPC or product ID
    if (upc) {
      query.upc = upc;
    } else if (productId) {
      query.productId = productId;
    }

    // Add date range if provided
    if (startDate || endDate) {
      query.effectiveDate = {};
      if (startDate) query.effectiveDate.$gte = new Date(startDate);
      if (endDate) query.effectiveDate.$lte = new Date(endDate);
    }

    const priceHistory = await PriceHistory.find(query)
      .sort({ effectiveDate: -1 })
      .limit(limit);

    // Calculate percentage change for each entry
    const historyWithPercentage = priceHistory.map((entry: any) => ({
      ...entry.toObject(),
      priceChangePercent: ((entry.newPrice - entry.oldPrice) / entry.oldPrice * 100).toFixed(2),
      costChangePercent: entry.oldCost ? ((entry.newCost - entry.oldCost) / entry.oldCost * 100).toFixed(2) : null
    }));

    return NextResponse.json(historyWithPercentage);
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}