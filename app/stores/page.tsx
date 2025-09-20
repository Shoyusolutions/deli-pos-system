'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OnScreenKeyboard from '@/components/OnScreenKeyboard';
import OnScreenNumpad from '@/components/OnScreenNumpad';

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
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // Admin check - for now always false
  // On-screen input states
  const [showNameKeyboard, setShowNameKeyboard] = useState(false);
  const [showEmailKeyboard, setShowEmailKeyboard] = useState(false);
  const [showPhoneKeyboard, setShowPhoneKeyboard] = useState(false);
  const [showTaxRateNumpad, setShowTaxRateNumpad] = useState(false);
  const [showAddressKeyboard, setShowAddressKeyboard] = useState(false);
  const [showCityKeyboard, setShowCityKeyboard] = useState(false);
  const [showStateKeyboard, setShowStateKeyboard] = useState(false);
  const [showZipKeyboard, setShowZipKeyboard] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    taxRate: '0.08'
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          taxRate: parseFloat(formData.taxRate)
        })
      });

      if (response.ok) {
        const newStore = await response.json();
        setStores([...stores, newStore]);
        setShowCreateForm(false);
        setFormData({
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          phone: '',
          email: '',
          taxRate: '0.08'
        });
      }
    } catch (error) {
      console.error('Error creating store:', error);
    }
  };

  const selectStore = (storeId: string) => {
    localStorage.setItem('selectedStoreId', storeId);
    router.push('/dashboard');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">Select Your Deli</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {!showCreateForm ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {stores.map((store) => (
                <div
                  key={store._id}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => selectStore(store._id)}
                >
                  <h2 className="text-xl font-semibold mb-2 text-black">{store.name}</h2>
                  <p className="text-black text-sm mb-1">{store.address}</p>
                  <p className="text-black text-sm mb-3">
                    {store.city}, {store.state} {store.zipCode}
                  </p>
                  <p className="text-black text-sm mb-1">📞 {store.phone}</p>
                  <p className="text-black text-sm mb-3">✉️ {store.email}</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {store.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button className="text-blue-600 hover:text-blue-800 font-semibold">
                      Select →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-semibold"
              >
                + Register New Deli (Admin Only)
              </button>
            )}
          </>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl">
            <h2 className="text-2xl font-semibold mb-6">Register New Deli</h2>
            <form onSubmit={handleCreateStore}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-black mb-2">Deli Name *</label>
                  <div
                    onClick={() => setShowNameKeyboard(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.name || <span className="text-gray-400">Tap to enter deli name</span>}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-black mb-2">Email *</label>
                  <div
                    onClick={() => setShowEmailKeyboard(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.email || <span className="text-gray-400">Tap to enter email</span>}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-black mb-2">Phone *</label>
                  <div
                    onClick={() => setShowPhoneKeyboard(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.phone || <span className="text-gray-400">Tap to enter phone</span>}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-black mb-2">Tax Rate (decimal)</label>
                  <div
                    onClick={() => setShowTaxRateNumpad(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.taxRate || <span className="text-gray-400">Tap to enter tax rate</span>}</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-black mb-2">Address *</label>
                  <div
                    onClick={() => setShowAddressKeyboard(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.address || <span className="text-gray-400">Tap to enter address</span>}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-black mb-2">City *</label>
                  <div
                    onClick={() => setShowCityKeyboard(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.city || <span className="text-gray-400">Tap to enter city</span>}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-black mb-2">State *</label>
                  <div
                    onClick={() => setShowStateKeyboard(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.state || <span className="text-gray-400">Tap to enter state (e.g., NY)</span>}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-black mb-2">ZIP Code *</label>
                  <div
                    onClick={() => setShowZipKeyboard(true)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <span className="text-black">{formData.zipCode || <span className="text-gray-400">Tap to enter ZIP code</span>}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold"
                >
                  Register Deli
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* On-Screen Inputs */}
      {showNameKeyboard && (
        <OnScreenKeyboard
          value={formData.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
          onClose={() => setShowNameKeyboard(false)}
          onEnter={() => setShowNameKeyboard(false)}
          title="Enter Deli Name"
          type="text"
        />
      )}

      {showEmailKeyboard && (
        <OnScreenKeyboard
          value={formData.email}
          onChange={(value) => setFormData({ ...formData, email: value })}
          onClose={() => setShowEmailKeyboard(false)}
          onEnter={() => setShowEmailKeyboard(false)}
          title="Enter Email"
          type="email"
        />
      )}

      {showPhoneKeyboard && (
        <OnScreenKeyboard
          value={formData.phone}
          onChange={(value) => setFormData({ ...formData, phone: value })}
          onClose={() => setShowPhoneKeyboard(false)}
          onEnter={() => setShowPhoneKeyboard(false)}
          title="Enter Phone Number"
          type="text"
        />
      )}

      {showTaxRateNumpad && (
        <OnScreenNumpad
          value={formData.taxRate}
          onChange={(value) => setFormData({ ...formData, taxRate: value })}
          onClose={() => setShowTaxRateNumpad(false)}
          onEnter={() => setShowTaxRateNumpad(false)}
          decimal={true}
          title="Enter Tax Rate (0.08 for 8%)"
        />
      )}

      {showAddressKeyboard && (
        <OnScreenKeyboard
          value={formData.address}
          onChange={(value) => setFormData({ ...formData, address: value })}
          onClose={() => setShowAddressKeyboard(false)}
          onEnter={() => setShowAddressKeyboard(false)}
          title="Enter Address"
          type="text"
        />
      )}

      {showCityKeyboard && (
        <OnScreenKeyboard
          value={formData.city}
          onChange={(value) => setFormData({ ...formData, city: value })}
          onClose={() => setShowCityKeyboard(false)}
          onEnter={() => setShowCityKeyboard(false)}
          title="Enter City"
          type="text"
        />
      )}

      {showStateKeyboard && (
        <OnScreenKeyboard
          value={formData.state}
          onChange={(value) => setFormData({ ...formData, state: value })}
          onClose={() => setShowStateKeyboard(false)}
          onEnter={() => setShowStateKeyboard(false)}
          title="Enter State"
          type="text"
        />
      )}

      {showZipKeyboard && (
        <OnScreenKeyboard
          value={formData.zipCode}
          onChange={(value) => setFormData({ ...formData, zipCode: value })}
          onClose={() => setShowZipKeyboard(false)}
          onEnter={() => setShowZipKeyboard(false)}
          title="Enter ZIP Code"
          type="text"
        />
      )}
    </div>
  );
}