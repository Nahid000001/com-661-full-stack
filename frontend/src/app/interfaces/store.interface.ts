export interface Store {
  _id?: string;
  company_name: string;
  title: string;
  description: string;
  location: string;
  work_type: string;
  contact_email?: string;
  contact_phone?: string;
  store_category?: string;
  image?: string;
  branches?: string[];
  views?: number;
  reviews?: any[];
  owner?: string;
  managers?: string[];
  created_at?: string;
  updated_at?: string;
  average_rating?: number;
  review_count?: number;
  can_edit?: boolean;
  can_delete?: boolean;
  is_owner?: boolean;
  is_admin?: boolean;
}

export interface StoreListResponse {
  stores: Store[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface StoreCreateResponse {
  message: string;
  store_id: string;
  branch_id: string;
  owner?: string;
  store?: Store;
}

export interface StoreUpdateResponse {
  message: string;
  store?: Store;
}

export interface StoreDeleteResponse {
  message: string;
}

export interface StoreOwnerAssignment {
  owner: string;  // Username of the new owner
}

export interface StoreManagerAssignment {
  manager: string;  // Username of the manager to add
}

export interface StoreStaff {
  owner: string;
  managers: string[];
} 