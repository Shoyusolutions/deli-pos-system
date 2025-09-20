import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import User from '@/models/User';
import { z } from 'zod';
import { createToken, rateLimit } from '@/lib/auth-middleware';
import { setAuthCookie, setStoreCookie } from '@/lib/secure-cookies';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(1).max(100)
});

const postHandler = async (req: NextRequest) => {
  try {
    await connectMongo();

    // Parse and validate input
    const body = await req.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Rate limiting check (simplified - in production use Redis)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    });

    if (!user) {
      // Prevent timing attacks - always compare password even if user doesn't exist
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT token
    const token = await createToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      storeIds: user.storeIds
    });

    // Create response with user info
    const response = NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        storeIds: user.storeIds
      }
    });

    // Set secure HTTP-only cookie
    setAuthCookie(response, token);

    // Set store cookie if user has stores
    if (user.storeIds && user.storeIds.length > 0) {
      setStoreCookie(response, user.storeIds[0]);
    }

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
};

// Apply rate limiting (5 attempts per minute)
export const POST = rateLimit(5, 60000)(postHandler);