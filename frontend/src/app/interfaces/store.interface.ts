export interface Store {
  _id: string;
  company_name: string;
  title: string;
  description: string;
  location: string;
  owner: string;
  work_type: string;
  is_remote: boolean;
  average_rating?: number;
  review_count?: number;
  views?: number;
  created_at: string;
  updated_at: string;
}

export interface StoreListResponse {
  stores: Store[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface StoreCreateResponse {
  store: Store;
  message: string;
}

export interface StoreUpdateResponse {
  store: Store;
  message: string;
}

export interface StoreDeleteResponse {
  message: string;
} 