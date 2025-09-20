import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: transaction._id,
      transactionNumber: transaction.transactionNumber,
      storeId: transaction.storeId,
      items: transaction.items,
      subtotal: transaction.subtotal,
      tax: transaction.tax,
      cashDiscount: transaction.cashDiscount,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      cashierName: transaction.cashierName,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}