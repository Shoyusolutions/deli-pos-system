import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  storeId: string;
  upc: string;
  name: string;
  price: number;
  cost?: number;
  supplierId?: string;
  supplierName?: string; // Denormalized for quick access
  inventory: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  storeId: {
    type: String,
    required: true,
    index: true
  },
  upc: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  cost: {
    type: Number,
    required: false,
    default: 0,
    min: 0
  },
  supplierId: {
    type: String,
    required: false,
    default: ''
  },
  supplierName: {
    type: String,
    required: false,
    default: ''
  },
  inventory: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure UPC is unique per store
productSchema.index({ storeId: 1, upc: 1 }, { unique: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;