'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface StripeAccountAssignmentProps {
  storeId: string;
  currentAccountId?: string | null;
  onSuccess: (accountId: string) => void;
}

export default function StripeAccountAssignment({ storeId, currentAccountId, onSuccess }: StripeAccountAssignmentProps) {
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState(currentAccountId || '');
  const [message, setMessage] = useState('');
  const [accountStatus, setAccountStatus] = useState<any>(null);

  const assignAccount = async () => {
    if (!accountId.trim()) {
      setMessage('❌ Please enter a Stripe Connect account ID');
      return;
    }

    setLoading(true);
    setMessage('🔍 Verifying Stripe Connect account...');

    try {
      // First verify the account exists and get its status
      const statusResponse = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          accountId: accountId.trim()
        })
      });

      if (!statusResponse.ok) {
        const error = await statusResponse.json();
        setMessage('❌ ' + (error.error || 'Invalid account ID'));
        return;
      }

      const status = await statusResponse.json();
      setAccountStatus(status);

      // Now assign it to the store
      const assignResponse = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_account',
          storeId,
          accountId: accountId.trim()
        })
      });

      if (assignResponse.ok) {
        setMessage('✅ Stripe Connect account assigned successfully!');
        onSuccess(accountId.trim());
      } else {
        const error = await assignResponse.json();
        setMessage('❌ ' + (error.error || 'Failed to assign account'));
      }
    } catch (error) {
      console.error('Error assigning account:', error);
      setMessage('❌ Error assigning account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    if (!currentAccountId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          accountId: currentAccountId
        })
      });

      if (response.ok) {
        const status = await response.json();
        setAccountStatus(status);
        setMessage('✅ Account status refreshed');
      }
    } catch (error) {
      setMessage('❌ Error refreshing status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold">Stripe Connect Account</h3>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      {!currentAccountId ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Manual Account Assignment</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Create a Stripe Connect account in your Stripe Dashboard, then enter the account ID below to assign it to this store.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stripe Connect Account ID
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="acct_1234567890abcdef"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: acct_1SGYiALAxlXfruNA
            </p>
          </div>

          <button
            onClick={assignAccount}
            disabled={loading || !accountId.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Assign Stripe Account
              </>
            )}
          </button>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">💡 How to get your Account ID:</h4>
            <ol className="text-sm text-green-700 space-y-1">
              <li>1. Go to your Stripe Dashboard</li>
              <li>2. Navigate to Connect → Accounts</li>
              <li>3. Create or select your connected account</li>
              <li>4. Copy the Account ID (starts with "acct_")</li>
              <li>5. Paste it above and click "Assign"</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Current Stripe Connect Account ID:</p>
            <p className="font-mono text-sm break-all">{currentAccountId}</p>
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
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Account setup incomplete. Complete onboarding in your Stripe Dashboard to accept payments.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Checking account status...</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={refreshStatus}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </button>
            <button
              onClick={() => {
                setAccountId('');
                setAccountStatus(null);
                setMessage('');
                onSuccess(''); // Clear the current account
              }}
              className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 font-medium"
            >
              Change Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}