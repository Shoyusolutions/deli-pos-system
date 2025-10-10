'use client';

import { useState, useEffect, useRef } from 'react';
import { ExternalLink, CheckCircle, AlertCircle, CreditCard, QrCode, Smartphone, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { pusherClient } from '@/lib/pusher';

interface StripeConnectOnboardingQRProps {
  storeId: string;
}

export default function StripeConnectOnboardingQR({ storeId }: StripeConnectOnboardingQRProps) {
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    checkStripeAccount();
    // Generate unique session ID for this onboarding session
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, [storeId]);

  useEffect(() => {
    if (!sessionId || !pusherClient) return;

    const channel = pusherClient.subscribe(`stripe-onboarding-${sessionId}`);

    channel.bind('stripe-account_created', (data: any) => {
      setConnectAccountId(data.accountId);
      setMessage('✅ Account created on phone! Checking status...');
      setTimeout(() => checkAccountStatus(data.accountId), 2000);
    });

    channel.bind('stripe-completed', (data: any) => {
      setAccountStatus(data.status);
      setMessage('🎉 Setup completed on phone!');
      setShowQRCode(false);
      setLoading(false);
    });

    return () => {
      if (pusherClient) {
        pusherClient.unsubscribe(`stripe-onboarding-${sessionId}`);
      }
    };
  }, [sessionId]);

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

  const generateQRCode = async () => {
    if (!sessionId) return;

    setShowQRCode(true);
    setLoading(true);
    setMessage('🔐 Generating secure QR code...');

    try {
      // Generate secure tokens
      const response = await fetch('/api/qr-auth/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate secure tokens');
      }

      const { secureUrl } = await response.json();

      setMessage('📱 Scan this secure QR code with your phone');

      if (qrCanvasRef.current) {
        await QRCode.toCanvas(qrCanvasRef.current, secureUrl, {
          width: 500,
          margin: 4,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      }
    } catch (error) {
      console.error('Error generating secure QR code:', error);
      setMessage('❌ Error generating secure QR code');
      setShowQRCode(false);
    } finally {
      setLoading(false);
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
        setMessage('❌ Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setMessage('❌ Error creating account');
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
        setMessage('❌ Failed to create onboarding link');
      }
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      setMessage('❌ Error creating onboarding link');
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

          {!showQRCode ? (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">🔒 Recommended: Secure Phone Setup</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Secure auto-login via encrypted QR code. Perfect for ELO devices with browser limitations.
                      QR codes expire in 15 minutes for security.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={generateQRCode}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    📱 Generate QR Code for Phone Setup
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-sm text-gray-500">or (not recommended for ELO devices)</span>
              </div>

              <button
                onClick={createStripeAccount}
                disabled={loading}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    💻 Set Up on This Device
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center bg-gray-50 p-6 rounded-lg">
                <canvas
                  ref={qrCanvasRef}
                  className="mx-auto border border-gray-200 rounded-lg bg-white"
                />
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    📱 Scan with your phone camera
                  </p>
                  <p className="text-xs text-gray-500">
                    {loading ? '⏳ Waiting for setup completion...' : '🔐 Secure QR Ready (expires in 15 min)'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowQRCode(false);
                    setLoading(false);
                    setMessage('');
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={generateQRCode}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          )}
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
                  Charges Enabled: {accountStatus.charges_enabled ? '✅ Yes' : '❌ No'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {accountStatus.details_submitted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">
                  Details Submitted: {accountStatus.details_submitted ? '✅ Yes' : '❌ No'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {accountStatus.payouts_enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">
                  Payouts Enabled: {accountStatus.payouts_enabled ? '✅ Yes' : '❌ No'}
                </span>
              </div>

              {accountStatus.charges_enabled && accountStatus.details_submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">🎉 Ready to Accept Payments!</span>
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

                  <div className="text-center">
                    <span className="text-sm text-gray-500">or</span>
                  </div>

                  <button
                    onClick={generateQRCode}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    📱 Use Phone to Complete
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
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
}