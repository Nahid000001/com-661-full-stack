export interface Review {
  _id: string;
  storeId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  images?: string[];
  replies?: {
    user: string;
    text: string;
    created_at: Date;
  }[];
  reply?: {
    text: string;
    createdAt: Date;
  };
  created_at: Date;
  updated_at: Date;
} 