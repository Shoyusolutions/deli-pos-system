import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const query = searchParams.get('query');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    let searchCriteria: any = { storeId };

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      const numericQuery = parseFloat(query);

      searchCriteria.$or = [
        { transactionNumber: searchRegex },
        { 'items.name': searchRegex },
        { cashierName: searchRegex }
      ];

      // If the query is a valid number, also search by total amount
      if (!isNaN(numericQuery)) {
        searchCriteria.$or.push({
          total: { $gte: numericQuery - 0.5, $lte: numericQuery + 0.5 }
        });
      }

      // If the query looks like a date, search by date
      const dateMatch = query.match(/(\d{1,2})[-/](\d{1,2})[-/]?(\d{2,4})?/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1;
        const day = parseInt(dateMatch[2]);
        const year = dateMatch[3] ?
          (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) :
          new Date().getFullYear();

        const startDate = new Date(year, month, day);
        const endDate = new Date(year, month, day + 1);

        searchCriteria.$or.push({
          createdAt: { $gte: startDate, $lt: endDate }
        });
      }
    }

    const transactions = await Transaction.find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(100)
      .select('transactionNumber total items paymentMethod createdAt');

    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t._id,
        transactionNumber: t.transactionNumber,
        total: t.total,
        items: t.items,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    return NextResponse.json({ error: 'Failed to search transactions' }, { status: 500 });
  }
}