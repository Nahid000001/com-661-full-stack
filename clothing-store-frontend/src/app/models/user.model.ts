export interface User {
  _id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: Date;
  updated_at: Date;
} 