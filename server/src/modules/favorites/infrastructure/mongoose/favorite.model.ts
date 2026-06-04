import mongoose, { Document, Schema } from 'mongoose';

export interface IFavoriteDocument extends Document {
  userId: mongoose.Types.ObjectId;
  supplementId: string;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavoriteDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserIdentity',
    required: true,
  },
  supplementId: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  collection: 'users_favorites',
});

// Compound unique index to prevent duplicate entries
favoriteSchema.index({ userId: 1, supplementId: 1 }, { unique: true });
// Index for performance of fetching all favorites for a user
favoriteSchema.index({ userId: 1 });

export const FavoriteModel = mongoose.model<IFavoriteDocument>('Favorite', favoriteSchema);
export default FavoriteModel;
