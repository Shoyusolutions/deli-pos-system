import { NextResponse } from 'next/server';

export async function GET() {
  // Test endpoint to verify login works
  const testResponse = NextResponse.json({
    message: 'Test endpoint working',
    redirect: '/stores'
  });

  // Set a test cookie
  testResponse.cookies.set('test-auth', 'test-value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60
  });

  return testResponse;
}