'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Package, ShoppingCart, BarChart3, Settings } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    todaysSales: 0,
    itemsSold: 0,
    lowStockItems: 0,
    activeProducts: 0
  });
  const [loading, setLoading] = useState(true);

  // Ensure we have the storeId selected
  const storeId = typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') : null;
  if (!storeId && typeof window !== 'undefined') {
    router.push('/stores');
  }

  useEffect(() => {
    if (storeId) {
      fetchStats();
    }
  }, [storeId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/stats?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem('selectedStoreId');
    localStorage.removeItem('storeSettings');
    localStorage.removeItem('userId');
    // Redirect to login
    router.push('/login');
  };

  const menuItems = [
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'Manage products and stock levels',
      href: '/inventory',
      color: 'bg-blue-500'
    },
    {
      icon: ShoppingCart,
      title: 'Checkout / POS',
      description: 'Process sales and transactions',
      href: '/checkout',
      color: 'bg-green-500'
    },
    {
      icon: BarChart3,
      title: 'Reports',
      description: 'View sales and inventory reports',
      href: '/reports',
      color: 'bg-yellow-500'
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Configure tax, pricing, and store settings',
      href: '/settings',
      color: 'bg-gray-500'
    }
  ];


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-black">Deli POS System</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-black mb-6">Main Menu</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                onClick={() => router.push(item.href)}
                className="relative overflow-hidden rounded-xl p-6 text-left transition-all bg-white hover:shadow-lg cursor-pointer transform hover:-translate-y-1"
              >
                <div className={`${item.color} absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full opacity-10`} />
                <div className="relative">
                  <div className={`${item.color} inline-flex rounded-lg p-3 text-white mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-black">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

      </main>
    </div>
  );
}