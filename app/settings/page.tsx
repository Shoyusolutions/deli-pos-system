'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, DollarSign, Receipt, Shield, Database, CreditCard } from 'lucide-react';
import OnScreenNumpad from '@/components/OnScreenNumpad';
import StripeConnectOnboardingQR from '@/components/StripeConnectOnboardingQR';

export default function SettingsPage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pricing');
  // On-screen input states
  const [showTaxRateNumpad, setShowTaxRateNumpad] = useState(false);
  const [showCashDiscountNumpad, setShowCashDiscountNumpad] = useState(false);

  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (!savedStoreId) {
      router.push('/stores');
    } else {
      setStoreId(savedStoreId);
      fetchSettings(savedStoreId);
    }
  }, [router]);

  const fetchSettings = async (storeId: string) => {
    try {
      const response = await fetch(`/api/store-settings?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeId || !settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          ...settings
        })
      });

      if (response.ok) {
        setMessage('✅ Settings saved successfully');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Error saving settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p>Error loading settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-2xl font-semibold text-black">Store Settings</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('pricing')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pricing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-black hover:text-black'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pricing & Tax
              </div>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-black hover:text-black'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payments
              </div>
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'receipt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-black hover:text-black'
              }`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Receipt
              </div>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-black hover:text-black'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </div>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-black hover:text-black'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                System
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4 text-black">Pricing & Tax Settings</h2>

              {/* Tax Settings */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3 text-black">Sales Tax</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-black">Enable Sales Tax</span>
                    <input
                      type="checkbox"
                      checked={settings.taxEnabled}
                      onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                  </label>

                  {settings.taxEnabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Tax Name
                        </label>
                        <input
                          type="text"
                          value={settings.taxName || ''}
                          onChange={(e) => setSettings({ ...settings, taxName: e.target.value })}
                          placeholder="Enter tax name"
                          className="w-full p-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Tax Rate (%)
                        </label>
                        <div
                          onClick={() => setShowTaxRateNumpad(true)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-black bg-gray-50 cursor-pointer hover:bg-gray-100"
                        >
                          <span className="text-black">{settings.taxRate ? `${settings.taxRate}%` : <span className="text-gray-400">Tap to enter tax rate</span>}</span>
                        </div>
                        <p className="text-xs text-black mt-1">
                          Tap to enter percentage (e.g., 8.5 for 8.5%)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Cash Discount Settings */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3 text-black">Cash Discount Program</h3>
                <p className="text-sm text-black mb-3">
                  Offer lower prices for cash payments. Credit card prices will be automatically increased by the specified percentage.
                </p>
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-black">Enable Cash Discount</span>
                    <input
                      type="checkbox"
                      checked={settings.cashDiscountEnabled}
                      onChange={(e) => setSettings({ ...settings, cashDiscountEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                  </label>

                  {settings.cashDiscountEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Card Processing Fee (%)
                      </label>
                      <div
                        onClick={() => setShowCashDiscountNumpad(true)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-black bg-gray-50 cursor-pointer hover:bg-gray-100"
                      >
                        <span className="text-black">{settings.cashDiscountRate ? `${settings.cashDiscountRate}%` : <span className="text-gray-400">Tap to enter discount rate</span>}</span>
                      </div>
                      <p className="text-xs text-black mt-1">
                        Credit card prices will be {settings.cashDiscountRate}% higher than cash prices
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4 text-black">Payment Settings</h2>
              {storeId && <StripeConnectOnboardingQR storeId={storeId} />}
            </div>
          )}

          {activeTab === 'receipt' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4 text-black">Receipt Settings</h2>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Receipt Header
                </label>
                <textarea
                  value={settings.receiptHeader || ''}
                  onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                  placeholder="Enter receipt header"
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Receipt Footer
                </label>
                <textarea
                  value={settings.receiptFooter || ''}
                  onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                  placeholder="Enter receipt footer"
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.showStoreAddress}
                    onChange={(e) => setSettings({ ...settings, showStoreAddress: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-black">Show store address on receipts</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.showPhoneNumber}
                    onChange={(e) => setSettings({ ...settings, showPhoneNumber: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-black">Show phone number on receipts</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4 text-black">Security Settings</h2>
              <p className="text-black">No security settings available at this time.</p>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4 text-black">System Settings</h2>
              <p className="text-black">No system settings available at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* On-Screen Inputs */}
      {showTaxRateNumpad && (
        <OnScreenNumpad
          value={settings.taxRate ? settings.taxRate.toString() : ''}
          onChange={(value) => {
            const numValue = parseFloat(value) || 0;
            setSettings({ ...settings, taxRate: numValue });
          }}
          onClose={() => setShowTaxRateNumpad(false)}
          onEnter={() => setShowTaxRateNumpad(false)}
          decimal={true}
          hidePrefix={true}
          suffix="%"
          title="Enter Tax Rate (%)"
        />
      )}

      {showCashDiscountNumpad && (
        <OnScreenNumpad
          value={settings.cashDiscountRate ? settings.cashDiscountRate.toString() : ''}
          onChange={(value) => {
            const numValue = parseFloat(value) || 0;
            setSettings({ ...settings, cashDiscountRate: numValue });
          }}
          onClose={() => setShowCashDiscountNumpad(false)}
          onEnter={() => setShowCashDiscountNumpad(false)}
          decimal={true}
          hidePrefix={true}
          suffix="%"
          title="Enter Cash Discount Rate (%)"
        />
      )}

    </div>
  );
}