import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const QR_TOKEN_EXPIRY = '15m'; // 15 minutes for security

export interface QRTokenPayload {
  storeId: string;
  sessionId: string;
  action: 'stripe-onboard';
  iat: number;
  exp: number;
}

export function generateQRToken(storeId: string, sessionId: string): string {
  const payload = {
    storeId,
    sessionId,
    action: 'stripe-onboard',
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: QR_TOKEN_EXPIRY,
    issuer: 'deli-pos-system',
    audience: 'mobile-onboard'
  });
}

export function verifyQRToken(token: string): QRTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'deli-pos-system',
      audience: 'mobile-onboard'
    }) as QRTokenPayload;

    // Additional security: check if token is not too old
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.log('QR token expired');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('QR token verification failed:', error);
    return null;
  }
}

export async function createSecureSession(storeId: string, sessionId: string) {
  // Create a temporary secure session for mobile onboarding
  const sessionToken = jwt.sign(
    {
      storeId,
      sessionId,
      type: 'mobile-onboard-session',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    {
      expiresIn: '30m', // 30 minutes for the entire onboarding process
      issuer: 'deli-pos-system',
      audience: 'mobile-session'
    }
  );

  return sessionToken;
}

export function verifyMobileSession(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'deli-pos-system',
      audience: 'mobile-session'
    });
  } catch (error) {
    console.error('Mobile session verification failed:', error);
    return null;
  }
}