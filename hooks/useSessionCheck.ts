import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useSessionCheck() {
  const router = useRouter();
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/check');
      if (!response.ok || response.status === 401) {
        // Session expired, redirect to login
        router.push('/login');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      router.push('/login');
      return false;
    }
  };

  useEffect(() => {
    // Check session immediately
    checkSession();

    // Set up periodic session check every 5 minutes
    sessionCheckInterval.current = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, []);

  return { checkSession };
}