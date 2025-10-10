import { NextRequest, NextResponse } from 'next/server';
import { createConnectionToken } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const connectionToken = await createConnectionToken();

    return NextResponse.json({
      secret: connectionToken.secret
    });
  } catch (error: any) {
    console.error('Terminal connection token error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}