import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const period = searchParams.get('period') || 'day'; // day, week, month, year

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    // Get sales data for different periods
    const [todayTransactions, weekTransactions, monthTransactions] = await Promise.all([
      Transaction.find({
        storeId,
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      Transaction.find({
        storeId,
        createdAt: { $gte: weekAgo }
      }),
      Transaction.find({
        storeId,
        createdAt: { $gte: monthAgo }
      })
    ]);

    // Calculate totals
    const calculateTotals = (transactions: any[]) => {
      return transactions.reduce((acc, trans) => {
        acc.total += trans.total;
        acc.count += 1;
        acc.items += trans.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        return acc;
      }, { total: 0, count: 0, items: 0 });
    };

    const todayStats = calculateTotals(todayTransactions);
    const weekStats = calculateTotals(weekTransactions);
    const monthStats = calculateTotals(monthTransactions);

    // Get top products
    const productSales = new Map();
    monthTransactions.forEach(trans => {
      trans.items.forEach((item: any) => {
        const key = item.upc;
        if (productSales.has(key)) {
          const existing = productSales.get(key);
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productSales.set(key, {
            upc: item.upc,
            name: item.name,
            quantity: item.quantity,
            revenue: item.subtotal
          });
        }
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Get hourly sales for today
    const hourlySales = new Array(24).fill(0);
    todayTransactions.forEach(trans => {
      const hour = new Date(trans.createdAt).getHours();
      hourlySales[hour] += trans.total;
    });

    // Get daily sales for the week
    const dailySales = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTransactions = weekTransactions.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= date && tDate < nextDate;
      });

      const dayTotal = dayTransactions.reduce((sum, t) => sum + t.total, 0);
      dailySales.push({
        date: date.toLocaleDateString(),
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        total: dayTotal
      });
    }

    // Get payment method breakdown
    const paymentMethods = {
      cash: monthTransactions.filter(t => t.paymentMethod === 'cash').length,
      card: monthTransactions.filter(t => t.paymentMethod === 'card').length
    };

    return NextResponse.json({
      today: {
        ...todayStats,
        avgTransaction: todayStats.count > 0 ? todayStats.total / todayStats.count : 0
      },
      week: {
        ...weekStats,
        avgTransaction: weekStats.count > 0 ? weekStats.total / weekStats.count : 0
      },
      month: {
        ...monthStats,
        avgTransaction: monthStats.count > 0 ? monthStats.total / monthStats.count : 0
      },
      topProducts,
      hourlySales,
      dailySales,
      paymentMethods,
      recentTransactions: todayTransactions.slice(0, 10).map(t => ({
        id: t._id,
        transactionNumber: t.transactionNumber,
        total: t.total,
        items: t.items.length,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}