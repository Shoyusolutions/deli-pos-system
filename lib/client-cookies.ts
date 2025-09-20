// Client-side cookie utilities
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }

  return null;
}

export function setCookie(name: string, value: string, days: number = 1) {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// Store management using cookies
export function getSelectedStoreId(): string | null {
  // First try cookie, then fallback to localStorage for backwards compatibility
  const cookieValue = getCookie('selected-store');
  if (cookieValue) return cookieValue;

  // Fallback to localStorage and migrate to cookie
  if (typeof window !== 'undefined') {
    const localValue = localStorage.getItem('selectedStoreId');
    if (localValue) {
      setCookie('selected-store', localValue);
      localStorage.removeItem('selectedStoreId'); // Clean up
      return localValue;
    }
  }

  return null;
}

export function setSelectedStoreId(storeId: string) {
  setCookie('selected-store', storeId);
  // Also remove from localStorage if it exists
  if (typeof window !== 'undefined') {
    localStorage.removeItem('selectedStoreId');
  }
}

export function clearSelectedStoreId() {
  deleteCookie('selected-store');
  if (typeof window !== 'undefined') {
    localStorage.removeItem('selectedStoreId');
  }
}