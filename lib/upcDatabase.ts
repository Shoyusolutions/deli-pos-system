// UPC Database API Integration

interface UPCDatabaseProduct {
  success: boolean;
  barcode?: string;
  title?: string;
  alias?: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  mpn?: string;
  msrp?: string;
  asin?: string;
  category?: string;
  images?: string[];
  stores?: Array<{
    store: string;
    price: string;
    link?: string;
  }>;
  reviews?: {
    thumbsup: number;
    thumbsdown: number;
  };
  metadata?: {
    size?: string;
    color?: string;
    gender?: string;
    age?: string;
    length?: string;
    unit?: string;
    width?: string;
    height?: string;
    weight?: string;
    quantity?: string;
    publisher?: string;
    genre?: string;
    author?: string;
    releasedate?: string;
  };
}

interface SearchResult {
  success: boolean;
  timestamp?: number;
  results?: number;
  items?: Array<{
    barcode: string;
    title: string;
    alias: string;
    description: string;
  }>;
}

const API_KEY = process.env.UPCDATABASE_API_KEY;
const API_URL = process.env.UPCDATABASE_API_URL || 'https://api.upcdatabase.org';

/**
 * Fetch product information from UPC Database API
 * @param upc The UPC/EAN code to look up
 * @returns Product information or null if not found
 */
export async function fetchProductFromUPCDatabase(upc: string): Promise<UPCDatabaseProduct | null> {
  if (!API_KEY) {
    console.error('UPC Database API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/product/${upc}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Product not found
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: UPCDatabaseProduct = await response.json();

    if (data.success === false) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching from UPC Database:', error);
    return null;
  }
}

/**
 * Search for products in UPC Database
 * @param query Search query string
 * @param page Page number (optional, defaults to 1)
 * @returns Search results or null if error
 */
export async function searchUPCDatabase(query: string, page: number = 1): Promise<SearchResult | null> {
  if (!API_KEY) {
    console.error('UPC Database API key not configured');
    return null;
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`${API_URL}/search/?query=${encodedQuery}&page=${page}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: SearchResult = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching UPC Database:', error);
    return null;
  }
}

/**
 * Save a new product to UPC Database (for contributing back)
 * @param upc The UPC/EAN code
 * @param productData Product information to save
 * @returns Success status
 */
export async function saveToUPCDatabase(
  upc: string,
  productData: {
    title: string;
    description?: string;
    alias?: string;
    brand?: string;
    manufacturer?: string;
    asin?: string;
    msrp?: string;
    category?: string;
    mpn?: string;
  }
): Promise<boolean> {
  if (!API_KEY) {
    console.error('UPC Database API key not configured');
    return false;
  }

  try {
    const formData = new FormData();

    // Add required fields
    formData.append('title', productData.title);

    // Add optional fields if provided
    if (productData.description) formData.append('description', productData.description);
    if (productData.alias) formData.append('alias', productData.alias);
    if (productData.brand) formData.append('brand', productData.brand);
    if (productData.manufacturer) formData.append('manufacturer', productData.manufacturer);
    if (productData.asin) formData.append('asin', productData.asin);
    if (productData.msrp) formData.append('msrp', productData.msrp);
    if (productData.category) formData.append('category', productData.category);
    if (productData.mpn) formData.append('mpn', productData.mpn);

    const response = await fetch(`${API_URL}/product/${upc}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error saving to UPC Database:', error);
    return false;
  }
}

/**
 * Convert UPC Database product to our internal format
 */
export function convertUPCDatabaseToProduct(upcData: UPCDatabaseProduct) {
  if (!upcData.barcode || !upcData.title) {
    return null;
  }

  // Parse MSRP to get price, default to 0 if not available
  let price = 0;
  if (upcData.msrp) {
    const parsed = parseFloat(upcData.msrp);
    if (!isNaN(parsed)) {
      price = parsed;
    }
  }

  // Try to find the best price from stores if MSRP not available
  if (price === 0 && upcData.stores && upcData.stores.length > 0) {
    const prices = upcData.stores
      .map(store => parseFloat(store.price))
      .filter(p => !isNaN(p));

    if (prices.length > 0) {
      price = Math.min(...prices); // Use the lowest price
    }
  }

  return {
    upc: upcData.barcode,
    name: upcData.title,
    description: upcData.description || upcData.alias || '',
    brand: upcData.brand || '',
    manufacturer: upcData.manufacturer || '',
    category: upcData.category || '',
    price: price,
    msrp: upcData.msrp ? parseFloat(upcData.msrp) : price,
    images: upcData.images || [],
    // Additional metadata that might be useful
    metadata: {
      asin: upcData.asin,
      mpn: upcData.mpn,
      size: upcData.metadata?.size,
      color: upcData.metadata?.color,
      weight: upcData.metadata?.weight,
      quantity: upcData.metadata?.quantity
    }
  };
}