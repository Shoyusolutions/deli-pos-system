import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe';
import dbConnect from '@/lib/mongodb';
import Store from '@/models/Store';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { storeId, amount, currency = 'usd', metadata } = await req.json();

    if (!storeId || !amount) {
      return NextResponse.json({ error: 'Store ID and amount required' }, { status: 400 });
    }

    const store = await Store.findById(storeId);
    if (!store || !store.stripeConnectAccountId) {
      return NextResponse.json({
        error: 'Store not found or Stripe Connect not configured'
      }, { status: 400 });
    }

    const applicationFeeAmount = amount * 0.05; // 5% platform fee

    const paymentIntent = await createPaymentIntent({
      amount,
      currency,
      connectedAccountId: store.stripeConnectAccountId,
      applicationFeeAmount,
      metadata: {
        ...metadata,
        storeId,
        storeName: store.name,
      }
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      application_fee_amount: paymentIntent.application_fee_amount,
    });

  } catch (error: any) {
    console.error('Payment intent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}