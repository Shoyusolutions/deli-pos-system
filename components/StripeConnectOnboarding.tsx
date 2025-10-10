'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';

interface StripeConnectOnboardingProps {
  storeId: string;
}

export default function StripeConnectOnboarding({ storeId }: StripeConnectOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStripeAccount();
  }, [storeId]);

  const checkStripeAccount = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`);
      if (response.ok) {
        const store = await response.json();
        if (store.stripeConnectAccountId) {
          setConnectAccountId(store.stripeConnectAccountId);
          await checkAccountStatus(store.stripeConnectAccountId);
        }
      }
    } catch (error) {
      console.error('Error checking Stripe account:', error);
    }
  };

  const checkAccountStatus = async (accountId: string) => {
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          accountId
        })
      });

      if (response.ok) {
        const status = await response.json();
        setAccountStatus(status);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  };

  const createStripeAccount = async () => {
    setLoading(true);
    setMessage('Creating Stripe Connect account...');

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_account',
          storeId
        })
      });

      if (response.ok) {
        const { accountId } = await response.json();
        setConnectAccountId(accountId);
        setMessage('Account created! Now redirecting to complete setup...');

        // Create onboarding link
        setTimeout(() => {
          createOnboardingLink(accountId);
        }, 1000);
      } else {
        setMessage('Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setMessage('Error creating account');
    } finally {
      setLoading(false);
    }
  };

  const createOnboardingLink = async (accountId: string) => {
    setLoading(true);
    setMessage('Preparing onboarding...');

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_account_link',
          accountId
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.open(url, '_blank');
        setMessage('Complete your setup in the new window, then return here');
      } else {
        setMessage('Failed to create onboarding link');
      }
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      setMessage('Error creating onboarding link');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = () => {
    if (connectAccountId) {
      checkAccountStatus(connectAccountId);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold">Stripe Connect Setup</h3>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      {!connectAccountId ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Connect Account Required</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  To accept credit card payments with your M2 reader, you need to set up Stripe Connect.
                  This allows us to collect a 5% platform fee while payments go directly to your account.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={createStripeAccount}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <ExternalLink className="w-5 h-5" />
                Set Up Stripe Connect
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Stripe Connect Account ID:</p>
            <p className="font-mono text-sm break-all">{connectAccountId}</p>
          </div>

          {accountStatus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {accountStatus.charges_enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">
                  Charges Enabled: {accountStatus.charges_enabled ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {accountStatus.details_submitted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">
                  Details Submitted: {accountStatus.details_submitted ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {accountStatus.payouts_enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">
                  Payouts Enabled: {accountStatus.payouts_enabled ? 'Yes' : 'No'}
                </span>
              </div>

              {accountStatus.charges_enabled && accountStatus.details_submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Ready to Accept Payments!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your M2 card reader can now process payments with a 5% platform fee.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => createOnboardingLink(connectAccountId)}
                    disabled={loading}
                    className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Complete Setup
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Checking account status...</p>
            </div>
          )}

          <button
            onClick={refreshStatus}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 font-medium"
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
}