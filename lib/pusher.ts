import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = process.env.PUSHER_APP_ID ? new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true,
}) : null;

// Client-side Pusher instance
export const pusherClient = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PUSHER_KEY ? new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  }
) : null;

// Event types for Stripe Connect onboarding
export const PUSHER_EVENTS = {
  STRIPE_ACCOUNT_CREATED: 'stripe-account-created',
  STRIPE_ONBOARDING_COMPLETED: 'stripe-onboarding-completed',
  STRIPE_STATUS_UPDATED: 'stripe-status-updated',
} as const;

// Trigger Pusher event
export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: any
) {
  if (!pusherServer) {
    console.warn('Pusher not configured. Skipping event trigger.');
    return;
  }

  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error);
  }
}