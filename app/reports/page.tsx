'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  CreditCard,
  Clock,
  Download,
  Search,
  X,
  Receipt,
  Printer
} from 'lucide-react';

interface TransactionItem {
  upc: string;
  name: string;
  quantity: number;
  price?: number;
  priceAtSale: number;
  subtotal: number;
}

interface TransactionDetail {
  id: string;
  transactionNumber: string;
  storeId: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  cashDiscount?: number;
  total: number;
  paymentMethod: string;
  cashierName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Analytics {
  today: {
    total: number;
    count: number;
    items: number;
    avgTransaction: number;
  };
  week: {
    total: number;
    count: number;
    items: number;
    avgTransaction: number;
  };
  month: {
    total: number;
    count: number;
    items: number;
    avgTransaction: number;
  };
  topProducts: Array<{
    upc: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  hourlySales: number[];
  dailySales: Array<{
    date: string;
    day: string;
    total: number;
  }>;
  paymentMethods: {
    cash: number;
    card: number;
  };
  recentTransactions: Array<{
    id: string;
    transactionNumber: string;
    total: number;
    items: number;
    paymentMethod: string;
    createdAt: string;
  }>;
}

export default function ReportsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [loadingTransaction, setLoadingTransaction] = useState(false);

  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (!savedStoreId) {
      router.push('/stores');
    } else {
      setStoreId(savedStoreId);
      fetchAnalytics(savedStoreId);
    }
  }, [router]);

  const fetchAnalytics = async (storeId: string) => {
    try {
      const response = await fetch(`/api/analytics?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !storeId) return;

    setSearching(true);
    try {
      const response = await fetch(`/api/transactions/search?storeId=${storeId}&query=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.transactions);
      }
    } catch (error) {
      console.error('Error searching transactions:', error);
    } finally {
      setSearching(false);
    }
  };

  const fetchTransactionDetail = async (transactionId: string) => {
    setLoadingTransaction(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTransaction(data);
      }
    } catch (error) {
      console.error('Error fetching transaction detail:', error);
    } finally {
      setLoadingTransaction(false);
    }
  };

  const handleTransactionClick = (transaction: any) => {
    fetchTransactionDetail(transaction.id);
  };

  const closeModal = () => {
    setSelectedTransaction(null);
  };

  const printReceipt = () => {
    if (!selectedTransaction) return;
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p>No data available</p>
      </div>
    );
  }

  const getPeriodData = () => {
    switch (selectedPeriod) {
      case 'today':
        return analytics.today;
      case 'week':
        return analytics.week;
      case 'month':
        return analytics.month;
      default:
        return analytics.today;
    }
  };

  const periodData = getPeriodData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-black">Sales Reports</h1>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('today')}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedPeriod === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedPeriod === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedPeriod === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-black text-sm">Total Sales</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-black">
              {formatCurrency(periodData.total)}
            </p>
            <p className="text-xs text-black mt-1">
              {periodData.count} transactions
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-black text-sm">Items Sold</span>
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-black">
              {periodData.items}
            </p>
            <p className="text-xs text-black mt-1">
              Products moved
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-black text-sm">Avg Transaction</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-black">
              {formatCurrency(periodData.avgTransaction)}
            </p>
            <p className="text-xs text-black mt-1">
              Per sale
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-black text-sm">Payment Methods</span>
              <CreditCard className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-black">Cash</p>
                <p className="text-xl font-bold text-black">{analytics.paymentMethods.cash}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-black">Card</p>
                <p className="text-xl font-bold text-black">{analytics.paymentMethods.card}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">Daily Sales (Last 7 Days)</h3>
            <div className="space-y-3">
              {analytics.dailySales.map((day, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-black w-12">{day.day}</span>
                    <span className="text-sm text-black">{day.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.max(day.total / Math.max(...analytics.dailySales.map(d => d.total)) * 100, 5)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-20 text-right text-black">
                      {formatCurrency(day.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">Top Products (30 Days)</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {analytics.topProducts.map((product, idx) => (
                <div key={product.upc} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-black w-6">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black truncate max-w-xs">
                        {product.name}
                      </p>
                      <p className="text-xs text-black">UPC: {product.upc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-black">{product.quantity} sold</p>
                    <p className="text-xs text-black">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">Transaction Search</h3>
          </div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by transaction number, date, or amount..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-black" />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <p className="text-sm font-medium text-black">Search Results ({searchResults.length} found)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 text-sm font-medium text-black">Transaction #</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-black">Date & Time</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-black">Items</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-black">Payment</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTransactionClick(transaction)}
                      >
                        <td className="py-2 px-3 text-sm text-blue-600 font-medium">
                          {transaction.transactionNumber}
                        </td>
                        <td className="py-2 px-3 text-sm text-black">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-sm text-black">{transaction.items.length}</td>
                        <td className="py-2 px-3 text-sm capitalize text-black">{transaction.paymentMethod}</td>
                        <td className="py-2 px-3 text-sm text-right font-medium text-black">
                          {formatCurrency(transaction.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4 text-black">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-black">Transaction #</th>
                  <th className="text-left py-2 text-sm font-medium text-black">Time</th>
                  <th className="text-left py-2 text-sm font-medium text-black">Items</th>
                  <th className="text-left py-2 text-sm font-medium text-black">Payment</th>
                  <th className="text-right py-2 text-sm font-medium text-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <td className="py-2 text-sm text-blue-600 font-medium">
                      {transaction.transactionNumber}
                    </td>
                    <td className="py-2 text-sm text-black">
                      {new Date(transaction.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 text-sm text-black">{transaction.items}</td>
                    <td className="py-2 text-sm capitalize text-black">{transaction.paymentMethod}</td>
                    <td className="py-2 text-sm text-right font-medium text-black">
                      {formatCurrency(transaction.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hourly Sales */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4 text-black">Hourly Sales Today</h3>
          <div className="grid grid-cols-12 gap-1">
            {analytics.hourlySales.slice(6, 22).map((sales, hour) => {
              const actualHour = hour + 6;
              const maxSales = Math.max(...analytics.hourlySales);
              const height = maxSales > 0 ? (sales / maxSales) * 100 : 0;

              return (
                <div key={actualHour} className="flex flex-col items-center">
                  <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-black mt-1">
                    {actualHour > 12 ? `${actualHour - 12}pm` : `${actualHour}am`}
                  </span>
                  {sales > 0 && (
                    <span className="text-xs font-medium text-black">${sales.toFixed(0)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {loadingTransaction ? (
              <div className="p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-black">Transaction Detail</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={printReceipt}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <button
                      onClick={closeModal}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Receipt Content */}
                <div className="p-6">
                  <div className="border rounded-lg p-6 bg-gray-50" id="receipt">
                    {/* Store Header */}
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-black">DELI POS SYSTEM</h3>
                      <p className="text-sm text-black mt-1">
                        Transaction #{selectedTransaction.transactionNumber}
                      </p>
                      <p className="text-sm text-black">
                        {new Date(selectedTransaction.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Items */}
                    <div className="border-t border-b py-4 mb-4">
                      <div className="space-y-2">
                        {selectedTransaction.items.map((item, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-sm text-black">
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <div className="flex justify-between text-sm text-black ml-4">
                              <span>{item.quantity} x {formatCurrency(item.priceAtSale || 0)}</span>
                              <span>{formatCurrency(item.subtotal)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-black">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                      </div>
                      {selectedTransaction.tax > 0 && (
                        <div className="flex justify-between text-sm text-black">
                          <span>Tax:</span>
                          <span>{formatCurrency(selectedTransaction.tax)}</span>
                        </div>
                      )}
                      {selectedTransaction.cashDiscount && selectedTransaction.cashDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Cash Discount:</span>
                          <span>-{formatCurrency(selectedTransaction.cashDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2 text-black">
                        <span>Total:</span>
                        <span>{formatCurrency(selectedTransaction.total)}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between text-sm text-black">
                        <span>Payment Method:</span>
                        <span className="capitalize font-medium">{selectedTransaction.paymentMethod}</span>
                      </div>
                      {selectedTransaction.cashierName && (
                        <div className="flex justify-between text-sm mt-1 text-black">
                          <span>Cashier:</span>
                          <span>{selectedTransaction.cashierName}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 pt-4 border-t">
                      <p className="text-sm text-black">Thank you for your purchase!</p>
                      <p className="text-xs text-black mt-2">Have a great day!</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}