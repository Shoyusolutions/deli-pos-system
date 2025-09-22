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

    // Find potential duplicates based on UPC similarity only (for mis-scans)
    // This will catch cases where:
    // 1. One UPC contains the other (partial scans)
    // 2. Last N digits match (scanner cut-off issues)
    // 3. First N digits match (scanner cut-off at end)
    // 4. UPCs differ by 1-3 characters (mis-scans, typos)
    // 5. Significant substring matches (partial scans)
    const duplicates = [];
    const processedPairs = new Set();

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const p1 = products[i];
        const p2 = products[j];

        // Skip if we've already processed this pair
        const pairKey = [p1.upc, p2.upc].sort().join('-');
        if (processedPairs.has(pairKey)) continue;

        // Skip if both UPCs are too short (less than 4 digits)
        if (p1.upc.length < 4 && p2.upc.length < 4) continue;

        // Check for UPC similarity only
        let upcSimilar = false;
        let similarityType = '';
        let confidenceScore = 0;

        // 1. Check if one UPC contains the other (common with partial scans)
        if (p1.upc.includes(p2.upc) || p2.upc.includes(p1.upc)) {
          const shorter = p1.upc.length < p2.upc.length ? p1.upc : p2.upc;
          const longer = p1.upc.length >= p2.upc.length ? p1.upc : p2.upc;

          // High confidence if the shorter one is a significant portion of the longer
          if (shorter.length >= 6 && shorter.length >= longer.length * 0.5) {
            upcSimilar = true;
            similarityType = `Partial scan - "${shorter}" found in "${longer}"`;
            confidenceScore = 90;
          } else if (shorter.length >= 4) {
            // Lower confidence for very short matches
            upcSimilar = true;
            similarityType = `Possible partial - "${shorter}" found in "${longer}"`;
            confidenceScore = 60;
          }
        }

        // 2. Check if last N digits match (scanner cut-off at beginning)
        if (!upcSimilar && p1.upc.length >= 6 && p2.upc.length >= 6) {
          // Check last 12 digits (full UPC)
          if (p1.upc.length >= 12 && p2.upc.length >= 12 &&
              p1.upc.slice(-12) === p2.upc.slice(-12)) {
            upcSimilar = true;
            similarityType = 'Last 12 digits match (leading zero/prefix issue)';
            confidenceScore = 95;
          }
          // Check last 10 digits
          else if (p1.upc.length >= 10 && p2.upc.length >= 10 &&
                   p1.upc.slice(-10) === p2.upc.slice(-10)) {
            upcSimilar = true;
            similarityType = 'Last 10 digits match';
            confidenceScore = 85;
          }
          // Check last 8 digits
          else if (p1.upc.length >= 8 && p2.upc.length >= 8 &&
                   p1.upc.slice(-8) === p2.upc.slice(-8)) {
            upcSimilar = true;
            similarityType = 'Last 8 digits match';
            confidenceScore = 75;
          }
          // Check last 6 digits
          else if (p1.upc.slice(-6) === p2.upc.slice(-6)) {
            upcSimilar = true;
            similarityType = 'Last 6 digits match';
            confidenceScore = 65;
          }
        }

        // 3. Check if first N digits match (scanner cut-off at end)
        if (!upcSimilar && p1.upc.length >= 6 && p2.upc.length >= 6) {
          // Check first 10 digits
          if (p1.upc.length >= 10 && p2.upc.length >= 10 &&
              p1.upc.substring(0, 10) === p2.upc.substring(0, 10)) {
            upcSimilar = true;
            similarityType = 'First 10 digits match (scanner cut-off)';
            confidenceScore = 80;
          }
          // Check first 8 digits
          else if (p1.upc.length >= 8 && p2.upc.length >= 8 &&
                   p1.upc.substring(0, 8) === p2.upc.substring(0, 8)) {
            upcSimilar = true;
            similarityType = 'First 8 digits match';
            confidenceScore = 70;
          }
          // Check first 6 digits
          else if (p1.upc.substring(0, 6) === p2.upc.substring(0, 6)) {
            upcSimilar = true;
            similarityType = 'First 6 digits match';
            confidenceScore = 60;
          }
        }

        // 4. Check for character differences (mis-scans, typos)
        if (!upcSimilar && p1.upc.length >= 8 && p2.upc.length >= 8) {
          // Only check if lengths are similar
          if (Math.abs(p1.upc.length - p2.upc.length) <= 2) {
            const minLen = Math.min(p1.upc.length, p2.upc.length);
            let differences = 0;

            // Count character differences
            for (let k = 0; k < minLen; k++) {
              if (p1.upc[k] !== p2.upc[k]) differences++;
            }
            differences += Math.abs(p1.upc.length - p2.upc.length);

            // Allow up to 3 differences for longer codes
            const maxDiff = p1.upc.length >= 12 ? 3 : 2;

            if (differences <= maxDiff) {
              upcSimilar = true;
              similarityType = `UPCs differ by ${differences} character(s)`;
              confidenceScore = 70 - (differences * 10);
            }
          }
        }

        // 5. Check for significant common substring
        if (!upcSimilar && p1.upc.length >= 5 && p2.upc.length >= 5) {
          // Find longest common substring
          let maxLen = 0;
          let commonStr = '';

          for (let i = 0; i < p1.upc.length; i++) {
            for (let j = 0; j < p2.upc.length; j++) {
              let len = 0;
              while (i + len < p1.upc.length &&
                     j + len < p2.upc.length &&
                     p1.upc[i + len] === p2.upc[j + len]) {
                len++;
              }
              if (len > maxLen) {
                maxLen = len;
                commonStr = p1.upc.substring(i, i + len);
              }
            }
          }

          // If we have at least 5 consecutive matching digits, consider it a potential duplicate
          if (maxLen >= 5) {
            upcSimilar = true;
            similarityType = `${maxLen} consecutive digits match: "${commonStr}"`;
            confidenceScore = 50 + (maxLen * 3);
          }
        }

        if (upcSimilar) {
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
              upcSimilar: true,
              similarityType: similarityType,
              confidence: confidenceScore || 50,
              nameMatch: p1.name.toLowerCase() === p2.name.toLowerCase(),
              priceDifference: Math.abs(p1.price - p2.price),
              upc1Length: p1.upc.length,
              upc2Length: p2.upc.length
            }
          });
          processedPairs.add(pairKey);
        }
      }
    }

    // Sort duplicates by confidence score (highest first)
    duplicates.sort((a, b) => b.similarity.confidence - a.similarity.confidence);

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