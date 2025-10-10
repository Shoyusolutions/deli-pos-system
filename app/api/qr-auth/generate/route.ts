import { NextRequest, NextResponse } from 'next/server';
import { generateQRToken, createSecureSession } from '@/lib/qrAuth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { storeId, sessionId } = await req.json();

    if (!storeId || !sessionId) {
      return NextResponse.json({ error: 'Store ID and session ID required' }, { status: 400 });
    }

    // Verify the request is coming from an authenticated POS session
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Generate secure QR token
    const qrToken = generateQRToken(storeId, sessionId);

    // Create mobile session token
    const mobileSessionToken = await createSecureSession(storeId, sessionId);

    // Generate the secure mobile URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const secureUrl = `${baseUrl}/mobile-onboard?token=${qrToken}&session=${encodeURIComponent(mobileSessionToken)}`;

    return NextResponse.json({
      qrToken,
      mobileSessionToken,
      secureUrl,
      expiresIn: '15 minutes'
    });

  } catch (error: any) {
    console.error('QR token generation error:', error);
    return NextResponse.json({ error: 'Failed to generate secure token' }, { status: 500 });
  }
}