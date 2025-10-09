'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, Package, X, Plus, ShoppingCart } from 'lucide-react';
import OnScreenNumpad from '@/components/OnScreenNumpad';
import OnScreenKeyboard from '@/components/OnScreenKeyboard';
import { useSessionCheck } from '@/hooks/useSessionCheck';

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
  weight?: number;
  isWeightBased?: boolean;
  pricePerPound?: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { checkSession } = useSessionCheck();
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
  const [showUpcNumpad, setShowUpcNumpad] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSearchKeyboard, setShowSearchKeyboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
  const [showKeyIn, setShowKeyIn] = useState(false);
  const [keyInAmount, setKeyInAmount] = useState('');
  const [showKeyInNumpad, setShowKeyInNumpad] = useState(false);
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

  // Food selection states
  const [showFoodSelection, setShowFoodSelection] = useState(false);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string | null>(null);
  const [foodCart, setFoodCart] = useState<Array<{name: string, price: number, quantity: number, weight?: number, isWeightBased?: boolean, modifiers?: Array<{name: string, price: number}>}>>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [selectedWeightItem, setSelectedWeightItem] = useState<{name: string, price: number} | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [showEditWeightModal, setShowEditWeightModal] = useState(false);

  // New states for food options
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [selectedBaseItem, setSelectedBaseItem] = useState<any | null>(null);

  // Open food item states
  const [showOpenFood, setShowOpenFood] = useState(false);
  const [openFoodPrice, setOpenFoodPrice] = useState('');
  const [showOpenFoodNumpad, setShowOpenFoodNumpad] = useState(false);

  // Open Item states (for general items above order summary)
  const [showOpenItem, setShowOpenItem] = useState(false);
  const [openItemPrice, setOpenItemPrice] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string}>({});
  const [multiSelectOptions, setMultiSelectOptions] = useState<{[key: string]: number}>({});

  // Combo selection states

  // States for modifiers/add-ons
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<{name: string, price: number, quantity: number, modifiers?: any[]} | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<{[key: string]: number}>({});
  const [showCustomPriceKeypad, setShowCustomPriceKeypad] = useState(false);
  const [customAddOnPrice, setCustomAddOnPrice] = useState('');

  // Price check states
  const [priceCheckMode, setPriceCheckMode] = useState(false);
  const [priceCheckProduct, setPriceCheckProduct] = useState<Product | null>(null);
  const [priceCheckBuffer, setPriceCheckBuffer] = useState('');
  const priceCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized food menu structure
  const foodMenuOptimized = {
    'COLD CUTS SANDWICHES': [
      { name: 'Roast Beef', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.99, hero: 9.99 } },
      { name: 'Pastrami', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.99, hero: 9.99 } },
      { name: 'Chipotle Chicken', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Honey Turkey', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Oven Gold Turkey', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Salsalito Turkey', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.00, hero: 9.00 } },
      { name: 'Turkey Ham', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.00, hero: 9.00 } }
    ],
    'SANDWICHES': [
      { name: 'Chicken Cutlet', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Spicy Chicken Cutlet', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Philly Cheesesteak', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 9.99, hero: 10.99 } },
      { name: 'Chopped Cheese', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.99, hero: 9.99 } },
      { name: 'Grilled Chicken', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } }
    ],
    'BREAKFAST': [
      { name: 'Egg & Cheese', price: 4.99, requiresOptions: true, optionType: 'breakfast-bread' },
      { name: 'Bacon Egg & Cheese', price: 5.99, requiresOptions: true, optionType: 'breakfast-bread' },
      { name: 'Turkey Sausage Egg & Cheese', price: 5.99, requiresOptions: true, optionType: 'breakfast-bread' },
      { name: 'Roast Beef Egg & Cheese', price: 8.99, requiresOptions: true, optionType: 'breakfast-bread' },
      { name: 'Pastrami Egg & Cheese', price: 8.99, requiresOptions: true, optionType: 'breakfast-bread' },
      { name: 'Chicken Cutlet Egg & Cheese', price: 7.99, requiresOptions: true, optionType: 'breakfast-bread-no-bagel' },
      { name: 'BLT (Bacon, Lettuce, Tomato)', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 6.00, hero: 7.00 } },
      { name: 'Roll/Bagel with Butter', price: 2.00, requiresOptions: true, optionType: 'breakfast-bread' },
      { name: 'Roll/Bagel Cream Cheese with Bacon', price: 5.00, requiresOptions: true, optionType: 'breakfast-bread' }
    ],
    'OMELETTES': [
      { name: 'Mexican Omelette', price: 7.99, requiresOptions: false },
      { name: 'Veggie Omelette', price: 7.99, requiresOptions: false },
      { name: 'Create Your Own Omelette', price: 7.99, requiresOptions: true, optionType: 'omelette-veggies' },
    ],
    'BAGELS': [
      { name: 'Bagel with Cream Cheese', price: 3.99, requiresOptions: true, optionType: 'bagel-type' },
      { name: 'Bagel with Grape Jelly', price: 3.99, requiresOptions: true, optionType: 'bagel-type' },
      { name: 'Bagel with Egg & Cheese', price: 4.99, requiresOptions: true, optionType: 'bagel-type' },
      { name: 'Bagel with Bacon Egg & Cheese', price: 5.99, requiresOptions: true, optionType: 'bagel-type' },
      { name: 'Bagel with Turkey Sausage Egg & Cheese', price: 5.99, requiresOptions: true, optionType: 'bagel-type' },
      { name: 'Bagel with Roast Beef Egg & Cheese', price: 8.99, requiresOptions: true, optionType: 'bagel-type' },
      { name: 'Bagel with Pastrami Egg & Cheese', price: 8.99, requiresOptions: true, optionType: 'bagel-type' },
    ],
    'BURGERS': [
      { name: 'American Cheese Burger', price: 7.99, requiresOptions: false },
      { name: 'Chicken Cheese Burger', price: 7.99, requiresOptions: false },
      { name: 'Turkey Burger', price: 7.99, requiresOptions: false },
    ],
    'PLATTERS': [
      { name: 'Chicken Over Rice', price: 9.99, requiresOptions: true, optionType: 'platter-sauce' },
      { name: 'Lamb Over Rice', price: 9.99, requiresOptions: true, optionType: 'platter-sauce' },
      { name: 'Grilled Chicken Over Rice', price: 9.99, requiresOptions: true, optionType: 'platter-sauce' },
      { name: 'Crispy Chicken Over Rice', price: 9.99, requiresOptions: true, optionType: 'platter-sauce' },
    ],
    'GYRO': [
      { name: 'Chicken Gyro', price: 8.99, requiresOptions: true, optionType: 'gyro-sauce' },
      { name: 'Lamb Gyro', price: 8.99, requiresOptions: true, optionType: 'gyro-sauce' },
      { name: 'Grilled Chicken Gyro', price: 8.99, requiresOptions: true, optionType: 'gyro-sauce' },
      { name: 'Crispy Chicken Gyro', price: 8.99, requiresOptions: true, optionType: 'gyro-sauce' },
    ],
    'TENDERS': [
      { name: 'Tenders (Regular)', prices: {'3 pcs': 5.99, '5 pcs': 9.99, '8 pcs': 12.99, '12 pcs': 16.99}, requiresOptions: true, optionType: 'tender-size' },
      { name: 'Spicy Tenders', prices: {'3 pcs': 5.99, '5 pcs': 9.99, '8 pcs': 12.99, '12 pcs': 16.99}, requiresOptions: true, optionType: 'tender-size' },
    ],
    'NUGGETS': [
      { name: 'Nuggets', prices: {'4 pcs': 3.99, '6 pcs': 4.99, '10 pcs': 6.99, '20 pcs': 10.99}, requiresOptions: true, optionType: 'nugget-size' },
    ],
    'WINGS': [
      { name: 'Wings (Regular)', prices: {'4 pcs': 8.49, '6 pcs': 9.49, '9 pcs': 12.99, '12 pcs': 18.99}, requiresOptions: true, optionType: 'wing-size' },
      { name: 'Spicy Wings', prices: {'4 pcs': 8.49, '6 pcs': 9.49, '9 pcs': 12.99, '12 pcs': 18.99}, requiresOptions: true, optionType: 'wing-size' },
    ],
    'PANINIS': [
      { name: 'Roast Beef Panini', price: 9.99, requiresOptions: false },
      { name: 'Turkey Panini', price: 9.99, requiresOptions: false },
      { name: 'Grilled Chicken Panini', price: 9.99, requiresOptions: false },
      { name: 'Chipotle Chicken Panini', price: 9.99, requiresOptions: false },
      { name: 'Buffalo Chicken Panini', price: 9.99, requiresOptions: false },
      { name: 'BBQ Chicken Panini', price: 9.99, requiresOptions: false },
    ],
    'QUESADILLA': [
      { name: 'Grilled Chicken Quesadilla', price: 9.99, requiresOptions: false },
      { name: 'Chipotle Chicken Quesadilla', price: 9.99, requiresOptions: false },
      { name: 'Buffalo Chicken Quesadilla', price: 9.99, requiresOptions: false },
      { name: 'BBQ Chicken Quesadilla', price: 9.99, requiresOptions: false },
      { name: 'Vegetable Quesadilla', price: 9.99, requiresOptions: false },
    ],
    'SALADS': [
      { name: 'Build Your Own Salad', price: 6.99, requiresOptions: true, optionType: 'salad-toppings' },
    ],
    'SIDES': [
      { name: 'French Fries', price: 4.99, requiresOptions: false },
      { name: 'Seasoned Fries', price: 5.99, requiresOptions: false },
      { name: 'Onion Rings', price: 5.99, requiresOptions: false },
      { name: 'Mozzarella Sticks (5 pcs)', price: 5.99, requiresOptions: false },
      { name: 'Beef Patty', price: 3.99, requiresOptions: false },
    ],
    'JUICES': [
      { name: 'Orange Juice', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size' },
      { name: 'Beet Juice', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size' },
      { name: 'Carrot Juice', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size' },
      { name: 'Celery Apple Spinach Juice', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size' },
      { name: 'Lemon Apple Ginger', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size' },
      { name: 'Cucumber Apple Celery', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size' },
      { name: 'Detox', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size' },
      { name: 'Create Your Own Juice', prices: {small: 6.99, large: 7.99}, requiresOptions: true, optionType: 'juice-size-custom' },
    ],
    'COFFEE/TEA': [
      { name: 'Hot Coffee', prices: {small: 1.50, large: 2.00}, requiresOptions: true, optionType: 'coffee-size' },
      { name: 'Iced Coffee', prices: {small: 2.00, large: 3.00}, requiresOptions: true, optionType: 'coffee-size' },
      { name: 'Cappuccino', prices: {small: 3.00, large: 4.00}, requiresOptions: true, optionType: 'cappuccino-flavor-size' },
      { name: 'Cup of Ice', price: 1.00, requiresOptions: false },
      { name: 'Hot Tea', prices: {small: 1.50, large: 2.00}, requiresOptions: true, optionType: 'coffee-size' },
    ],
    'PASTRY': [
      { name: 'Pastry', price: 2.50, requiresOptions: false },
    ],
  };

  // Option configurations
  const optionConfigs: {[key: string]: {title: string, options: string[], multiSelect?: boolean, maxFree?: number, extraCharge?: number}} = {
    'breakfast-bread': {
      title: 'Choose Bread',
      options: ['Roll', 'White Bread', 'Wheat Bread']
    },
    'breakfast-bread-no-bagel': {
      title: 'Choose Bread',
      options: ['Roll', 'White Bread', 'Wheat Bread']
    },
    'breakfast-bread-limited': {
      title: 'Choose Bread',
      options: ['White Bread', 'Wheat Bread']
    },
    'bagel-type': {
      title: 'Choose Bagel',
      options: ['Plain', 'Raisin', 'Wheat', 'Everything', 'Sesame']
    },
    'roll-hero': {
      title: 'Choose Size',
      options: ['Roll', 'Hero']
    },
    'tender-size': {
      title: 'Choose Size',
      options: ['3 pcs', '5 pcs', '8 pcs', '12 pcs']
    },
    'nugget-size': {
      title: 'Choose Size',
      options: ['4 pcs', '6 pcs', '10 pcs', '20 pcs']
    },
    'wing-size': {
      title: 'Choose Size',
      options: ['4 pcs', '6 pcs', '9 pcs', '12 pcs']
    },
    'omelette-veggies': {
      title: 'Choose 3 Vegetables ($1.50 for each extra)',
      options: ['Onions', 'Green Peppers', 'Jalapeños', 'Mushrooms', 'Tomatoes', 'Spinach'],
      multiSelect: true,
      maxFree: 3,
      extraCharge: 1.50
    },
    'salad-toppings': {
      title: 'Choose Your Toppings (4 free, $1.00 for each extra)',
      options: ['Lettuce', 'Tomatoes', 'Cucumbers', 'Onions', 'Carrots', 'Peppers', 'Corn', 'Croutons', 'Cheese'],
      multiSelect: true,
      maxFree: 4,
      extraCharge: 1.00
    },
    'salad-dressing': {
      title: 'Choose Dressing',
      options: ['Ranch', 'Caesar', 'Italian', 'Blue Cheese', 'Honey Mustard', 'Balsamic Vinaigrette', 'No Dressing']
    },
    'platter-sauce': {
      title: 'Choose Sauce',
      options: ['White Sauce', 'Hot Sauce', 'BBQ Sauce', 'No Sauce']
    },
    'gyro-sauce': {
      title: 'Choose Sauce',
      options: ['White Sauce', 'Hot Sauce', 'BBQ Sauce', 'No Sauce']
    },
    'salad-dressing-old': {
      title: 'Choose Dressing',
      options: ['Ranch', 'Caesar', 'Blue Cheese', 'Honey Mustard', 'Italian', 'No Dressing']
    },
    'juice-size': {
      title: 'Choose Size',
      options: ['Small', 'Large']
    },
    'juice-size-custom': {
      title: 'Choose Size',
      options: ['Small', 'Large']
    },
    'juice-custom-small': {
      title: 'Choose Your Ingredients (4 included, $1.50 for each extra)',
      options: ['Apple', 'Orange', 'Carrot', 'Beet', 'Celery', 'Cucumber', 'Ginger', 'Lemon', 'Spinach', 'Kale', 'Pineapple', 'Watermelon'],
      multiSelect: true,
      maxFree: 4,
      extraCharge: 1.50
    },
    'juice-custom-large': {
      title: 'Choose Your Ingredients (7 included, $1.50 for each extra)',
      options: ['Apple', 'Orange', 'Carrot', 'Beet', 'Celery', 'Cucumber', 'Ginger', 'Lemon', 'Spinach', 'Kale', 'Pineapple', 'Watermelon'],
      multiSelect: true,
      maxFree: 7,
      extraCharge: 1.50
    },
    'coffee-size': {
      title: 'Choose Size',
      options: ['Small', 'Large']
    },
    'cappuccino-flavor-size': {
      title: 'Choose Flavor and Size',
      options: ['French Vanilla Small', 'French Vanilla Large', 'Chocolate Small', 'Chocolate Large']
    },
  };

  // Modifier configurations for different item types
  const modifierConfigs = {
    breakfast: [
      { name: 'Extra Egg', price: 1.50 },
      { name: 'Extra Cheese', price: 1.00 },
      { name: 'Extra Bacon', price: 2.00 },
      { name: 'Add Avocado', price: 2.50 },
      { name: 'Add Hash Brown', price: 2.00 },
    ],
    omelette: [
      { name: 'Extra Egg', price: 1.50 },
      { name: 'Extra Veggies', price: 1.50 },
      { name: 'Add Meat', price: 3.00 },
      { name: 'Extra Cheese', price: 1.00 },
    ],
    salad: [
      { name: 'Add Chicken', price: 3.00 },
      { name: 'Add Grilled Chicken', price: 3.00 },
      { name: 'Add Lamb', price: 3.00 },
      { name: 'Add Crispy Chicken', price: 3.00 },
    ],
    sandwich: [
      { name: 'Extra Meat', price: 3.00 },
      { name: 'Extra Cheese', price: 1.00 },
      { name: 'Add Bacon', price: 2.00 },
      { name: 'Add Avocado', price: 2.50 },
    ],
    burger: [
      { name: 'Extra Patty', price: 3.00 },
      { name: 'Extra Cheese', price: 1.00 },
      { name: 'Add Bacon', price: 2.00 },
      { name: 'Add Avocado', price: 2.50 },
    ],
    quesadilla: [
      { name: 'Extra Chicken', price: 3.00 },
      { name: 'Extra Cheese', price: 1.00 },
      { name: 'Add Sour Cream', price: 1.00 },
      { name: 'Add Guacamole', price: 2.50 },
      { name: 'Add Salsa', price: 0.50 },
    ],
    platters: [
      { name: 'Extra Meat', price: 3.00 },
      { name: 'Extra Rice', price: 2.00 },
      { name: 'Add Pita Bread', price: 1.00 },
      { name: 'Extra Sauce', price: 0.50 },
    ],
    gyro: [
      { name: 'Extra Meat', price: 3.00 },
      { name: 'Extra Tzatziki', price: 1.00 },
      { name: 'Add Feta', price: 1.50 },
      { name: 'Add Hot Sauce', price: 0.50 },
    ],
    panini: [
      { name: 'Extra Meat', price: 3.00 },
      { name: 'Extra Cheese', price: 1.00 },
      { name: 'Add Avocado', price: 2.50 },
      { name: 'Add Bacon', price: 2.00 },
    ],
    wings: [
      { name: 'Extra Sauce', price: 0.50 },
      { name: 'Add Ranch', price: 0.50 },
      { name: 'Add Blue Cheese', price: 0.50 },
      { name: 'Make it Spicy', price: 0.00 },
    ],
    tenders: [
      { name: 'Extra Sauce', price: 0.50 },
      { name: 'Add Ranch', price: 0.50 },
      { name: 'Add Blue Cheese', price: 0.50 },
      { name: 'Make it Spicy', price: 0.00 },
    ],
    nuggets: [
      { name: 'Extra Sauce', price: 0.50 },
      { name: 'Add Ranch', price: 0.50 },
      { name: 'Add Blue Cheese', price: 0.50 },
    ],
    bagel: [
      { name: 'Extra Cream Cheese', price: 1.00 },
      { name: 'Add Lox', price: 4.00 },
      { name: 'Add Tomato', price: 0.50 },
      { name: 'Add Onion', price: 0.50 },
    ],
    pastry: [
      { name: 'Warm it up', price: 0.00 },
      { name: 'Add Butter', price: 0.50 },
    ],
    sides: [
      { name: 'Extra Sauce', price: 0.50 },
      { name: 'Make it Large', price: 2.00 },
    ],
  };

  // Helper to determine modifier type from item name
  const getModifierType = (itemName: string): string => {
    const name = itemName.toLowerCase();

    // Check specific items first (more specific before general)
    if (name.includes('burger')) return 'burger';
    if (name.includes('quesadilla')) return 'quesadilla';
    if (name.includes('over rice')) return 'platters';
    if (name.includes('gyro')) return 'gyro';
    if (name.includes('panini')) return 'panini';
    if (name.includes('wings')) return 'wings';
    if (name.includes('tenders')) return 'tenders';
    if (name.includes('nuggets')) return 'nuggets';
    if (name.includes('omelette') || name.includes('omelet')) return 'omelette';
    if (name.includes('bagel')) return 'bagel';
    if (name.includes('salad')) return 'salad';
    if (name.includes('fries') || name.includes('onion rings') || name.includes('mozzarella')) return 'sides';
    if (name.includes('beef patty')) return 'sides';
    if (name.includes('pastry')) return 'pastry';

    // Breakfast items (check after bagel to avoid conflicts)
    if ((name.includes('egg') && name.includes('cheese')) ||
        (name.includes('bacon') && name.includes('egg')) ||
        (name.includes('sausage') && name.includes('egg')) ||
        (name.includes('roll') && name.includes('butter')) ||
        name.includes('blt')) return 'breakfast';

    // Sandwiches (check last as catch-all for meat items)
    if (name.includes('chicken cutlet') || name.includes('philly') ||
        name.includes('chopped cheese') || name.includes('grilled chicken') ||
        name.includes('roast beef') || name.includes('pastrami') ||
        name.includes('turkey') || name.includes('ham')) return 'sandwich';

    return 'sandwich'; // default
  };


  const comboUpcharge = 4.00; // Additional cost to make any item a combo

  // Food menu data structure (keep original for non-optimized items)
  const foodMenu = {
    'BREAKFAST': [
      { name: 'Egg & Cheese (Roll)', price: 4.99 },
      { name: 'Egg & Cheese (White Bread)', price: 4.99 },
      { name: 'Egg & Cheese (Wheat Bread)', price: 4.99 },
      { name: 'Bacon Egg & Cheese (Roll)', price: 5.99 },
      { name: 'Bacon Egg & Cheese (White Bread)', price: 5.99 },
      { name: 'Bacon Egg & Cheese (Wheat Bread)', price: 5.99 },
      { name: 'Turkey Sausage Egg & Cheese (Roll)', price: 5.99 },
      { name: 'Turkey Sausage Egg & Cheese (White Bread)', price: 5.99 },
      { name: 'Turkey Sausage Egg & Cheese (Wheat Bread)', price: 5.99 },
      { name: 'Roast Beef Egg & Cheese (Roll)', price: 8.99 },
      { name: 'Roast Beef Egg & Cheese (White Bread)', price: 8.99 },
      { name: 'Roast Beef Egg & Cheese (Wheat Bread)', price: 8.99 },
      { name: 'Pastrami Egg & Cheese (Roll)', price: 8.99 },
      { name: 'Pastrami Egg & Cheese (White Bread)', price: 8.99 },
      { name: 'Pastrami Egg & Cheese (Wheat Bread)', price: 8.99 },
      { name: 'Chicken Cutlet Egg & Cheese (White Bread)', price: 7.99 },
      { name: 'Chicken Cutlet Egg & Cheese (Wheat Bread)', price: 7.99 }
    ],
    'OMELETTES': [
      { name: 'Mexican Omelette', price: 7.99 },
      { name: 'Veggie Omelette', price: 7.99 },
      { name: 'Create Your Own Omelette', price: 7.99 },
      { name: 'Extra Egg', price: 1.50 },
      { name: 'Extra Veggies', price: 1.50 },
      { name: 'Add Vegetables', price: 1.50 },
      { name: 'Add Meat', price: 3.00 }
    ],
    'BAGELS': [
      { name: 'Bagel with Cream Cheese (Plain)', price: 3.99 },
      { name: 'Bagel with Cream Cheese (Raisin)', price: 3.99 },
      { name: 'Bagel with Cream Cheese (Wheat)', price: 3.99 },
      { name: 'Bagel with Cream Cheese (Everything)', price: 3.99 },
      { name: 'Bagel with Cream Cheese (Sesame)', price: 3.99 },
      { name: 'Bagel with Grape Jelly (Plain)', price: 3.99 },
      { name: 'Bagel with Grape Jelly (Raisin)', price: 3.99 },
      { name: 'Bagel with Grape Jelly (Wheat)', price: 3.99 },
      { name: 'Bagel with Grape Jelly (Everything)', price: 3.99 },
      { name: 'Bagel with Grape Jelly (Sesame)', price: 3.99 },
      { name: 'Bagel with Egg & Cheese (Plain)', price: 4.99 },
      { name: 'Bagel with Egg & Cheese (Raisin)', price: 4.99 },
      { name: 'Bagel with Egg & Cheese (Wheat)', price: 4.99 },
      { name: 'Bagel with Egg & Cheese (Everything)', price: 4.99 },
      { name: 'Bagel with Egg & Cheese (Sesame)', price: 4.99 },
      { name: 'Bagel with Bacon Egg & Cheese (Plain)', price: 5.99 },
      { name: 'Bagel with Bacon Egg & Cheese (Everything)', price: 5.99 },
      { name: 'Bagel with Turkey Sausage Egg & Cheese (Plain)', price: 5.99 },
      { name: 'Bagel with Turkey Sausage Egg & Cheese (Everything)', price: 5.99 },
      { name: 'Bagel with Roast Beef Egg & Cheese (Plain)', price: 8.99 },
      { name: 'Bagel with Pastrami Egg & Cheese (Plain)', price: 8.99 }
    ],
    'COLD CUTS SANDWICHES': [
      { name: 'Roast Beef', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.99, hero: 9.99 } },
      { name: 'Pastrami', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.99, hero: 9.99 } },
      { name: 'Chipotle Chicken', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Honey Turkey', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Oven Gold Turkey', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } }
    ],
    'SANDWICHES': [
      { name: 'Chicken Cutlet', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Spicy Chicken Cutlet', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } },
      { name: 'Philly Cheesesteak', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 9.99, hero: 10.99 } },
      { name: 'Chopped Cheese', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 8.99, hero: 9.99 } },
      { name: 'Grilled Chicken', requiresOptions: true, optionType: 'roll-hero', prices: { roll: 7.99, hero: 8.99 } }
    ],
    'BURGERS': [
      { name: 'American Cheese Burger', price: 7.99 },
      { name: 'Chicken Cheese Burger', price: 7.99 },
      { name: 'Turkey Burger', price: 7.99 }
    ],
    'PLATTERS': [
      { name: 'Chicken Over Rice', price: 9.99 },
      { name: 'Lamb Over Rice', price: 9.99 },
      { name: 'Grilled Chicken Over Rice', price: 9.99 },
      { name: 'Crispy Chicken Over Rice', price: 9.99 }
    ],
    'GYRO': [
      { name: 'Chicken Gyro', price: 8.99 },
      { name: 'Lamb Gyro', price: 8.99 },
      { name: 'Grilled Chicken Gyro', price: 8.99 },
      { name: 'Crispy Chicken Gyro', price: 8.99 }
    ],
    'SALADS': [
      { name: 'Build Your Own Salad', price: 6.99 }
    ],
    'SIDES': [
      { name: 'French Fries', price: 4.99 },
      { name: 'Seasoned Fries', price: 5.99 },
      { name: 'Onion Rings', price: 5.99 },
      { name: 'Mozzarella Sticks (5 pcs)', price: 5.99 },
      { name: 'Beef Patty', price: 3.99 }
    ],
    'TENDERS': [
      { name: 'Tenders (3 pcs)', price: 5.99 },
      { name: 'Tenders (5 pcs)', price: 9.99 },
      { name: 'Tenders (8 pcs)', price: 12.99 },
      { name: 'Tenders (12 pcs)', price: 16.99 },
      { name: 'Spicy Tenders (3 pcs)', price: 5.99 },
      { name: 'Spicy Tenders (5 pcs)', price: 9.99 },
      { name: 'Spicy Tenders (8 pcs)', price: 12.99 },
      { name: 'Spicy Tenders (12 pcs)', price: 16.99 }
    ],
    'NUGGETS': [
      { name: 'Nuggets (4 pcs)', price: 3.99 },
      { name: 'Nuggets (6 pcs)', price: 4.99 },
      { name: 'Nuggets (10 pcs)', price: 6.99 },
      { name: 'Nuggets (20 pcs)', price: 10.99 }
    ],
    'WINGS': [
      { name: 'Wings (4 pcs)', price: 8.49 },
      { name: 'Wings (6 pcs)', price: 9.49 },
      { name: 'Wings (9 pcs)', price: 12.99 },
      { name: 'Wings (12 pcs)', price: 18.99 },
      { name: 'Spicy Wings (4 pcs)', price: 8.49 },
      { name: 'Spicy Wings (6 pcs)', price: 9.49 },
      { name: 'Spicy Wings (9 pcs)', price: 12.99 },
      { name: 'Spicy Wings (12 pcs)', price: 18.99 }
    ],
    'PANINIS': [
      { name: 'Roast Beef Panini', price: 9.99 },
      { name: 'Turkey Panini', price: 9.99 },
      { name: 'Grilled Chicken Panini', price: 9.99 },
      { name: 'Chipotle Chicken Panini', price: 9.99 },
      { name: 'Buffalo Chicken Panini', price: 9.99 },
      { name: 'BBQ Chicken Panini', price: 9.99 }
    ],
    'QUESADILLA': [
      { name: 'Grilled Chicken Quesadilla', price: 9.99 },
      { name: 'Chipotle Chicken Quesadilla', price: 9.99 },
      { name: 'Buffalo Chicken Quesadilla', price: 9.99 },
      { name: 'BBQ Chicken Quesadilla', price: 9.99 },
      { name: 'Vegetable Quesadilla', price: 9.99 }
    ],
    'JUICES': [
      { name: 'Orange Juice (Small)', price: 6.99 },
      { name: 'Orange Juice (Large)', price: 7.99 },
      { name: 'Beet Juice (Small)', price: 6.99 },
      { name: 'Beet Juice (Large)', price: 7.99 },
      { name: 'Carrot Juice (Small)', price: 6.99 },
      { name: 'Carrot Juice (Large)', price: 7.99 },
      { name: 'Celery Apple Spinach Juice (Small)', price: 6.99 },
      { name: 'Celery Apple Spinach Juice (Large)', price: 7.99 },
      { name: 'Lemon Apple Ginger (Small)', price: 6.99 },
      { name: 'Lemon Apple Ginger (Large)', price: 7.99 },
      { name: 'Cucumber Apple Celery (Small)', price: 6.99 },
      { name: 'Cucumber Apple Celery (Large)', price: 7.99 },
      { name: 'Detox (Small)', price: 6.99 },
      { name: 'Detox (Large)', price: 7.99 },
      { name: 'Create Your Own Juice (Small)', price: 6.99 },
      { name: 'Create Your Own Juice (Large)', price: 7.99 }
    ],
    'CHEESE (By the Pound)': [
      { name: 'American Cheese (1 lb)', price: 9.99 },
      { name: 'Muenster Cheese (1 lb)', price: 9.99 },
      { name: 'Pepper Jack Cheese (1 lb)', price: 9.99 },
      { name: 'Mozzarella Cheese (1 lb)', price: 9.99 },
      { name: 'Swiss Cheese (1 lb)', price: 9.99 },
      { name: 'Provolone Cheese (1 lb)', price: 9.99 }
    ],
    'COLD CUTS (By the Pound)': [
      { name: 'Roast Beef (1 lb)', price: 15.99 },
      { name: 'Pastrami (1 lb)', price: 15.99 },
      { name: 'Chipotle Chicken (1 lb)', price: 13.99 },
      { name: 'Honey Turkey (1 lb)', price: 13.99 },
      { name: 'Oven Gold Turkey (1 lb)', price: 13.99 },
      { name: 'Salsalito Turkey (1 lb)', price: 14.00 },
      { name: 'Turkey Ham (1 lb)', price: 14.00 }
    ],
    'COFFEE/TEA': [
      { name: 'Hot Coffee (Small)', price: 1.50 },
      { name: 'Hot Coffee (Large)', price: 2.00 },
      { name: 'Iced Coffee (Small)', price: 2.00 },
      { name: 'Iced Coffee (Large)', price: 3.00 },
      { name: 'Cappuccino French Vanilla (Small)', price: 3.00 },
      { name: 'Cappuccino French Vanilla (Large)', price: 4.00 },
      { name: 'Cappuccino Chocolate (Small)', price: 3.00 },
      { name: 'Cappuccino Chocolate (Large)', price: 4.00 },
      { name: 'Cup of Ice', price: 1.00 },
      { name: 'Hot Tea (Small)', price: 1.50 },
      { name: 'Hot Tea (Large)', price: 2.00 }
    ],
    'PASTRY': [
      { name: 'Pastry', price: 2.50 }
    ]
  };

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

  // Search products function
  const searchProducts = async (query: string) => {
    if (!query.trim() || !storeId) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchUrl = `/api/products?storeId=${storeId}&search=${encodeURIComponent(query.trim())}`;
      console.log('Search URL:', searchUrl); // Debug log
      const response = await fetch(searchUrl);
      console.log('Search response status:', response.status); // Debug log

      if (response.ok) {
        const products = await response.json();
        console.log('Search results:', products); // Debug log
        setSearchResults(products.slice(0, 10)); // Limit to 10 results
      } else {
        console.log('Search failed with status:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, storeId]);

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

      // Check if we should block scanning (but allow in price check mode)
      if (!priceCheckMode && (notFoundUpc || showManualKeyIn || showKeyIn || showAddProduct)) {
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
  }, [paymentMode, showManualEntry, scanBuffer, storeId, notFoundUpc, showManualKeyIn, showKeyIn, showAddProduct, message, priceCheckMode]);

  const handleScanComplete = async (upc: string) => {
    if (!upc || !storeId) return;

    // Check session before processing scan
    const sessionValid = await checkSession();
    if (!sessionValid) {
      setMessage('⚠️ Session expired. Please login again.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // If in price check mode, don't check for unresolved products
    if (!priceCheckMode) {
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
    }

    try {
      const response = await fetch(`/api/products?upc=${upc}&storeId=${storeId}`);

      if (response.ok) {
        const product = await response.json();

        // If in price check mode, show price and don't add to cart
        if (priceCheckMode) {
          setPriceCheckProduct(product);
          return;
        }

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
            setCart([{ product, quantity: 1 }, ...cart]);
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
            setCart([{ product, quantity: 1 }, ...cart]);
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
            setCart([{ product, quantity: 1 }, ...cart]);
          }
          setMessage(`✓ Added: ${product.name} - $${product.price.toFixed(2)}`);
          // Show mobile scan feedback
          showScanFeedback(product);
        }

        setNotFoundUpc('');
        setTimeout(() => setMessage(''), 7000);
      } else {
        // Product not found
        if (priceCheckMode) {
          // In price check mode, just show not found message
          setMessage(`❌ Product not found: ${upc}`);
          setTimeout(() => setMessage(''), 3000);
        } else {
          // Normal mode - check for similar products
          await checkForSimilarProducts(upc);
          setMessage(''); // Clear any existing message
        }
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
    setCart([{ product: tempProduct, quantity: 1 }, ...cart]);
    setMessage(`✓ Added: ${tempProduct.name} - $${tempProduct.price.toFixed(2)}`);

    // Reset states
    setShowManualKeyIn(false);
    setManualItemName('');
    setManualItemPrice('');
    setTimeout(() => setMessage(''), 7000);
  };

  // Handle adding optimized food item (with options)
  const handleOptimizedFoodClick = (item: any) => {
    if (item.requiresOptions) {
      // Open option selection modal
      // For items with prices object, set a default price
      const defaultPrice = item.price || (item.prices ? Object.values(item.prices)[0] : 0);
      setSelectedBaseItem({...item, price: defaultPrice});
      setSelectedOptions({});
      setShowOptionModal(true);
    } else {
      // Direct add for items without options
      handleFoodItemClick({name: item.name, price: item.price});
    }
  };

  // Handle option selection confirmation
  const handleOptionConfirm = () => {
    if (!selectedBaseItem) return;

    const config = optionConfigs[selectedBaseItem.optionType as keyof typeof optionConfigs];
    const selectedOption = selectedOptions[selectedBaseItem.optionType];

    if (!selectedOption) {
      setMessage('Please select an option');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    // Construct the full item name with options
    let fullName = selectedBaseItem.name;
    let finalPrice = selectedBaseItem.price || 0;

    // Handle different option types
    if (selectedBaseItem.optionType === 'roll-hero') {
      const size = selectedOption.toLowerCase();
      fullName = `${selectedBaseItem.name} (${selectedOption})`;
      finalPrice = selectedBaseItem.prices[size];
    } else if (selectedBaseItem.optionType.includes('size')) {
      fullName = `${selectedBaseItem.name} (${selectedOption})`;
      finalPrice = selectedBaseItem.prices[selectedOption];
    } else if (selectedBaseItem.optionType.includes('breakfast-bread')) {
      fullName = `${selectedBaseItem.name} (${selectedOption})`;
      finalPrice = selectedBaseItem.price;
    } else if (selectedBaseItem.optionType === 'bagel-type') {
      fullName = `${selectedBaseItem.name} (${selectedOption})`;
      finalPrice = selectedBaseItem.price;
    }

    // Add to food cart
    const existingItem = foodCart.find(cartItem => cartItem.name === fullName);
    if (existingItem) {
      setFoodCart(foodCart.map(cartItem =>
        cartItem.name === fullName
          ? {...cartItem, quantity: cartItem.quantity + 1}
          : cartItem
      ));
    } else {
      setFoodCart([...foodCart, {name: fullName, price: finalPrice, quantity: 1}]);
    }

    // Close modal and reset
    setShowOptionModal(false);
    setSelectedBaseItem(null);
    setSelectedOptions({});
    setSelectedCartItem(null);
  };

  // Handle adding food item to temporary food cart
  const handleFoodItemClick = (item: {name: string, price: number}) => {
    // Check if this is a weight-based item (by the pound)
    const isWeightBased = selectedFoodCategory === 'CHEESE (By the Pound)' ||
                          selectedFoodCategory === 'COLD CUTS (By the Pound)';

    if (isWeightBased) {
      // Open weight input modal for by-the-pound items
      setSelectedWeightItem(item);
      setWeightInput('');
      setShowWeightModal(true);
    } else {
      // For regular items without customizations, add directly to food cart
      const existingItem = foodCart.find(cartItem => cartItem.name === item.name);
      if (existingItem) {
        setFoodCart(foodCart.map(cartItem =>
          cartItem.name === item.name
            ? {...cartItem, quantity: cartItem.quantity + 1}
            : cartItem
        ));
      } else {
        setFoodCart([...foodCart, {name: item.name, price: item.price, quantity: 1}]);
      }
      setMessage(`✓ Added: ${item.name}`);
      setTimeout(() => setMessage(''), 2000);
    }
  };



  // Handle weight submission for by-the-pound items
  const handleWeightSubmit = () => {
    if (!selectedWeightItem || !weightInput) return;

    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      setMessage('Please enter a valid weight');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    // Calculate total price based on weight (price is per pound)
    const totalPrice = selectedWeightItem.price * weight;

    const existingItem = foodCart.find(cartItem => cartItem.name === selectedWeightItem.name);
    if (existingItem) {
      // Update weight for existing item
      setFoodCart(foodCart.map(cartItem =>
        cartItem.name === selectedWeightItem.name
          ? {...cartItem, weight: weight, quantity: 1, isWeightBased: true}
          : cartItem
      ));
    } else {
      // Add new weight-based item
      setFoodCart([...foodCart, {
        name: selectedWeightItem.name,
        price: selectedWeightItem.price,
        quantity: 1,
        weight: weight,
        isWeightBased: true
      }]);
    }

    // Close modal and reset
    setShowWeightModal(false);
    setWeightInput('');
    setSelectedWeightItem(null);
  };

  // Handle removing/decreasing food item quantity
  const handleFoodItemDecrease = (item: {name: string, price: number}) => {
    const existingItem = foodCart.find(cartItem => cartItem.name === item.name);
    if (existingItem) {
      if (existingItem.quantity > 1) {
        // Decrease quantity
        setFoodCart(foodCart.map(cartItem =>
          cartItem.name === item.name
            ? {...cartItem, quantity: cartItem.quantity - 1}
            : cartItem
        ));
      } else {
        // Remove item from cart
        setFoodCart(foodCart.filter(cartItem => cartItem.name !== item.name));
      }
    }
  };

  // Handle Done button - add all food items to main cart
  const handleFoodDone = () => {
    // Only proceed if there are items to add
    if (foodCart.length === 0) {
      setShowFoodSelection(false);
      return;
    }

    // Create a new cart array with all food items added
    let newCart = [...cart];

    foodCart.forEach(foodItem => {
      // Calculate total price including modifiers
      const modifierTotal = foodItem.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;

      // For weight-based items, calculate total price
      const itemPrice = foodItem.isWeightBased
        ? (foodItem.price * (foodItem.weight || 0)) + modifierTotal
        : foodItem.price + modifierTotal;

      // Build item name with modifiers and weight
      let itemName = foodItem.name;
      if (foodItem.isWeightBased && foodItem.weight) {
        itemName = `${foodItem.name} (${foodItem.weight} lbs)`;
      }
      if (foodItem.modifiers && foodItem.modifiers.length > 0) {
        // Group modifiers by name and count
        const modifierCounts: {[key: string]: number} = {};
        foodItem.modifiers.forEach(mod => {
          modifierCounts[mod.name] = (modifierCounts[mod.name] || 0) + 1;
        });

        const modifierText = Object.entries(modifierCounts)
          .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
          .join(', ');
        itemName = foodItem.isWeightBased && foodItem.weight
          ? `${foodItem.name} (${foodItem.weight} lbs, ${modifierText})`
          : `${foodItem.name} (${modifierText})`;
      }

      // Create temporary product for each food item
      const tempProduct: Product = {
        _id: `food_${Date.now()}_${Math.random()}`,
        upc: `FOOD_${Date.now()}_${Math.random()}`,
        name: itemName,
        price: itemPrice,
        inventory: 999
      };

      // Check if the item already exists in cart (including modifiers)
      const existingIndex = newCart.findIndex(item => item.product.name === itemName);

      if (existingIndex !== -1) {
        // Update quantity of existing item
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + foodItem.quantity
        };
      } else {
        // Add new item to cart with weight information if applicable
        const cartItem: CartItem = {
          product: tempProduct,
          quantity: foodItem.quantity
        };

        if (foodItem.isWeightBased) {
          cartItem.weight = foodItem.weight;
          cartItem.isWeightBased = true;
          cartItem.pricePerPound = foodItem.price;
        }

        newCart.unshift(cartItem);
      }
    });

    // Update cart state once with all items
    setCart(newCart);

    // Show success message
    const totalItems = foodCart.reduce((sum, item) => sum + item.quantity, 0);
    setMessage(`✓ Added ${totalItems} food item${totalItems > 1 ? 's' : ''} to cart`);

    // Reset food selection only after successful addition
    setShowFoodSelection(false);
    setSelectedFoodCategory(null);
    setFoodCart([]); // Clear the food cart only after items are added
    setTimeout(() => setMessage(''), 3000);
  };

  // Handle open food item addition
  const handleOpenFoodAdd = () => {
    if (!openFoodPrice || parseFloat(openFoodPrice) <= 0) return;

    const price = parseFloat(openFoodPrice);

    // Generate a short unique identifier for display (last 4 digits of timestamp)
    const timestamp = Date.now();
    const shortId = timestamp.toString().slice(-4);

    // Add to food cart with unique name to ensure separate line items
    // Include a short ID that makes each item unique but isn't too verbose
    const openFoodItem = {
      name: `Open Food Item - $${price.toFixed(2)} (#${shortId})`,
      price: price,
      quantity: 1
    };

    setFoodCart([...foodCart, openFoodItem]);

    // Clear and close
    setOpenFoodPrice('');
    setShowOpenFood(false);
    setMessage(`✓ Added Open Food Item - $${price.toFixed(2)}`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Handle open item addition (general items above order summary)
  const handleOpenItemAdd = () => {
    if (!openItemPrice || parseFloat(openItemPrice) <= 0) return;

    const price = parseFloat(openItemPrice);

    // Generate unique identifier using timestamp
    const timestamp = Date.now();
    const shortId = timestamp.toString().slice(-4);

    // Add directly to cart with proper structure
    const newCartItem: CartItem = {
      product: {
        _id: `open_${timestamp}`,
        upc: `OPEN_${timestamp}`,
        name: `Open Item - $${price.toFixed(2)} (#${shortId})`,
        price: price,
        inventory: 999
      },
      quantity: 1
    };

    setCart([newCartItem, ...cart]);

    // Clear and close
    setOpenItemPrice('');
    setShowOpenItem(false);
    setMessage(`✓ Added Open Item - $${price.toFixed(2)}`);
    setTimeout(() => setMessage(''), 3000);
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
        setCart([{ product: newProduct, quantity: 1 }, ...cart]);
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
                      setCart([{ product: similarProduct, quantity: 1 }, ...cart]);
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

      {/* On-Screen Numpad for UPC Entry */}
      {showUpcNumpad && (
        <OnScreenNumpad
          value={manualUpc}
          onChange={setManualUpc}
          onClose={() => setShowUpcNumpad(false)}
          onEnter={() => {
            setShowUpcNumpad(false);
            if (manualUpc.trim()) {
              handleManualSubmit({ preventDefault: () => {} } as React.FormEvent);
            }
          }}
          decimal={false}
          maxLength={15}
          title={priceCheckMode ? "Enter UPC for Price Check" : "Enter UPC Code"}
        />
      )}

      {/* Smart Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">{priceCheckMode ? 'Price Check - Search' : 'Search Products'}</h3>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-black hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={() => setShowSearchKeyboard(true)}
                placeholder="Type product name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                readOnly
              />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {isSearching && (
                <div className="text-center py-4">
                  <div className="text-black">Searching...</div>
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-black">No products found</div>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => {
                        if (priceCheckMode) {
                          // In price check mode, show price
                          setPriceCheckProduct(product);
                          setShowSearchModal(false);
                          setShowSearchKeyboard(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        } else {
                          const newCartItem: CartItem = {
                            product: {
                              _id: product._id,
                              upc: product.upc,
                              name: product.name,
                              price: product.price,
                              inventory: product.inventory
                            },
                            quantity: 1
                          };

                          // Add item to top of cart (prepend instead of append)
                          setCart([newCartItem, ...cart]);

                          // Show scan feedback in the middle of screen
                          showScanFeedback(product, `Added: ${product.name} - $${product.price.toFixed(2)}`);

                          // Close modal and reset search
                          setShowSearchModal(false);
                          setShowSearchKeyboard(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <div className="font-medium text-black">{product.name}</div>
                      <div className="text-sm text-black">
                        ${product.price.toFixed(2)} • Stock: {product.inventory}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <div className="text-black">Start typing to search products</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Keyboard for Search Input */}
      {showSearchKeyboard && (
        <OnScreenKeyboard
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => setShowSearchKeyboard(false)}
          onEnter={() => setShowSearchKeyboard(false)}
          title="Search Products"
          type="text"
        />
      )}

      {/* On-Screen Numpad for Key in Amount */}
      {showKeyInNumpad && (
        <OnScreenNumpad
          value={keyInAmount}
          onChange={setKeyInAmount}
          onClose={() => setShowKeyInNumpad(false)}
          onEnter={() => setShowKeyInNumpad(false)}
          decimal={true}
          title="Enter Amount"
        />
      )}

      {/* On-Screen Numpad for Open Food Price */}
      {showOpenFoodNumpad && (
        <OnScreenNumpad
          value={openFoodPrice}
          onChange={setOpenFoodPrice}
          onClose={() => {
            setShowOpenFoodNumpad(false);
            setOpenFoodPrice('');
          }}
          onEnter={() => {
            if (openFoodPrice && parseFloat(openFoodPrice) > 0) {
              handleOpenFoodAdd();
            }
            setShowOpenFoodNumpad(false);
          }}
          decimal={true}
          title="Enter Open Food Price"
          zIndex={10001}
        />
      )}

      {/* Open Item Numpad Modal */}
      {showOpenItem && (
        <OnScreenNumpad
          value={openItemPrice}
          onChange={setOpenItemPrice}
          onClose={() => {
            setShowOpenItem(false);
            setOpenItemPrice('');
          }}
          onEnter={() => {
            if (openItemPrice && parseFloat(openItemPrice) > 0) {
              handleOpenItemAdd();
            }
            setShowOpenItem(false);
          }}
          decimal={true}
          title="Enter Open Item Price"
          zIndex={10001}
        />
      )}

      {/* Custom Price Keypad for Modifier */}
      {showCustomPriceKeypad && (
        <OnScreenNumpad
          value={customAddOnPrice}
          onChange={setCustomAddOnPrice}
          onClose={() => {
            setShowCustomPriceKeypad(false);
            setCustomAddOnPrice('');
          }}
          onEnter={() => {
            if (customAddOnPrice && parseFloat(customAddOnPrice) > 0) {
              // Add custom price add-on as a modifier
              const price = parseFloat(customAddOnPrice);
              const customKey = `Custom Add-On - $${price.toFixed(2)}`;

              // Add to selected modifiers
              setSelectedModifiers(prev => ({
                ...prev,
                [customKey]: 1
              }));

              setShowCustomPriceKeypad(false);
              setCustomAddOnPrice('');
              setMessage(`✓ Added Custom Add-On - $${price.toFixed(2)}`);
              setTimeout(() => setMessage(''), 3000);
            }
          }}
          decimal={true}
          maxLength={7}
          title="Enter Custom Add-On Price"
          zIndex={10002}
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
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priceCheckMode ? 'bg-orange-500 animate-pulse' : isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className="text-xs sm:text-sm text-black whitespace-nowrap">
                      {priceCheckMode ? 'Price Check Mode' : isScanning ? 'Scanning...' : 'Scanner ready'}
                    </span>
                    {isScanning && scanBuffer && (
                      <span className="text-xs font-mono text-black hidden sm:inline">{scanBuffer}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-6 px-2 py-1">
                    <button
                      onClick={() => {
                        setPriceCheckMode(!priceCheckMode);
                        setPriceCheckProduct(null);
                        setPriceCheckBuffer('');
                      }}
                      className={`${priceCheckMode ? 'text-white bg-orange-600 hover:bg-orange-700' : 'text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100'} flex items-center gap-2 px-3 py-2 rounded-lg active:bg-orange-200 transition-colors text-sm font-medium`}
                    >
                      <Package className="w-4 h-4" />
                      <span>{priceCheckMode ? 'Exit Price Check' : 'Price Check'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowSearchModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-700 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 active:bg-purple-200 transition-colors text-sm font-medium"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Search</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUpcNumpad(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <Keyboard className="w-4 h-4" />
                      <span>Enter UPC</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowManualKeyIn(true);
                      }}
                      className="text-green-600 hover:text-green-700 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 active:bg-green-200 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Manual Item</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowFoodSelection(true);
                        setSelectedFoodCategory(null);
                        // Don't clear foodCart - preserve previous selections
                      }}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <span className="text-lg">🍔</span>
                      <span>FOOD</span>
                      {foodCart.length > 0 && (
                        <span>({foodCart.reduce((sum, item) => sum + item.quantity, 0)})</span>
                      )}
                    </button>
                  </div>
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

            {paymentMode === 'idle' && showKeyIn && (
              <div className="bg-white p-4 rounded-xl shadow-sm mb-3 flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-black">Key in Amount</h3>
                  <button
                    onClick={() => {
                      setShowKeyIn(false);
                      setKeyInAmount('');
                    }}
                    className="text-black hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-black mb-1">Amount *</label>
                  <div
                    onClick={() => setShowKeyInNumpad(true)}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{keyInAmount ? `$${keyInAmount}` : <span className="text-gray-400">Tap to enter amount</span>}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (keyInAmount) {
                        // Add the Key in item to cart
                        const existingItem = cart.find(item => item.product.name === 'Key in');
                        if (existingItem) {
                          setCart(cart.map(item =>
                            item.product.name === 'Key in'
                              ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * parseFloat(keyInAmount) }
                              : item
                          ));
                        } else {
                          const newCartItem = {
                            id: Date.now(),
                            product: {
                              upc: `KEYIN_${Date.now()}`,
                              name: 'Key in',
                              price: parseFloat(keyInAmount),
                              inventory: 999
                            },
                            quantity: 1,
                            totalPrice: parseFloat(keyInAmount)
                          };
                          setCart([newCartItem, ...cart]);
                        }

                        setShowKeyIn(false);
                        setKeyInAmount('');
                        setMessage(`✓ Added: Key in - $${keyInAmount}`);
                        setTimeout(() => setMessage(''), 3000);
                      }
                    }}
                    disabled={!keyInAmount}
                    className="flex-1 bg-orange-600 text-white py-2 rounded text-sm hover:bg-orange-700 disabled:bg-gray-400"
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowKeyIn(false);
                      setKeyInAmount('');
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
                      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
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

            {/* Option Selection Modal */}
            {showOptionModal && selectedBaseItem && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center"
                   onClick={(e) => {
                     // Dismiss if clicking outside the modal
                     if (e.target === e.currentTarget) {
                       setShowOptionModal(false);
                       setSelectedBaseItem(null);
                       setSelectedOptions({});
                       setMultiSelectOptions({});
                       setSelectedCartItem(null);
                     }
                   }}>
                <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-[95vw] h-[90vh] w-full mx-2 flex flex-col"
                     onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setShowOptionModal(false);
                      setSelectedBaseItem(null);
                      setSelectedOptions({});
                      setMultiSelectOptions({});
                      setSelectedCartItem(null);
                    }}
                    className="text-gray-600 hover:text-gray-800 font-medium mb-2 self-start"
                  >
                    ← Back
                  </button>
                  <h3 className="text-xl font-bold text-black mb-1 text-center">
                    {selectedBaseItem.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 text-center">
                    {optionConfigs[selectedBaseItem.optionType]?.title}
                    {optionConfigs[selectedBaseItem.optionType]?.multiSelect && (
                      <span className="block text-xs mt-1">
                        Selected: {Object.values(multiSelectOptions).reduce((sum, count) => sum + count, 0)}
                        {optionConfigs[selectedBaseItem.optionType]?.maxFree &&
                         Object.values(multiSelectOptions).reduce((sum, count) => sum + count, 0) > (optionConfigs[selectedBaseItem.optionType]?.maxFree || 0) &&
                          ` (+$${((Object.values(multiSelectOptions).reduce((sum, count) => sum + count, 0) - (optionConfigs[selectedBaseItem.optionType]?.maxFree || 0)) *
                                   (optionConfigs[selectedBaseItem.optionType]?.extraCharge || 0)).toFixed(2)} extra)`}
                      </span>
                    )}
                  </p>
                  <div className={`flex-1 grid gap-1.5 content-start p-1 ${(() => {
                    const optionCount = optionConfigs[selectedBaseItem.optionType]?.options?.length || 0;
                    if (optionCount <= 4) return 'grid-cols-2';
                    if (optionCount <= 9) return 'grid-cols-3';
                    if (optionCount <= 16) return 'grid-cols-4';
                    return 'grid-cols-5';
                  })()}`}>
                    {optionConfigs[selectedBaseItem.optionType]?.options?.map((option) => {
                      const optionCount = optionConfigs[selectedBaseItem.optionType]?.options?.length || 0;

                      let price = selectedBaseItem.price;
                      if (selectedBaseItem.prices) {
                        if (selectedBaseItem.optionType === 'roll-hero') {
                          price = selectedBaseItem.prices[option.toLowerCase()];
                        } else if (selectedBaseItem.optionType === 'juice-size' || selectedBaseItem.optionType === 'juice-size-custom') {
                          price = selectedBaseItem.prices[option.toLowerCase()];
                        } else if (selectedBaseItem.optionType === 'coffee-size') {
                          price = selectedBaseItem.prices[option.toLowerCase()];
                        } else if (selectedBaseItem.optionType === 'cappuccino-flavor-size') {
                          // Extract size from option (e.g., "French Vanilla Small" -> "small")
                          const sizePart = option.split(' ').pop();
                          price = selectedBaseItem.prices[sizePart?.toLowerCase() || 'small'];
                        } else {
                          price = selectedBaseItem.prices[option];
                        }
                      }

                      // Determine button height based on number of options
                      let buttonHeight = 'h-[150px]';
                      if (optionCount > 12) buttonHeight = 'h-[80px]';
                      else if (optionCount > 9) buttonHeight = 'h-[100px]';
                      else if (optionCount > 6) buttonHeight = 'h-[120px]';

                      const config = optionConfigs[selectedBaseItem.optionType];
                      const isMultiSelect = config?.multiSelect;
                      const quantity = multiSelectOptions[option] || 0;
                      const isSelected = quantity > 0;

                      return (
                        <div
                          key={option}
                          className={`${buttonHeight} relative flex flex-col items-center justify-center p-1.5 bg-white border-2 ${
                            isSelected ? 'border-blue-500' : 'border-gray-300'
                          } rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all`}
                        >
                          <button
                            onClick={() => {
                              if (isMultiSelect) {
                                // Multi-select logic - increment quantity on each click
                                const newOptions = { ...multiSelectOptions };
                                newOptions[option] = (newOptions[option] || 0) + 1;
                                setMultiSelectOptions(newOptions);
                              } else {
                              // Single select - immediately add to cart
                              setSelectedOptions({...selectedOptions, [selectedBaseItem.optionType]: option});

                              // Construct the full item name with options
                              let fullName = selectedBaseItem.name;
                              let finalPrice = price || 0;

                              if (selectedBaseItem.optionType === 'roll-hero') {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              } else if (selectedBaseItem.optionType === 'juice-size-custom') {
                                // For Create Your Own Juice, save the size and show ingredients selection
                                const juicePrice = selectedBaseItem.prices[option.toLowerCase()];
                                const ingredientOptionType = option.toLowerCase() === 'small' ? 'juice-custom-small' : 'juice-custom-large';


                                // Create a new item for the ingredients selection
                                setSelectedBaseItem({
                                  ...selectedBaseItem,
                                  optionType: ingredientOptionType,
                                  selectedSize: option,
                                  basePrice: juicePrice,
                                  prices: selectedBaseItem.prices // Keep prices for reference
                                });
                                setMultiSelectOptions({});
                                return; // Don't close modal, continue to ingredients selection
                              } else if (selectedBaseItem.optionType.includes('size')) {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              } else if (selectedBaseItem.optionType.includes('breakfast-bread')) {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              } else if (selectedBaseItem.optionType === 'bagel-type') {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              } else if (selectedBaseItem.optionType.includes('sauce') || selectedBaseItem.optionType.includes('dressing')) {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              } else if (selectedBaseItem.optionType === 'juice-size') {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              } else if (selectedBaseItem.optionType === 'coffee-size') {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              } else if (selectedBaseItem.optionType === 'cappuccino-flavor-size') {
                                // Format: "Cappuccino (French Vanilla, Small)"
                                const parts = option.split(' ');
                                const size = parts.pop();
                                const flavor = parts.join(' ');
                                fullName = `${selectedBaseItem.name} (${flavor}, ${size})`;
                              } else {
                                fullName = `${selectedBaseItem.name} (${option})`;
                              }

                              // Add to food cart
                              const existingItem = foodCart.find(cartItem => cartItem.name === fullName);
                              if (existingItem) {
                                setFoodCart(foodCart.map(cartItem =>
                                  cartItem.name === fullName
                                    ? {...cartItem, quantity: cartItem.quantity + 1}
                                    : cartItem
                                ));
                              } else {
                                setFoodCart([...foodCart, {name: fullName, price: finalPrice, quantity: 1}]);
                              }

                              // Close modal
                              setShowOptionModal(false);
                              setSelectedBaseItem(null);
                              setSelectedOptions({});
                              setSelectedCartItem(null);
                            }
                          }}
                          className="w-full h-full flex flex-col items-center justify-center active:scale-95"
                        >
                          <span className={`font-semibold text-black text-center leading-tight ${
                            optionCount > 12 ? 'text-xs' : optionCount > 9 ? 'text-sm' : 'text-base'
                          }`}>
                            {option}
                          </span>
                          {/* Only show price for single-select options */}
                          {!isMultiSelect && (
                            <span className={`text-green-600 font-bold mt-1 ${
                              optionCount > 12 ? 'text-xs' : optionCount > 9 ? 'text-sm' : 'text-base'
                            }`}>
                              ${price?.toFixed(2)}
                            </span>
                          )}
                          {/* Show quantity for selected multi-select options */}
                          {isMultiSelect && isSelected && (
                            <span className="text-black font-bold text-lg mt-1">{quantity}x</span>
                          )}
                        </button>
                        {/* Minus button outside of main button for multi-select */}
                        {isMultiSelect && isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newOptions = { ...multiSelectOptions };
                              if (newOptions[option] > 1) {
                                newOptions[option]--;
                              } else {
                                delete newOptions[option];
                              }
                              setMultiSelectOptions(newOptions);
                            }}
                            className="absolute top-1 left-1 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold hover:bg-red-600 z-10"
                          >
                            −
                          </button>
                        )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add to Cart button for multi-select options */}
                  {optionConfigs[selectedBaseItem.optionType]?.multiSelect && (
                    <div className="mt-3 border-t pt-3">
                      <button
                        onClick={() => {
                          const config = optionConfigs[selectedBaseItem.optionType];

                          const totalItems = Object.values(multiSelectOptions).reduce((sum, count) => sum + count, 0);

                          if (totalItems === 0) {
                            // Show error or just return
                            return;
                          }

                          // Calculate price with extra charges
                          let finalPrice = selectedBaseItem.basePrice || selectedBaseItem.price || 0;
                          const maxFree = config?.maxFree || 0;
                          const extraCharge = config?.extraCharge || 0;

                          if (totalItems > maxFree) {
                            finalPrice += (totalItems - maxFree) * extraCharge;
                          }

                          // Construct the full item name with selected options and quantities
                          const optionsList = Object.entries(multiSelectOptions)
                            .map(([item, qty]) => qty > 1 ? `${qty}x ${item}` : item)
                            .join(', ');

                          // For Create Your Own Juice, include the size in the name
                          let fullName;
                          if (selectedBaseItem.optionType === 'juice-custom-small' || selectedBaseItem.optionType === 'juice-custom-large') {
                            const size = selectedBaseItem.selectedSize || (selectedBaseItem.optionType === 'juice-custom-small' ? 'Small' : 'Large');
                            fullName = `${selectedBaseItem.name.replace(' (Small)', '').replace(' (Large)', '')} (${size}, ${optionsList})`;
                          } else {
                            fullName = `${selectedBaseItem.name} (${optionsList})`;
                          }

                          // Check if we're editing an existing cart item (from customize)
                          if (selectedCartItem) {
                            // Replace the existing cart item with the updated one
                            setFoodCart(foodCart.map(cartItem =>
                              cartItem === selectedCartItem
                                ? {...cartItem, name: fullName, price: finalPrice}
                                : cartItem
                            ));
                          } else {
                            // Add to food cart (normal flow)
                            const existingItem = foodCart.find(cartItem => cartItem.name === fullName);
                            if (existingItem) {
                              setFoodCart(foodCart.map(cartItem =>
                                cartItem.name === fullName
                                  ? {...cartItem, quantity: cartItem.quantity + 1}
                                  : cartItem
                              ));
                            } else {
                              setFoodCart([...foodCart, {name: fullName, price: finalPrice, quantity: 1}]);
                            }
                          }

                          // Close modal and reset
                          setShowOptionModal(false);
                          setSelectedBaseItem(null);
                          setSelectedOptions({});
                          setMultiSelectOptions({});
                          setSelectedCartItem(null);
                        }}
                        disabled={Object.keys(multiSelectOptions).length === 0}
                        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                          Object.keys(multiSelectOptions).length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 active:scale-95'
                        }`}
                      >
                        {Object.keys(multiSelectOptions).length === 0 ? 'Select Options' : `Add to Cart - $${(() => {
                          const config = optionConfigs[selectedBaseItem.optionType];
                          const totalItems = Object.values(multiSelectOptions).reduce((sum, count) => sum + count, 0);
                          let finalPrice = selectedBaseItem.basePrice || selectedBaseItem.price || 0;
                          const maxFree = config?.maxFree || 0;
                          const extraCharge = config?.extraCharge || 0;

                          if (totalItems > maxFree) {
                            finalPrice += (totalItems - maxFree) * extraCharge;
                          }

                          return finalPrice.toFixed(2);
                        })()}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modifier Selection Modal */}
            {showModifierModal && selectedCartItem && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center"
                   onClick={(e) => {
                     if (e.target === e.currentTarget) {
                       setShowModifierModal(false);
                       setSelectedCartItem(null);
                       setSelectedModifiers({});
                     }
                   }}>
                <div className="bg-white rounded-2xl shadow-2xl p-3 max-w-[95vw] h-[95vh] w-full mx-2 flex flex-col"
                     onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setShowModifierModal(false);
                        setSelectedCartItem(null);
                        setSelectedModifiers({});
                      }}
                      className="text-gray-600 hover:text-gray-800 font-medium text-base px-3 py-1"
                    >
                      ← Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Apply modifiers to the cart item
                        const updatedModifiers = Object.entries(selectedModifiers)
                          .filter(([_, quantity]) => quantity > 0)
                          .flatMap(([name, quantity]) => {
                            // Check if this is a custom add-on
                            if (name.startsWith('Custom Add-On - $')) {
                              const priceMatch = name.match(/\$(\d+\.?\d*)/);
                              const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
                              return Array(quantity).fill({name: 'Custom Add-On', price: price, quantity: 1});
                            }

                            const modifier = modifierConfigs[getModifierType(selectedCartItem?.name || '') as keyof typeof modifierConfigs]
                              ?.find(m => m.name === name);
                            if (modifier) {
                              // Create an array with one entry for each quantity
                              return Array(quantity).fill({name: modifier.name, price: modifier.price, quantity: 1});
                            }
                            return [];
                          });

                        // Update the food cart with new modifiers
                        setFoodCart(prev => prev.map((item, idx) => {
                          if (item === selectedCartItem) {
                            return {...item, modifiers: updatedModifiers};
                          }
                          return item;
                        }));

                        // Close modal
                        setShowModifierModal(false);
                        setSelectedCartItem(null);
                        setSelectedModifiers({});
                      }}
                      className="bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 font-medium text-base"
                    >
                      Apply →
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-black text-center flex-shrink-0">
                    Customize {selectedCartItem?.name || ''}
                  </h3>

                  {/* Combo Option Section - Simplified */}
                  <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                    <button
                      onClick={() => {
                        // Add combo as a separate line item with its own price
                        const comboName = `  → Combo for ${selectedCartItem?.name || ''}`;

                        // Check if combo already exists for this item
                        const existingCombo = foodCart.find(cartItem => cartItem.name === comboName);
                        if (existingCombo) {
                          // Increase quantity if combo already exists
                          setFoodCart(foodCart.map(cartItem =>
                            cartItem.name === comboName
                              ? {...cartItem, quantity: cartItem.quantity + 1}
                              : cartItem
                          ));
                        } else {
                          // Add combo as new line item with just the upcharge price
                          // Find the index of the original item to insert combo after it
                          const originalIndex = foodCart.findIndex(item => item === selectedCartItem);
                          const newFoodCart = [...foodCart];
                          const comboItem = {
                            name: comboName,
                            price: comboUpcharge,
                            quantity: 1,
                            isCombo: true,
                            parentItem: selectedCartItem?.name
                          };

                          if (originalIndex !== -1) {
                            // Insert combo right after the original item
                            newFoodCart.splice(originalIndex + 1, 0, comboItem);
                          } else {
                            // If original item not found, add to end
                            newFoodCart.push(comboItem);
                          }
                          setFoodCart(newFoodCart);
                        }

                        setShowModifierModal(false);
                        setSelectedCartItem(null);
                        setSelectedModifiers({});
                        setMessage(`✓ Added Combo`);
                        setTimeout(() => setMessage(''), 3000);
                      }}
                      className="px-4 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
                    >
                      Add Combo +$4.00
                    </button>

                    <button
                      onClick={() => {
                        setShowCustomPriceKeypad(true);
                      }}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                    >
                      OPEN KEY
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 mb-2 text-center flex-shrink-0">
                    Select Add-Ons
                  </p>
                  <div className="flex-1 grid grid-cols-2 gap-2 p-2 content-start overflow-y-auto">
                    {/* Regular modifiers */}
                    {modifierConfigs[getModifierType(selectedCartItem?.name || '') as keyof typeof modifierConfigs]?.map((modifier) => {
                      const quantity = selectedModifiers[modifier.name] || 0;
                      return (
                        <div
                          key={modifier.name}
                          className={`h-[140px] relative p-3 rounded-lg border-2 transition-all ${
                            quantity > 0
                              ? 'border-blue-500'
                              : 'border-gray-300'
                          } bg-white hover:border-blue-500 hover:bg-blue-50`}
                        >
                          <button
                            onClick={() => {
                              setSelectedModifiers(prev => ({
                                ...prev,
                                [modifier.name]: (prev[modifier.name] || 0) + 1
                              }));
                            }}
                            className="w-full h-full flex flex-col items-center justify-center active:scale-95"
                          >
                            <span className="font-semibold text-black text-base block">{modifier.name}</span>
                            <div className="text-green-600 font-bold text-sm mt-1">
                              +${modifier.price.toFixed(2)} each
                            </div>
                            {quantity > 0 && (
                              <span className="text-black font-bold text-lg mt-2">{quantity}x</span>
                            )}
                          </button>
                          {/* Minus button in upper left corner */}
                          {quantity > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedModifiers(prev => ({
                                  ...prev,
                                  [modifier.name]: quantity - 1
                                }));
                              }}
                              className="absolute top-1 left-1 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold hover:bg-red-600 z-10"
                            >
                              −
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Custom add-ons added via OPEN KEY */}
                    {Object.entries(selectedModifiers)
                      .filter(([name, quantity]) => name.startsWith('Custom Add-On - $') && quantity > 0)
                      .map(([name, quantity]) => {
                        const priceMatch = name.match(/\$(\d+\.?\d*)/);
                        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
                        return (
                          <div
                            key={name}
                            className="h-[140px] relative p-3 rounded-lg border-2 border-blue-500 bg-blue-50"
                          >
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              <span className="font-semibold text-black text-base block">Custom Add-On</span>
                              <div className="text-green-600 font-bold text-sm mt-1">
                                +${price.toFixed(2)}
                              </div>
                              <span className="text-black font-bold text-lg mt-2">{quantity}x</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedModifiers(prev => {
                                  const newModifiers = {...prev};
                                  delete newModifiers[name];
                                  return newModifiers;
                                });
                              }}
                              className="absolute top-1 left-1 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold hover:bg-red-600 z-10"
                            >
                              −
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Weight Input Modal for By-the-Pound Items */}
            {showWeightModal && selectedWeightItem && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                <OnScreenNumpad
                  value={weightInput}
                  onChange={(value) => setWeightInput(value)}
                  onClose={() => {
                    setShowWeightModal(false);
                    setWeightInput('');
                    setSelectedWeightItem(null);
                  }}
                  onEnter={() => {
                    if (weightInput && parseFloat(weightInput) > 0) {
                      handleWeightSubmit();
                    }
                  }}
                  decimal={true}
                  title={`${selectedWeightItem.name} - $${selectedWeightItem.price.toFixed(2)}/lb`}
                  subtitle="Enter weight (e.g., 125 = 1.25 lbs)"
                  maxLength={10}
                  hidePrefix={true}
                  suffix="lbs"
                />
              </div>
            )}

            {/* Edit Weight Modal */}
            {showEditWeightModal && editingCartItem && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                <OnScreenNumpad
                  value={weightInput}
                  onChange={(value) => setWeightInput(value)}
                  onClose={() => {
                    setShowEditWeightModal(false);
                    setWeightInput('');
                    setEditingCartItem(null);
                  }}
                  onEnter={() => {
                    if (weightInput && parseFloat(weightInput) > 0 && editingCartItem) {
                      const newWeight = parseFloat(weightInput);
                      const pricePerPound = editingCartItem.pricePerPound || editingCartItem.product.price;
                      const newTotalPrice = pricePerPound * newWeight;

                      // Extract the base name without the weight
                      const baseName = editingCartItem.product.name.replace(/\s*\([^)]*lbs[^)]*\)/, '');
                      const newName = `${baseName} (${newWeight} lbs)`;

                      // Update the cart item
                      setCart(cart.map(item => {
                        if (item.product.upc === editingCartItem.product.upc) {
                          return {
                            ...item,
                            weight: newWeight,
                            product: {
                              ...item.product,
                              name: newName,
                              price: newTotalPrice
                            }
                          };
                        }
                        return item;
                      }));

                      setMessage(`✓ Updated weight to ${newWeight} lbs`);
                      setTimeout(() => setMessage(''), 2000);

                      setShowEditWeightModal(false);
                      setWeightInput('');
                      setEditingCartItem(null);
                    }
                  }}
                  decimal={true}
                  title={`Edit Weight: ${editingCartItem.product.name.replace(/\s*\([^)]*\)/, '')}`}
                  subtitle={`Current: ${editingCartItem.weight} lbs • $${editingCartItem.pricePerPound?.toFixed(2) || '0.00'}/lb`}
                  maxLength={10}
                  hidePrefix={true}
                  suffix="lbs"
                />
              </div>
            )}

            {/* Food Selection Interface */}
            {showFoodSelection && (
              <div className="fixed inset-0 bg-gray-50 z-[9999] flex flex-col">
                {/* Header with Back and Done buttons */}
                <div className="bg-white border-b shadow-sm p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (selectedFoodCategory) {
                          // Go back to categories view
                          setSelectedFoodCategory(null);
                        } else {
                          // Go back to cart, but preserve food selections
                          setShowFoodSelection(false);
                          // Keep foodCart state intact - don't clear it
                          // selectedFoodCategory is already null, so no need to set it
                        }
                      }}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back
                    </button>

                    <h2 className="text-xl font-bold text-black">
                      {selectedFoodCategory || 'Food Categories'}
                    </h2>

                    <button
                      onClick={handleFoodDone}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                        foodCart.length > 0
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={foodCart.length === 0}
                    >
                      ADD TO CART {foodCart.length > 0 && `(${foodCart.reduce((sum, item) => sum + item.quantity, 0)})`}
                    </button>
                  </div>
                </div>

                {/* Split Screen Content */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Left Side - Cart Display */}
                  <div className="w-1/3 bg-white border-r border-gray-300 p-4 overflow-y-auto">
                    <h3 className="font-bold text-lg mb-4 text-black">Cart Summary</h3>

                    {/* Existing Cart */}
                    {cart.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-gray-600 mb-2">Current Cart:</h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {cart.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-black truncate pr-2">{item.product.name} x{item.quantity}</span>
                              <span className="text-black font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t mt-2 pt-2 flex justify-between font-bold text-sm text-black">
                          <span>Subtotal:</span>
                          <span>${cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* New Food Items */}
                    {foodCart.length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                        <h4 className="font-semibold text-sm text-gray-600 mb-2">Adding to Cart:</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {[...foodCart].reverse().map((item, index) => {
                            const modifierTotal = item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
                            const itemPrice = item.price || 0; // Handle undefined price
                            const basePrice = item.isWeightBased
                              ? (itemPrice * (item.weight || 0))
                              : (itemPrice * item.quantity);
                            const totalPrice = basePrice + (modifierTotal * (item.quantity || 1));

                            return (
                              <div key={index} className="flex flex-col space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-black text-sm truncate pr-2 flex-1">
                                    {item.isWeightBased ? `${item.name} (${item.weight} lbs)` : item.name}
                                  </span>
                                  {!item.isWeightBased ? (
                                    <div className="flex items-center gap-1 mr-2">
                                      <button
                                        onClick={() => handleFoodItemDecrease(item)}
                                        className="w-5 h-5 rounded-full bg-white border border-gray-300 text-black hover:bg-gray-100 flex items-center justify-center text-xs"
                                      >
                                        −
                                      </button>
                                      <span className="w-6 text-center text-xs font-semibold text-black">{item.quantity}</span>
                                      <button
                                        onClick={() => handleFoodItemClick(item)}
                                        className="w-5 h-5 rounded-full bg-white border border-gray-300 text-black hover:bg-gray-100 flex items-center justify-center text-xs"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 mr-2">
                                      <button
                                        onClick={() => {
                                          // Set up for editing this specific food cart item's weight
                                          setSelectedWeightItem({ name: item.name, price: item.price });
                                          setWeightInput(item.weight?.toString() || '');
                                          setShowWeightModal(true);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        Edit Weight
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-black font-bold text-sm">${totalPrice.toFixed(2)}</span>
                                </div>
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <div className="pl-4 space-y-1 mt-1">
                                    {(() => {
                                      // Group modifiers by name and count
                                      const modifierCounts: {[key: string]: {count: number, price: number}} = {};
                                      item.modifiers.forEach(mod => {
                                        if (!modifierCounts[mod.name]) {
                                          modifierCounts[mod.name] = {count: 0, price: mod.price};
                                        }
                                        modifierCounts[mod.name].count++;
                                      });

                                      return Object.entries(modifierCounts).map(([name, data]) => (
                                        <div key={name} className="flex justify-between items-center">
                                          <span className="text-xs text-gray-600">
                                            → {data.count > 1 ? `${data.count}x ` : ''}{name}
                                          </span>
                                          <span className="text-xs font-semibold text-black">
                                            ${(data.price * data.count).toFixed(2)}
                                          </span>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                )}
                                {!item.isWeightBased && (
                                  <button
                                    onClick={() => {
                                      // Check if this is a Create Your Own Juice item
                                      if (item.name.includes('Create Your Own Juice')) {
                                        // Parse the juice name to extract size and ingredients
                                        const match = item.name.match(/Create Your Own Juice \((Large|Small)(?:, (.+))?\)/);
                                        if (match) {
                                          const size = match[1];
                                          const ingredientsStr = match[2] || '';
                                          const ingredients = ingredientsStr ? ingredientsStr.split(', ') : [];

                                          // Set up the ingredient selection modal
                                          const ingredientOptionType = size.toLowerCase() === 'small' ? 'juice-custom-small' : 'juice-custom-large';
                                          const basePrice = size.toLowerCase() === 'small' ? 6.99 : 7.99;

                                          // Pre-populate the multi-select options with current ingredients
                                          const preselectedIngredients: {[key: string]: number} = {};
                                          ingredients.forEach(ingredient => {
                                            preselectedIngredients[ingredient] = 1;
                                          });

                                          setSelectedBaseItem({
                                            name: 'Create Your Own Juice',
                                            prices: {small: 6.99, large: 7.99},
                                            requiresOptions: true,
                                            optionType: ingredientOptionType,
                                            selectedSize: size,
                                            basePrice: basePrice
                                          });
                                          setMultiSelectOptions(preselectedIngredients);
                                          setSelectedCartItem(item); // Keep track of which cart item we're editing
                                          setShowOptionModal(true);
                                          return;
                                        }
                                      }

                                      // For all other items, use the normal modifier flow
                                      setSelectedCartItem(item);
                                      const modifierQuantities: {[key: string]: number} = {};
                                      item.modifiers?.forEach(mod => {
                                        modifierQuantities[mod.name] = (modifierQuantities[mod.name] || 0) + 1;
                                      });
                                      setSelectedModifiers(modifierQuantities);
                                      setShowModifierModal(true);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium self-start pl-2"
                                  >
                                    Customize
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Grand Total */}
                    {(cart.length > 0 || foodCart.length > 0) && (
                      <div className="mt-4 bg-gray-100 rounded-lg p-3">
                        <div className="flex justify-between font-bold text-lg text-black">
                          <span>Total:</span>
                          <span>
                            ${(
                              cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) +
                              foodCart.reduce((sum, item) => {
                                if (item.isWeightBased) {
                                  return sum + (item.price * (item.weight || 0));
                                } else {
                                  return sum + (item.price * item.quantity);
                                }
                              }, 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {cart.length === 0 && foodCart.length === 0 && (
                      <div className="text-gray-500 text-center py-8">
                        Cart is empty
                      </div>
                    )}
                  </div>

                  {/* Right Side - Food Selection */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    {!selectedFoodCategory ? (
                      // Show Categories
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.keys(foodMenu).map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedFoodCategory(category)}
                            className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 transition-all"
                          >
                            <div className="text-base font-semibold text-black">{category}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {foodMenu[category as keyof typeof foodMenu].length} items
                            </div>
                          </button>
                        ))}

                        {/* OPEN FOOD Button */}
                        <button
                          onClick={() => {
                            setOpenFoodPrice('');
                            setShowOpenFoodNumpad(true);
                          }}
                          className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4 hover:bg-orange-200 hover:border-orange-400 transition-all"
                        >
                          <div className="text-base font-semibold text-orange-800">OPEN FOOD</div>
                          <div className="text-xs text-orange-600 mt-1">
                            Enter custom price
                          </div>
                        </button>
                      </div>
                    ) : (
                      // Show Food Items in Selected Category
                      <div>
                        {/* Back to Categories Button */}
                        <button
                          onClick={() => setSelectedFoodCategory(null)}
                          className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          ← Back to Categories
                        </button>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {(() => {
                          // Check if this category has optimized items
                          const optimizedItems = foodMenuOptimized[selectedFoodCategory as keyof typeof foodMenuOptimized];
                          const regularItems = foodMenu[selectedFoodCategory as keyof typeof foodMenu];
                          const itemsToDisplay = optimizedItems || regularItems || [];

                          return itemsToDisplay.map((item: any, index: number) => {
                            const isOptimized = !!optimizedItems;
                            const isWeightBased = selectedFoodCategory === 'CHEESE (By the Pound)' ||
                                                selectedFoodCategory === 'COLD CUTS (By the Pound)';

                            // For optimized items, check all possible variations in cart
                            let totalQuantity = 0;
                            let hasInCart = false;

                            if (isOptimized && item.requiresOptions) {
                              // Count all variations of this item in cart
                              foodCart.forEach(cartItem => {
                                if (cartItem.name.startsWith(item.name + ' (')) {
                                  totalQuantity += cartItem.quantity;
                                  hasInCart = true;
                                }
                              });
                            } else {
                              const cartItem = foodCart.find(ci => ci.name === item.name);
                              totalQuantity = cartItem ? cartItem.quantity : 0;
                              hasInCart = !!cartItem;
                            }

                            // Get display price (range for items with options)
                            let displayPrice = '';
                            if (item.prices) {
                              const priceValues = Object.values(item.prices).map(p => typeof p === 'number' ? p : 0);
                              const minPrice = Math.min(...priceValues);
                              const maxPrice = Math.max(...priceValues);
                              displayPrice = minPrice === maxPrice
                                ? `$${minPrice.toFixed(2)}`
                                : `$${minPrice.toFixed(2)}-${maxPrice.toFixed(2)}`;
                            } else if (item.price) {
                              displayPrice = `$${item.price.toFixed(2)}`;
                            }

                            return (
                              <div
                                key={index}
                                className={`relative bg-white border-2 rounded-lg p-3 transition-all ${
                                  hasInCart
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                {/* Quantity badge */}
                                {totalQuantity > 0 && !isWeightBased && (
                                  <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                                    {totalQuantity}
                                  </div>
                                )}

                                {/* Item content */}
                                <button
                                  onClick={() => isOptimized ? handleOptimizedFoodClick(item) : handleFoodItemClick(item)}
                                  className="w-full text-left hover:bg-gray-50 rounded transition-colors p-1"
                                >
                                  <div className="font-semibold text-sm text-black">{item.name}</div>
                                  <div className="text-green-600 font-bold text-sm mt-1">{displayPrice}</div>
                                  {item.requiresOptions && (
                                    <div className="text-xs text-gray-500 mt-1">Tap for options</div>
                                  )}
                                </button>
                              </div>
                            );
                          });
                        })()}
                        </div>
                      </div>
                    )}
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
                          {item.isWeightBased && (
                            <button
                              onClick={() => {
                                setEditingCartItem(item);
                                setWeightInput(item.weight?.toString() || '');
                                setShowEditWeightModal(true);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                              disabled={paymentMode !== 'idle'}
                            >
                              Edit Weight
                            </button>
                          )}
                        </div>
                        {!item.isWeightBased ? (
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
                        ) : (
                          <div className="mr-3">
                            <span className="text-sm text-black">{item.weight} lbs</span>
                          </div>
                        )}
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
            <div className="lg:col-span-1 flex flex-col h-full space-y-4">
              {/* Open Item Button */}
              <button
                onClick={() => setShowOpenItem(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-sm"
              >
                Open Item
              </button>

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


      {/* Open Food Modal */}
      {showOpenFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">Open Food Item</h3>
              <button
                onClick={() => {
                  setShowOpenFood(false);
                  setOpenFoodPrice('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">
                Price *
              </label>
              <div
                onClick={() => setShowOpenFoodNumpad(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {openFoodPrice ? (
                  <span className="text-black font-semibold">${openFoodPrice}</span>
                ) : (
                  <span className="text-gray-400">Tap to enter price</span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleOpenFoodAdd}
                disabled={!openFoodPrice || parseFloat(openFoodPrice) <= 0}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add to Cart
              </button>
              <button
                onClick={() => {
                  setShowOpenFood(false);
                  setOpenFoodPrice('');
                }}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Price Check Modal */}
      {priceCheckMode && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 transform animate-scale-in">
            <div className="text-center">
              {/* Price Check Header */}
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-orange-600" />
              </div>

              {!priceCheckProduct ? (
                <>
                  {/* Waiting for Scan State */}
                  <h2 className="text-2xl font-bold text-black mb-4">Price Check Mode</h2>
                  <div className="mb-6">
                    <p className="text-lg text-gray-700 mb-4">
                      Please scan barcode for price check...
                    </p>
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Waiting for barcode scan
                    </p>
                  </div>

                  {/* Exit Button */}
                  <button
                    onClick={() => {
                      setPriceCheckMode(false);
                      setPriceCheckProduct(null);
                      setPriceCheckBuffer('');
                    }}
                    className="w-full bg-gray-200 text-black py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors"
                  >
                    Exit Price Check
                  </button>
                </>
              ) : (
                <>
                  {/* Product Info State */}
                  <h2 className="text-2xl font-bold text-black mb-4">Price Check</h2>
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-black mb-2">
                      {priceCheckProduct.name}
                    </h3>
                    <div className="text-4xl font-bold text-orange-600 mb-2">
                      ${priceCheckProduct.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      UPC: {priceCheckProduct.upc}
                    </div>
                    {priceCheckProduct.inventory !== undefined && (
                      <div className="text-sm text-gray-600 mt-2">
                        In Stock: {priceCheckProduct.inventory}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPriceCheckProduct(null);
                      }}
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                      Scan Another
                    </button>
                    <button
                      onClick={() => {
                        setPriceCheckMode(false);
                        setPriceCheckProduct(null);
                        setPriceCheckBuffer('');
                      }}
                      className="flex-1 bg-gray-200 text-black py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

// Combo Selector Component
