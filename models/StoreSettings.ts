import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreSettings extends Document {
  storeId: string;

  // Tax Settings
  taxEnabled: boolean;
  taxRate: number; // Percentage (e.g., 8.5 for 8.5%)
  taxName: string; // e.g., "Sales Tax", "VAT", etc.

  // Cash Discount Settings (inverse of credit card surcharge)
  cashDiscountEnabled: boolean;
  cashDiscountRate: number; // Percentage (e.g., 4 for 4% credit card price increase)

  // Receipt Settings
  receiptHeader?: string;
  receiptFooter?: string;
  showStoreAddress: boolean;
  showPhoneNumber: boolean;

  // Other Settings
  requireCashierLogin: boolean;
  allowNegativeInventory: boolean;
  autoBackupEnabled: boolean;

  updatedAt: Date;
  createdAt: Date;
}

const StoreSettingsSchema: Schema = new Schema({
  storeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Tax Settings
  taxEnabled: {
    type: Boolean,
    default: true
  },
  taxRate: {
    type: Number,
    default: 8.0, // Default 8% tax
    min: 0,
    max: 30 // Reasonable max tax rate
  },
  taxName: {
    type: String,
    default: 'Sales Tax'
  },

  // Cash Discount Settings
  cashDiscountEnabled: {
    type: Boolean,
    default: false
  },
  cashDiscountRate: {
    type: Number,
    default: 4.0, // Default 4% for credit card transactions
    min: 0,
    max: 10 // Reasonable max discount rate
  },

  // Receipt Settings
  receiptHeader: {
    type: String,
    default: ''
  },
  receiptFooter: {
    type: String,
    default: 'Thank you for your business!'
  },
  showStoreAddress: {
    type: Boolean,
    default: true
  },
  showPhoneNumber: {
    type: Boolean,
    default: true
  },

  // Other Settings
  requireCashierLogin: {
    type: Boolean,
    default: false
  },
  allowNegativeInventory: {
    type: Boolean,
    default: false
  },
  autoBackupEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.StoreSettings || mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);