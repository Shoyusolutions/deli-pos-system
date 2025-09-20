'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  isActive: boolean;
  taxRate: number;
  createdAt: string;
}

interface Product {
  _id: string;
  storeId: string;
  upc: string;
  name: string;
  price: number;
  inventory: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    checkAuth();
    fetchStores();
  }, []);

  const checkAuth = async () => {
    // Check if user is admin (will be handled by middleware)
    // This is just for UI display
    const role = localStorage.getItem('userRole');
    if (role !== 'admin') {
      router.push('/dashboard');
    }
    setUserRole(role || '');
  };

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/admin/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreProducts = async (storeId: string) => {
    try {
      const response = await fetch(`/api/products?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    fetchStoreProducts(store._id);
  };

  const getTotalInventoryValue = (storeProducts: Product[]) => {
    return storeProducts.reduce((sum, product) => sum + (product.price * product.inventory), 0);
  };

  const getTotalProducts = (storeId: string) => {
    return products.filter(p => p.storeId === storeId).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
            <p className="text-black mt-1">Manage all deli stores</p>
          </div>
          <button
            onClick={() => router.push('/stores')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Store Selection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Total Stores</h3>
            <p className="text-3xl font-bold text-blue-600">{stores.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Active Stores</h3>
            <p className="text-3xl font-bold text-green-600">
              {stores.filter(s => s.isActive).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-black mb-2">Total Products</h3>
            <p className="text-3xl font-bold text-purple-600">{products.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">All Stores</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4">Store Name</th>
                  <th className="text-left p-4">Location</th>
                  <th className="text-left p-4">Contact</th>
                  <th className="text-left p-4">Tax Rate</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store._id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold">{store.name}</td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p>{store.address}</p>
                        <p className="text-black">{store.city}, {store.state} {store.zipCode}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p>{store.phone}</p>
                        <p className="text-black">{store.email}</p>
                      </div>
                    </td>
                    <td className="p-4">{(store.taxRate * 100).toFixed(2)}%</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {store.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleStoreSelect(store)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedStore && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">
              {selectedStore.name} - Products
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-blue-600 font-semibold">Total Products</p>
                <p className="text-2xl font-bold">{getTotalProducts(selectedStore._id)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <p className="text-sm text-green-600 font-semibold">Inventory Value</p>
                <p className="text-2xl font-bold">
                  ${getTotalInventoryValue(products.filter(p => p.storeId === selectedStore._id)).toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <p className="text-sm text-purple-600 font-semibold">Created</p>
                <p className="text-lg font-bold">
                  {new Date(selectedStore.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}