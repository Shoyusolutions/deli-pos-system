import mongoose, { Schema, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  ownerId?: string;
  isActive: boolean;
  taxRate: number;
  stripeConnectAccountId?: string;
  stripeOnboardingCompleted?: boolean;
  stripeTerminalLocationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStore>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  ownerId: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  taxRate: {
    type: Number,
    default: 0.08,
    min: 0,
    max: 0.20
  },
  stripeConnectAccountId: {
    type: String,
    required: false
  },
  stripeOnboardingCompleted: {
    type: Boolean,
    default: false
  },
  stripeTerminalLocationId: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

export default mongoose.models.Store || mongoose.model<IStore>('Store', storeSchema);