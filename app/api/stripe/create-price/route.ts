import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not initialized' }, { status: 500 });
    }

    const { product, unit_amount, currency = 'usd' } = await req.json();

    if (!product || !unit_amount) {
      return NextResponse.json({ error: 'Product ID and unit_amount are required' }, { status: 400 });
    }

    const price = await stripe.prices.create({
      product,
      unit_amount: Math.round(unit_amount), // Ensure it's an integer
      currency,
    });

    return NextResponse.json({ price });
  } catch (error: any) {
    console.error('Price creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create price' },
      { status: 500 }
    );
  }
}