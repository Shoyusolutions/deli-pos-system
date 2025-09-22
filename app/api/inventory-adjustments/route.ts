import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongo from '@/lib/mongodb';
import Product from '@/models/Product';
import InventoryAdjustment from '@/models/InventoryAdjustment';
import { createAuditLog, auditInventoryChange } from '@/lib/auditLogger';

export async function POST(req: NextRequest) {
  const session = await mongoose.startSession();

  try {
    await connectMongo();

    // Start transaction
    session.startTransaction();

    const body = await req.json();
    const {
      storeId,
      upc,
      productUpc,
      productName,
      adjustmentType,
      quantityChange,
      previousCount,
      newCount,
      discrepancy,
      reason,
      notes,
      userId,
      userName,
      timestamp
    } = body;

    // Support both formats - reconcile format and regular adjustment format
    const actualUpc = upc || productUpc;

    // Handle reconcile format - when physical count is provided
    if (previousCount !== undefined && newCount !== undefined && discrepancy !== undefined) {
      // Reconcile mode - don't need to check for product since it was already updated
      if (!storeId || !actualUpc || !reason) {
        return NextResponse.json({
          error: 'Missing required fields: storeId, upc, and reason are required'
        }, { status: 400 });
      }

      // Create inventory adjustment record for reconciliation
      const adjustment = new InventoryAdjustment({
        storeId,
        upc: actualUpc,
        productName: productName || 'Unknown Product',
        adjustmentType: 'reconcile',
        quantityBefore: previousCount,
        quantityAfter: newCount,
        quantityChanged: discrepancy,
        reason,
        adjustedBy: userId || 'system',
        adjustedByName: userName,
        notes,
        createdAt: timestamp || new Date()
      });

      await adjustment.save({ session });
      await session.commitTransaction();

      return NextResponse.json(adjustment, { status: 201 });
    }

    // Regular adjustment format
    if (!storeId || !actualUpc || !adjustmentType || quantityChange === undefined || !reason) {
      return NextResponse.json({
        error: 'Missing required fields: storeId, upc, adjustmentType, quantityChange, and reason are required'
      }, { status: 400 });
    }

    // Find the product
    const product = await Product.findOne({ upc: actualUpc, storeId }).session(session);
    if (!product) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate new inventory
    const quantityBefore = product.inventory;
    const quantityAfter = quantityBefore + quantityChange;

    // Validate inventory won't go negative
    if (quantityAfter < 0) {
      await session.abortTransaction();
      return NextResponse.json({
        error: `Invalid adjustment: would result in negative inventory (Current: ${quantityBefore}, Change: ${quantityChange})`
      }, { status: 400 });
    }

    // Update product inventory
    product.inventory = quantityAfter;
    await product.save({ session });

    // Create inventory adjustment record
    const adjustment = new InventoryAdjustment({
      storeId,
      productId: product._id,
      upc: product.upc,
      productName: product.name,
      adjustmentType,
      quantityBefore,
      quantityAfter,
      quantityChanged: quantityChange,
      reason,
      adjustedBy: userId || 'system',
      adjustedByName: userName,
      notes
    });

    await adjustment.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    // Create audit logs after successful commit
    await auditInventoryChange(
      storeId,
      product,
      quantityBefore,
      quantityAfter,
      `${adjustmentType}: ${reason}`,
      userId
    );

    await createAuditLog({
      storeId,
      userId,
      userName,
      action: 'INVENTORY_ADJUSTMENT',
      category: 'INVENTORY',
      entityType: 'InventoryAdjustment',
      entityId: adjustment._id.toString(),
      changes: [{
        field: 'inventory',
        oldValue: quantityBefore,
        newValue: quantityAfter
      }],
      metadata: {
        upc: product.upc,
        productName: product.name,
        reason: `${adjustmentType}: ${reason}`
      },
      severity: Math.abs(quantityChange) > 50 ? 'WARNING' : 'INFO',
      success: true,
      request: req
    });

    return NextResponse.json(adjustment, { status: 201 });

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();

    console.error('Error creating inventory adjustment:', error);

    // Log the failed attempt
    await createAuditLog({
      storeId: req.nextUrl.searchParams.get('storeId') || 'unknown',
      action: 'INVENTORY_ADJUSTMENT_FAILED',
      category: 'INVENTORY',
      entityType: 'InventoryAdjustment',
      severity: 'ERROR',
      success: false,
      errorMessage: error.message || 'Failed to create inventory adjustment',
      request: req
    });

    return NextResponse.json({
      error: error.message || 'Failed to create inventory adjustment'
    }, { status: 500 });

  } finally {
    // End the session
    session.endSession();
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const upc = searchParams.get('upc');
    const productId = searchParams.get('productId');
    const adjustmentType = searchParams.get('adjustmentType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const query: any = { storeId };

    // Add filters
    if (upc) query.upc = upc;
    if (productId) query.productId = productId;
    if (adjustmentType) query.adjustmentType = adjustmentType;

    // Add date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const adjustments = await InventoryAdjustment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Log the query
    await createAuditLog({
      storeId,
      action: 'INVENTORY_ADJUSTMENTS_VIEWED',
      category: 'INVENTORY',
      entityType: 'InventoryAdjustment',
      metadata: {
        reason: `Viewed ${adjustments.length} inventory adjustments`
      },
      severity: 'INFO',
      success: true,
      request: req
    });

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('Error fetching inventory adjustments:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory adjustments' }, { status: 500 });
  }
}