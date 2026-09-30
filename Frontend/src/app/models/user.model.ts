export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  is_active: boolean;
  is_admin?: boolean;
  created_at?: string;
}
