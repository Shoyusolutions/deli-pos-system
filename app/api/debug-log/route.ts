import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, data, timestamp, userAgent } = await request.json();

    // Log to server console with timestamp
    const logTime = new Date(timestamp).toLocaleTimeString();

    console.log('\n' + '='.repeat(80));
    console.log(`[${logTime}] SCANNER DEBUG: ${message}`);
    console.log('='.repeat(80));

    if (data) {
      console.log('DATA:', JSON.stringify(data, null, 2));
    }

    if (userAgent && message.includes('🔍')) {
      console.log('USER AGENT:', userAgent);
    }

    console.log('='.repeat(80) + '\n');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug log API error:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}