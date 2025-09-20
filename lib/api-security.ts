import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { NextResponse } from 'next/server';

/**
 * Security middleware for API routes
 * Ensures users can only access/modify their own store's data
 */

export async function validateSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  return { error: false, session };
}

export function hasPermission(session: any, requiredPermission: string): boolean {
  // Admin users have all permissions
  if (session.user?.role === 'admin') return true;

  // Check if user has the specific permission
  return session.user?.permissions?.includes(requiredPermission) || false;
}

export function filterByStore(query: any, storeLocation: string) {
  // Add store location filter to any database query
  return {
    ...query,
    storeLocation: storeLocation
  };
}

/**
 * Secure data wrapper - ensures data belongs to user's store
 */
export async function secureQuery(Model: any, query: any, storeLocation: string) {
  const secureFilter = filterByStore(query, storeLocation);
  return await Model.find(secureFilter);
}

/**
 * Validate that a resource belongs to the user's store before modification
 */
export async function validateOwnership(Model: any, resourceId: string, storeLocation: string) {
  const resource = await Model.findOne({
    _id: resourceId,
    storeLocation: storeLocation
  });

  return resource !== null;
}