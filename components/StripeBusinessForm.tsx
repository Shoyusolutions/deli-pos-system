'use client';

import { useState } from 'react';
import { CreditCard, Building, MapPin, Phone, Mail, User } from 'lucide-react';

interface StripeBusinessFormProps {
  storeId: string;
  onSuccess: (accountId: string) => void;
  onCancel: () => void;
}

interface BusinessInfo {
  businessName: string;
  businessType: 'individual' | 'company';
  email: string;
  phone: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  individual?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export default function StripeBusinessForm({ storeId, onSuccess, onCancel }: StripeBusinessFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    businessName: '',
    businessType: 'company',
    email: '',
    phone: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Creating your Stripe Connect account...');

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_complete_account',
          storeId,
          businessInfo
        })
      });

      if (response.ok) {
        const { accountId } = await response.json();
        setMessage('✅ Account created successfully!');
        onSuccess(accountId);
      } else {
        const error = await response.json();
        setMessage('❌ ' + (error.error || 'Failed to create account'));
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setMessage('❌ Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessInfo = (field: string, value: any) => {
    setBusinessInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAddress = (field: string, value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const updateIndividual = (field: string, value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      individual: {
        ...prev.individual,
        [field]: value
      }
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold">Business Information</h3>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building className="w-4 h-4 inline mr-1" />
            Business Type
          </label>
          <select
            value={businessInfo.businessType}
            onChange={(e) => updateBusinessInfo('businessType', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="company">Company/Business</option>
            <option value="individual">Individual/Sole Proprietor</option>
          </select>
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={businessInfo.businessName}
            onChange={(e) => updateBusinessInfo('businessName', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Bedstuy Deli & Grill"
            required
          />
        </div>

        {/* Individual Information (if individual business type) */}
        {businessInfo.businessType === 'individual' && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">
              <User className="w-4 h-4 inline mr-1" />
              Personal Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={businessInfo.individual?.first_name || ''}
                  onChange={(e) => updateIndividual('first_name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={businessInfo.individual?.last_name || ''}
                  onChange={(e) => updateIndividual('last_name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Contact Information</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={businessInfo.email}
              onChange={(e) => updateBusinessInfo('email', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="owner@bedstuydeli.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={businessInfo.phone}
              onChange={(e) => updateBusinessInfo('phone', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>

        {/* Business Address */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">
            <MapPin className="w-4 h-4 inline mr-1" />
            Business Address
          </h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={businessInfo.address.line1}
              onChange={(e) => updateAddress('line1', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123 Main Street"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={businessInfo.address.city}
                onChange={(e) => updateAddress('city', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brooklyn"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={businessInfo.address.state}
                onChange={(e) => updateAddress('state', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="NY"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={businessInfo.address.postal_code}
                onChange={(e) => updateAddress('postal_code', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="11221"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={businessInfo.address.country}
                onChange={(e) => updateAddress('country', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Create Stripe Account
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          ✅ <strong>Simple Setup:</strong> This creates your Stripe Connect account with the basic information needed to start accepting payments. You can always update additional details later in your Stripe dashboard.
        </p>
      </div>
    </div>
  );
}