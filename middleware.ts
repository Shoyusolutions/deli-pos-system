import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth-middleware';
import { verifyQRToken } from './lib/qrAuth';

// Public routes that don't require authentication
const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/check', '/api/test-db', '/api/qr-auth'];

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): boolean {
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const key = `${ip}-${endpoint}`;
  const now = Date.now();
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;

  // Clean up old entries
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k);
      }
    }
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting to login endpoint
  if (pathname === '/api/auth/login') {
    if (!checkRateLimit(request, 'login', 5, 60000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Apply general API rate limiting
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!checkRateLimit(request, 'api', 100, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Check if it's a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Special handling for mobile-onboard route - validate QR tokens
  if (pathname === '/mobile-onboard') {
    const qrToken = request.nextUrl.searchParams.get('token');
    const sessionToken = request.nextUrl.searchParams.get('session');

    // If QR tokens are present, validate them
    if (qrToken && sessionToken) {
      const qrPayload = verifyQRToken(qrToken);
      if (!qrPayload) {
        // Invalid QR token - redirect to login with error
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'invalid_qr_token');
        return NextResponse.redirect(loginUrl);
      }
      // QR token is valid - allow access
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      return response;
    }
    // No QR tokens - fall through to normal auth check
  }

  // Get the token from the request cookies
  const token = request.cookies.get('auth-token')?.value || '';

  // Security headers for all responses
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // If it's a public path, allow access
  if (isPublicPath) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // If user is already logged in and trying to access login page, redirect to stores
    if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/stores', request.url));
    }

    return response;
  }

  // Protected routes - check for token
  if (!token) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // User is authenticated, allow access
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};