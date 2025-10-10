import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, data, timestamp, userAgent } = await request.json();

    // Log to server console with timestamp
    const logTime = new Date(timestamp).toLocaleTimeString();
    console.log(`[${logTime}] SCANNER DEBUG: ${message}`);

    if (data) {
      console.log(`[${logTime}] DATA:`, JSON.stringify(data, null, 2));
    }

    if (userAgent) {
      console.log(`[${logTime}] USER AGENT:`, userAgent);
    }

    console.log('---');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug log API error:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}