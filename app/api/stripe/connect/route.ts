import { NextRequest, NextResponse } from 'next/server';
import { createConnectAccount, createCompleteConnectAccount, createAccountLink, getAccountStatus } from '@/lib/stripe';
import dbConnect from '@/lib/mongodb';
import Store from '@/models/Store';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { action, storeId, accountId, businessInfo } = await req.json();

    switch (action) {
      case 'create_account': {
        const store = await Store.findById(storeId);
        if (!store) {
          return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const account = await createConnectAccount(
          store.email || 'owner@bedstuydeli.com',
          store.name
        );

        await Store.findByIdAndUpdate(storeId, {
          stripeConnectAccountId: account.id
        });

        return NextResponse.json({ accountId: account.id });
      }

      case 'create_complete_account': {
        const store = await Store.findById(storeId);
        if (!store) {
          return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const account = await createCompleteConnectAccount(businessInfo);

        await Store.findByIdAndUpdate(storeId, {
          stripeConnectAccountId: account.id
        });

        return NextResponse.json({ accountId: account.id });
      }

      case 'assign_account': {
        const store = await Store.findById(storeId);
        if (!store) {
          return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        // Verify the account exists by checking its status
        const account = await getAccountStatus(accountId);
        if (!account) {
          return NextResponse.json({ error: 'Stripe account not found' }, { status: 404 });
        }

        await Store.findByIdAndUpdate(storeId, {
          stripeConnectAccountId: accountId
        });

        return NextResponse.json({
          success: true,
          accountId: accountId,
          accountStatus: {
            charges_enabled: account.charges_enabled,
            details_submitted: account.details_submitted,
            payouts_enabled: account.payouts_enabled,
          }
        });
      }

      case 'create_account_link': {
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const accountLink = await createAccountLink(
          accountId,
          `${baseUrl}/settings?stripe_onboarding=success`,
          `${baseUrl}/settings?stripe_onboarding=refresh`
        );

        return NextResponse.json({ url: accountLink.url });
      }

      case 'check_status': {
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        const account = await getAccountStatus(accountId);
        return NextResponse.json({
          charges_enabled: account.charges_enabled,
          details_submitted: account.details_submitted,
          payouts_enabled: account.payouts_enabled,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Stripe Connect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}