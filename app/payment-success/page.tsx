'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      fetchSessionData(sessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchSessionData = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/checkout-session?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionData(data.session);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Thank you for your payment.</p>
        </div>

        {sessionData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">
                  ${(sessionData.amount_total / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-xs">{sessionData.payment_intent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-semibold">Paid</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => window.close()}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Close
          </button>
          <button
            onClick={() => window.location.href = '/checkout'}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            New Transaction
          </button>
        </div>
      </div>
    </div>
  );
}