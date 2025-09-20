import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryAdjustment extends Document {
  storeId: string;
  productId: string;
  upc: string;
  productName: string;
  adjustmentType: 'MANUAL' | 'WASTE' | 'DAMAGE' | 'THEFT' | 'RETURN' | 'CORRECTION' | 'EXPIRED';
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  reason: string;
  adjustedBy: string;
  adjustedByName?: string;
  notes?: string;
  relatedTransactionId?: string;
  createdAt: Date;
}

const InventoryAdjustmentSchema: Schema = new Schema({
  storeId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  upc: {
    type: String,
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true
  },
  adjustmentType: {
    type: String,
    enum: ['MANUAL', 'WASTE', 'DAMAGE', 'THEFT', 'RETURN', 'CORRECTION', 'EXPIRED'],
    required: true,
    index: true
  },
  quantityBefore: {
    type: Number,
    required: true
  },
  quantityAfter: {
    type: Number,
    required: true
  },
  quantityChanged: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  adjustedBy: {
    type: String,
    required: true
  },
  adjustedByName: {
    type: String
  },
  notes: {
    type: String
  },
  relatedTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
InventoryAdjustmentSchema.index({ storeId: 1, createdAt: -1 });
InventoryAdjustmentSchema.index({ storeId: 1, adjustmentType: 1, createdAt: -1 });
InventoryAdjustmentSchema.index({ storeId: 1, productId: 1, createdAt: -1 });

export default mongoose.models.InventoryAdjustment || mongoose.model<IInventoryAdjustment>('InventoryAdjustment', InventoryAdjustmentSchema);