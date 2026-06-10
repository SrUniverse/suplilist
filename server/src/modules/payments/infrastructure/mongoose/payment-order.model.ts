import mongoose, { Document, Schema } from 'mongoose';

export type PaymentOrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface IOrderItem {
  supplementId: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface IPaymentOrder extends Document {
  userId: string;          // Always set from JWT — never trusted from client payload
  status: PaymentOrderStatus; // Managed server-side — stripped from all client payloads
  items: IOrderItem[];
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  supplementId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  priceAtPurchase: { type: Number, required: true, min: 0 },
}, { _id: false });

const paymentOrderSchema = new Schema<IPaymentOrder>(
  {
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BRL' },
  },
  { timestamps: true, collection: 'payment_orders' }
);

// Index for ownership queries — always filter by userId
paymentOrderSchema.index({ userId: 1, createdAt: -1 });

export const PaymentOrderModel = mongoose.model<IPaymentOrder>(
  'PaymentOrder',
  paymentOrderSchema
);
