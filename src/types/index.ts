export type UserRole = 'admin' | 'employee';
export type OfferStatus = 'entwurf' | 'gesendet' | 'angenommen' | 'abgelehnt';
export type TodoStatus = 'offen' | 'erledigt';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  customer_number: string | null;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  offer_count?: number;
  offers?: OfferSummary[];
}

export interface OfferSummary {
  id: string;
  offer_number: string;
  customer_name?: string;
  status: OfferStatus;
  gross_total: number;
  created_at: string;
}

export interface Offer {
  id: string;
  offer_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_address: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: OfferStatus;
  notes: string | null;
  valid_until: string | null;
  net_total: number;
  vat_rate: number;
  vat_amount: number;
  gross_total: number;
  discount_amount: number;
  discount_note: string | null;
  created_by: string;
  created_by_name?: string;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OfferItem[];
}

export interface OfferItem {
  id: string;
  offer_id: string;
  category_slug: string;
  product_name: string;
  description: string | null;
  configuration: Record<string, unknown>;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  attributes?: ProductAttribute[];
}

export interface ProductAttribute {
  id: string;
  category_id: string;
  slug: string;
  label: string;
  attribute_type: 'select' | 'number' | 'boolean' | 'text';
  unit: string | null;
  is_required: boolean;
  sort_order: number;
  options?: ProductAttributeOption[];
}

export interface ProductAttributeOption {
  id: string;
  attribute_id: string;
  value: string;
  label: string;
  price_modifier: number;
  is_default: boolean;
  sort_order: number;
}

export interface PriceCalculation {
  unitPrice: number;
  breakdown: { label: string; amount: number; type: string }[];
  productName: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  due_date: string | null;
  customer_id: string | null;
  customer_name: string | null;
  offer_id: string | null;
  offer_number: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_customers: number;
  offers_draft: number;
  offers_sent: number;
  offers_accepted: number;
  offers_declined: number;
  offers_total: number;
  accepted_revenue: number;
  monthly_offer_total: number;
  open_todos: number;
}

export interface ImportPreviewRow {
  rowIndex: number;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  confidence: number;
  raw_text: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  per_page: number;
  customers?: T[];
  offers?: T[];
}
