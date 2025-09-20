import { NextRequest, NextResponse } from 'next/server';
import { fetchProductFromEANDB, convertEANDBToProduct } from '@/lib/eandb';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const upc = searchParams.get('upc');

    if (!upc) {
      return NextResponse.json({ error: 'UPC is required' }, { status: 400 });
    }

    // Fetch from EAN-DB API
    const eanData = await fetchProductFromEANDB(upc);

    if (!eanData) {
      return NextResponse.json({ error: 'Product not found in EAN-DB' }, { status: 404 });
    }

    // Convert to our format
    const product = convertEANDBToProduct(eanData);

    if (!product) {
      return NextResponse.json({ error: 'Invalid product data from EAN-DB' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      source: 'eandb',
      product: product,
      rawData: eanData // Include raw data for reference
    });

  } catch (error: any) {
    console.error('Error looking up product:', error);
    return NextResponse.json({
      error: 'Failed to lookup product',
      details: error.message
    }, { status: 500 });
  }
}