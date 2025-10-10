import { NextRequest, NextResponse } from 'next/server';
import { verifyQRToken, verifyMobileSession } from '@/lib/qrAuth';

export async function POST(req: NextRequest) {
  try {
    const { token, sessionToken } = await req.json();

    if (!token || !sessionToken) {
      return NextResponse.json({ error: 'Token and session token required' }, { status: 400 });
    }

    // Verify QR token
    const qrPayload = verifyQRToken(token);
    if (!qrPayload) {
      return NextResponse.json({ error: 'Invalid or expired QR token' }, { status: 401 });
    }

    // Verify mobile session token
    const sessionPayload = verifyMobileSession(sessionToken);
    if (!sessionPayload) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Ensure tokens match
    if (qrPayload.storeId !== sessionPayload.storeId || qrPayload.sessionId !== sessionPayload.sessionId) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      storeId: qrPayload.storeId,
      sessionId: qrPayload.sessionId,
      action: qrPayload.action
    });

  } catch (error: any) {
    console.error('QR token validation error:', error);
    return NextResponse.json({ error: 'Token validation failed' }, { status: 500 });
  }
}