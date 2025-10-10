import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionItem {
  productId?: string;   // Optional for manual items
  upc: string;
  name: string;
  priceAtSale: number;  // Price at the time of sale
  costAtSale?: number;  // Cost at the time of sale for profit calculations
  quantity: number;
  subtotal: number;     // priceAtSale * quantity
}

export interface ITransaction extends Document {
  storeId: string;
  transactionNumber: string;
  items: ITransactionItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'other';
  cashGiven?: number;
  changeGiven?: number;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeFeeAmount?: number;
  platformFeeAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const transactionItemSchema = new Schema<ITransactionItem>({
  productId: { type: String, required: false }, // Optional for manual items
  upc: { type: String, required: true },
  name: { type: String, required: true },
  priceAtSale: { type: Number, required: true },
  costAtSale: { type: Number, default: 0 },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true }
}, { _id: false });

const transactionSchema = new Schema<ITransaction>({
  storeId: {
    type: String,
    required: true,
    index: true
  },
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [transactionItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'other'],
    required: true
  },
  cashGiven: {
    type: Number,
    required: false
  },
  changeGiven: {
    type: Number,
    required: false
  },
  stripePaymentIntentId: {
    type: String,
    required: false
  },
  stripeChargeId: {
    type: String,
    required: false
  },
  stripeFeeAmount: {
    type: Number,
    required: false
  },
  platformFeeAmount: {
    type: Number,
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
transactionSchema.index({ storeId: 1, createdAt: -1 });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default Transaction;