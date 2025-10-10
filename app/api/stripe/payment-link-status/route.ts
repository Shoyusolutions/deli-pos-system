import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const paymentLinkId = searchParams.get('id');

    if (!paymentLinkId) {
      return NextResponse.json({ error: 'Payment link ID is required' }, { status: 400 });
    }

    // Get checkout sessions for this payment link
    const sessions = await stripe.checkout.sessions.list({
      payment_link: paymentLinkId,
      limit: 10
    });

    return NextResponse.json({ sessions: sessions.data });
  } catch (error: any) {
    console.error('Payment link status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get payment link status' },
      { status: 500 }
    );
  }
}