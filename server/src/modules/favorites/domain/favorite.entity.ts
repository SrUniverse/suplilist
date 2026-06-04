export interface Favorite {
  userId: string;
  supplementId: string;
  createdAt: Date;
}

export interface FavoriteDTO {
  supplementId: string;
  createdAt: string;
}

export interface BulkSetResult {
  replaced: number;
}

export class FavoriteMapper {
  static toDTO(fav: Favorite): FavoriteDTO {
    return {
      supplementId: fav.supplementId,
      createdAt: fav.createdAt.toISOString(),
    };
  }
}
