import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  storeId: string;
  productId: string;
  upc: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  oldCost?: number;
  newCost?: number;
  changedBy?: string;
  changeReason?: string;
  effectiveDate: Date;
  createdAt: Date;
}

const PriceHistorySchema: Schema = new Schema({
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
  oldPrice: {
    type: Number,
    required: true
  },
  newPrice: {
    type: Number,
    required: true
  },
  oldCost: {
    type: Number
  },
  newCost: {
    type: Number
  },
  changedBy: {
    type: String  // userId or username
  },
  changeReason: {
    type: String
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
PriceHistorySchema.index({ storeId: 1, productId: 1, createdAt: -1 });
PriceHistorySchema.index({ storeId: 1, upc: 1, createdAt: -1 });

export default mongoose.models.PriceHistory || mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);