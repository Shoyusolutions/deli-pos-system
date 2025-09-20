'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, Package, X, Plus, ShoppingCart } from 'lucide-react';
import OnScreenNumpad from '@/components/OnScreenNumpad';
import OnScreenKeyboard from '@/components/OnScreenKeyboard';

interface Product {
  _id?: string;
  upc: string;
  name: string;
  price: number;
  inventory: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const [paymentMode, setPaymentMode] = useState<'idle' | 'payment' | 'cash' | 'card' | 'success' | 'change'>('idle');
  const [cashGiven, setCashGiven] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [showCashNumpad, setShowCashNumpad] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [showCardConfirmation, setShowCardConfirmation] = useState(false);

  // Store settings
  const [storeSettings, setStoreSettings] = useState<any>(null);

  // Scanner and manual entry states
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualUpc, setManualUpc] = useState('');
  const [scanBuffer, setScanBuffer] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [notFoundUpc, setNotFoundUpc] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  // Mobile scan feedback overlay
  const [scanFeedback, setScanFeedback] = useState<{show: boolean, product?: Product, message?: string}>({show: false});
  const scanFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile scan feedback functions
  const showScanFeedback = (product?: Product, message?: string) => {
    // Clear any existing timeout
    if (scanFeedbackTimeoutRef.current) {
      clearTimeout(scanFeedbackTimeoutRef.current);
    }

    setScanFeedback({ show: true, product, message });

    // Auto-dismiss after 3 seconds
    scanFeedbackTimeoutRef.current = setTimeout(() => {
      setScanFeedback({ show: false });
    }, 3000);
  };

  const dismissScanFeedback = () => {
    if (scanFeedbackTimeoutRef.current) {
      clearTimeout(scanFeedbackTimeoutRef.current);
    }
    setScanFeedback({ show: false });
  };

  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductPriceDisplay, setNewProductPriceDisplay] = useState('');
  const [newProductSupplier, setNewProductSupplier] = useState('');
  const [newProductCost, setNewProductCost] = useState('');
  const [newProductCostDisplay, setNewProductCostDisplay] = useState('');
  const [showManualKeyIn, setShowManualKeyIn] = useState(false);
  const [showNewProductNameKeyboard, setShowNewProductNameKeyboard] = useState(false);
  const [showNewProductPriceNumpad, setShowNewProductPriceNumpad] = useState(false);
  const [showNewProductCostNumpad, setShowNewProductCostNumpad] = useState(false);
  const [showNewSupplierKeyboard, setShowNewSupplierKeyboard] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');
  const [showManualNameKeyboard, setShowManualNameKeyboard] = useState(false);
  const [showManualPriceNumpad, setShowManualPriceNumpad] = useState(false);
  const [lookingUpProduct, setLookingUpProduct] = useState(false);
  const [upcDatabaseProduct, setUpcDatabaseProduct] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [similarProduct, setSimilarProduct] = useState<any>(null);
  const [showSimilarProductDialog, setShowSimilarProductDialog] = useState(false);
  const [showCashConfirmation, setShowCashConfirmation] = useState(false);
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Helper function to handle price input changes
  const handlePriceInput = (inputValue: string, setPriceState: (val: string) => void, setDisplayState: (val: string) => void) => {
    // Remove all non-numeric characters
    const cleanValue = inputValue.replace(/\D/g, '');

    if (!cleanValue) {
      setPriceState('');
      setDisplayState('');
      return;
    }

    // Store the raw cents value
    setPriceState(cleanValue);

    // Convert to dollars and display
    const numValue = parseInt(cleanValue) || 0;
    const dollars = (numValue / 100).toFixed(2);
    setDisplayState(dollars);
  };

  // Load store ID and cart from localStorage on mount
  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (!savedStoreId) {
      router.push('/stores');
    } else {
      setStoreId(savedStoreId);

      // Load saved cart for this store
      const savedCart = localStorage.getItem(`cart_${savedStoreId}`);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
        } catch (error) {
          console.error('Error loading saved cart:', error);
          localStorage.removeItem(`cart_${savedStoreId}`);
        }
      }

      // Load store settings
      fetchStoreSettings(savedStoreId);
      // Load suppliers
      fetchSuppliers(savedStoreId);
    }
  }, [router]);

  // Fetch store settings
  const fetchStoreSettings = async (storeId: string) => {
    try {
      const response = await fetch(`/api/store-settings?storeId=${storeId}`);
      if (response.ok) {
        const settings = await response.json();
        setStoreSettings(settings);
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
      // Use defaults if settings can't be fetched
      setStoreSettings({
        taxEnabled: true,
        taxRate: 8.0,
        taxName: 'Sales Tax',
        cashDiscountEnabled: false,
        cashDiscountRate: 4.0
      });
    }
  };

  // Fetch suppliers (from both suppliers collection and existing product suppliers)
  const fetchSuppliers = async (storeId: string) => {
    try {
      // Get suppliers from suppliers collection
      const suppliersResponse = await fetch(`/api/suppliers?storeId=${storeId}`);
      let suppliersList = [];
      if (suppliersResponse.ok) {
        suppliersList = await suppliersResponse.json();
      }

      // Get unique supplier names from products
      const productsResponse = await fetch(`/api/products?storeId=${storeId}`);
      if (productsResponse.ok) {
        const products = await productsResponse.json();
        const productSuppliers = [...new Set(products
          .map((p: any) => p.supplierName)
          .filter((name: string) => name && name.trim() !== '')
        )];

        // Combine and deduplicate suppliers
        const allSupplierNames = new Set([
          ...suppliersList.map((s: any) => s.name),
          ...productSuppliers
        ]);

        // Add common default suppliers if the list is empty
        const defaultSuppliers = ['Walmart', 'Costco', 'Amazon', 'Local Distributor', 'Direct from Manufacturer'];
        if (allSupplierNames.size === 0) {
          defaultSuppliers.forEach(name => allSupplierNames.add(name));
        }

        // Convert to array format expected by the dropdown
        const combinedSuppliers = Array.from(allSupplierNames).sort().map(name => ({
          _id: name,
          name: name
        }));

        setSuppliers(combinedSuppliers);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      // Set default suppliers on error
      const defaultSuppliers = ['Walmart', 'Costco', 'Amazon', 'Local Distributor', 'Direct from Manufacturer'];
      setSuppliers(defaultSuppliers.map(name => ({ _id: name, name })));
    }
  };

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (storeId && cart.length > 0) {
      localStorage.setItem(`cart_${storeId}`, JSON.stringify(cart));
    } else if (storeId && cart.length === 0) {
      // Remove cart from localStorage when empty
      localStorage.removeItem(`cart_${storeId}`);
    }
  }, [cart, storeId]);

  // Global scanner capture
  useEffect(() => {
    if (paymentMode !== 'idle' || showManualEntry) return;

    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Ignore keypresses when user is typing in form inputs
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
        return;
      }

      // Check if we should block scanning
      if (notFoundUpc || showManualKeyIn || showAddProduct) {
        // If it looks like a scan attempt (numbers or Enter with buffer)
        if ((e.key >= '0' && e.key <= '9') || (e.key === 'Enter' && scanBuffer.length > 0)) {
          e.preventDefault();
          // Flash the screen red
          setScreenFlash(true);
          setTimeout(() => setScreenFlash(false), 500);
          // Show alert message
          setMessage('⚠️ Please add product details before scanning next item');
          setTimeout(() => setMessage(''), 3000);
          // Clear any partial scan buffer
          setScanBuffer('');
          setIsScanning(false);
        }
        return;
      }

      // Build up the scan buffer for numbers
      if (e.key >= '0' && e.key <= '9') {
        setScanBuffer(prev => {
          const newBuffer = prev + e.key;
          setIsScanning(true);

          // Clear previous timeout
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
          }

          // Set new timeout - scanner typically sends all digits quickly
          scanTimeoutRef.current = setTimeout(() => {
            setScanBuffer('');
            setIsScanning(false);
          }, 100);

          return newBuffer;
        });
      } else if (e.key === 'Enter' && scanBuffer.length > 0) {
        // Scanner pressed enter after UPC
        e.preventDefault();
        handleScanComplete(scanBuffer);
        setScanBuffer('');
        setIsScanning(false);
      }
    };

    document.addEventListener('keypress', handleGlobalKeyPress);
    return () => {
      document.removeEventListener('keypress', handleGlobalKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [paymentMode, showManualEntry, scanBuffer, storeId, notFoundUpc, showManualKeyIn, showAddProduct, message]);

  const handleScanComplete = async (upc: string) => {
    if (!upc || !storeId) return;

    // Prevent scanning if there's an unresolved not found product
    if (notFoundUpc) {
      // Flash the screen red
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 500);

      // Show alert message temporarily
      setMessage('⚠️ Please add product details before scanning next item');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch(`/api/products?upc=${upc}&storeId=${storeId}`);

      if (response.ok) {
        const product = await response.json();

        // Check inventory levels
        const existingItem = cart.find(item => item.product.upc === product.upc);
        const currentCartQuantity = existingItem ? existingItem.quantity : 0;
        const newQuantity = currentCartQuantity + 1;

        // Check if there's enough inventory
        if (product.inventory !== undefined && product.inventory <= 0) {
          // Zero inventory - show warning but allow sale
          setMessage(`⚠️ OUT OF STOCK: ${product.name} (Inventory: 0) - OVERRIDE SALE`);

          // Still add to cart but with warning
          if (existingItem) {
            setCart(cart.map(item =>
              item.product.upc === product.upc
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ));
          } else {
            setCart([...cart, { product, quantity: 1 }]);
          }
          // Show mobile scan feedback
          showScanFeedback(product, 'OUT OF STOCK - OVERRIDE SALE');
        } else if (product.inventory !== undefined && newQuantity > product.inventory) {
          // Not enough inventory - show warning
          setMessage(`⚠️ LOW STOCK: Only ${product.inventory} left, selling ${newQuantity} - ${product.name}`);

          // Still add to cart
          if (existingItem) {
            setCart(cart.map(item =>
              item.product.upc === product.upc
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ));
          } else {
            setCart([...cart, { product, quantity: 1 }]);
          }
          // Show mobile scan feedback
          showScanFeedback(product, `LOW STOCK: ${product.inventory} left`);
        } else {
          // Normal add to cart
          if (existingItem) {
            setCart(cart.map(item =>
              item.product.upc === product.upc
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ));
          } else {
            setCart([...cart, { product, quantity: 1 }]);
          }
          setMessage(`✓ Added: ${product.name} - $${product.price.toFixed(2)}`);
          // Show mobile scan feedback
          showScanFeedback(product);
        }

        setNotFoundUpc('');
        setTimeout(() => setMessage(''), 7000);
      } else {
        // Product not found - check for similar products
        await checkForSimilarProducts(upc);
        setMessage(''); // Clear any existing message
      }
    } catch (error) {
      setMessage('Error fetching product');
      console.error('Error:', error);
    }
  };

  const checkForSimilarProducts = async (upc: string) => {
    if (!storeId) return;

    try {
      // Get all products and check for similar UPCs
      const response = await fetch(`/api/products?storeId=${storeId}`);
      if (response.ok) {
        const allProducts = await response.json();

        // Check for products where:
        // 1. One UPC contains the other (extra/missing digits)
        // 2. Last 12 digits match (standard UPC length)
        const similar = allProducts.find((product: any) => {
          // Check if one UPC contains the other
          if (product.upc.includes(upc) || upc.includes(product.upc)) {
            return true;
          }

          // Check if last 12 digits match (for UPCs with leading zeros)
          const upc1Last12 = product.upc.slice(-12);
          const upc2Last12 = upc.slice(-12);
          if (upc1Last12 === upc2Last12 && upc1Last12.length === 12) {
            return true;
          }

          // Check if removing leading zeros makes them match
          const upc1NoZeros = product.upc.replace(/^0+/, '');
          const upc2NoZeros = upc.replace(/^0+/, '');
          if (upc1NoZeros === upc2NoZeros) {
            return true;
          }

          return false;
        });

        if (similar) {
          // Found a similar product - ask user to confirm
          setSimilarProduct(similar);
          setNotFoundUpc(upc); // Store the scanned UPC for display
          setShowSimilarProductDialog(true);
        } else {
          // No similar products found - proceed with normal not found flow
          setNotFoundUpc(upc);
        }
      } else {
        // Error getting products - proceed with normal not found flow
        setNotFoundUpc(upc);
      }
    } catch (error) {
      console.error('Error checking for similar products:', error);
      setNotFoundUpc(upc);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUpc) return;

    await handleScanComplete(manualUpc);
    setManualUpc('');
    setShowManualEntry(false);
  };

  const handleManualKeyIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemName || !manualItemPrice) return;

    // Create a temporary product object (not saved to database)
    const tempProduct: Product = {
      _id: `manual_${Date.now()}`, // Temporary ID
      upc: `MANUAL_${Date.now()}`, // Temporary UPC
      name: manualItemName,
      price: parseFloat(manualItemPrice),
      inventory: 999 // Dummy inventory
    };

    // Add to cart
    setCart([...cart, { product: tempProduct, quantity: 1 }]);
    setMessage(`✓ Added: ${tempProduct.name} - $${tempProduct.price.toFixed(2)}`);

    // Reset states
    setShowManualKeyIn(false);
    setManualItemName('');
    setManualItemPrice('');
    setTimeout(() => setMessage(''), 7000);
  };

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !notFoundUpc || !storeId) return;

    try {
      // Convert cent-based values to dollars
      const priceInDollars = parseInt(newProductPrice) / 100;
      const costInDollars = newProductCost ? parseInt(newProductCost) / 100 : 0;

      // Create the product in the database
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          upc: notFoundUpc,
          name: newProductName,
          price: priceInDollars,
          cost: costInDollars,
          supplierId: '',
          supplierName: newProductSupplier || '',
          inventory: 100 // Default inventory
        })
      });

      if (response.ok) {
        const newProduct = await response.json();
        // Add to cart
        setCart([...cart, { product: newProduct, quantity: 1 }]);
        setMessage(`✓ Product created and added: ${newProduct.name} - $${newProduct.price.toFixed(2)}`);

        // Reset states
        setShowAddProduct(false);
        setNotFoundUpc('');
        setNewProductName('');
        setNewProductPrice('');
        setNewProductPriceDisplay('');
        setNewProductSupplier('');
        setNewProductCost('');
        setNewProductCostDisplay('');
        setShowNewSupplierInput(false);
        setNewSupplierName('');
        setTimeout(() => setMessage(''), 7000);
      } else {
        setMessage('Error creating product');
      }
    } catch (error) {
      setMessage('Error creating product');
      console.error('Error:', error);
    }
  };

  const updateQuantity = (upc: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.upc === upc) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeItem = (upc: string) => {
    setCart(cart.filter(item => item.product.upc !== upc));
  };

  const getSubtotal = () => {
    // Base subtotal (this is always the card price in cash discount model)
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getTax = () => {
    if (!storeSettings?.taxEnabled) return 0;
    const subtotal = getSubtotal();
    return subtotal * (storeSettings.taxRate / 100);
  };

  const getCashTotal = () => {
    // Cash price is the base price (no additional fees)
    return getSubtotal() + getTax();
  };

  const getCardTotal = () => {
    // Card price includes $0.30 fixed fee + 4% fee on both subtotal AND tax
    const baseTotal = getSubtotal() + getTax();

    if (storeSettings?.cashDiscountEnabled) {
      // Apply 4% to the entire amount (subtotal + tax) and add $0.30 fixed fee
      return baseTotal * (1 + storeSettings.cashDiscountRate / 100) + 0.30;
    }

    return baseTotal;
  };

  const getTotal = (paymentMethod?: 'cash' | 'card') => {
    if (paymentMethod === 'card') return getCardTotal();
    if (paymentMethod === 'cash') return getCashTotal();
    return getCashTotal(); // Default to cash price
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setMessage('Cart is empty');
      return;
    }
    setPaymentMode('payment');
  };

  const handleCashPayment = () => {
    setPaymentMode('cash');
    setCashGiven('');
    setShowCashNumpad(true);
  };

  const getCashDisplayAmount = () => {
    if (!cashGiven) return 0;
    const amount = parseFloat(cashGiven);
    return isNaN(amount) ? 0 : amount;
  };

  const handleCardPayment = () => {
    setPaymentMode('card');
    // Don't auto-complete - wait for user to confirm
  };

  const calculateChange = () => {
    const given = getCashDisplayAmount();
    const total = getTotal('cash');
    // Round to 2 decimal places to avoid floating point issues
    return Math.round((given - total) * 100) / 100;
  };

  const completeTransaction = async (method: 'cash' | 'card' = 'cash') => {
    try {
      setProcessingTransaction(true);

      // Create transaction record with price snapshot
      const itemsWithPricing = cart.map(item => {
        return {
          product: {
            ...item.product,
            price: item.product.price // Keep base price
          },
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity
        };
      });

      // Calculate the appropriate total
      const transactionTotal = method === 'card' ? getCardTotal() : getCashTotal();
      const processingFee = method === 'card' && storeSettings?.cashDiscountEnabled
        ? (getCashTotal() * storeSettings.cashDiscountRate / 100) + 0.30
        : 0;

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          items: itemsWithPricing,
          tax: getTax(),
          total: transactionTotal,
          processingFee,
          paymentMethod: method,
          cashGiven: method === 'cash' ? getCashDisplayAmount() : undefined
        })
      });

      if (response.ok) {
        const transaction = await response.json();

        // Show success message for card transactions
        if (method === 'card') {
          // Clear cart and reset states for card
          setCart([]);
          setCashGiven('');

          // Clear the saved cart from localStorage after successful checkout
          if (storeId) {
            localStorage.removeItem(`cart_${storeId}`);
          }

          setPaymentMode('success');
          setMessage(`✅ Transaction ${transaction.transactionNumber} completed successfully!`);
          setProcessingTransaction(false);
        } else {
          // For cash, don't clear anything - let user manually proceed from change screen
          setMessage(`✅ Transaction ${transaction.transactionNumber} completed!`);
          setProcessingTransaction(false);
        }
      } else {
        setMessage('Error completing transaction');
        setProcessingTransaction(false);
      }
    } catch (error) {
      console.error('Transaction error:', error);
      setMessage('Error completing transaction');
      setProcessingTransaction(false);
    }
  };

  const handleCashSubmit = () => {
    const change = calculateChange();
    // Use >= 0 to include exact amounts (change of 0)
    if (change < 0) {
      setMessage('Insufficient cash amount');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    // Show confirmation dialog and hide numpad
    setShowCashConfirmation(true);
    setShowCashNumpad(false);
  };

  const handleCashConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      const change = calculateChange();
      setChangeAmount(change);
      setPaymentMode('change');
      completeTransaction('cash');
    } else {
      // If user says "No", take them back to the cash payment screen
      setShowCashNumpad(true);
    }
    setShowCashConfirmation(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col relative">
      {/* Similar Product Found Dialog */}
      {showSimilarProductDialog && similarProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-yellow-500 mb-4">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-black mb-4">Similar Product Found</h2>

              <div className="text-left bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-black mb-2">
                  <span className="font-semibold">Scanned UPC:</span>
                  <span className="font-mono ml-2">{notFoundUpc || scanBuffer}</span>
                </p>
                <p className="text-sm text-black">
                  <span className="font-semibold">Found Product:</span>
                </p>
                <div className="mt-2 bg-white rounded p-3">
                  <p className="font-semibold text-black">{similarProduct.name}</p>
                  <p className="text-sm text-gray-600">UPC: {similarProduct.upc}</p>
                  <p className="text-sm text-black mt-1">Price: ${similarProduct.price.toFixed(2)}</p>
                  <p className="text-sm text-green-600">Stock: {similarProduct.inventory} units</p>
                </div>
              </div>

              <p className="text-black mb-6">
                Is this the product you're trying to scan?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    // Add the similar product to cart
                    const existingItem = cart.find(item => item.product.upc === similarProduct.upc);
                    if (existingItem) {
                      setCart(cart.map(item =>
                        item.product.upc === similarProduct.upc
                          ? { ...item, quantity: item.quantity + 1 }
                          : item
                      ));
                    } else {
                      setCart([...cart, { product: similarProduct, quantity: 1 }]);
                    }

                    setMessage(`✓ Added: ${similarProduct.name} - $${similarProduct.price.toFixed(2)}`);
                    setShowSimilarProductDialog(false);
                    setSimilarProduct(null);
                    setNotFoundUpc('');
                    setTimeout(() => setMessage(''), 7000);
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  Yes, Add This Product
                </button>

                <button
                  onClick={() => {
                    // Not the right product - proceed to add new product flow
                    setShowSimilarProductDialog(false);
                    setSimilarProduct(null);
                    setNotFoundUpc(scanBuffer || notFoundUpc);
                  }}
                  className="w-full border-2 border-gray-300 text-black py-3 rounded-lg hover:bg-gray-50 font-medium"
                >
                  No, This is Different
                </button>

                <button
                  onClick={() => {
                    // Cancel completely
                    setShowSimilarProductDialog(false);
                    setSimilarProduct(null);
                    setNotFoundUpc('');
                    setMessage('');
                  }}
                  className="w-full text-gray-500 underline hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Product Not Found Dialog */}
      {notFoundUpc && !showAddProduct && !showManualKeyIn && (
        <div className={`fixed inset-0 ${screenFlash ? 'bg-red-600 bg-opacity-50' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50 transition-colors duration-200`}>
          <div className={`bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative ${screenFlash ? 'animate-shake' : ''}`}>
            {/* Alert message when user tries to scan */}
            {message && message.includes('Please add product details') && (
              <div className="absolute -top-16 left-0 right-0 mx-4">
                <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">{message.replace('⚠️ ', '')}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-black mb-2">Product Not Found</h2>
              <p className="text-black mb-2">The scanned product is not in the system</p>
              <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded inline-block mb-6 text-black">UPC: {notFoundUpc}</p>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setLookingUpProduct(true);
                    try {
                      const response = await fetch(`/api/products/lookup?upc=${notFoundUpc}`);
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.product) {
                          // Auto-fill the form with API data
                          setNewProductName(data.product.name);
                          // EAN-DB doesn't provide pricing, so leave price empty
                          setNewProductPrice('');
                          // Don't auto-fill supplier
                          setNewProductSupplier('');
                          setUpcDatabaseProduct(data.product);
                          setShowAddProduct(true);
                        } else {
                          // Product not found in EAN-DB either
                          setShowAddProduct(true);
                        }
                      } else {
                        // API error, still allow manual entry
                        setShowAddProduct(true);
                      }
                    } catch (error) {
                      console.error('Error looking up product:', error);
                      setShowAddProduct(true);
                    } finally {
                      setLookingUpProduct(false);
                    }
                  }}
                  disabled={lookingUpProduct}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium text-lg disabled:bg-gray-400"
                >
                  {lookingUpProduct ? 'Looking up product...' : 'Add New Product to System'}
                </button>
                <button
                  onClick={() => {
                    setShowManualKeyIn(true);
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium text-lg"
                >
                  Add as Manual Item (One-time)
                </button>
                <button
                  onClick={() => {
                    setNotFoundUpc('');
                    setMessage('');
                  }}
                  className="w-full border-2 border-gray-300 text-black py-3 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && notFoundUpc && (
        <div className={`fixed inset-0 ${screenFlash ? 'bg-red-600 bg-opacity-50' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50 transition-colors duration-200`}>
          <div className={`bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 relative ${screenFlash ? 'animate-shake' : ''}`}>
            {/* Alert message when user tries to scan */}
            {message && message.includes('Please add product details') && (
              <div className="absolute -top-16 left-0 right-0 mx-4">
                <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">{message.replace('⚠️ ', '')}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">Add New Product</h3>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setNewProductName('');
                  setNewProductPrice('');
                  setNewProductPriceDisplay('');
                  setNewProductSupplier('');
                  setNewProductCost('');
                  setNewProductCostDisplay('');
                  setUpcDatabaseProduct(null);
                  setShowNewSupplierInput(false);
                  setNewSupplierName('');
                }}
                className="text-black hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {upcDatabaseProduct && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">✓ Product found in database!</p>
                <p className="text-xs text-green-700 mt-1">Product name has been auto-filled below</p>
              </div>
            )}
            <form onSubmit={handleAddNewProduct}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-black mb-1">UPC</label>
                <input
                  type="text"
                  value={notFoundUpc}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-black"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-black mb-1">Product Name *</label>
                <div
                  onClick={() => setShowNewProductNameKeyboard(true)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                >
                  <span className="text-black">{newProductName || <span className="text-gray-400">Tap to enter product name</span>}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Retail Price *</label>
                  <div
                    onClick={() => setShowNewProductPriceNumpad(true)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{newProductPriceDisplay ? `$${newProductPriceDisplay}` : <span className="text-gray-400">Tap to enter price</span>}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Tap to enter price</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Cost</label>
                  <div
                    onClick={() => setShowNewProductCostNumpad(true)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{newProductCostDisplay ? `$${newProductCostDisplay}` : <span className="text-gray-400">Tap to enter cost</span>}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Tap to enter cost</p>
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-black mb-1">Supplier/Source *</label>
                {showNewSupplierInput ? (
                  <div className="flex gap-2">
                    <div
                      onClick={() => setShowNewSupplierKeyboard(true)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                    >
                      <span className="text-black">{newSupplierName || <span className="text-gray-400">Tap to enter supplier name</span>}</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (newSupplierName && storeId) {
                          try {
                            // Save supplier to database
                            const response = await fetch('/api/suppliers', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                storeId,
                                name: newSupplierName
                              })
                            });

                            if (response.ok) {
                              const newSupplier = await response.json();
                              // Add to suppliers list
                              setSuppliers(prev => [...prev, { _id: newSupplier._id, name: newSupplier.name }].sort((a, b) => a.name.localeCompare(b.name)));
                              // Set as selected supplier
                              setNewProductSupplier(newSupplierName);
                              setShowNewSupplierInput(false);
                              setNewSupplierName('');
                            } else {
                              // If supplier already exists or error, just use the name
                              setNewProductSupplier(newSupplierName);
                              setShowNewSupplierInput(false);
                              setNewSupplierName('');
                            }
                          } catch (error) {
                            console.error('Error saving supplier:', error);
                            // Still use the supplier name even if save fails
                            setNewProductSupplier(newSupplierName);
                            setShowNewSupplierInput(false);
                            setNewSupplierName('');
                          }
                        }
                      }}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSupplierInput(false);
                        setNewSupplierName('');
                      }}
                      className="px-3 py-2 border border-gray-300 text-black text-sm rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={newProductSupplier}
                    onChange={(e) => {
                      if (e.target.value === 'add_new') {
                        setShowNewSupplierInput(true);
                        setNewSupplierName('');
                      } else {
                        setNewProductSupplier(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier.name}>
                        {supplier.name}
                      </option>
                    ))}
                    <option value="add_new" className="font-medium text-blue-600">
                      + Add New Supplier
                    </option>
                  </select>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add to Cart & System
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setNewProductName('');
                    setNewProductPrice('');
                    setNewProductPriceDisplay('');
                    setNewProductSupplier('');
                    setNewProductCost('');
                    setNewProductCostDisplay('');
                    setUpcDatabaseProduct(null);
                    setShowNewSupplierInput(false);
                    setNewSupplierName('');
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Item Modal (from not found) */}
      {showManualKeyIn && notFoundUpc && (
        <div className={`fixed inset-0 ${screenFlash ? 'bg-red-600 bg-opacity-50' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50 transition-colors duration-200`}>
          <div className={`bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 relative ${screenFlash ? 'animate-shake' : ''}`}>
            {/* Alert message when user tries to scan */}
            {message && message.includes('Please add product details') && (
              <div className="absolute -top-16 left-0 right-0 mx-4">
                <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">{message.replace('⚠️ ', '')}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">Add Manual Item</h3>
              <button
                onClick={() => {
                  setShowManualKeyIn(false);
                  setManualItemName('');
                  setManualItemPrice('');
                }}
                className="text-black hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-black mb-4">This will add a one-time item to the cart without saving it to the product database.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-1">Item Name *</label>
              <div
                onClick={() => setShowManualNameKeyboard(true)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
              >
                <span className="text-black">{manualItemName || <span className="text-gray-400">Tap to enter item name</span>}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-1">Price *</label>
              <div
                onClick={() => setShowManualPriceNumpad(true)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
              >
                <span className="text-black">{manualItemPrice ? `$${manualItemPrice}` : <span className="text-gray-400">Tap to enter price</span>}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (manualItemName && manualItemPrice) {
                    handleManualKeyIn({ preventDefault: () => {} } as React.FormEvent);
                    setNotFoundUpc('');
                  }
                }}
                disabled={!manualItemName || !manualItemPrice}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowManualKeyIn(false);
                  setManualItemName('');
                  setManualItemPrice('');
                }}
                className="px-4 py-2.5 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Keyboards for New Product Form */}
      {showNewProductNameKeyboard && (
        <OnScreenKeyboard
          value={newProductName}
          onChange={setNewProductName}
          onClose={() => setShowNewProductNameKeyboard(false)}
          onEnter={() => setShowNewProductNameKeyboard(false)}
          title="Enter Product Name"
          type="text"
        />
      )}

      {showNewProductPriceNumpad && (
        <OnScreenNumpad
          value={newProductPriceDisplay}
          onChange={(value) => {
            const cleanValue = value.replace(/\D/g, '');
            if (!cleanValue) {
              setNewProductPrice('');
              setNewProductPriceDisplay('');
              return;
            }
            setNewProductPrice(cleanValue);
            const numValue = parseInt(cleanValue) || 0;
            const dollars = (numValue / 100).toFixed(2);
            setNewProductPriceDisplay(dollars);
          }}
          onClose={() => setShowNewProductPriceNumpad(false)}
          onEnter={() => setShowNewProductPriceNumpad(false)}
          decimal={true}
          title="Enter Retail Price"
        />
      )}

      {showNewProductCostNumpad && (
        <OnScreenNumpad
          value={newProductCostDisplay}
          onChange={(value) => {
            const cleanValue = value.replace(/\D/g, '');
            if (!cleanValue) {
              setNewProductCost('');
              setNewProductCostDisplay('');
              return;
            }
            setNewProductCost(cleanValue);
            const numValue = parseInt(cleanValue) || 0;
            const dollars = (numValue / 100).toFixed(2);
            setNewProductCostDisplay(dollars);
          }}
          onClose={() => setShowNewProductCostNumpad(false)}
          onEnter={() => setShowNewProductCostNumpad(false)}
          decimal={true}
          title="Enter Cost"
        />
      )}

      {showNewSupplierKeyboard && (
        <OnScreenKeyboard
          value={newSupplierName}
          onChange={setNewSupplierName}
          onClose={() => setShowNewSupplierKeyboard(false)}
          onEnter={() => setShowNewSupplierKeyboard(false)}
          title="Enter Supplier Name"
          type="text"
        />
      )}

      {/* On-Screen Keyboard for Manual Item Name */}
      {showManualNameKeyboard && (
        <OnScreenKeyboard
          value={manualItemName}
          onChange={setManualItemName}
          onClose={() => setShowManualNameKeyboard(false)}
          onEnter={() => setShowManualNameKeyboard(false)}
          title="Enter Item Name"
          type="text"
        />
      )}

      {/* On-Screen Numpad for Manual Item Price */}
      {showManualPriceNumpad && (
        <OnScreenNumpad
          value={manualItemPrice}
          onChange={setManualItemPrice}
          onClose={() => setShowManualPriceNumpad(false)}
          onEnter={() => setShowManualPriceNumpad(false)}
          decimal={true}
          title="Enter Price"
        />
      )}

      {/* Payment Method Selection Modal */}
      {paymentMode === 'payment' && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold text-center mb-6 text-black">Select Payment Method</h2>

            {/* Order Summary - Show both cash and card prices */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-black">Subtotal</span>
                  <span className="font-medium text-black">${getSubtotal().toFixed(2)}</span>
                </div>
                {storeSettings?.taxEnabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-black">{storeSettings.taxName || 'Tax'} ({storeSettings.taxRate}%)</span>
                    <span className="font-medium text-black">${getTax().toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  {/* Cash Price */}
                  <div className="flex justify-between mb-2">
                    <span className="text-base font-semibold text-black">Cash Price</span>
                    <span className="text-lg font-bold text-black">${getCashTotal().toFixed(2)}</span>
                  </div>
                  {/* Regular Price */}
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-black">
                      Card Price
                    </span>
                    <span className="text-lg font-bold text-black">${getCardTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={handleCashPayment}
                className="bg-green-500 text-white p-6 rounded-xl hover:bg-green-600 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-4xl mb-2">💵</div>
                <div className="text-xl font-semibold">Cash</div>
              </button>
              <button
                onClick={handleCardPayment}
                className="bg-blue-500 text-white p-6 rounded-xl hover:bg-blue-600 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-4xl mb-2">💳</div>
                <div className="text-xl font-semibold">Card</div>
              </button>
            </div>

            <button
              onClick={() => setPaymentMode('idle')}
              className="w-full bg-gray-200 text-black py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-black">Point of Sale</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-black hover:text-black px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Fixed Height */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto p-4 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          <div className="lg:col-span-2 flex flex-col h-full">
            {/* Hide scanner section on mobile to save space */}
            {paymentMode === 'idle' && !showManualEntry && !notFoundUpc && (
              <div className="hidden sm:block bg-white rounded-xl shadow-sm p-2 sm:p-3 mb-3 flex-shrink-0">
                {/* Compact Scanner Status */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className="text-xs sm:text-sm text-black whitespace-nowrap">
                      {isScanning ? 'Scanning...' : 'Scanner ready'}
                    </span>
                    {isScanning && scanBuffer && (
                      <span className="text-xs font-mono text-black hidden sm:inline">{scanBuffer}</span>
                    )}
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        setShowManualEntry(true);
                        setTimeout(() => manualInputRef.current?.focus(), 100);
                      }}
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Keyboard className="w-3 sm:w-4 h-3 sm:h-4" />
                      <span className="hidden sm:inline">Enter UPC</span>
                      <span className="sm:hidden">UPC</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowManualKeyIn(true);
                      }}
                      className="text-xs sm:text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                      <span className="hidden sm:inline">Manual Item</span>
                      <span className="sm:hidden">Manual</span>
                    </button>
                  </div>
                </div>

                {/* Last Scanned Item Display - Responsive height */}
                <div className="h-[60px] sm:h-[70px] md:h-[80px] flex items-center justify-center px-2">
                  {message && message.includes('Added:') ? (
                    <div className="flex items-center gap-2 sm:gap-3 animate-fadeIn w-full">
                      <div className="text-green-600 flex-shrink-0">
                        <svg className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const parts = message.replace('✓ Added: ', '').split(' - $');
                          return (
                            <div>
                              <p className="text-sm sm:text-base font-semibold text-black truncate">{parts[0]}</p>
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg sm:text-xl font-bold text-green-600">${parts[1]}</span>
                                <span className="text-xs text-black">Added to cart</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-black">
                      <Package className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 mx-auto mb-1" />
                      <p className="text-xs sm:text-sm">Waiting for scan...</p>
                    </div>
                  )}
                </div>
              </div>
            )}


            {paymentMode === 'idle' && showManualKeyIn && !notFoundUpc && (
              <div className="bg-white p-4 rounded-xl shadow-sm mb-3 flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-black">Manual Item Entry</h3>
                  <button
                    onClick={() => {
                      setShowManualKeyIn(false);
                      setManualItemName('');
                      setManualItemPrice('');
                    }}
                    className="text-black hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-black mb-1">Item Name *</label>
                  <div
                    onClick={() => setShowManualNameKeyboard(true)}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{manualItemName || <span className="text-gray-400">Tap to enter item name</span>}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-black mb-1">Price *</label>
                  <div
                    onClick={() => setShowManualPriceNumpad(true)}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{manualItemPrice ? `$${manualItemPrice}` : <span className="text-gray-400">Tap to enter price</span>}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (manualItemName && manualItemPrice) {
                        handleManualKeyIn({ preventDefault: () => {} } as React.FormEvent);
                      }
                    }}
                    disabled={!manualItemName || !manualItemPrice}
                    className="flex-1 bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualKeyIn(false);
                      setManualItemName('');
                      setManualItemPrice('');
                    }}
                    className="px-4 py-2 text-black hover:text-black text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {paymentMode === 'idle' && showManualEntry && (
              <div className="bg-white p-4 rounded-xl shadow-sm mb-3 flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-black">Manual UPC Entry</h3>
                  <button
                    onClick={() => {
                      setShowManualEntry(false);
                      setManualUpc('');
                    }}
                    className="text-black hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleManualSubmit}>
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualUpc}
                    onChange={(e) => setManualUpc(e.target.value)}
                    placeholder="Enter UPC code"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualEntry(false);
                        setManualUpc('');
                      }}
                      className="px-4 py-2 text-black hover:text-black text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}


            {/* Cash Payment Interface */}
            {showCashNumpad && paymentMode === 'cash' && (
              <div className="fixed inset-0 bg-gray-50 z-[9999]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const amount = parseFloat(cashGiven) || 0;
                    const total = Math.round(getTotal('cash') * 100) / 100;
                    if (amount >= total) {
                      handleCashSubmit();
                    }
                  } else if (e.key === 'Escape') {
                    setShowCashNumpad(false);
                    setPaymentMode('payment');
                    setCashGiven('');
                  }
                }}
              >
                {/* Top Bar with Total and Actions */}
                <div className="bg-white border-b shadow-sm p-4">
                  <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <button
                      onClick={() => {
                        setShowCashNumpad(false);
                        setPaymentMode('payment');
                        setCashGiven('');
                      }}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      ← Back
                    </button>

                    <div className="text-center flex-1">
                      <div className="text-sm text-gray-500">Total Due</div>
                      <div className="text-5xl font-bold text-black">${getTotal('cash').toFixed(2)}</div>
                      <div className="text-lg text-gray-600 mt-1">
                        Cash Received: <span className="font-semibold text-black">${cashGiven || '0.00'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const amount = parseFloat(cashGiven) || 0;
                        const total = Math.round(getTotal('cash') * 100) / 100;
                        if (amount >= total) {
                          handleCashSubmit();
                        }
                      }}
                      className={`px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
                        parseFloat(cashGiven || '0') >= Math.round(getTotal('cash') * 100) / 100
                          ? 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={parseFloat(cashGiven || '0') < Math.round(getTotal('cash') * 100) / 100}
                    >
                      Confirm →
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex h-[calc(100vh-120px)] max-w-7xl mx-auto p-6 gap-6">
                  {/* Left Side - Quick Presets */}
                  <div className="w-80">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Cash</h3>

                    {/* Exact Amount - Special Button */}
                    <button
                      onClick={() => {
                        const exactAmount = getTotal('cash').toFixed(2);
                        setCashGiven(exactAmount);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-5 px-4 rounded-xl hover:from-green-600 hover:to-green-700 font-semibold text-lg mb-4 shadow-lg transform hover:scale-102 transition-all"
                    >
                      <div>Exact Amount</div>
                      <div className="text-2xl mt-1">${getTotal('cash').toFixed(2)}</div>
                    </button>

                    {/* Common Denominations */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { amount: '5.00', label: '$5' },
                        { amount: '10.00', label: '$10' },
                        { amount: '20.00', label: '$20' },
                        { amount: '50.00', label: '$50' },
                        { amount: '100.00', label: '$100' },
                        { amount: '200.00', label: '$200' }
                      ].map(({ amount, label }) => (
                        <button
                          key={amount}
                          onClick={() => setCashGiven(amount)}
                          className={`py-4 px-4 rounded-xl font-semibold text-xl transition-all transform hover:scale-105 ${
                            cashGiven === amount
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white text-gray-800 hover:bg-blue-50 border-2 border-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Side - Large Numpad */}
                  <div className="flex-1 max-w-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">Enter Custom Amount</h3>
                      <button
                        onClick={() => setCashGiven('')}
                        className="text-red-600 hover:text-red-700 font-medium px-3 py-1"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Amount Display */}
                    <div className="bg-white rounded-xl p-6 mb-6 text-center border-2 border-gray-200">
                      <div className="text-4xl font-bold text-black">
                        ${cashGiven || '0.00'}
                      </div>
                    </div>

                    {/* Large Numpad */}
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            const currentCents = cashGiven ? Math.round(parseFloat(cashGiven) * 100).toString() : '';
                            if (currentCents.length < 6) {
                              const newCents = currentCents + num;
                              const newDollars = (parseInt(newCents) / 100).toFixed(2);
                              setCashGiven(newDollars);
                            }
                          }}
                          className="h-20 text-2xl font-semibold bg-white hover:bg-gray-50 text-black rounded-xl border-2 border-gray-200 transition-all transform hover:scale-105 active:scale-95"
                        >
                          {num}
                        </button>
                      ))}

                      {/* Bottom Row */}
                      <button
                        onClick={() => {
                          const currentCents = cashGiven ? Math.round(parseFloat(cashGiven) * 100).toString() : '';
                          if (currentCents.length < 5) {
                            const newCents = currentCents + '00';
                            const newDollars = (parseInt(newCents) / 100).toFixed(2);
                            setCashGiven(newDollars);
                          }
                        }}
                        className="h-20 text-2xl font-semibold bg-white hover:bg-gray-50 text-black rounded-xl border-2 border-gray-200 transition-all transform hover:scale-105 active:scale-95"
                      >
                        00
                      </button>

                      <button
                        onClick={() => {
                          const currentCents = cashGiven ? Math.round(parseFloat(cashGiven) * 100).toString() : '';
                          if (currentCents.length < 6) {
                            const newCents = currentCents + '0';
                            const newDollars = (parseInt(newCents) / 100).toFixed(2);
                            setCashGiven(newDollars);
                          }
                        }}
                        className="h-20 text-2xl font-semibold bg-white hover:bg-gray-50 text-black rounded-xl border-2 border-gray-200 transition-all transform hover:scale-105 active:scale-95"
                      >
                        0
                      </button>

                      <button
                        onClick={() => {
                          if (cashGiven) {
                            const currentCents = Math.round(parseFloat(cashGiven) * 100).toString();
                            const newCents = currentCents.slice(0, -1);
                            const newDollars = newCents ? (parseInt(newCents) / 100).toFixed(2) : '0.00';
                            setCashGiven(newCents ? newDollars : '');
                          }
                        }}
                        className="h-20 text-2xl font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all transform hover:scale-105 active:scale-95"
                      >
                        ⌫
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cash Confirmation Modal */}
            {showCashConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-black mb-6">Confirm Cash Payment</h2>

                    <p className="text-lg text-black mb-4">Did the customer give you:</p>

                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-8">
                      <p className="text-5xl font-bold text-green-700">
                        ${getCashDisplayAmount().toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => handleCashConfirmation(false)}
                        className="flex-1 bg-red-500 text-white py-3 px-6 rounded-lg hover:bg-red-600 font-semibold text-lg"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleCashConfirmation(true)}
                        className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold text-lg"
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'change' && (
              <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
                  <div className="text-center">
                    {processingTransaction ? (
                      <>
                        <div className="mb-6">
                          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-4">Processing Transaction...</h2>
                        <p className="text-gray-600">Please wait</p>
                      </>
                    ) : (
                      <>
                        <div className="mb-6">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-4">Transaction Complete</h2>

                        <p className="text-lg text-green-600 font-semibold mb-6">{message}</p>

                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
                          <p className="text-lg text-black mb-2">Change Due</p>
                          <p className="text-5xl font-bold text-black">${changeAmount.toFixed(2)}</p>
                        </div>

                        <button
                          onClick={() => {
                            // Clear everything and return to main POS
                            setCart([]);
                            setPaymentMode('idle');
                            setCashGiven('');
                            setChangeAmount(0);
                            setMessage('');
                            if (storeId) {
                              localStorage.removeItem(`cart_${storeId}`);
                            }
                          }}
                          className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 text-lg font-medium"
                        >
                          Next Transaction
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'card' && (
              <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto">
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-6 text-black">Credit Card Payment</h2>

                    {/* Large total display */}
                    <div className="bg-blue-50 p-6 rounded-xl mb-6">
                      <p className="text-lg text-black mb-2">Enter this amount on credit card machine:</p>
                      <p className="text-6xl font-bold text-blue-600">${getTotal('card').toFixed(2)}</p>
                      {storeSettings?.cashDiscountEnabled && (
                        <p className="text-sm text-black mt-2">Credit card price</p>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <p className="text-black font-medium">Process payment on credit card terminal</p>
                      <p className="text-sm text-black mt-1">Once payment is completed, click the button below</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setPaymentMode('payment')}
                        className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                      <button
                        onClick={() => setShowCardConfirmation(true)}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                      >
                        Payment Completed
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card Payment Confirmation Modal */}
            {showCardConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
                  <div className="text-center">
                    <div className="text-yellow-500 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-black mb-2">Confirm Payment</h3>
                    <p className="text-black mb-6">Are you sure you collected payment on the credit card machine?</p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCardConfirmation(false)}
                        className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium"
                      >
                        No, Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowCardConfirmation(false);
                          completeTransaction('card');
                        }}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
                      >
                        Yes, Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'success' && (
              <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-black mb-3">Transaction Complete!</h2>
                    <p className="text-lg text-green-600 font-semibold mb-6">{message}</p>

                    <button
                      onClick={() => {
                        setCart([]);
                        setPaymentMode('idle');
                        setCashGiven('');
                        setMessage('');
                      }}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
                    >
                      Next Transaction
                    </button>
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'idle' && (
              <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 300px)' }}>
              <div className="p-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-black">
                    Cart ({cart.reduce((total, item) => total + item.quantity, 0)} {cart.reduce((total, item) => total + item.quantity, 0) === 1 ? 'item' : 'items'})
                  </h3>
                  {cart.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear the cart?')) {
                          setCart([]);
                          // Also clear from localStorage
                          if (storeId) {
                            localStorage.removeItem(`cart_${storeId}`);
                          }
                          setMessage('Cart cleared');
                          setTimeout(() => setMessage(''), 2000);
                        }
                      }}
                      className="text-xs text-black hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                      disabled={paymentMode !== 'idle'}
                    >
                      Clear Cart
                    </button>
                  )}
                </div>
                {storeSettings?.cashDiscountEnabled && (
                  <p className="text-xs text-blue-600 mt-2">
                    Cash discount pricing active
                  </p>
                )}
              </div>
              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Package className="w-16 h-16 text-black mx-auto mb-3" />
                    <p className="text-black text-sm">Cart is empty</p>
                    <p className="text-black text-xs mt-1">Scan items to add to cart</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {cart.map((item) => {
                    // Use the base price (cash price in idle mode)
                    let displayPrice = item.product.price;

                    // Check inventory status
                    const hasInventoryIssue = item.product.inventory !== undefined && (
                      item.product.inventory <= 0 || item.quantity > item.product.inventory
                    );
                    const isOutOfStock = item.product.inventory !== undefined && item.product.inventory <= 0;

                    return (
                      <div key={item.product.upc} className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-100 transition-colors group ${
                        hasInventoryIssue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'
                      }`}>
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-black truncate" title={item.product.name}>
                              {item.product.name.length > 50
                                ? item.product.name.substring(0, 50) + '...'
                                : item.product.name}
                            </p>
                            {isOutOfStock && (
                              <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-semibold">OUT OF STOCK</span>
                            )}
                            {!isOutOfStock && hasInventoryIssue && (
                              <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded font-semibold">LOW STOCK</span>
                            )}
                          </div>
                          <p className="text-xs text-black">
                            UPC: {item.product.upc}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 mr-3">
                          <button
                            onClick={() => updateQuantity(item.product.upc, -1)}
                            className="w-7 h-7 rounded-full bg-white border border-gray-300 text-black hover:bg-gray-100 flex items-center justify-center text-sm shadow-sm"
                            disabled={paymentMode !== 'idle'}
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-black">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.upc, 1)}
                            className="w-7 h-7 rounded-full bg-white border border-gray-300 text-black hover:bg-gray-100 flex items-center justify-center text-sm shadow-sm"
                            disabled={paymentMode !== 'idle'}
                          >
                            +
                          </button>
                        </div>
                        <div className="text-sm font-bold text-black w-20 text-right mr-2">
                          ${(displayPrice * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => removeItem(item.product.upc)}
                          className="opacity-0 group-hover:opacity-100 text-black hover:text-red-500 transition-all p-1"
                          disabled={paymentMode !== 'idle'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Only show summary when idle */}
          {paymentMode === 'idle' && (
            <div className="lg:col-span-1 flex flex-col h-full">
              <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ height: 'fit-content' }}>
                {/* Summary Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-black">Order Summary</h3>
                </div>

                {/* Summary Content */}
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-black">Subtotal</span>
                      <span className="font-medium text-black">
                        ${getSubtotal().toFixed(2)}
                      </span>
                    </div>
                    {storeSettings?.taxEnabled && (
                      <div className="flex justify-between text-sm">
                        <span className="text-black">
                          {storeSettings.taxName || 'Tax'} ({storeSettings.taxRate}%)
                        </span>
                        <span className="font-medium text-black">
                          ${getTax().toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    {storeSettings?.cashDiscountEnabled ? (
                      <>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-black">
                              💵 Cash Price
                            </span>
                            <span className="text-xl font-bold text-black">
                              ${getCashTotal().toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-black">
                              💳 Card Price
                            </span>
                            <span className="text-xl font-bold text-black">
                              ${getCardTotal().toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-black">Total</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${getCashTotal().toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkout Button - Always Visible */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  {paymentMode === 'idle' ? (
                    <button
                      onClick={handleCheckout}
                      className="w-full bg-green-600 text-white py-3.5 rounded-lg hover:bg-green-700 font-semibold transition-all text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:bg-gray-300 disabled:shadow-none disabled:transform-none"
                      disabled={cart.length === 0}
                    >
                      {cart.length === 0 ? 'Cart Empty' : 'Checkout'}
                    </button>
                  ) : (
                    <div className="text-center text-sm text-black">
                      Processing payment...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Scan Feedback Overlay */}
      {scanFeedback.show && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 pointer-events-auto transform animate-scale-in"
            onClick={dismissScanFeedback}
          >
            <div className="text-center">
              {/* Success icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Product info */}
              {scanFeedback.product && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-black mb-2">
                    {scanFeedback.product.name}
                  </h3>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    ${scanFeedback.product.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-black">
                    {scanFeedback.message || 'Added to cart'}
                  </div>
                </div>
              )}

              {/* Tap to dismiss hint */}
              <div className="text-xs text-gray-500 mt-4">
                Tap to dismiss • Auto-dismiss in 3s
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}