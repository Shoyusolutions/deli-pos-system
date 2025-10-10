import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('Checkout session retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}