import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';

interface AuditLogOptions {
  storeId: string;
  userId?: string;
  userName?: string;
  action: string;
  category: 'PRODUCT' | 'INVENTORY' | 'TRANSACTION' | 'USER' | 'SYSTEM' | 'PRICE_CHANGE' | 'SUPPLIER';
  entityType: string;
  entityId?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    upc?: string;
    productName?: string;
    transactionNumber?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  success?: boolean;
  errorMessage?: string;
  request?: NextRequest;
}

export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    // Extract IP and user agent from request if provided
    let ipAddress = options.metadata?.ipAddress;
    let userAgent = options.metadata?.userAgent;

    if (options.request) {
      ipAddress = options.request.headers.get('x-forwarded-for') ||
                  options.request.headers.get('x-real-ip') ||
                  'unknown';
      userAgent = options.request.headers.get('user-agent') || 'unknown';
    }

    const auditLog = new AuditLog({
      storeId: options.storeId,
      userId: options.userId,
      userName: options.userName,
      action: options.action,
      category: options.category,
      entityType: options.entityType,
      entityId: options.entityId,
      changes: options.changes,
      metadata: {
        ...options.metadata,
        ipAddress,
        userAgent
      },
      severity: options.severity || 'INFO',
      success: options.success !== undefined ? options.success : true,
      errorMessage: options.errorMessage
    });

    await auditLog.save();
  } catch (error) {
    // Log to console if audit logging fails
    // In production, this should go to an external logging service
    console.error('Failed to create audit log:', error);
    console.error('Audit data:', options);
  }
}

// Helper function to track inventory changes
export async function auditInventoryChange(
  storeId: string,
  product: any,
  oldQuantity: number,
  newQuantity: number,
  reason: string,
  userId?: string
): Promise<void> {
  const change = newQuantity - oldQuantity;
  const action = change > 0 ? 'INVENTORY_INCREASE' : 'INVENTORY_DECREASE';

  await createAuditLog({
    storeId,
    userId,
    action,
    category: 'INVENTORY',
    entityType: 'Product',
    entityId: product._id,
    changes: [{
      field: 'inventory',
      oldValue: oldQuantity,
      newValue: newQuantity
    }],
    metadata: {
      upc: product.upc,
      productName: product.name,
      reason
    },
    severity: Math.abs(change) > 100 ? 'WARNING' : 'INFO'
  });
}

// Helper function to track price changes
export async function auditPriceChange(
  storeId: string,
  product: any,
  oldPrice: number,
  newPrice: number,
  userId?: string
): Promise<void> {
  const percentChange = ((newPrice - oldPrice) / oldPrice) * 100;

  await createAuditLog({
    storeId,
    userId,
    action: 'PRICE_UPDATE',
    category: 'PRICE_CHANGE',
    entityType: 'Product',
    entityId: product._id,
    changes: [{
      field: 'price',
      oldValue: oldPrice,
      newValue: newPrice
    }],
    metadata: {
      upc: product.upc,
      productName: product.name,
      reason: `Price changed by ${percentChange.toFixed(2)}%`
    },
    severity: Math.abs(percentChange) > 50 ? 'WARNING' : 'INFO'
  });
}

// Helper function to track transaction creation
export async function auditTransaction(
  transaction: any,
  userId?: string
): Promise<void> {
  await createAuditLog({
    storeId: transaction.storeId,
    userId,
    action: 'TRANSACTION_CREATED',
    category: 'TRANSACTION',
    entityType: 'Transaction',
    entityId: transaction._id,
    metadata: {
      transactionNumber: transaction.transactionNumber,
      reason: `${transaction.paymentMethod} payment - Total: $${transaction.total.toFixed(2)}`
    },
    severity: 'INFO',
    success: true
  });
}