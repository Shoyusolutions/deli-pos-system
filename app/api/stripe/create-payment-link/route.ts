import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not initialized' }, { status: 500 });
    }

    const { price, quantity = 1, metadata = {} } = await req.json();

    if (!price) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price,
          quantity,
        },
      ],
      metadata,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXTAUTH_URL}/payment-success`
        }
      }
    });

    return NextResponse.json({ payment_link: paymentLink });
  } catch (error: any) {
    console.error('Payment link creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment link' },
      { status: 500 }
    );
  }
}