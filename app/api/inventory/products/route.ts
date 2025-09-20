import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import connectMongo from '@/lib/mongodb';
import Product from '@/models/Product';

// GET - Fetch products for the user's store
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    // Filter products by the user's store location
    const products = await Product.find({
      storeLocation: session.user.storeLocation,
      isActive: true
    }).sort({ name: 1 });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST - Add new product (only for user's store)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has inventory permission
    if (session.user.role !== 'admin' && !session.user.permissions?.includes('inventory')) {
      return NextResponse.json({ error: 'No permission to add products' }, { status: 403 });
    }

    const data = await req.json();
    await connectMongo();

    // Automatically assign the product to the user's store
    const product = new Product({
      ...data,
      storeLocation: session.user.storeLocation, // Ensures product belongs to user's store
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await product.save();

    return NextResponse.json({
      message: 'Product added successfully',
      product
    });
  } catch (error) {
    console.error('Error adding product:', error);
    return NextResponse.json({ error: 'Failed to add product' }, { status: 500 });
  }
}

// PUT - Update product (only if it belongs to user's store)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && !session.user.permissions?.includes('inventory')) {
      return NextResponse.json({ error: 'No permission to update products' }, { status: 403 });
    }

    const { productId, ...updateData } = await req.json();
    await connectMongo();

    // Find product and verify it belongs to user's store
    const product = await Product.findOne({
      _id: productId,
      storeLocation: session.user.storeLocation // Security: only update products from user's store
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
    }

    // Update product
    Object.assign(product, {
      ...updateData,
      lastModifiedBy: session.user.id,
      updatedAt: new Date()
    });

    await product.save();

    return NextResponse.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE - Remove product (only if it belongs to user's store)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && !session.user.permissions?.includes('inventory')) {
      return NextResponse.json({ error: 'No permission to delete products' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('id');

    await connectMongo();

    // Soft delete - only if product belongs to user's store
    const result = await Product.updateOne(
      {
        _id: productId,
        storeLocation: session.user.storeLocation // Security check
      },
      {
        isActive: false,
        lastModifiedBy: session.user.id,
        updatedAt: new Date()
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}