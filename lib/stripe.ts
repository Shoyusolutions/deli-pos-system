import Stripe from 'stripe';

// Allow build to succeed without Stripe keys, but warn at runtime
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && typeof window === 'undefined') {
  console.warn('⚠️ STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
}) : null;

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  connectClientId: process.env.STRIPE_CONNECT_CLIENT_ID!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  terminalSecret: process.env.STRIPE_TERMINAL_SECRET!,
  applicationFeePercent: 5, // 5% platform fee
};

export interface PaymentIntentData {
  amount: number;
  currency: string;
  connectedAccountId: string;
  applicationFeeAmount: number;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(data: PaymentIntentData) {
  if (!stripe) {
    throw new Error('Stripe not initialized. Please check your environment variables.');
  }
  return await stripe.paymentIntents.create({
    amount: Math.round(data.amount * 100), // Convert to cents
    currency: data.currency,
    application_fee_amount: Math.round(data.applicationFeeAmount * 100),
    metadata: data.metadata,
    transfer_data: {
      destination: data.connectedAccountId,
    },
  });
}

export async function createTerminalLocation(storeAddress: {
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}, storeName: string) {
  if (!stripe) {
    throw new Error('Stripe not initialized. Please check your environment variables.');
  }
  return await stripe.terminal.locations.create({
    display_name: storeName,
    address: storeAddress,
  });
}

export async function createConnectionToken() {
  if (!stripe) {
    throw new Error('Stripe not initialized. Please check your environment variables.');
  }
  return await stripe.terminal.connectionTokens.create();
}

export async function createConnectAccount(email: string, businessName: string) {
  if (!stripe) {
    throw new Error('Stripe not initialized. Please check your environment variables.');
  }
  return await stripe.accounts.create({
    type: 'express',
    email,
    business_profile: {
      name: businessName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  if (!stripe) {
    throw new Error('Stripe not initialized. Please check your environment variables.');
  }
  return await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  });
}

export async function getAccountStatus(accountId: string) {
  if (!stripe) {
    throw new Error('Stripe not initialized. Please check your environment variables.');
  }
  return await stripe.accounts.retrieve(accountId);
}