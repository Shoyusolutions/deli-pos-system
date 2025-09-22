import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

// GET endpoint to find invalid products (very short UPCs that are likely scan errors)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Find all products with invalid UPCs (less than 6 digits)
    const products = await Product.find({ storeId }).sort({ name: 1 });

    const invalidProducts = products.filter(p => {
      // Check for invalid UPC patterns
      return (
        p.upc.length < 6 || // Too short
        p.upc === '0' || // Single digit
        p.upc === '00' || // Double zeros
        /^0+$/.test(p.upc) || // All zeros
        /^[0-9]$/.test(p.upc) // Single digit
      );
    });

    return NextResponse.json({
      invalidProducts: invalidProducts.map(p => ({
        _id: p._id,
        upc: p.upc,
        name: p.name,
        price: p.price,
        inventory: p.inventory,
        cost: p.cost,
        reason: p.upc.length < 6 ? 'UPC too short' : 'Invalid UPC pattern'
      })),
      totalProducts: products.length,
      invalidCount: invalidProducts.length
    });

  } catch (error) {
    console.error('Error finding invalid products:', error);
    return NextResponse.json(
      { error: 'Failed to find invalid products' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove invalid products
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { storeId, productId, deleteAll } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    let result;

    if (deleteAll) {
      // Delete all products with invalid UPCs
      result = await Product.deleteMany({
        storeId,
        $or: [
          { upc: { $regex: /^.{0,5}$/ } }, // Less than 6 characters
          { upc: '0' },
          { upc: '00' },
          { upc: { $regex: /^0+$/ } }, // All zeros
          { upc: { $regex: /^[0-9]$/ } } // Single digit
        ]
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} invalid products`
      });
    } else if (productId) {
      // Delete specific product
      await Product.findByIdAndDelete(productId);

      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Product ID or deleteAll flag required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error deleting invalid products:', error);
    return NextResponse.json(
      { error: 'Failed to delete products' },
      { status: 500 }
    );
  }
}