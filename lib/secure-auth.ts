import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import connectMongo from '@/lib/mongodb';

interface AuthSession {
  userId: string;
  storeId: string;
  role: 'owner' | 'admin' | 'cashier';
  email: string;
}

/**
 * Get authenticated store from JWT token
 * This prevents store ID spoofing by extracting store from the secure JWT token
 * NOT from the request body which can be manipulated
 */
export async function getAuthenticatedStore(req: NextRequest): Promise<AuthSession> {
  const token = req.cookies.get('auth-token')?.value;

  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    // Return the secure session data from the token
    // This data cannot be spoofed by the client
    return {
      userId: decoded.userId,
      storeId: decoded.storeId, // CRITICAL: From token, not request body!
      role: decoded.role,
      email: decoded.email
    };
  } catch (error) {
    throw new Error('Invalid authentication token');
  }
}

/**
 * Verify user has access to the specified store
 * Prevents cross-store data access
 */
export async function verifyStoreAccess(
  userId: string,
  storeId: string,
  requestedStoreId?: string
): Promise<boolean> {
  // If a specific store is requested, verify it matches user's store
  if (requestedStoreId && requestedStoreId !== storeId) {
    throw new Error('Unauthorized: Cannot access data from another store');
  }

  await connectMongo();
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new Error('User account is disabled');
  }

  if (user.storeId !== storeId) {
    throw new Error('Unauthorized: User does not belong to this store');
  }

  return true;
}

/**
 * Check if user has required role
 * Implements role-based access control
 */
export function requireRole(
  userRole: string,
  requiredRoles: string[]
): boolean {
  if (!requiredRoles.includes(userRole)) {
    throw new Error(`Insufficient permissions. Required role: ${requiredRoles.join(' or ')}`);
  }
  return true;
}

/**
 * Create secure JWT token with embedded store information
 */
export function createSecureToken(user: any): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      storeId: user.storeId, // Embed store in token
      role: user.role,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 8) // 8 hours
    },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256' }
  );
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove any MongoDB operators
    return input.replace(/[${}]/g, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
}

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(
  userId: string,
  storeId: string,
  action: string,
  success: boolean,
  details?: any
) {
  try {
    // Log to your audit system
    console.log('[SECURITY]', {
      timestamp: new Date().toISOString(),
      userId,
      storeId,
      action,
      success,
      details
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}