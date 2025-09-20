import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import PriceHistory from '@/models/PriceHistory';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { storeId, primaryUpc, duplicateUpc, mergeStrategy = 'combine' } = body;

    if (!storeId || !primaryUpc || !duplicateUpc) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch both products
    const primaryProduct = await Product.findOne({ storeId, upc: primaryUpc });
    const duplicateProduct = await Product.findOne({ storeId, upc: duplicateUpc });

    if (!primaryProduct || !duplicateProduct) {
      return NextResponse.json(
        { error: 'One or both products not found' },
        { status: 404 }
      );
    }

    // Merge based on strategy
    if (mergeStrategy === 'combine') {
      // Combine inventory
      primaryProduct.inventory = primaryProduct.inventory + duplicateProduct.inventory;

      // Use the better price (could be lower for customer benefit)
      if (duplicateProduct.price < primaryProduct.price) {
        primaryProduct.price = duplicateProduct.price;
      }

      // Keep the better cost (lower is better for profit)
      if (duplicateProduct.cost && (!primaryProduct.cost || duplicateProduct.cost < primaryProduct.cost)) {
        primaryProduct.cost = duplicateProduct.cost;
      }

      // Keep supplier info if primary doesn't have it
      if (!primaryProduct.supplierName && duplicateProduct.supplierName) {
        primaryProduct.supplierName = duplicateProduct.supplierName;
        primaryProduct.supplierId = duplicateProduct.supplierId;
      }
    } else if (mergeStrategy === 'replace') {
      // Replace with duplicate's data but keep primary UPC
      primaryProduct.inventory = duplicateProduct.inventory;
      primaryProduct.price = duplicateProduct.price;
      primaryProduct.cost = duplicateProduct.cost;
      primaryProduct.supplierName = duplicateProduct.supplierName;
      primaryProduct.supplierId = duplicateProduct.supplierId;
    } else if (mergeStrategy === 'combine_verified') {
      // Combine inventory but keep verified product's price and details
      primaryProduct.inventory = primaryProduct.inventory + duplicateProduct.inventory;

      // Keep primary product's price and cost (since it's the verified correct one)
      // Only update supplier info if primary doesn't have it
      if (!primaryProduct.supplierName && duplicateProduct.supplierName) {
        primaryProduct.supplierName = duplicateProduct.supplierName;
        primaryProduct.supplierId = duplicateProduct.supplierId;
      }

      // Keep the better (more complete) name if needed
      if (!primaryProduct.name || primaryProduct.name.length < duplicateProduct.name.length) {
        primaryProduct.name = duplicateProduct.name;
      }
    }

    // Save the updated primary product
    await primaryProduct.save();

    // Update all transactions that reference the duplicate UPC
    try {
      const updateResult = await Transaction.updateMany(
        { storeId, 'items.product.upc': duplicateUpc },
        { $set: { 'items.$[elem].product.upc': primaryUpc, 'items.$[elem].product.name': primaryProduct.name } },
        { arrayFilters: [{ 'elem.product.upc': duplicateUpc }] }
      );
      console.log(`Updated ${updateResult.modifiedCount} transactions`);
    } catch (txnError: any) {
      // If transactions update fails, log it but continue with the merge
      console.log('Note: No transactions to update or transaction update not needed:', txnError?.message || txnError);
    }

    // Update price history records
    try {
      const priceUpdateResult = await PriceHistory.updateMany(
        { storeId, upc: duplicateUpc },
        { $set: { upc: primaryUpc } }
      );
      console.log(`Updated ${priceUpdateResult.modifiedCount} price history records`);
    } catch (priceError: any) {
      console.log('Note: No price history to update or update not needed:', priceError?.message || priceError);
    }

    // Delete the duplicate product
    await Product.deleteOne({ storeId, upc: duplicateUpc });

    return NextResponse.json({
      success: true,
      mergedProduct: primaryProduct,
      message: `Successfully merged ${duplicateUpc} into ${primaryUpc}`
    });

  } catch (error) {
    console.error('Error merging products:', error);
    return NextResponse.json(
      { error: 'Failed to merge products' },
      { status: 500 }
    );
  }
}

// GET endpoint to find potential duplicates
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

    const products = await Product.find({ storeId }).sort({ name: 1 });

    // Find potential duplicates based on:
    // 1. Similar names
    // 2. UPCs that differ only by leading/trailing digits
    const duplicates = [];
    const processedPairs = new Set();

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const p1 = products[i];
        const p2 = products[j];

        // Skip if we've already processed this pair
        const pairKey = [p1.upc, p2.upc].sort().join('-');
        if (processedPairs.has(pairKey)) continue;

        // Check for similar names (case insensitive)
        const nameSimilar = p1.name.toLowerCase() === p2.name.toLowerCase() ||
                           p1.name.toLowerCase().includes(p2.name.toLowerCase()) ||
                           p2.name.toLowerCase().includes(p1.name.toLowerCase());

        // Check for UPC similarity (one might have extra digit)
        const upcSimilar = p1.upc.includes(p2.upc) ||
                          p2.upc.includes(p1.upc) ||
                          p1.upc.slice(-12) === p2.upc.slice(-12); // Last 12 digits match

        if (nameSimilar || upcSimilar) {
          duplicates.push({
            product1: {
              upc: p1.upc,
              name: p1.name,
              price: p1.price,
              inventory: p1.inventory,
              cost: p1.cost
            },
            product2: {
              upc: p2.upc,
              name: p2.name,
              price: p2.price,
              inventory: p2.inventory,
              cost: p2.cost
            },
            similarity: {
              nameMatch: nameSimilar,
              upcSimilar: upcSimilar,
              priceDifference: Math.abs(p1.price - p2.price)
            }
          });
          processedPairs.add(pairKey);
        }
      }
    }

    return NextResponse.json({
      duplicates,
      totalProducts: products.length,
      duplicatePairs: duplicates.length
    });

  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to find duplicates' },
      { status: 500 }
    );
  }
}