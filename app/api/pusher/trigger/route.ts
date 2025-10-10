import { NextRequest, NextResponse } from 'next/server';
import { triggerPusherEvent } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const { channel, event, data } = await req.json();

    if (!channel || !event) {
      return NextResponse.json({ error: 'Channel and event are required' }, { status: 400 });
    }

    await triggerPusherEvent(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pusher trigger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}