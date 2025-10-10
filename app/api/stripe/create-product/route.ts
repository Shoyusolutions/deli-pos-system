import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not initialized' }, { status: 500 });
    }

    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const product = await stripe.products.create({
      name,
      description,
      // Note: 'type' field is deprecated in newer Stripe API versions
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Product creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}