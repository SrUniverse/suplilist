import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceHistory {
  date: Date;
  price: number;
  source: 'amazon' | 'mercadolivre' | 'shopee';
}

export interface ISupplementPrice {
  price: number;
  url: string;
  lastUpdated: Date;
}

export interface ISupplementData extends Document<string> {
  _id: string;
  supplementId: string; // Reference to original supplement
  name: string;
  prices: {
    amazon?: ISupplementPrice;
    mercadolivre?: ISupplementPrice;
    shopee?: ISupplementPrice;
  };
  bestPrice: 'amazon' | 'mercadolivre' | 'shopee';
  bestPriceValue: number;
  priceHistory: IPriceHistory[];
  lastCrawled: Date;
  createdAt: Date;
  updatedAt: Date;
}

const priceSchema = new Schema<ISupplementPrice>({
  price: Number,
  url: String,
  lastUpdated: { type: Date, default: Date.now },
});

const priceHistorySchema = new Schema<IPriceHistory>({
  date: { type: Date, default: Date.now },
  price: Number,
  source: { type: String, enum: ['amazon', 'mercadolivre', 'shopee'] },
});

const supplementDataSchema = new Schema<ISupplementData>(
  {
    _id: { type: String, required: true },
    supplementId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    prices: {
      amazon: priceSchema,
      mercadolivre: priceSchema,
      shopee: priceSchema,
    },
    bestPrice: { type: String, enum: ['amazon', 'mercadolivre', 'shopee'] },
    bestPriceValue: { type: Number },
    priceHistory: [priceHistorySchema],
    lastCrawled: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'supplements_data',
    // Note: TTL index is defined separately below via schema.index()
    // ttl: 604800,
  }
);

// Compound index for cache invalidation queries (most frequent access pattern).
// supplementId on its own is already indexed via `index: true` on the field above.
supplementDataSchema.index({ supplementId: 1, lastCrawled: -1 });

// Text index for full-text search on product names (10x faster for regex queries)
supplementDataSchema.index({ name: 'text' }, { default_language: 'portuguese' });

// NOTE: No TTL index. This collection holds the curated affiliate catalog, which
// must persist. A previous `createdAt` TTL (expireAfterSeconds: 604800) deleted
// entries after 7 days — removed so imported/edited products stay permanently.
// To drop the TTL index already present in a live database, run: npm run catalog:drop-ttl

export const SupplementDataModel = mongoose.model<ISupplementData>(
  'SupplementData',
  supplementDataSchema
);
