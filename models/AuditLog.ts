import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
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
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  storeId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  userName: String,
  action: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['PRODUCT', 'INVENTORY', 'TRANSACTION', 'USER', 'SYSTEM', 'PRICE_CHANGE', 'SUPPLIER'],
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: String,
  changes: [{
    field: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
  }],
  metadata: {
    upc: String,
    productName: String,
    transactionNumber: String,
    reason: String,
    ipAddress: String,
    userAgent: String
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    default: 'INFO'
  },
  success: {
    type: Boolean,
    required: true,
    default: true
  },
  errorMessage: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for efficient querying
auditLogSchema.index({ storeId: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ 'metadata.upc': 1 });
auditLogSchema.index({ 'metadata.transactionNumber': 1 });

// This collection should never be modified, only inserted
auditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('Audit logs cannot be modified'));
  }
  next();
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;