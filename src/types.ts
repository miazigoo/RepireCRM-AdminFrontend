export type ViewKey =
  | 'dashboard'
  | 'clients'
  | 'payments'
  | 'referrals'
  | 'campaigns'
  | 'support'
  | 'plans'
  | 'admins';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  price_monthly: number;
  currency: string;
  interval_days: number;
  max_users?: number | null;
  max_shops?: number | null;
  features: Record<string, unknown>;
  is_active: boolean;
}

export interface ReferralPartner {
  id: number;
  name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  default_share_percent: number;
  payout_details?: string | null;
  notes?: string | null;
  is_active: boolean;
  clients_count: number;
  accrued_amount: number;
  paid_amount: number;
  unpaid_amount: number;
}

export interface Client {
  id: number;
  name: string;
  slug: string;
  status: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  crm_url?: string | null;
  portal_url?: string | null;
  notes?: string | null;
  plan_id?: number | null;
  subscription_status: string;
  paid_until?: string | null;
  trial_until?: string | null;
  grace_until?: string | null;
  auto_renew: boolean;
  support_priority: string;
  referral_partner_id?: number | null;
  referral_share_percent: number;
  referral_note?: string | null;
  referral_partner?: ReferralPartner | null;
  effective_access?: {
    status?: string;
    access_allowed?: boolean;
    reason?: string;
    plan_name?: string | null;
  };
  plan?: Plan | null;
}

export interface Installation {
  id: number;
  client_id: number;
  kind: string;
  label: string;
  base_url?: string | null;
  server_ip?: string | null;
  environment: string;
  version?: string | null;
  token_prefix: string;
  agent_token?: string;
  last_seen_at?: string | null;
  health_status: string;
  health_message?: string | null;
}

export interface Campaign {
  id: number;
  title: string;
  subtitle?: string | null;
  message: string;
  cta_label?: string | null;
  cta_url?: string | null;
  status: string;
  audience_status: string;
  target_plan_id?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  priority: number;
  banner_color: string;
}

export interface PaymentProvider {
  code: string;
  name: string;
  configured: boolean;
  default: boolean;
}

export interface FiscalReceipt {
  id: number;
  status: string;
  provider: string;
  error_message?: string | null;
}

export interface PaymentAttempt {
  id: number;
  invoice_id: number;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  payment_url?: string | null;
  error_message?: string | null;
  fiscal_receipts?: FiscalReceipt[];
}

export interface ReferralCommission {
  id: number;
  partner_id: number;
  client_id: number;
  payout_id?: number | null;
  invoice_id: number;
  amount: number;
  currency: string;
  share_percent: number;
  status: string;
  accrued_at: string;
  paid_at?: string | null;
  notes?: string | null;
  partner_name?: string | null;
  client_name?: string | null;
  invoice_description?: string | null;
}

export interface ReferralPayout {
  id: number;
  partner_id: number;
  partner_name: string;
  count: number;
  commissions_count: number;
  amount: number;
  currency: string;
  status: string;
  paid_at: string;
  voided_at?: string | null;
  reference?: string | null;
  notes?: string | null;
  void_reason?: string | null;
  created_at: string;
  updated_at: string;
  commissions: ReferralCommission[];
}

export type ReferralPayoutResult = ReferralPayout;

export interface Invoice {
  id: number;
  client_id: number;
  plan_id?: number | null;
  amount: number;
  currency: string;
  period_days: number;
  status: string;
  description: string;
  created_at: string;
  paid_at?: string | null;
  client_name?: string | null;
  plan_name?: string | null;
  attempts: PaymentAttempt[];
  referral_commission?: ReferralCommission | null;
}

export interface FiscalSettings {
  id?: number;
  client_id?: number | null;
  enabled: boolean;
  taxation: string;
  vat: string;
  payment_subject: string;
  payment_mode: string;
  item_name: string;
  ffd_version: string;
  merchant_email?: string | null;
  merchant_phone?: string | null;
  payload?: Record<string, unknown>;
}

export interface SupportThread {
  id: number;
  client_id: number;
  client_name?: string | null;
  subject: string;
  status: string;
  priority: string;
  unread_admin: number;
  unread_client: number;
  last_message_at?: string | null;
}

export interface SupportMessage {
  id: number;
  thread_id: number;
  author_type: string;
  external_author?: string | null;
  body: string;
  created_at: string;
}

export interface Dashboard {
  totals: {
    clients: number;
    active_clients: number;
    installations: number;
    open_threads: number;
  };
  revenue: {
    mrr: number;
    currency: string;
  };
  referrals: {
    partners: number;
    clients: number;
    unpaid_amount: number;
    paid_amount: number;
    currency: string;
  };
  subscriptions: Record<string, number>;
  health: Record<string, number>;
  expiring_clients: Client[];
  recent_threads: SupportThread[];
}
