import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import { createAuditLog, auditInventoryChange, auditTransaction } from '@/lib/auditLogger';

// Generate transaction number (e.g., TXN-20240101-001)
function generateTransactionNumber() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN-${dateStr}-${random}`;
}

export async function POST(req: NextRequest) {
  // Start a MongoDB session for atomic transaction
  const session = await mongoose.startSession();

  try {
    await dbConnect();

    // Start transaction
    session.startTransaction();

    const body = await req.json();
    const { storeId, items, tax, paymentMethod, cashGiven, userId } = body;

    if (!storeId || !items || !items.length) {
      await createAuditLog({
        storeId: storeId || 'unknown',
        userId,
        action: 'TRANSACTION_CREATE_FAILED',
        category: 'TRANSACTION',
        entityType: 'Transaction',
        severity: 'ERROR',
        success: false,
        errorMessage: 'Invalid transaction data',
        request: req
      });
      return NextResponse.json({ error: 'Invalid transaction data' }, { status: 400 });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const total = subtotal + (tax || 0);
    const changeGiven = paymentMethod === 'cash' && cashGiven ? cashGiven - total : 0;

    // Validate inventory availability before proceeding (skip manual items)
    const inventoryChecks = [];
    const inventoryWarnings = [];
    for (const item of items) {
      // Skip inventory checks for manual items and FOOD menu items
      if (item.product.upc.startsWith('MANUAL_') || item.product.upc.startsWith('FOOD_')) {
        continue;
      }

      const product = await Product.findOne({ upc: item.product.upc, storeId }).session(session);
      if (!product) {
        throw new Error(`Product ${item.product.upc} not found`);
      }

      // Check inventory but DON'T block the sale - just log warning
      if (product.inventory < item.quantity) {
        inventoryWarnings.push({
          product: product.name,
          available: product.inventory,
          requested: item.quantity
        });
        console.log(`⚠️ OVERRIDE SALE: ${product.name} - Available: ${product.inventory}, Selling: ${item.quantity}`);
        // Don't throw error - allow the sale to proceed
      }

      inventoryChecks.push({ product, requestedQty: item.quantity });
    }

    // Create transaction with price snapshot
    const transactionNumber = generateTransactionNumber();
    const transaction = new Transaction({
      storeId,
      transactionNumber,
      items: items.map((item: any) => ({
        productId: (item.product.upc.startsWith('MANUAL_') || item.product.upc.startsWith('FOOD_')) ? null : item.product._id,
        upc: item.product.upc,
        name: item.product.name,
        priceAtSale: item.product.price,  // Capture current price
        costAtSale: item.product.cost || 0, // Capture current cost
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      subtotal,
      tax: tax || 0,
      total,
      paymentMethod,
      cashGiven: paymentMethod === 'cash' ? cashGiven : undefined,
      changeGiven: paymentMethod === 'cash' ? changeGiven : undefined
    });

    await transaction.save({ session });

    // Update inventory for each product and create audit logs
    const inventoryUpdates = [];
    for (const check of inventoryChecks) {
      const oldInventory = check.product.inventory;
      const newInventory = oldInventory - check.requestedQty;

      // Update inventory
      await Product.findByIdAndUpdate(
        check.product._id,
        { $inc: { inventory: -check.requestedQty } },
        { session }
      );

      // Prepare audit log (will be saved after commit)
      inventoryUpdates.push({
        product: check.product,
        oldQuantity: oldInventory,
        newQuantity: newInventory,
        reason: `Sale - Transaction ${transactionNumber}`
      });
    }

    // Commit the transaction
    await session.commitTransaction();

    // Create audit logs after successful commit
    await auditTransaction(transaction, userId);

    for (const update of inventoryUpdates) {
      await auditInventoryChange(
        storeId,
        update.product,
        update.oldQuantity,
        update.newQuantity,
        update.reason,
        userId
      );
    }

    await createAuditLog({
      storeId,
      userId,
      action: 'TRANSACTION_COMPLETED',
      category: 'TRANSACTION',
      entityType: 'Transaction',
      entityId: transaction._id.toString(),
      metadata: {
        transactionNumber,
        reason: `${paymentMethod} transaction completed - Total: $${total.toFixed(2)}${inventoryWarnings.length > 0 ? ' (with inventory override)' : ''}`
      },
      severity: inventoryWarnings.length > 0 ? 'WARNING' : 'INFO',
      success: true,
      request: req
    });

    return NextResponse.json({
      ...transaction.toObject(),
      inventoryWarnings: inventoryWarnings.length > 0 ? inventoryWarnings : undefined
    }, { status: 201 });

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();

    console.error('Error creating transaction:', error);

    // Log the failed attempt
    await createAuditLog({
      storeId: req.nextUrl.searchParams.get('storeId') || 'unknown',
      action: 'TRANSACTION_CREATE_FAILED',
      category: 'TRANSACTION',
      entityType: 'Transaction',
      severity: 'ERROR',
      success: false,
      errorMessage: error.message || 'Failed to create transaction',
      request: req
    });

    return NextResponse.json({
      error: error.message || 'Failed to create transaction'
    }, { status: 500 });

  } finally {
    // End the session
    session.endSession();
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const query: any = { storeId };

    // Add date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Log the query
    await createAuditLog({
      storeId,
      action: 'TRANSACTION_LIST_VIEWED',
      category: 'TRANSACTION',
      entityType: 'Transaction',
      metadata: {
        reason: `Viewed ${transactions.length} transactions`
      },
      severity: 'INFO',
      success: true,
      request: req
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}