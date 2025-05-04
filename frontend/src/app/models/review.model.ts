export interface Review {
  _id: string;
  storeId: string;
  store_id?: string;
  store_name?: string;
  userId?: string;
  user?: string;
  userName?: string;
  rating: number;
  comment: string;
  images?: string[];
  replies?: {
    reply_id: string;
    user: string;
    text: string;
    created_at: Date;
    updated_at?: Date;
    isAdmin?: boolean;
  }[];
  reply?: {
    text: string;
    createdAt: Date;
    isAdmin?: boolean;
  };
  created_at: Date;
  updated_at: Date;
} 