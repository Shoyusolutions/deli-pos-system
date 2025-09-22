'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import OnScreenKeyboard from '@/components/OnScreenKeyboard';
import OnScreenNumpad from '@/components/OnScreenNumpad';

interface Product {
  _id?: string;
  upc: string;
  name: string;
  price: number;
  cost?: number;
  supplierId?: string;
  supplierName?: string;
  inventory: number;
}

interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

type ViewMode = 'menu' | 'view' | 'update' | 'add' | 'duplicates' | 'lowstock';

export default function InventoryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>('menu');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Inventory update mode states
  const [updateMode, setUpdateMode] = useState<'select' | 'add' | 'remove' | 'reconcile'>('select');
  const [reconcileCount, setReconcileCount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Form states for adding/updating
  const [upcInput, setUpcInput] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productPriceDisplay, setProductPriceDisplay] = useState('');
  const [productCost, setProductCost] = useState('');
  const [productCostDisplay, setProductCostDisplay] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Supplier states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');

  // Track products added in this session
  const [productsAdded, setProductsAdded] = useState(0);
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const [notFoundUpc, setNotFoundUpc] = useState<string>('');
  const [lookingUpUPC, setLookingUpUPC] = useState(false);
  const [upcDatabaseProduct, setUpcDatabaseProduct] = useState<any>(null);
  const [showProductConfirm, setShowProductConfirm] = useState(false);
  const [lastCheckedUPC, setLastCheckedUPC] = useState<string>('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState('');
  const [manualUpc, setManualUpc] = useState('');
  const [showReconcileNumpad, setShowReconcileNumpad] = useState(false);

  // On-screen keyboard states
  const [showNameKeyboard, setShowNameKeyboard] = useState(false);
  const [showPriceNumpad, setShowPriceNumpad] = useState(false);
  const [showCostNumpad, setShowCostNumpad] = useState(false);
  const [showQuantityNumpad, setShowQuantityNumpad] = useState(false);
  const [activeInputField, setActiveInputField] = useState<'name' | 'price' | 'cost' | 'quantity' | 'reconcile' | null>(null);
  // Edit mode on-screen inputs
  const [showEditNameKeyboard, setShowEditNameKeyboard] = useState(false);
  const [showEditPriceNumpad, setShowEditPriceNumpad] = useState(false);
  const [showEditCostNumpad, setShowEditCostNumpad] = useState(false);
  // Search field on-screen input
  const [showSearchKeyboard, setShowSearchKeyboard] = useState(false);
  // Supplier fields on-screen inputs
  const [showSupplierNameKeyboard, setShowSupplierNameKeyboard] = useState(false);
  const [showSupplierContactKeyboard, setShowSupplierContactKeyboard] = useState(false);
  const [showSupplierPhoneKeyboard, setShowSupplierPhoneKeyboard] = useState(false);
  const [showSupplierEmailKeyboard, setShowSupplierEmailKeyboard] = useState(false);

  // Duplicate management states
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<any>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'combine' | 'replace'>('combine');
  const [verificationMode, setVerificationMode] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [verifiedUpc, setVerifiedUpc] = useState<string>('');
  const [awaitingVerification, setAwaitingVerification] = useState<any>(null);
  const [scanAttempts, setScanAttempts] = useState<Array<{upc: string, valid: boolean}>>([]);

  const upcInputRef = useRef<HTMLInputElement>(null);
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scanBuffer, setScanBuffer] = useState('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (!savedStoreId) {
      router.push('/stores');
    } else {
      setStoreId(savedStoreId);
      if (mode === 'view') {
        fetchProducts(savedStoreId);
      } else if (mode === 'update') {
        // If we have a UPC pre-populated from the view page, search for it
        if (upcInput && !selectedProduct) {
          handleSearchProduct();
        }
        // Keep focus on UPC input when in update mode
        if (upcInputRef.current) {
          upcInputRef.current.focus();
        }
      } else if (mode === 'add') {
        // Fetch suppliers when in add mode
        fetchSuppliers(savedStoreId);
      } else if (mode === 'duplicates') {
        // Setup scanner for verification when in duplicates mode
        if (verificationMode) {
          // Scanner will be handled by global key handler
        }
      }
    }
  }, [mode, router, verificationMode]);

  // Auto-focus UPC input when component mounts or when returning to empty state
  useEffect(() => {
    if ((mode === 'update' || mode === 'add') && !selectedProduct && upcInputRef.current) {
      upcInputRef.current.focus();
    }
  }, [mode, selectedProduct]);

  // Listen for search trigger from scanner
  useEffect(() => {
    const handleTriggerSearch = () => {
      if (upcInput && mode === 'update') {
        handleSearchProduct();
      }
    };

    window.addEventListener('triggerSearch', handleTriggerSearch);
    return () => {
      window.removeEventListener('triggerSearch', handleTriggerSearch);
    };
  }, [upcInput, mode]);

  // Global keyboard listener for scanner input in update, view, add, and verification modes
  useEffect(() => {
    if (mode !== 'update' && mode !== 'view' && mode !== 'add' && !verificationMode) return;

    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // For Verification mode (handle first to take priority)
      if (verificationMode) {
        // Build up the scan buffer
        if (e.key >= '0' && e.key <= '9') {
          setScanBuffer(prev => {
            const newBuffer = prev + e.key;

            // Clear previous timeout
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
            }

            // Set new timeout
            scanTimeoutRef.current = setTimeout(() => {
              setScanBuffer('');
            }, 100);

            return newBuffer;
          });
        } else if (e.key === 'Enter' && scanBuffer.length > 0) {
          e.preventDefault();
          const scannedUpc = scanBuffer;

          // Check if it matches one of the duplicate UPCs
          if (awaitingVerification) {
            const isValidProduct = scannedUpc === awaitingVerification.product1.upc ||
                                  scannedUpc === awaitingVerification.product2.upc;

            // Add scan attempt to history
            const newAttempt = { upc: scannedUpc, valid: isValidProduct };
            const newAttempts = [...scanAttempts, newAttempt].slice(-3); // Keep only last 3 attempts
            setScanAttempts(newAttempts);

            if (isValidProduct) {
              // Check if all last 3 scans are valid and for the same product
              const lastThreeValid = newAttempts.length >= 3 &&
                                    newAttempts.slice(-3).every(a => a.valid && a.upc === scannedUpc);

              if (lastThreeValid) {
                // Successfully verified 3 times with same product
                const primary = scannedUpc === awaitingVerification.product1.upc
                  ? awaitingVerification.product1
                  : awaitingVerification.product2;
                const duplicate = scannedUpc === awaitingVerification.product1.upc
                  ? awaitingVerification.product2
                  : awaitingVerification.product1;

                // Perform merge with verified primary using combine_verified strategy
                mergeDuplicatesWithStrategy(primary, duplicate, 'combine_verified');

                // Reset verification state
                setVerificationMode(false);
                setScanCount(0);
                setVerifiedUpc('');
                setAwaitingVerification(null);
                setSelectedDuplicate(null);
                setScanAttempts([]);
                setMessage(`✅ Products and inventory merged successfully! Kept ${primary.name} (UPC: ${primary.upc})`);
                setTimeout(() => setMessage(''), 5000);
              } else {
                // Valid scan but not yet 3 in a row
                setVerifiedUpc(scannedUpc);
                const validCount = newAttempts.filter(a => a.valid && a.upc === scannedUpc).length;
                setScanCount(validCount);
              }
            } else {
              // Invalid product scanned - reset count but keep attempt history
              setScanCount(0);
              setVerifiedUpc('');
              setMessage('Invalid product scanned. Please scan one of the products being compared.');
              setTimeout(() => setMessage(''), 3000);
            }
          }

          setScanBuffer('');
        }
        return; // Don't process other modes when in verification
      }

      // For Update mode
      if (mode === 'update') {
        // Don't capture scanner input if we're in edit mode or typing in an input field
        if (editMode) return;

        // Check if user is typing in any input field
        const activeElement = document.activeElement;
        const isTypingInInput = activeElement &&
          (activeElement.tagName === 'INPUT' ||
           activeElement.tagName === 'TEXTAREA');

        if (isTypingInInput) return;

        // Always capture scanner input in update mode (when not editing or typing)
        if (e.key >= '0' && e.key <= '9') {
          // If we have a "product not found" message showing, clear it on first digit
          if (message.includes('Product not found') && scanBuffer.length === 0) {
            setMessage('');
            setUpcInput('');
          }

          // If we already have a product selected, start building new UPC
          if (selectedProduct) {
            setScanBuffer(prev => prev + e.key);

            // Clear previous timeout
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
            }

            // Set new timeout - scanner typically sends all digits quickly
            scanTimeoutRef.current = setTimeout(() => {
              setScanBuffer('');
            }, 100);
          } else if (document.activeElement !== upcInputRef.current) {
            // No product selected, focus the input
            if (upcInputRef.current) {
              upcInputRef.current.focus();
            }
          }
        } else if (e.key === 'Enter' && selectedProduct && scanBuffer.length > 0) {
          // We have a complete UPC from scanner while product is selected
          e.preventDefault();
          // Clear current product and search for new one
          setSelectedProduct(null);
          setUpcInput(scanBuffer);
          setScanBuffer('');
          // Trigger search by setting a flag
          setTimeout(() => {
            const searchEvent = new CustomEvent('triggerSearch');
            window.dispatchEvent(searchEvent);
          }, 50);
        } else if (e.key === 'Enter' && !selectedProduct && scanBuffer.length > 0) {
          // Handle case where we're scanning a new product when no product is selected
          // (including when "Product not found" is showing)
          e.preventDefault();
          setMessage('');
          setUpcInput(scanBuffer);
          setScanBuffer('');
          // Trigger search
          setTimeout(() => {
            const searchEvent = new CustomEvent('triggerSearch');
            window.dispatchEvent(searchEvent);
          }, 50);
        }
      }

      // For Add mode
      if (mode === 'add') {
        // If an existing product is shown, we need to handle scanner input differently
        if (existingProduct) {
          // Start building new scan buffer when numbers are typed
          if (e.key >= '0' && e.key <= '9') {
            // Clear the existing product warning immediately on first digit
            if (scanBuffer.length === 0) {
              setExistingProduct(null);
              setMessage('');
              setUpcInput('');
            }
            setScanBuffer(prev => prev + e.key);

            // Clear previous timeout
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
            }

            // Set new timeout - scanner typically sends all digits quickly
            scanTimeoutRef.current = setTimeout(() => {
              setScanBuffer('');
            }, 100);
          } else if (e.key === 'Enter' && scanBuffer.length > 0) {
            // Scanner pressed enter after UPC
            e.preventDefault();
            const newUpc = scanBuffer;
            setUpcInput(newUpc);
            setScanBuffer('');
            // Check the new product
            setTimeout(() => {
              checkExistingProduct(newUpc);
            }, 50);
          }
        } else {
          // Normal behavior when no existing product is shown
          if (
            document.activeElement !== upcInputRef.current &&
            (e.key >= '0' && e.key <= '9') // Scanner typically sends numbers
          ) {
            // Focus the UPC input and let it capture the keystroke
            if (upcInputRef.current) {
              upcInputRef.current.focus();
            }
          }
        }
      }

      // For View mode - capture scanner input globally
      if (mode === 'view') {
        // Don't capture if already typing in search box
        if (document.activeElement === searchInputRef.current) return;

        // Build up the scan buffer
        if (e.key >= '0' && e.key <= '9') {
          setScanBuffer(prev => prev + e.key);

          // Clear previous timeout
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
          }

          // Set new timeout - scanner typically sends all digits quickly
          scanTimeoutRef.current = setTimeout(() => {
            setScanBuffer('');
          }, 100);
        } else if (e.key === 'Enter' && scanBuffer.length > 0) {
          // Scanner pressed enter after UPC
          e.preventDefault();
          const scannedUpc = scanBuffer;
          setSearchTerm(scannedUpc);
          setScanBuffer('');
          if (searchInputRef.current) {
            searchInputRef.current.value = scannedUpc;
          }
          // Check if this UPC exists in products
          const productExists = products.some(p => p.upc === scannedUpc);
          if (!productExists && scannedUpc.length > 0) {
            setNotFoundUpc(scannedUpc);
          } else {
            setNotFoundUpc('');
          }
        }
      }
    };

    document.addEventListener('keypress', handleGlobalKeyPress);
    return () => {
      document.removeEventListener('keypress', handleGlobalKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [mode, selectedProduct, scanBuffer, storeId, editMode, existingProduct, products, verificationMode, awaitingVerification, verifiedUpc, scanCount]);

  const fetchProducts = async (storeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      setMessage('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async (storeId: string) => {
    try {
      const response = await fetch(`/api/suppliers?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName || !storeId) {
      setMessage('Supplier name is required');
      return;
    }

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          name: newSupplierName,
          contactPerson: newSupplierContact,
          phone: newSupplierPhone,
          email: newSupplierEmail
        })
      });

      if (response.ok) {
        const newSupplier = await response.json();
        setSuppliers([...suppliers, newSupplier]);
        setSelectedSupplierId(newSupplier._id);
        setShowAddSupplier(false);
        setNewSupplierName('');
        setNewSupplierContact('');
        setNewSupplierPhone('');
        setNewSupplierEmail('');
        setMessage('Supplier added successfully');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Error adding supplier');
      }
    } catch (error) {
      setMessage('Error adding supplier');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't allow submission if product already exists
    if (existingProduct) {
      setErrorModalMessage('Product already exists. Please update stock or add a different product.');
      setShowErrorModal(true);
      return;
    }

    if (!upcInput || !productName || !productPrice || !productCost || !selectedSupplierId) {
      setErrorModalMessage('Please fill all required fields');
      setShowErrorModal(true);
      return;
    }

    const selectedSupplier = suppliers.find(s => s._id === selectedSupplierId);
    if (!selectedSupplier) {
      setErrorModalMessage('Please select a valid supplier');
      setShowErrorModal(true);
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          upc: upcInput,
          name: productName,
          price: productPrice ? parseFloat(productPrice) : 0,
          cost: productCost ? parseFloat(productCost) : 0,
          supplierId: selectedSupplierId,
          supplierName: selectedSupplier.name,
          inventory: parseInt(quantityInput) || 0
        })
      });

      if (response.ok) {
        // Quick success feedback
        setMessage('✓ Product added');
        setProductsAdded(prev => prev + 1);

        // Reset form immediately
        resetForm();
        setShowManualAdd(false);

        // Clear message quickly
        setTimeout(() => {
          setMessage('');
        }, 500);

        // Focus on ready for next scan immediately
        if (upcInputRef.current) {
          upcInputRef.current.focus();
        }
      } else {
        const error = await response.json();
        setErrorModalMessage(error.error || 'Error adding product');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorModalMessage('Error adding product');
      setShowErrorModal(true);
    }
  };

  const handleUpdateProductDetails = async () => {
    if (!selectedProduct || !storeId) return;

    try {
      // Validate and prepare the update data
      const updateData: any = {};

      // Only update name if it's different and not empty
      if (editName && editName !== selectedProduct.name) {
        updateData.name = editName;
      } else {
        updateData.name = selectedProduct.name;
      }

      // Only update price if it's a valid number
      const priceValue = parseFloat(editPrice);
      if (!isNaN(priceValue) && priceValue >= 0) {
        updateData.price = priceValue;
      } else {
        updateData.price = selectedProduct.price;
      }

      // Only update cost if it's a valid number
      if (editCost) {
        const costValue = parseFloat(editCost);
        if (!isNaN(costValue) && costValue >= 0) {
          updateData.cost = costValue;
        } else if (selectedProduct.cost) {
          updateData.cost = selectedProduct.cost;
        }
      } else if (selectedProduct.cost) {
        updateData.cost = selectedProduct.cost;
      }

      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          upc: selectedProduct.upc,
          updateDetails: updateData
        })
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setSelectedProduct(updatedProduct);
        setMessage(`✓ Product details updated successfully`);
        setEditMode(false);
        setEditPrice('');
        setEditName('');
        setEditCost('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Error updating product details');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setMessage('Error updating product details');
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (updateMode === 'reconcile') {
      // Handle reconcile mode
      if (!selectedProduct || !reconcileCount) {
        setMessage('Please enter physical count');
        return;
      }

      const physicalCount = parseInt(reconcileCount);
      const discrepancy = physicalCount - selectedProduct.inventory;

      // If there's a discrepancy and no reason provided, require a reason
      if (discrepancy !== 0 && !adjustmentReason) {
        setMessage('Please select a reason for the discrepancy');
        return;
      }

      try {
        // Update inventory to match physical count
        const inventoryResponse = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            upc: selectedProduct.upc,
            setInventory: physicalCount // Use setInventory for absolute value
          })
        });

        if (inventoryResponse.ok) {
          const updatedProduct = await inventoryResponse.json();

          // If there's a discrepancy, record the adjustment
          if (discrepancy !== 0) {
            await fetch('/api/inventory-adjustments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storeId,
                productUpc: selectedProduct.upc,
                productName: selectedProduct.name,
                previousCount: selectedProduct.inventory,
                newCount: physicalCount,
                discrepancy: discrepancy,
                reason: adjustmentReason,
                timestamp: new Date()
              })
            });
          }

          // Show appropriate message based on discrepancy
          if (discrepancy === 0) {
            setMessage(`✓ Inventory verified: ${selectedProduct.name} has ${physicalCount} units (no discrepancy)`);
          } else if (discrepancy < 0) {
            setMessage(`⚠️ Inventory adjusted: ${selectedProduct.name} - Missing ${Math.abs(discrepancy)} units (${adjustmentReason})`);
          } else {
            setMessage(`✓ Inventory adjusted: ${selectedProduct.name} - Found ${discrepancy} extra units (${adjustmentReason})`);
          }

          setProducts(products.map(p =>
            p.upc === selectedProduct.upc ? updatedProduct : p
          ));

          // Reset form for next item
          setReconcileCount('');
          setAdjustmentReason('');
          setSelectedProduct(null);
          setUpcInput('');

          // Focus back on UPC input
          setTimeout(() => {
            if (upcInputRef.current) {
              upcInputRef.current.focus();
            }
          }, 100);

          // Clear message after 5 seconds
          setTimeout(() => setMessage(''), 5000);
        }
      } catch (error) {
        setMessage('Error reconciling inventory');
      }
    } else {
      // Handle add/remove mode
      if (!selectedProduct || !quantityInput) {
        setMessage('Please enter quantity');
        return;
      }

      const quantity = parseInt(quantityInput);
      const adjustedQuantity = updateMode === 'remove' ? -quantity : quantity;

      try {
        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            upc: selectedProduct.upc,
            addInventory: adjustedQuantity
          })
        });

        if (response.ok) {
          const updatedProduct = await response.json();
          const action = updateMode === 'add' ? 'Added' : 'Removed';
          setMessage(`✓ ${action} ${Math.abs(adjustedQuantity)} units. ${selectedProduct.name} now has ${updatedProduct.inventory} in stock`);
          setProducts(products.map(p =>
            p.upc === selectedProduct.upc ? updatedProduct : p
          ));

          // Reset form for next scan
          setQuantityInput('');
          setSelectedProduct(null);
          setUpcInput('');
          setProductName('');
          setProductPrice('');
          setProductPriceDisplay('');
          setProductCostDisplay('');

          // Focus back on UPC input for next scan
          setTimeout(() => {
            if (upcInputRef.current) {
              upcInputRef.current.focus();
            }
          }, 100);

          // Clear success message after 3 seconds
          setTimeout(() => setMessage(''), 3000);
        }
      } catch (error) {
        setMessage('Error updating stock');
      }
    }
  };

  const handleSearchProduct = async () => {
    if (!upcInput) return;

    const searchUpc = upcInput; // Store the UPC before clearing
    setLoading(true);
    try {
      const response = await fetch(`/api/products?upc=${searchUpc}&storeId=${storeId}`);
      if (response.ok) {
        const product = await response.json();
        setSelectedProduct(product);
        setProductName(product.name);
        const priceInCents = Math.round(product.price * 100).toString();
        setProductPrice(priceInCents);
        setProductPriceDisplay(product.price.toFixed(2));
        setMessage(`Found: ${product.name} (Current stock: ${product.inventory})`);

        // Clear UPC input after successful search to prepare for next scan
        setUpcInput('');
      } else {
        setMessage(`Product not found - UPC: ${searchUpc}. Would you like to add it?`);
        setSelectedProduct(null);
        // Keep the UPC visible for the add operation
        // But still refocus for next scan
        setTimeout(() => {
          if (upcInputRef.current) {
            upcInputRef.current.focus();
          }
        }, 100);
      }
    } catch (error) {
      setMessage('Error searching product');
      setUpcInput('');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUpcInput('');
    setProductName('');
    setProductPrice('');
    setProductPriceDisplay('');
    setProductCost('');
    setProductCostDisplay('');
    setSelectedSupplierId('');
    setQuantityInput('');
    setSelectedProduct(null);
    setExistingProduct(null);
    setUpcDatabaseProduct(null);
    setShowProductConfirm(false);
    setLastCheckedUPC('');
    setShowManualAdd(false);
  };

  const checkExistingProduct = async (upc: string) => {
    if (!upc || !storeId) return;

    // Skip if we already checked this UPC
    if (upc === lastCheckedUPC) return;

    setLastCheckedUPC(upc);
    setLookingUpUPC(true);
    setUpcDatabaseProduct(null);

    try {
      // First check local database
      const response = await fetch(`/api/products?upc=${upc}&storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && !Array.isArray(data)) {
          // Product exists locally
          setExistingProduct(data);
          setErrorModalMessage(`This product already exists: ${data.name}. Current stock: ${data.inventory} units.`);
          setShowErrorModal(true);
          setLookingUpUPC(false);
          return;
        }
      }

      // Product doesn't exist locally, check EAN-DB
      setExistingProduct(null);
      setMessage('Product not found locally, checking product database...');

      const upcResponse = await fetch(`/api/products/lookup?upc=${upc}`);
      if (upcResponse.ok) {
        const upcData = await upcResponse.json();
        if (upcData.success && upcData.product) {
          // Found in EAN-DB, show confirmation dialog
          setUpcDatabaseProduct(upcData.product);
          setShowProductConfirm(true);
          setMessage('');
        } else {
          // Not found in EAN-DB either
          setErrorModalMessage('Product not found in database. Please enter details manually.');
          setShowErrorModal(true);
        }
      } else {
        // Error checking EAN-DB
        setErrorModalMessage('Could not check product database. Please enter details manually.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error checking product:', error);
      setErrorModalMessage('Error checking product. Please enter details manually.');
      setShowErrorModal(true);
    } finally {
      setLookingUpUPC(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.upc.includes(searchTerm)
  );

  const findDuplicates = async () => {
    if (!storeId) return;

    setLoadingDuplicates(true);
    try {
      const response = await fetch(`/api/products/merge?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setDuplicates(data.duplicates);
        if (data.duplicates.length === 0) {
          setMessage('No duplicate products found');
          setTimeout(() => setMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
      setMessage('Error finding duplicates');
    } finally {
      setLoadingDuplicates(false);
    }
  };


  const performMergeWithVerifiedUpc = async (correctUpc: string) => {
    if (!storeId || !awaitingVerification) return;

    const dup = awaitingVerification;
    let primaryProduct, duplicateProduct;

    // Determine which product has the correct UPC
    if (correctUpc === dup.product1.upc) {
      primaryProduct = dup.product1;
      duplicateProduct = dup.product2;
    } else {
      primaryProduct = dup.product2;
      duplicateProduct = dup.product1;
    }

    try {
      const response = await fetch('/api/products/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          primaryUpc: primaryProduct.upc,
          duplicateUpc: duplicateProduct.upc,
          mergeStrategy: 'combine_verified' // Special strategy that keeps price from primary
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✓ Merged successfully! Kept UPC ${correctUpc} with price $${primaryProduct.price.toFixed(2)}`);
        // Reset verification
        setVerificationMode(false);
        setAwaitingVerification(null);
        setScanCount(0);
        setVerifiedUpc('');
        // Refresh duplicates list
        findDuplicates();
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('Error merging products');
      }
    } catch (error) {
      console.error('Error merging products:', error);
      setMessage('Error merging products');
    }
  };

  const startVerification = (dup: any) => {
    setSelectedDuplicate(dup);
    setAwaitingVerification(dup);
    setVerificationMode(true);
    setScanCount(0);
    setVerifiedUpc('');
    setScanAttempts([]);
    setMergeStrategy('combine');
  };

  const mergeDuplicatesWithStrategy = async (primary: any, duplicate: any, strategy: string) => {
    if (!storeId) return;

    try {
      const response = await fetch('/api/products/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          primaryUpc: primary.upc,
          duplicateUpc: duplicate.upc,
          mergeStrategy: strategy
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        // Refresh duplicates list
        findDuplicates();
        // Refresh products if in view mode
        if (mode === 'view') {
          fetchProducts(storeId);
        }
        setSelectedDuplicate(null);
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('Error merging products');
      }
    } catch (error) {
      console.error('Error merging products:', error);
      setMessage('Failed to merge products');
    }
  };

  const mergeDuplicates = async (primary: any, duplicate: any) => {
    if (!storeId) return;

    try {
      const response = await fetch('/api/products/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          primaryUpc: primary.upc,
          duplicateUpc: duplicate.upc,
          mergeStrategy
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        // Refresh duplicates list
        findDuplicates();
        // Refresh products if in view mode
        if (mode === 'view') {
          fetchProducts(storeId);
        }
        setSelectedDuplicate(null);
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('Error merging products');
      }
    } catch (error) {
      console.error('Error merging products:', error);
      setMessage('Error merging products');
    }
  };

  // Main Menu View
  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-black">Inventory Management</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setMode('view')}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-blue-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-black">View Inventory</h2>
              <p className="text-black">Browse and search current stock levels</p>
            </button>

            <button
              onClick={() => setMode('update')}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-green-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-black">Update Stock</h2>
              <p className="text-black">Add or remove inventory for existing items</p>
            </button>

            <button
              onClick={() => setMode('add')}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-purple-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-black">Add New Item</h2>
              <p className="text-black">Add new products to inventory</p>
            </button>

            <button
              onClick={() => {
                setMode('lowstock');
                fetchProducts(storeId!);
              }}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-red-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-black">Low Stock Alert</h2>
              <p className="text-black">View items with less than 10 units</p>
            </button>

            {/* Hidden for now - Find Duplicates button
            <button
              onClick={() => {
                setMode('duplicates');
                findDuplicates();
              }}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-orange-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-black">Find Duplicates</h2>
              <p className="text-black">Find and merge duplicate products</p>
            </button>
            */}
          </div>
        </div>
      </div>
    );
  }

  // View Inventory
  if (mode === 'view') {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-black">View Inventory</h1>
            <button
              onClick={() => setMode('menu')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Menu
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div
              onClick={() => setShowSearchKeyboard(true)}
              className="w-full p-3 border border-gray-300 rounded-lg text-black bg-gray-50 cursor-pointer hover:bg-gray-100"
            >
              <span className="text-black">{searchTerm || <span className="text-gray-400">Tap to search by name or UPC</span>}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-black mb-4">No products found</p>
                {notFoundUpc && (
                  <div className="mt-4">
                    <p className="text-sm text-black mb-3">UPC {notFoundUpc} not in inventory</p>
                    <button
                      onClick={() => {
                        setMode('add');
                        setTimeout(() => {
                          setUpcInput(notFoundUpc);
                          setSearchTerm('');
                          setNotFoundUpc('');
                          checkExistingProduct(notFoundUpc);
                          // Focus on product name field since UPC is already filled
                          setTimeout(() => {
                            if (productNameInputRef.current) {
                              productNameInputRef.current.focus();
                            }
                          }, 200);
                        }, 100);
                      }}
                      className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add This Product
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase">
                      <span className="hidden sm:inline">UPC</span>
                      <span className="sm:hidden">Code</span>
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase">Name</th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase">Price</th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase hidden sm:table-cell">Stock</th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase hidden md:table-cell">Status</th>
                    <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm text-black">
                        <span className="hidden sm:inline">{product.upc}</span>
                        <span className="sm:hidden text-xs">{product.upc.substring(0, 8)}...</span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-black">
                        <span
                          className="block truncate"
                          style={{ maxWidth: 'min(200px, 30vw)' }}
                          title={product.name}
                        >
                          {product.name}
                        </span>
                        <span className="sm:hidden text-xs text-gray-500">
                          Stock: {product.inventory}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm text-black whitespace-nowrap">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 hidden sm:table-cell">
                        <span className={`font-semibold text-xs sm:text-sm ${product.inventory < 10 ? 'text-red-600' : 'text-green-600'}`}>
                          {product.inventory}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 hidden md:table-cell">
                        {product.inventory === 0 ? (
                          <span className="px-1 sm:px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Out</span>
                        ) : product.inventory < 10 ? (
                          <span className="px-1 sm:px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Low</span>
                        ) : (
                          <span className="px-1 sm:px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">In Stock</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm">
                        <button
                          onClick={() => {
                            setUpcInput(product.upc);
                            setMode('update');
                          }}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Update Stock
  if (mode === 'update') {
    // Show mode selection first
    if (updateMode === 'select') {
      return (
        <div className="min-h-screen bg-gray-100 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-black">Update Stock</h1>
              <button
                onClick={() => {
                  setUpdateMode('select');
                  resetForm();
                  setMode('menu');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Menu
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-black mb-6">What would you like to do?</h2>

              <div className="space-y-4">
                <button
                  onClick={() => setUpdateMode('add')}
                  className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center">
                    <div className="text-blue-500 mr-4">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-black">Add Inventory</h3>
                      <p className="text-gray-600">Receiving new stock or restocking items</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setUpdateMode('remove')}
                  className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all"
                >
                  <div className="flex items-center">
                    <div className="text-red-500 mr-4">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-black">Remove Inventory</h3>
                      <p className="text-gray-600">Items damaged, expired, or removed</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setUpdateMode('reconcile')}
                  className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  <div className="flex items-center">
                    <div className="text-green-500 mr-4">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-black">Reconcile (Physical Count)</h3>
                      <p className="text-gray-600">Count actual stock and update system to match</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Original update stock flow with modifications based on mode
    return (
      <>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-black">
              {updateMode === 'add' ? 'Add Inventory' :
               updateMode === 'remove' ? 'Remove Inventory' :
               'Reconcile Inventory'}
            </h1>
            <button
              onClick={() => {
                setUpdateMode('select');
                setReconcileCount('');
                setAdjustmentReason('');
                setQuantityInput('');
                setSelectedProduct(null);
                setUpcInput('');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Selection
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('Error') || message.includes('not found')
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
              {message.includes('not found') && message.includes('Would you like to add it?') && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      // Save the UPC and switch to add mode
                      const tempUpc = upcInput;
                      setMessage(''); // Clear the "Product not found" message
                      setMode('add');
                      setTimeout(() => {
                        setUpcInput(tempUpc);
                        // Trigger the duplicate check
                        checkExistingProduct(tempUpc);
                        // Focus on product name field since UPC is already filled
                        setTimeout(() => {
                          if (productNameInputRef.current) {
                            productNameInputRef.current.focus();
                          }
                        }, 200);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Add Product
                  </button>
                  <button
                    onClick={() => {
                      setMessage('');
                      setUpcInput('');
                      setSelectedProduct(null);
                      if (upcInputRef.current) {
                        upcInputRef.current.focus();
                      }
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Find Product</h2>
              <p className="text-sm text-black">Scan anytime to switch products</p>
            </div>
            {!selectedProduct && (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    ref={upcInputRef}
                    type="text"
                    value={upcInput}
                    onChange={(e) => setUpcInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchProduct();
                      }
                    }}
                    placeholder="Scan or enter UPC code"
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-black placeholder:text-black"
                    autoFocus
                  />
                  <button
                    onClick={handleSearchProduct}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
                    disabled={loading}
                  >
                    Search
                  </button>
                </div>

                <div className="text-center mb-4">
                  <button
                    type="button"
                    onClick={() => setManualUpc(manualUpc ? '' : 'open')}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    {manualUpc ? 'Hide Manual Entry' : 'Enter UPC Manually'}
                  </button>
                </div>

                {manualUpc && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type UPC code here"
                        value={upcInput}
                        onChange={(e) => setUpcInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchProduct();
                          }
                        }}
                        className="flex-1 p-3 border border-gray-300 rounded-lg text-black placeholder:text-black"
                      />
                      <button
                        onClick={handleSearchProduct}
                        className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
                        disabled={loading || !upcInput}
                      >
                        Find Product
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedProduct && (
              <form onSubmit={handleUpdateStock} className="">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-black font-semibold text-lg">{selectedProduct.name}</p>
                      <p className="text-black">UPC: {selectedProduct.upc}</p>
                      <p className="text-black">Current Stock: <span className="font-semibold">{selectedProduct.inventory} units</span></p>
                      <p className="text-black">Price: <span className="font-semibold">${selectedProduct.price.toFixed(2)}</span></p>
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(true);
                          setEditPrice(selectedProduct.price.toString());
                          setEditName(selectedProduct.name);
                          setEditCost(selectedProduct.cost ? selectedProduct.cost.toString() : '');
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditMode(true);
                          setEditPrice(selectedProduct.price.toString());
                          setEditName(selectedProduct.name);
                          setEditCost(selectedProduct.cost ? selectedProduct.cost.toString() : '');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 underline touch-manipulation"
                      >
                        Edit Product Details
                      </button>
                      {scanBuffer && (
                        <p className="text-xs text-black mt-2">
                          Scanning: {scanBuffer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {editMode && (
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold mb-3 text-black">Edit Product Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-black mb-1">Product Name</label>
                        <div
                          onClick={() => setShowEditNameKeyboard(true)}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            setShowEditNameKeyboard(true);
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg text-black bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                        >
                          <span className="text-black">{editName || <span className="text-gray-400">Tap to edit name</span>}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-black mb-1">Price</label>
                          <div
                            onClick={() => setShowEditPriceNumpad(true)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              setShowEditPriceNumpad(true);
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg text-black bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                          >
                            <span className="text-black">{editPrice ? `$${editPrice}` : <span className="text-gray-400">Tap to edit price</span>}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-black mb-1">Cost</label>
                          <div
                            onClick={() => setShowEditCostNumpad(true)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              setShowEditCostNumpad(true);
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg text-black bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                          >
                            <span className="text-black">{editCost ? `$${editCost}` : <span className="text-gray-400">Tap to edit cost</span>}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={handleUpdateProductDetails}
                          className="flex-1 bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditMode(false);
                            setEditPrice('');
                            setEditName('');
                            setEditCost('');
                          }}
                          className="flex-1 bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reconcile Mode - Physical Count Entry */}
                {updateMode === 'reconcile' ? (
                  <div className="mb-6">
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-black mb-2">Physical Inventory Count</h3>
                      <p className="text-sm text-gray-700">Count the actual items on the shelf and enter the total below.</p>
                    </div>

                    <label className="block text-black mb-2 font-medium">Physical Count:</label>
                    <div
                      onClick={() => {
                        setActiveInputField('reconcile');
                        setShowReconcileNumpad(true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setActiveInputField('reconcile');
                        setShowReconcileNumpad(true);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation mb-3"
                    >
                      <span className="text-black">{reconcileCount || <span className="text-gray-400">Tap to enter physical count</span>}</span>
                    </div>

                    {reconcileCount && (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">System Count:</span>
                            <span className="text-lg font-semibold text-black">{selectedProduct.inventory}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">Physical Count:</span>
                            <span className="text-lg font-semibold text-black">{reconcileCount}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Discrepancy:</span>
                              <span className={`text-lg font-bold ${
                                parseInt(reconcileCount) - selectedProduct.inventory < 0
                                  ? 'text-red-600'
                                  : parseInt(reconcileCount) - selectedProduct.inventory > 0
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                              }`}>
                                {parseInt(reconcileCount) - selectedProduct.inventory > 0 && '+'}
                                {parseInt(reconcileCount) - selectedProduct.inventory}
                              </span>
                            </div>
                          </div>
                        </div>

                        {parseInt(reconcileCount) !== selectedProduct.inventory && (
                          <div>
                            <label className="block text-black mb-2 font-medium">Reason for Discrepancy:</label>
                            <select
                              value={adjustmentReason}
                              onChange={(e) => setAdjustmentReason(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg text-black bg-white"
                              required
                            >
                              <option value="">Select a reason...</option>
                              <option value="theft">Suspected Theft</option>
                              <option value="damage">Damaged/Expired</option>
                              <option value="miscount">Previous Count Error</option>
                              <option value="received">Unreported Delivery</option>
                              <option value="return">Customer Return</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Add/Remove Mode - Quantity Entry */
                  <div className="mb-6">
                    <label className="block text-black mb-3 font-semibold">Select Operation:</label>
                    <div className="flex gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setUpdateMode('add')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          updateMode === 'add'
                            ? 'bg-green-50 border-green-500 text-green-700'
                            : 'bg-white border-gray-300 text-black hover:border-gray-400'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium">Add Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpdateMode('remove')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          updateMode === 'remove'
                            ? 'bg-red-50 border-red-500 text-red-700'
                            : 'bg-white border-gray-300 text-black hover:border-gray-400'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        <span className="font-medium">Remove Stock</span>
                      </button>
                    </div>

                    <label className="block text-black mb-2">How many?</label>
                    <div
                      onClick={() => {
                        setActiveInputField('quantity');
                        setShowQuantityNumpad(true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setActiveInputField('quantity');
                        setShowQuantityNumpad(true);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                    >
                      <span className="text-black">{quantityInput || <span className="text-gray-400">Tap to enter quantity</span>}</span>
                    </div>
                    {quantityInput && (
                      <p className="text-sm mt-2 font-medium">
                        {updateMode === 'add' ? (
                          <span className="text-green-600">
                            New stock will be: {selectedProduct.inventory + parseInt(quantityInput || '0')}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            New stock will be: {Math.max(0, selectedProduct.inventory - parseInt(quantityInput || '0'))}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full text-white p-3 rounded-lg transition-colors ${
                    updateMode === 'reconcile'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : updateMode === 'add'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {updateMode === 'reconcile' ? 'Update Inventory' : updateMode === 'add' ? 'Add to Stock' : 'Remove from Stock'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Modals for Update Stock mode */}
      {showQuantityNumpad && (
        <OnScreenNumpad
          value={quantityInput}
          onChange={setQuantityInput}
          onClose={() => {
            setShowQuantityNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowQuantityNumpad(false);
            setActiveInputField(null);
          }}
          decimal={false}
          title="Enter Quantity"
        />
      )}

      {showReconcileNumpad && (
        <OnScreenNumpad
          value={reconcileCount}
          onChange={setReconcileCount}
          onClose={() => {
            setShowReconcileNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowReconcileNumpad(false);
            setActiveInputField(null);
          }}
          decimal={false}
          title="Enter Physical Count"
          subtitle={`Current system count: ${selectedProduct?.inventory || 0}`}
        />
      )}

      {/* Edit Mode On-Screen Inputs */}
      {showEditNameKeyboard && (
        <OnScreenKeyboard
          value={editName}
          onChange={setEditName}
          onClose={() => setShowEditNameKeyboard(false)}
          onEnter={() => setShowEditNameKeyboard(false)}
          title="Edit Product Name"
          type="text"
        />
      )}

      {showEditPriceNumpad && (
        <OnScreenNumpad
          value={editPrice}
          onChange={setEditPrice}
          onClose={() => setShowEditPriceNumpad(false)}
          onEnter={() => setShowEditPriceNumpad(false)}
          decimal={true}
          title="Edit Retail Price"
        />
      )}

      {showEditCostNumpad && (
        <OnScreenNumpad
          value={editCost}
          onChange={setEditCost}
          onClose={() => setShowEditCostNumpad(false)}
          onEnter={() => setShowEditCostNumpad(false)}
          decimal={true}
          title="Edit Cost"
        />
      )}
      </>
    );
  }

  // Low Stock View
  if (mode === 'lowstock') {
    const lowStockProducts = products.filter(p => p.inventory < 10).sort((a, b) => a.inventory - b.inventory);

    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-black">Low Stock Alert</h1>
                <p className="text-gray-600 mt-1">Products with less than 10 units in inventory</p>
              </div>
              <button
                onClick={() => setMode('menu')}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Menu
              </button>
            </div>

            {loading ? (
              <p className="text-black">Loading products...</p>
            ) : lowStockProducts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-24 h-24 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl text-black">All products are well stocked!</p>
                <p className="text-gray-600 mt-2">No items have less than 10 units in inventory.</p>
              </div>
            ) : (
              <div>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <strong>{lowStockProducts.length} products</strong> need to be restocked soon
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UPC</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lowStockProducts.map(product => (
                        <tr key={product.upc} className={product.inventory === 0 ? 'bg-red-50' : product.inventory < 5 ? 'bg-orange-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-black">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{product.upc}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.inventory === 0 ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                OUT OF STOCK
                              </span>
                            ) : product.inventory < 5 ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                {product.inventory} units
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                {product.inventory} units
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">${product.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                            {product.supplierName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => {
                                setUpcInput(product.upc);
                                setMode('update');
                              }}
                              className="text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              Restock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-900">
                      {lowStockProducts.filter(p => p.inventory === 0).length}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-4 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium">Critical (&lt; 5 units)</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {lowStockProducts.filter(p => p.inventory > 0 && p.inventory < 5).length}
                    </p>
                  </div>
                  <div className="bg-yellow-100 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">Low (5-9 units)</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {lowStockProducts.filter(p => p.inventory >= 5 && p.inventory < 10).length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Find Duplicates View
  if (mode === 'duplicates') {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-black">Find & Merge Duplicates</h1>
            <button
              onClick={() => setMode('menu')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Menu
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('Error') || message.includes('Failed')
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          {/* Verification Modal */}
          {verificationMode && awaitingVerification && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-black mb-4">Product Verification Required</h2>
                  <p className="text-lg text-black mb-2">
                    Please scan the actual product barcode <strong>3 times</strong> to verify which UPC is correct.
                  </p>
                  <p className="text-sm text-gray-600">
                    This ensures we keep the correct barcode and merge the duplicate.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border-2 border-gray-300 rounded-lg p-4">
                    <h3 className="font-semibold text-black mb-2">Product 1</h3>
                    <p className="text-sm text-black">{awaitingVerification.product1.name}</p>
                    <p className="text-xs text-gray-600 font-mono mt-1">UPC: {awaitingVerification.product1.upc}</p>
                  </div>
                  <div className="border-2 border-gray-300 rounded-lg p-4">
                    <h3 className="font-semibold text-black mb-2">Product 2</h3>
                    <p className="text-sm text-black">{awaitingVerification.product2.name}</p>
                    <p className="text-xs text-gray-600 font-mono mt-1">UPC: {awaitingVerification.product2.upc}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="text-blue-500">
                      <svg className="w-24 h-24 mx-auto animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h1v12H7V6zm2 0h2v12H9V6zm3 0h1v12h-1V6zm2 0h2v12h-2V6zm3 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h2v12h-2V6z"/>
                      </svg>
                    </div>
                  </div>

                  {scanCount > 0 ? (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600 mb-2">
                        Scan {scanCount} of 3 complete!
                      </p>
                      {verifiedUpc && (
                        <p className="text-sm text-black">
                          Detected UPC: <span className="font-mono font-bold">{verifiedUpc}</span>
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        Please scan the same product {3 - scanCount} more time{3 - scanCount !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  ) : (
                    <p className="text-center text-lg text-black">
                      Waiting for first scan...
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setVerificationMode(false);
                      setScanCount(0);
                      setVerifiedUpc('');
                      setAwaitingVerification(null);
                      setSelectedDuplicate(null);
                    }}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel Verification
                  </button>
                </div>

                {message && message.includes('Wrong product') && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-800 text-sm">{message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {loadingDuplicates ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-black">Searching for duplicates...</p>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-green-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xl text-black">No duplicate products found!</p>
              <p className="text-black mt-2">All your products have unique UPCs and names.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-semibold text-black mb-2">
                      Found {duplicates.length} potential duplicate{duplicates.length === 1 ? '' : 's'}
                    </p>
                    <p className="text-sm text-black">
                      Review each pair below and decide how to merge them.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!storeId) return;

                      try {
                        // First, get the count of invalid products
                        const response = await fetch(`/api/products/cleanup?storeId=${storeId}`);
                        const data = await response.json();

                        if (data.invalidCount > 0) {
                          if (confirm(`Found ${data.invalidCount} products with invalid UPCs (very short or single digits). These are likely scan errors. Delete them all?`)) {
                            const deleteResponse = await fetch('/api/products/cleanup', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ storeId, deleteAll: true })
                            });

                            if (deleteResponse.ok) {
                              const result = await deleteResponse.json();
                              setMessage(result.message);
                              // Refresh duplicates after cleanup
                              findDuplicates();
                              setTimeout(() => setMessage(''), 5000);
                            }
                          }
                        } else {
                          setMessage('No invalid products found to clean up');
                          setTimeout(() => setMessage(''), 3000);
                        }
                      } catch (error) {
                        console.error('Error cleaning invalid products:', error);
                        setMessage('Error cleaning invalid products');
                      }
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
                  >
                    Clean Invalid Products
                  </button>
                </div>
              </div>

              {duplicates.map((dup, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product 1 */}
                    <div className="border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-black">Product 1</h3>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Keep This</span>
                      </div>
                      <div className="space-y-2 text-sm text-black">
                        <p><span className="font-medium">Name:</span> {dup.product1.name}</p>
                        <p><span className="font-medium">UPC:</span> {dup.product1.upc}</p>
                        <p><span className="font-medium">Price:</span> ${dup.product1.price.toFixed(2)}</p>
                        <p><span className="font-medium">Stock:</span> {dup.product1.inventory}</p>
                        {dup.product1.cost && (
                          <p><span className="font-medium">Cost:</span> ${dup.product1.cost.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    {/* Product 2 */}
                    <div className="border-2 border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-black">Product 2</h3>
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Will Be Merged</span>
                      </div>
                      <div className="space-y-2 text-sm text-black">
                        <p><span className="font-medium">Name:</span> {dup.product2.name}</p>
                        <p><span className="font-medium">UPC:</span> {dup.product2.upc}</p>
                        <p><span className="font-medium">Price:</span> ${dup.product2.price.toFixed(2)}</p>
                        <p><span className="font-medium">Stock:</span> {dup.product2.inventory}</p>
                        {dup.product2.cost && (
                          <p><span className="font-medium">Cost:</span> ${dup.product2.cost.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Similarity Info */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-black">
                        <span className="font-medium">Match Type:</span>{' '}
                        {dup.similarity.similarityType || 'UPCs are similar'}
                      </p>
                      {dup.similarity.confidence && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Confidence:</span>
                          <div className="relative w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full ${
                                dup.similarity.confidence >= 80 ? 'bg-green-500' :
                                dup.similarity.confidence >= 60 ? 'bg-yellow-500' :
                                'bg-orange-500'
                              }`}
                              style={{width: `${dup.similarity.confidence}%`}}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            dup.similarity.confidence >= 80 ? 'text-green-600' :
                            dup.similarity.confidence >= 60 ? 'text-yellow-600' :
                            'text-orange-600'
                          }`}>
                            {dup.similarity.confidence}%
                          </span>
                        </div>
                      )}
                    </div>

                    {dup.similarity.upc1Length && dup.similarity.upc2Length && (
                      <p className="text-xs text-gray-600 mb-1">
                        UPC lengths: {dup.similarity.upc1Length} vs {dup.similarity.upc2Length} digits
                      </p>
                    )}

                    {dup.similarity.nameMatch && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Product names match exactly
                      </p>
                    )}
                    {!dup.similarity.nameMatch && (
                      <p className="text-sm text-orange-600 mt-1">
                        ⚠ Different product names - verify before merging
                      </p>
                    )}
                    {dup.similarity.priceDifference > 0 && (
                      <p className="text-sm text-black mt-1">
                        Price difference: ${dup.similarity.priceDifference.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Merge Actions */}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => startVerification(dup)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Verify & Merge with Scanner
                    </button>
                    {duplicates.length > 1 && (
                      <button
                        className="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
                      >
                        Skip
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Verification Modal */}
          {verificationMode && awaitingVerification && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
                <div className="text-center">
                  <div className="text-blue-500 mb-4">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-bold text-black mb-4">Scan Product to Verify</h2>

                  <div className="mb-6 text-left bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-black mb-2">Comparing:</p>
                    <div className="space-y-3">
                      <div>
                        <div className="font-semibold text-black text-sm mb-1">Product 1: {awaitingVerification.product1.name}</div>
                        <div className="flex justify-between pl-4">
                          <span className="text-sm text-gray-600">UPC:</span>
                          <span className="font-mono text-sm text-black">{awaitingVerification.product1.upc}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-black text-sm mb-1">Product 2: {awaitingVerification.product2.name}</div>
                        <div className="flex justify-between pl-4">
                          <span className="text-sm text-gray-600">UPC:</span>
                          <span className="font-mono text-sm text-black">{awaitingVerification.product2.upc}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-lg text-black mb-4">
                      Please scan the actual product barcode <strong>3 times</strong> to verify
                    </p>

                    {/* Progress indicator */}
                    <div className="flex justify-center gap-2 mb-4">
                      {[0, 1, 2].map((i) => {
                        const attempt = scanAttempts[i];
                        const showCheck = attempt?.valid;
                        const showX = attempt && !attempt.valid;
                        const showNumber = !attempt;

                        return (
                          <div
                            key={i}
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                              showCheck ? 'bg-green-500 text-white' :
                              showX ? 'bg-red-500 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}
                          >
                            {showCheck ? '✓' : showX ? '✗' : i + 1}
                          </div>
                        );
                      })}
                    </div>

                    {verifiedUpc && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-black">
                          Scanning: <span className="font-mono font-bold">{verifiedUpc}</span>
                        </p>
                        <p className="text-xs text-black mt-1">
                          {3 - scanCount} more scan{3 - scanCount !== 1 ? 's' : ''} needed
                        </p>
                      </div>
                    )}

                    {message && message.includes('Wrong product') && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">{message}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-center">
                    {scanAttempts.length > 0 && (
                      <button
                        onClick={() => {
                          setScanCount(0);
                          setVerifiedUpc('');
                          setMessage('');
                          setScanBuffer('');
                          setScanAttempts([]);
                        }}
                        className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
                      >
                        Try Again
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setVerificationMode(false);
                        setAwaitingVerification(null);
                        setScanCount(0);
                        setVerifiedUpc('');
                        setMessage('');
                        setScanBuffer('');
                        setScanAttempts([]);
                      }}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Add New Item
  if (mode === 'add') {
    return (
      <>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-black">Add New Item</h1>
              {productsAdded > 0 && (
                <p className="text-sm text-black mt-1">
                  {productsAdded} product{productsAdded !== 1 ? 's' : ''} added this session
                </p>
              )}
            </div>
            <button
              onClick={() => {
                resetForm();
                setProductsAdded(0);
                setMode('menu');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Menu
            </button>
          </div>


          {/* Error Modal */}
          {showErrorModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="text-red-500 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-black mb-6">{errorModalMessage}</p>
                  <button
                    onClick={() => {
                      setShowErrorModal(false);
                      setErrorModalMessage('');
                      setShowManualAdd(true);
                      // Focus on appropriate field
                      setTimeout(() => {
                        if (!productName && productNameInputRef.current) {
                          productNameInputRef.current.focus();
                        }
                      }, 100);
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scan Prompt - Default View */}
          {!showManualAdd && !existingProduct && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="mb-8">
                <div className="text-blue-500 mb-4">
                  <svg className="w-32 h-32 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h1v12H7V6zm2 0h2v12H9V6zm3 0h1v12h-1V6zm2 0h2v12h-2V6zm3 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h2v12h-2V6z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-black mb-3">Please scan item you would like to add</h2>
                <p className="text-black mb-8">Position the barcode in front of the scanner</p>

                {/* Success message */}
                {message && (
                  <div className="mb-4 text-green-600 font-semibold text-lg animate-pulse">
                    {message}
                  </div>
                )}

                {/* Hidden UPC input for scanner */}
                <input
                  ref={upcInputRef}
                  type="text"
                  value={upcInput}
                  onChange={(e) => {
                    setUpcInput(e.target.value);
                    setLastCheckedUPC('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && upcInput) {
                      e.preventDefault();
                      checkExistingProduct(upcInput);
                      setShowManualAdd(true);
                    }
                  }}
                  className="sr-only"
                  autoFocus
                />

                <button
                  onClick={() => setShowManualAdd(true)}
                  className="text-blue-600 underline hover:text-blue-700 text-sm"
                >
                  Add manually
                </button>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {lookingUpUPC && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-2xl p-8">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-lg font-medium text-black">Looking up product...</p>
                </div>
              </div>
            </div>
          )}

          {/* Product Confirmation Dialog */}
          {showProductConfirm && upcDatabaseProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold text-black mb-4">Product Found</h2>
                <p className="text-black mb-6">
                  Is this <span className="font-semibold">"{upcDatabaseProduct.name}"</span>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // User confirmed - only fill in the product name
                      setProductName(upcDatabaseProduct.name);
                      setShowProductConfirm(false);
                      setShowManualAdd(true);
                      setMessage('');
                      // Focus on price field
                      setTimeout(() => {
                        const priceInput = document.querySelector('input[placeholder="0.00"]') as HTMLInputElement;
                        if (priceInput) {
                          priceInput.focus();
                        }
                      }, 100);
                    }}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => {
                      // User declined - clear everything and ask for manual entry
                      setUpcDatabaseProduct(null);
                      setShowProductConfirm(false);
                      setShowManualAdd(true);
                      setProductName(''); // Clear product name
                      setMessage('');
                      // Focus on product name field
                      setTimeout(() => {
                        if (productNameInputRef.current) {
                          productNameInputRef.current.focus();
                        }
                      }, 100);
                    }}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Add Form - Only show when manual add is clicked or after scan */}
          {(showManualAdd || existingProduct) && (
            <>
              {message && !message.includes('Product not found') && (
                <div className={`mb-4 p-4 rounded-lg ${
                  message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              <div className="bg-white p-6 rounded-lg shadow-md">
                <form onSubmit={handleAddProduct}>
              <div className="mb-4">
                <label className="block text-black mb-2">UPC Code *</label>
                <div className="relative">
                  <input
                    ref={upcInputRef}
                    type="text"
                    value={upcInput}
                    onChange={(e) => {
                      setUpcInput(e.target.value);
                      setExistingProduct(null); // Clear existing product when typing
                      setUpcDatabaseProduct(null); // Clear UPC database product
                      setLastCheckedUPC(''); // Clear last checked to allow re-checking
                    }}
                    onBlur={() => checkExistingProduct(upcInput)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && upcInput) {
                        e.preventDefault();
                        checkExistingProduct(upcInput);
                      // Move to product name field after scanner enters UPC
                      if (!existingProduct) {
                        setTimeout(() => {
                          if (productNameInputRef.current) {
                            productNameInputRef.current.focus();
                          }
                        }, 100);
                      }
                    }
                  }}
                  placeholder="Scan or enter UPC code"
                  className="w-full p-3 border border-gray-300 rounded-lg text-black placeholder:text-black"
                  required
                  autoFocus
                  />
                </div>
              </div>

              {existingProduct && (
                <div className="mb-4 p-4 border-2 border-orange-400 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold text-orange-800 mb-2">⚠️ Product Already Exists</h3>
                  <div className="space-y-1 text-sm text-black">
                    <p><span className="font-medium">Name:</span> {existingProduct.name}</p>
                    <p><span className="font-medium">Current Stock:</span> {existingProduct.inventory} units</p>
                    <p><span className="font-medium">Price:</span> ${existingProduct.price.toFixed(2)}</p>
                    {existingProduct.supplierName && (
                      <p><span className="font-medium">Supplier:</span> {existingProduct.supplierName}</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUpcInput(existingProduct.upc);
                        setMode('update');
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Go to Update Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUpcInput('');
                        setExistingProduct(null);
                        setMessage('');
                        setTimeout(() => {
                          if (upcInputRef.current) {
                            upcInputRef.current.focus();
                          }
                        }, 50);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Scan Different Product
                    </button>
                  </div>
                </div>
              )}

              {!existingProduct && (
                <>
              <div className="mb-4">
                <label className="block text-black mb-2">Product Name *</label>
                <div
                  onClick={() => {
                    setActiveInputField('name');
                    setShowNameKeyboard(true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setActiveInputField('name');
                    setShowNameKeyboard(true);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                >
                  <span className="text-black">{productName || <span className="text-gray-400">Tap to enter product name</span>}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-black mb-2">Retail Price *</label>
                  <div
                    onClick={() => {
                      setActiveInputField('price');
                      setShowPriceNumpad(true);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setActiveInputField('price');
                      setShowPriceNumpad(true);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                  >
                    <span className="text-black">{productPriceDisplay ? `$${productPriceDisplay}` : <span className="text-gray-400">Tap to enter price</span>}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-black mb-2">Cost *</label>
                  <div
                    onClick={() => {
                      setActiveInputField('cost');
                      setShowCostNumpad(true);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setActiveInputField('cost');
                      setShowCostNumpad(true);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                  >
                    <span className="text-black">{productCostDisplay ? `$${productCostDisplay}` : <span className="text-gray-400">Tap to enter cost</span>}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-black mb-2">Supplier/Source *</label>
                <div className="flex gap-2">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-black"
                    required
                  >
                    <option value="" className="text-black">Select a supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id} className="text-black">
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplier(!showAddSupplier)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {showAddSupplier ? 'Cancel' : 'Add New'}
                  </button>
                </div>

                {showAddSupplier && (
                  <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <h4 className="font-semibold mb-3 text-black">Add New Supplier</h4>
                    <div className="space-y-3">
                      <div
                        onClick={() => setShowSupplierNameKeyboard(true)}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          setShowSupplierNameKeyboard(true);
                        }}
                        className="w-full p-2 border border-gray-300 rounded text-black bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                      >
                        <span className="text-black">{newSupplierName || <span className="text-gray-400">Tap to enter supplier name</span>}</span>
                      </div>
                      <div
                        onClick={() => setShowSupplierContactKeyboard(true)}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          setShowSupplierContactKeyboard(true);
                        }}
                        className="w-full p-2 border border-gray-300 rounded text-black bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                      >
                        <span className="text-black">{newSupplierContact || <span className="text-gray-400">Tap to enter contact person</span>}</span>
                      </div>
                      <div
                        onClick={() => setShowSupplierPhoneKeyboard(true)}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          setShowSupplierPhoneKeyboard(true);
                        }}
                        className="w-full p-2 border border-gray-300 rounded text-black bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                      >
                        <span className="text-black">{newSupplierPhone || <span className="text-gray-400">Tap to enter phone number</span>}</span>
                      </div>
                      <div
                        onClick={() => setShowSupplierEmailKeyboard(true)}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          setShowSupplierEmailKeyboard(true);
                        }}
                        className="w-full p-2 border border-gray-300 rounded text-black bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                      >
                        <span className="text-black">{newSupplierEmail || <span className="text-gray-400">Tap to enter email</span>}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSupplier}
                        className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Save Supplier
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-black mb-2">Initial Quantity</label>
                <div
                  onClick={() => {
                    setActiveInputField('quantity');
                    setShowQuantityNumpad(true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setActiveInputField('quantity');
                    setShowQuantityNumpad(true);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 touch-manipulation"
                >
                  <span className="text-black">{quantityInput || <span className="text-gray-400">Tap to enter quantity</span>}</span>
                </div>
              </div>

              {productPrice && productCost && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Profit Margin: <span className="font-semibold">
                      ${(parseFloat(productPrice) - parseFloat(productCost)).toFixed(2)}
                      ({((parseFloat(productPrice) - parseFloat(productCost)) / parseFloat(productPrice) * 100).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600"
                disabled={existingProduct !== null}
              >
                Add Product
              </button>
                </>
              )}
                </form>
              </div>
            </>
          )}

          {/* All modals moved to root level - duplicate modals removed */}
        </div>
      </div>

      {/* Modals for Add mode */}
      {showNameKeyboard && (
        <OnScreenKeyboard
          value={productName}
          onChange={setProductName}
          onClose={() => {
            setShowNameKeyboard(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowNameKeyboard(false);
            setActiveInputField(null);
          }}
          title="Enter Product Name"
          type="text"
        />
      )}

      {showPriceNumpad && (
        <OnScreenNumpad
          value={productPrice}
          onChange={(value) => {
            setProductPrice(value);
            setProductPriceDisplay(value);
          }}
          onClose={() => {
            setShowPriceNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowPriceNumpad(false);
            setActiveInputField(null);
          }}
          decimal={true}
          title="Enter Retail Price"
        />
      )}

      {showCostNumpad && (
        <OnScreenNumpad
          value={productCost}
          onChange={(value) => {
            setProductCost(value);
            setProductCostDisplay(value);
          }}
          onClose={() => {
            setShowCostNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowCostNumpad(false);
            setActiveInputField(null);
          }}
          decimal={true}
          title="Enter Cost"
        />
      )}

      {showQuantityNumpad && (
        <OnScreenNumpad
          value={quantityInput}
          onChange={setQuantityInput}
          onClose={() => {
            setShowQuantityNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowQuantityNumpad(false);
            setActiveInputField(null);
          }}
          decimal={false}
          title="Enter Initial Quantity"
        />
      )}

      {/* Supplier Field Keyboards */}
      {showSupplierNameKeyboard && (
        <OnScreenKeyboard
          value={newSupplierName}
          onChange={setNewSupplierName}
          onClose={() => setShowSupplierNameKeyboard(false)}
          onEnter={() => setShowSupplierNameKeyboard(false)}
          title="Enter Supplier Name"
          type="text"
        />
      )}

      {showSupplierContactKeyboard && (
        <OnScreenKeyboard
          value={newSupplierContact}
          onChange={setNewSupplierContact}
          onClose={() => setShowSupplierContactKeyboard(false)}
          onEnter={() => setShowSupplierContactKeyboard(false)}
          title="Enter Contact Person"
          type="text"
        />
      )}

      {showSupplierPhoneKeyboard && (
        <OnScreenKeyboard
          value={newSupplierPhone}
          onChange={setNewSupplierPhone}
          onClose={() => setShowSupplierPhoneKeyboard(false)}
          onEnter={() => setShowSupplierPhoneKeyboard(false)}
          title="Enter Phone Number"
          type="text"
        />
      )}

      {showSupplierEmailKeyboard && (
        <OnScreenKeyboard
          value={newSupplierEmail}
          onChange={setNewSupplierEmail}
          onClose={() => setShowSupplierEmailKeyboard(false)}
          onEnter={() => setShowSupplierEmailKeyboard(false)}
          title="Enter Email"
          type="email"
        />
      )}
      </>
    );
  }

  // Render on-screen modals for all modes
  return (
    <>
      {/* On-Screen Keyboard for Product Name */}
      {showNameKeyboard && (
        <OnScreenKeyboard
          value={productName}
          onChange={setProductName}
          onClose={() => {
            setShowNameKeyboard(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowNameKeyboard(false);
            setActiveInputField(null);
          }}
          title="Enter Product Name"
          type="text"
        />
      )}

      {/* On-Screen Numpad for Price */}
      {showPriceNumpad && (
        <OnScreenNumpad
          value={productPrice}
          onChange={(value) => {
            setProductPrice(value);
            setProductPriceDisplay(value);
          }}
          onClose={() => {
            setShowPriceNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowPriceNumpad(false);
            setActiveInputField(null);
          }}
          decimal={true}
          title="Enter Retail Price"
        />
      )}

      {/* On-Screen Numpad for Cost */}
      {showCostNumpad && (
        <OnScreenNumpad
          value={productCost}
          onChange={(value) => {
            setProductCost(value);
            setProductCostDisplay(value);
          }}
          onClose={() => {
            setShowCostNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowCostNumpad(false);
            setActiveInputField(null);
          }}
          decimal={true}
          title="Enter Cost"
        />
      )}

      {/* On-Screen Numpad for Quantity */}
      {showQuantityNumpad && (
        <OnScreenNumpad
          value={quantityInput}
          onChange={setQuantityInput}
          onClose={() => {
            setShowQuantityNumpad(false);
            setActiveInputField(null);
          }}
          onEnter={() => {
            setShowQuantityNumpad(false);
            setActiveInputField(null);
          }}
          decimal={false}
          title="Enter Quantity"
        />
      )}

      {/* Edit Mode On-Screen Inputs */}
      {showEditNameKeyboard && (
        <OnScreenKeyboard
          value={editName}
          onChange={setEditName}
          onClose={() => setShowEditNameKeyboard(false)}
          onEnter={() => setShowEditNameKeyboard(false)}
          title="Edit Product Name"
          type="text"
        />
      )}

      {showEditPriceNumpad && (
        <OnScreenNumpad
          value={editPrice}
          onChange={setEditPrice}
          onClose={() => setShowEditPriceNumpad(false)}
          onEnter={() => setShowEditPriceNumpad(false)}
          decimal={true}
          title="Edit Retail Price"
        />
      )}

      {showEditCostNumpad && (
        <OnScreenNumpad
          value={editCost}
          onChange={setEditCost}
          onClose={() => setShowEditCostNumpad(false)}
          onEnter={() => setShowEditCostNumpad(false)}
          decimal={true}
          title="Edit Cost"
        />
      )}


      {/* Search field on-screen input */}
      {showSearchKeyboard && (
        <OnScreenKeyboard
          value={searchTerm}
          onChange={setSearchTerm}
          onClose={() => setShowSearchKeyboard(false)}
          onEnter={() => setShowSearchKeyboard(false)}
          title="Search Products"
          type="text"
        />
      )}
    </>
  );
}