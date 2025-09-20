import { setCookie, getCookie, deleteCookie } from 'cookies-next';
import { NextRequest, NextResponse } from 'next/server';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 8 // 8 hours
};

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set('auth-token', token, cookieOptions);
}

export function setStoreCookie(res: NextResponse, storeId: string) {
  res.cookies.set('selected-store', storeId, {
    ...cookieOptions,
    httpOnly: false // Allow client-side access for store selection
  });
}

export function getAuthCookie(req: NextRequest): string | undefined {
  return req.cookies.get('auth-token')?.value;
}

export function getStoreCookie(req: NextRequest): string | undefined {
  return req.cookies.get('selected-store')?.value;
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete('auth-token');
  res.cookies.delete('selected-store');
}