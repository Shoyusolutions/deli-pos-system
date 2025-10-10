'use client';

import { useState, useEffect } from 'react';
import StripeAccountAssignment from './StripeAccountAssignment';

interface StripeConnectOnboardingQRProps {
  storeId: string;
}

export default function StripeConnectOnboardingQR({ storeId }: StripeConnectOnboardingQRProps) {
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);

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
        }
      }
    } catch (error) {
      console.error('Error checking Stripe account:', error);
    }
  };

  const handleAccountAssignment = (accountId: string) => {
    setConnectAccountId(accountId);
    // Refresh the store data
    checkStripeAccount();
  };

  return (
    <StripeAccountAssignment
      storeId={storeId}
      currentAccountId={connectAccountId}
      onSuccess={handleAccountAssignment}
    />
  );
}