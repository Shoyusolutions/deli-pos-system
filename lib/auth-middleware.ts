import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { getCookie } from 'cookies-next';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production'
);

export interface UserSession {
  userId: string;
  email: string;
  role: string;
  storeIds: string[];
}

export async function createToken(payload: UserSession): Promise<string> {
  // Convert arrays to JSON strings for JWT compatibility
  const jwtPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    storeIds: JSON.stringify(payload.storeIds) // Convert array to string
  };

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    // Validate that payload has required fields
    if (
      payload.userId &&
      payload.email &&
      payload.role &&
      payload.storeIds
    ) {
      // Parse storeIds back from JSON string to array
      let storeIdsArray: string[] = [];
      try {
        storeIdsArray = JSON.parse(payload.storeIds as string);
      } catch {
        // If parsing fails, treat as single store ID
        storeIdsArray = [payload.storeIds as string];
      }

      return {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as string,
        storeIds: storeIdsArray
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function verifyAuth(request: NextRequest): Promise<UserSession | null> {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

export function requireAuth(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    const session = await verifyAuth(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    // Add session to request for use in handler
    (request as any).session = session;

    return handler(request, context);
  };
}

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return (handler: Function) => {
    return async (request: NextRequest, context?: any) => {
      const ip = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown';

      const now = Date.now();
      const userLimit = rateLimitMap.get(ip);

      if (!userLimit || now > userLimit.resetTime) {
        rateLimitMap.set(ip, {
          count: 1,
          resetTime: now + windowMs
        });
      } else {
        if (userLimit.count >= maxRequests) {
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
          );
        }
        userLimit.count++;
      }

      // Clean up old entries periodically
      if (rateLimitMap.size > 1000) {
        for (const [key, value] of rateLimitMap.entries()) {
          if (now > value.resetTime) {
            rateLimitMap.delete(key);
          }
        }
      }

      return handler(request, context);
    };
  };
}