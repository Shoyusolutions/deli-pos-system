import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/secure-cookies';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}