import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectMongo();

    return NextResponse.json({
      status: 'connected',
      dbName: mongoose.connection.db?.databaseName,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      message: 'MongoDB connection successful'
    });
  } catch (error: any) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to connect to MongoDB',
      details: error.toString()
    }, { status: 500 });
  }
}