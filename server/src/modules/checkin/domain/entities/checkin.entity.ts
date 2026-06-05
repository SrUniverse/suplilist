export interface Checkin {
  id: string; // The client-generated UUIDv4
  userId: string;
  supplementId: string;
  dose: number;
  checkedAt: Date;
  createdAt: Date; // Mongoose internal, maps to syncedAt
  updatedAt: Date;
}
