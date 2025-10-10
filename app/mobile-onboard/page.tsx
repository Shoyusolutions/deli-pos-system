'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, CreditCard, ExternalLink, Smartphone } from 'lucide-react';

function MobileOnboardContent() {
  const searchParams = useSearchParams();

  // New secure token-based authentication
  const token = searchParams?.get('token');
  const sessionToken = searchParams?.get('session');

  // Legacy support (fallback)
  const legacyStoreId = searchParams?.get('storeId');
  const legacySessionId = searchParams?.get('sessionId');

  const [storeId, setStoreId] = useState<string | null>(legacyStoreId);
  const [sessionId, setSessionId] = useState<string | null>(legacySessionId);

  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'welcome' | 'creating' | 'onboarding' | 'completed'>('welcome');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // If we have secure tokens, validate them first
    if (token && sessionToken) {
      validateSecureTokens();
    } else if (legacyStoreId && legacySessionId) {
      // Legacy support - direct access
      setAuthenticated(true);
      checkExistingAccount();
    } else {
      setAuthError('Invalid QR code. Please scan again from the POS system.');
    }
  }, [token, sessionToken, legacyStoreId, legacySessionId]);

  const validateSecureTokens = async () => {
    setLoading(true);
    setMessage('🔐 Authenticating securely...');

    try {
      const response = await fetch('/api/qr-auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, sessionToken })
      });

      if (response.ok) {
        const { storeId: validatedStoreId, sessionId: validatedSessionId } = await response.json();
        setStoreId(validatedStoreId);
        setSessionId(validatedSessionId);
        setAuthenticated(true);
        setMessage('✅ Securely authenticated! Loading your setup...');

        // Now check existing account
        setTimeout(() => {
          checkExistingAccount();
        }, 1000);
      } else {
        const error = await response.json();
        setAuthError(error.error || 'Authentication failed');
        setMessage('❌ ' + (error.error || 'Authentication failed'));
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Network error during authentication');
      setMessage('❌ Network error during authentication');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only proceed if authenticated and we have valid IDs
    if (authenticated && storeId && sessionId) {
      checkExistingAccount();
    }
  }, [authenticated, storeId, sessionId]);

  const checkExistingAccount = async () => {
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
      console.error('Error checking existing account:', error);
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

        if (status.charges_enabled && status.details_submitted) {
          setStep('completed');
          notifyPOS('completed', { accountId, status });
        }
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  };

  const createStripeAccount = async () => {
    if (!storeId) return;

    setLoading(true);
    setStep('creating');
    setMessage('Creating your Stripe Connect account...');

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
        setMessage('Account created! Now setting up onboarding...');

        // Notify POS that account was created
        notifyPOS('account_created', { accountId });

        // Create onboarding link
        setTimeout(() => {
          createOnboardingLink(accountId);
        }, 1000);
      } else {
        setMessage('Failed to create account. Please try again.');
        setStep('welcome');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setMessage('Error creating account. Please try again.');
      setStep('welcome');
    } finally {
      setLoading(false);
    }
  };

  const createOnboardingLink = async (accountId: string) => {
    setLoading(true);
    setStep('onboarding');
    setMessage('Preparing onboarding...');

    try {
      const currentUrl = window.location.origin;
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_account_link',
          accountId,
          returnUrl: `${currentUrl}/mobile-onboard?storeId=${storeId}&sessionId=${sessionId}&status=success`,
          refreshUrl: `${currentUrl}/mobile-onboard?storeId=${storeId}&sessionId=${sessionId}&status=refresh`
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        setMessage('Redirecting to Stripe setup...');

        // Redirect to Stripe onboarding
        window.location.href = url;
      } else {
        setMessage('Failed to create onboarding link. Please try again.');
        setStep('welcome');
      }
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      setMessage('Error creating onboarding link. Please try again.');
      setStep('welcome');
    } finally {
      setLoading(false);
    }
  };

  const notifyPOS = async (event: string, data: any) => {
    if (!sessionId) return;

    try {
      await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: `stripe-onboarding-${sessionId}`,
          event: `stripe-${event}`,
          data
        })
      });
    } catch (error) {
      console.error('Failed to notify POS:', error);
    }
  };

  const handleStatusCheck = () => {
    const status = searchParams?.get('status');
    if (status === 'success') {
      setStep('completed');
      setMessage('Setup completed successfully!');

      if (connectAccountId) {
        checkAccountStatus(connectAccountId);
      }
    } else if (status === 'refresh') {
      setMessage('Setup needs to be completed. Please try again.');
      setStep('welcome');
    }
  };

  useEffect(() => {
    handleStatusCheck();
  }, [searchParams]);

  if (authError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">🔒 Authentication Failed</h1>
          <p className="text-gray-600 mb-4">{authError}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              💡 <strong>Tip:</strong> QR codes expire after 15 minutes for security.
              Please generate a new QR code from your POS system.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated || !storeId || !sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">🔐 Secure Authentication</h2>
          <p className="text-gray-600">{message || 'Verifying your secure access...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-blue-600 mr-2" />
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bedstuy Deli & Grill</h1>
          <p className="text-gray-600">Payment Setup</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        {step === 'welcome' && !connectAccountId && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">Setup Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    To accept credit card payments, we need to set up your Stripe Connect account.
                    This allows you to receive payments with a 5% platform fee.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={createStripeAccount}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  Start Payment Setup
                </>
              )}
            </button>
          </div>
        )}

        {step === 'creating' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Creating Account</h3>
            <p className="text-gray-600">Setting up your payment processing...</p>
          </div>
        )}

        {step === 'onboarding' && (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <ExternalLink className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Redirecting</h3>
            <p className="text-gray-600">Taking you to Stripe to complete setup...</p>
          </div>
        )}

        {step === 'completed' && accountStatus && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Setup Complete!</h3>
              <p className="text-gray-600">Your payment processing is now active.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Charges Enabled: {accountStatus.charges_enabled ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Details Submitted: {accountStatus.details_submitted ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Payouts Enabled: {accountStatus.payouts_enabled ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 text-center">
                ✅ You can now return to the POS system. Payment processing is ready!
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Powered by Stripe Connect • 5% Platform Fee
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MobileOnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <MobileOnboardContent />
    </Suspense>
  );
}