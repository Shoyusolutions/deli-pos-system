'use client';

import { useState, useEffect } from 'react';

interface MobilePaymentProps {
  amount: number;
  storeId: string;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

export default function MobilePayment({
  amount,
  storeId,
  onPaymentSuccess,
  onPaymentError
}: MobilePaymentProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  useEffect(() => {
    // Detect mobile device and platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsMobile(isMobileDevice);
  }, []);

  const generatePaymentLink = async () => {
    setIsGeneratingLink(true);
    try {
      // First create a product for this transaction
      const productResponse = await fetch('/api/stripe/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `POS Transaction - $${amount.toFixed(2)}`,
          description: `In-person payment at ${storeId}`
        })
      });

      if (!productResponse.ok) {
        throw new Error('Failed to create product');
      }

      const { product } = await productResponse.json();

      // Create a price for the product
      const priceResponse = await fetch('/api/stripe/create-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.id,
          unit_amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd'
        })
      });

      if (!priceResponse.ok) {
        throw new Error('Failed to create price');
      }

      const { price } = await priceResponse.json();

      // Create payment link
      const linkResponse = await fetch('/api/stripe/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: price.id,
          quantity: 1,
          metadata: {
            source: 'mobile_pos',
            store_id: storeId
          }
        })
      });

      if (!linkResponse.ok) {
        throw new Error('Failed to create payment link');
      }

      const { payment_link } = await linkResponse.json();
      setPaymentLink(payment_link.url);

      // Generate QR code for the payment link
      const qrResponse = await fetch(`/api/generate-qr?url=${encodeURIComponent(payment_link.url)}`);
      if (qrResponse.ok) {
        const { qrCodeData } = await qrResponse.json();
        setQrCode(qrCodeData);
      }

      // Poll for payment completion
      pollPaymentStatus(payment_link.id);

    } catch (error: any) {
      console.error('Error generating payment link:', error);
      onPaymentError(error.message || 'Failed to generate payment link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const pollPaymentStatus = async (paymentLinkId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/stripe/payment-link-status?id=${paymentLinkId}`);
        const { sessions } = await response.json();

        if (sessions && sessions.length > 0) {
          const completedSession = sessions.find((session: any) => session.payment_status === 'paid');
          if (completedSession) {
            onPaymentSuccess({
              payment_intent: completedSession.payment_intent,
              amount_total: completedSession.amount_total,
              session_id: completedSession.id
            });
            return;
          }
        }

        // Continue polling
        setTimeout(checkStatus, 2000);
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    checkStatus();
  };

  const openStripeApp = () => {
    if (isIOS) {
      // Try to open Stripe Dashboard app, fallback to App Store
      window.location.href = 'stripe-dashboard://';
      setTimeout(() => {
        window.open('https://apps.apple.com/app/apple-store/id978516833', '_blank');
      }, 1000);
    } else if (isAndroid) {
      // Try to open Stripe Dashboard app, fallback to Google Play
      window.location.href = 'intent://dashboard#Intent;package=com.stripe.android.dashboard;end';
      setTimeout(() => {
        window.open('https://play.google.com/store/apps/details?id=com.stripe.android.dashboard', '_blank');
      }, 1000);
    }
  };

  const copyPaymentLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      // You could add a toast notification here
    }
  };

  if (!isMobile) {
    return (
      <div className="p-4 border rounded-lg bg-blue-50">
        <h3 className="text-lg font-semibold mb-2">💻 Desktop Payment</h3>
        <p className="text-sm text-gray-600 mb-4">
          Mobile tap payments are available on mobile devices. Use the M2 reader for in-person payments on desktop.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        📱 Mobile Payment Options
        {isIOS && <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">iPhone</span>}
        {isAndroid && <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded">Android</span>}
      </h3>

      <div className="text-sm font-medium mb-4">
        Amount: ${amount.toFixed(2)}
      </div>

      <div className="space-y-4">
        {/* Option 1: Stripe Dashboard App (True Tap to Pay) */}
        {(isIOS || isAndroid) && (
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">
              ⚡ Best: Official Stripe Tap to Pay
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Use the official Stripe Dashboard app for true tap-to-pay functionality
            </p>
            <button
              onClick={openStripeApp}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-sm"
            >
              Open Stripe Dashboard App
            </button>
            <p className="text-xs text-gray-500 mt-2">
              {isIOS ? 'Requires iPhone XS or later' : 'Requires supported Android device'}
            </p>
          </div>
        )}

        {/* Option 2: Payment Link with QR Code */}
        <div className="p-3 bg-white rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">
            📲 Alternative: Payment Link
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Generate a QR code or link for the customer to pay on their device
          </p>

          {!paymentLink ? (
            <button
              onClick={generatePaymentLink}
              disabled={isGeneratingLink}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 text-sm disabled:opacity-50"
            >
              {isGeneratingLink ? 'Generating...' : 'Create Payment Link'}
            </button>
          ) : (
            <div className="space-y-3">
              {qrCode && (
                <div className="text-center">
                  <img
                    src={qrCode}
                    alt="Payment QR Code"
                    className="mx-auto w-32 h-32 border rounded"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Customer can scan this QR code to pay
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={copyPaymentLink}
                  className="flex-1 bg-gray-600 text-white py-2 px-3 rounded text-xs hover:bg-gray-700"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => window.open(paymentLink, '_blank')}
                  className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-xs hover:bg-green-700"
                >
                  Open Link
                </button>
              </div>

              <div className="text-center">
                <div className="animate-pulse text-sm text-blue-600">
                  Waiting for payment...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Option 3: Manual Entry Fallback */}
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-2">
            💳 Fallback: Manual Entry
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Ask customer for card details and enter manually
          </p>
          <button
            onClick={() => {/* Navigate to manual entry form */}}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 text-sm"
          >
            Enter Card Manually
          </button>
        </div>
      </div>
    </div>
  );
}