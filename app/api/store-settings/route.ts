import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import StoreSettings from '@/models/StoreSettings';
import { createAuditLog } from '@/lib/auditLogger';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Find existing settings or create default ones
    let settings = await StoreSettings.findOne({ storeId });

    if (!settings) {
      // Create default settings for the store
      settings = new StoreSettings({ storeId });
      await settings.save();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return NextResponse.json({ error: 'Failed to fetch store settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: any;
  try {
    await connectMongo();

    body = await req.json();
    const { storeId, userId, ...updates } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Find existing settings or create new ones
    let settings = await StoreSettings.findOne({ storeId });
    const isNew = !settings;

    if (!settings) {
      settings = new StoreSettings({ storeId });
    }

    // Track changes for audit log
    const changes: any[] = [];

    // Update only provided fields
    if (updates.taxEnabled !== undefined) {
      if (settings.taxEnabled !== updates.taxEnabled) {
        changes.push({ field: 'taxEnabled', oldValue: settings.taxEnabled, newValue: updates.taxEnabled });
      }
      settings.taxEnabled = updates.taxEnabled;
    }
    if (updates.taxRate !== undefined) {
      if (settings.taxRate !== updates.taxRate) {
        changes.push({ field: 'taxRate', oldValue: settings.taxRate, newValue: updates.taxRate });
      }
      settings.taxRate = updates.taxRate;
    }
    if (updates.taxName !== undefined) {
      if (settings.taxName !== updates.taxName) {
        changes.push({ field: 'taxName', oldValue: settings.taxName, newValue: updates.taxName });
      }
      settings.taxName = updates.taxName;
    }
    if (updates.cashDiscountEnabled !== undefined) {
      if (settings.cashDiscountEnabled !== updates.cashDiscountEnabled) {
        changes.push({ field: 'cashDiscountEnabled', oldValue: settings.cashDiscountEnabled, newValue: updates.cashDiscountEnabled });
      }
      settings.cashDiscountEnabled = updates.cashDiscountEnabled;
    }
    if (updates.cashDiscountRate !== undefined) {
      if (settings.cashDiscountRate !== updates.cashDiscountRate) {
        changes.push({ field: 'cashDiscountRate', oldValue: settings.cashDiscountRate, newValue: updates.cashDiscountRate });
      }
      settings.cashDiscountRate = updates.cashDiscountRate;
    }

    // Save other settings too
    if (updates.receiptHeader !== undefined) settings.receiptHeader = updates.receiptHeader;
    if (updates.receiptFooter !== undefined) settings.receiptFooter = updates.receiptFooter;
    if (updates.showStoreAddress !== undefined) settings.showStoreAddress = updates.showStoreAddress;
    if (updates.showPhoneNumber !== undefined) settings.showPhoneNumber = updates.showPhoneNumber;
    if (updates.requireCashierLogin !== undefined) settings.requireCashierLogin = updates.requireCashierLogin;
    if (updates.allowNegativeInventory !== undefined) settings.allowNegativeInventory = updates.allowNegativeInventory;
    if (updates.autoBackupEnabled !== undefined) settings.autoBackupEnabled = updates.autoBackupEnabled;

    await settings.save();

    // Create audit log for the changes
    if (changes.length > 0 || isNew) {
      await createAuditLog({
        storeId,
        userId,
        action: isNew ? 'STORE_SETTINGS_CREATED' : 'STORE_SETTINGS_UPDATED',
        category: 'SYSTEM',
        entityType: 'StoreSettings',
        entityId: settings._id.toString(),
        changes: changes.length > 0 ? changes : undefined,
        metadata: {
          reason: isNew ? 'Initial store settings created' : 'Store settings updated'
        },
        severity: 'INFO',
        success: true,
        request: req
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error updating store settings:', error);

    // Log the failure
    await createAuditLog({
      storeId: body?.storeId || 'unknown',
      userId: body?.userId,
      action: 'STORE_SETTINGS_UPDATE_FAILED',
      category: 'SYSTEM',
      entityType: 'StoreSettings',
      severity: 'ERROR',
      success: false,
      errorMessage: error?.message || 'Failed to update store settings',
      request: req
    });

    return NextResponse.json({ error: 'Failed to update store settings' }, { status: 500 });
  }
}