export type UserRole = 'admin' | 'employee';
export type LeadStatus = 'neu' | 'kontaktiert' | 'qualifiziert' | 'angebot' | 'gewonnen' | 'verloren';
export type ServiceType = 'paket' | 'addon';
export type ActivityType = 'anruf' | 'email' | 'status_aenderung' | 'notiz' | 'zuweisung' | 'erstellt' | 'import' | 'konvertiert';
export type DocumentCategory = 'Gesprächsleitfaden' | 'Service-Info' | 'Schulung' | 'Sonstiges';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type WebsiteStatus = 'keine' | 'veraltet' | 'einfach' | 'ok' | 'unbekannt';

export interface Lead {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  bundesland: string | null;
  branche: string | null;
  website_status: WebsiteStatus | null;
  website_checked: boolean;
  website_check_notes: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  source: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  lead_id: string | null;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  converted_at: string | null;
  converted_by: string | null;
  created_at: string;
  total_revenue: number;
  service_count: number;
  services?: CustomerServiceItem[];
}

export type ServiceCategory = 'Web-Services' | 'Sichtbarkeit & Marketing' | 'KI-Workflows' | 'Analytics';

export interface Service {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  includes: string | null;
  base_price: number;
  price_model: string;
  type: ServiceType;
  category: ServiceCategory | null;
  is_active: boolean;
  sort_order: number;
  commission_rate: number;
}

export interface CustomerServiceItem {
  id: string;
  customer_id: string;
  service_id: string;
  service_name: string;
  service_type: ServiceType;
  sold_price: number;
  price_model: string;
  contract_months: number | null;
  sold_date: string;
  sold_by: string | null;
  sold_by_name: string | null;
  notes: string | null;
  commission_rate: number;
  commission_amount: number;
  promotion_id: string | null;
  promotion_name: string | null;
  original_price: number | null;
  discount_amount: number | null;
}

export type DiscountType = 'fixed' | 'percentage';

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  max_redemptions: number | null;
  current_redemptions: number;
  applicable_service_ids: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  type: ActivityType;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  company_name?: string;
}

export interface LeadLock {
  lead_id: string;
  user_id: string;
  user_name: string;
  expires_at: string;
}

export interface Region {
  id: string;
  name: string;
  plzFrom: string;
  plzTo: string;
  bundesland: string;
  landkreis: string;
}

export interface DashboardStats {
  leads_by_status: Record<string, number>;
  total_leads: number;
  won_leads: number;
  conversion_rate: number;
  total_revenue: number;
  monthly_revenue: number;
}

export interface CommissionDetail {
  id: string;
  sold_price: number;
  sold_date: string;
  price_model: string;
  contract_months: number | null;
  service_name: string;
  commission_rate: number;
  commission_amount: number;
  customer_name: string;
  employee_name: string;
  employee_id: string;
}

export interface CommissionSummary {
  employee_id: string;
  employee_name: string;
  total_sales: number;
  total_revenue: number;
  total_commission: number;
}

export interface CommissionData {
  details: CommissionDetail[];
  summary: CommissionSummary[];
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type TodoStatus = 'offen' | 'erledigt';

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  due_date: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_service_id: string | null;
  service_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  per_page: number;
  leads?: T[];
  customers?: T[];
}
