// EAN-DB API Integration

interface BarcodeDetails {
  type: string;
  description: string;
  country: string;
}

interface Category {
  id: string;
  titles: {
    [lang: string]: string;
  };
}

interface Manufacturer {
  id: string;
  titles: {
    [lang: string]: string;
  };
  wikidataId?: string;
}

interface ProductImage {
  url: string;
}

interface EANDBProduct {
  barcode: string;
  barcodeDetails?: BarcodeDetails;
  titles?: {
    [lang: string]: string;
  };
  categories?: Category[];
  manufacturer?: Manufacturer;
  relatedBrands?: any[];
  images?: ProductImage[];
  metadata?: {
    [key: string]: any;
  };
}

interface EANDBResponse {
  balance: number;
  product?: EANDBProduct;
  error?: string;
  message?: string;
}

const JWT_TOKEN = process.env.EANDB_JWT;
const API_URL = process.env.EANDB_API_URL || 'https://ean-db.com/api/v2';

/**
 * Fetch product information from EAN-DB API
 * @param barcode The UPC/EAN code to look up
 * @returns Product information or null if not found
 */
export async function fetchProductFromEANDB(barcode: string): Promise<EANDBProduct | null> {
  if (!JWT_TOKEN) {
    console.error('EAN-DB JWT token not configured');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/product/${barcode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Product not found
      }
      if (response.status === 401) {
        console.error('EAN-DB API authentication failed - check JWT token');
        return null;
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: EANDBResponse = await response.json();

    if (!data.product) {
      return null;
    }

    return data.product;
  } catch (error) {
    console.error('Error fetching from EAN-DB:', error);
    return null;
  }
}

/**
 * Get account balance from EAN-DB
 */
export async function getEANDBBalance(): Promise<number | null> {
  if (!JWT_TOKEN) {
    console.error('EAN-DB JWT token not configured');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/account`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.balance || null;
  } catch (error) {
    console.error('Error fetching EAN-DB balance:', error);
    return null;
  }
}

/**
 * Convert EAN-DB product to our internal format
 */
export function convertEANDBToProduct(eanData: EANDBProduct) {
  if (!eanData.barcode) {
    return null;
  }

  // Get the product title (prefer English, fallback to any available language)
  let productName = '';
  if (eanData.titles) {
    productName = eanData.titles['en'] || eanData.titles['us'] || Object.values(eanData.titles)[0] || '';
  }

  if (!productName) {
    return null;
  }

  // Get manufacturer name
  let manufacturerName = '';
  if (eanData.manufacturer && eanData.manufacturer.titles) {
    manufacturerName = eanData.manufacturer.titles['en'] ||
                      eanData.manufacturer.titles['us'] ||
                      Object.values(eanData.manufacturer.titles)[0] || '';
  }

  // Get category
  let category = '';
  if (eanData.categories && eanData.categories.length > 0) {
    const firstCategory = eanData.categories[0];
    if (firstCategory.titles) {
      category = firstCategory.titles['en'] ||
                firstCategory.titles['us'] ||
                Object.values(firstCategory.titles)[0] || '';
    }
  }

  // Get first image URL if available
  let imageUrl = '';
  if (eanData.images && eanData.images.length > 0) {
    imageUrl = eanData.images[0].url;
  }

  return {
    upc: eanData.barcode,
    name: productName,
    manufacturer: manufacturerName,
    category: category,
    brand: manufacturerName, // Use manufacturer as brand
    imageUrl: imageUrl,
    // Note: EAN-DB doesn't provide pricing information
    // Price will need to be entered manually
    price: 0,
    metadata: {
      country: eanData.barcodeDetails?.country,
      barcodeType: eanData.barcodeDetails?.type,
      ...eanData.metadata
    }
  };
}

/**
 * Search for products (Note: EAN-DB doesn't have a search endpoint, this is for compatibility)
 * @deprecated EAN-DB doesn't support search, only direct barcode lookup
 */
export async function searchEANDB(query: string): Promise<null> {
  console.warn('EAN-DB does not support search functionality, only direct barcode lookup');
  return null;
}