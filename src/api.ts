import type {
  AdminUser,
  Campaign,
  Client,
  Dashboard,
  FiscalSettings,
  Installation,
  Invoice,
  PaymentAttempt,
  PaymentProvider,
  Plan,
  ReferralCommission,
  ReferralPayout,
  ReferralPayoutResult,
  ReferralPartner,
  SupportMessage,
  SupportThread,
} from './types';

const TOKEN_KEY = 'repirecrm.admin.accessToken';
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

type JsonBody = Record<string, unknown> | Array<unknown> | null;

class ApiClient {
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      throw new Error('Сервер админки недоступен');
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.detail ||
        payload?.error ||
        `Ошибка API ${response.status}`;
      if (response.status === 401) {
        this.clearToken();
      }
      throw new Error(message);
    }
    return payload as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: JsonBody = {}): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch<T>(path: string, body: JsonBody): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  put<T>(path: string, body: JsonBody): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  login(email: string, password: string): Promise<{ access_token: string }> {
    return this.post('/auth/login', { email, password });
  }

  me(): Promise<AdminUser> {
    return this.get('/me');
  }

  dashboard(): Promise<Dashboard> {
    return this.get('/dashboard');
  }

  plans(): Promise<Plan[]> {
    return this.get('/plans?include_inactive=true');
  }

  createPlan(body: Record<string, unknown>): Promise<Plan> {
    return this.post('/plans', body);
  }

  clients(): Promise<Client[]> {
    return this.get('/clients?limit=500');
  }

  createClient(body: Record<string, unknown>): Promise<Client> {
    return this.post('/clients', body);
  }

  updateClient(id: number, body: Record<string, unknown>): Promise<Client> {
    return this.patch(`/clients/${id}`, body);
  }

  referralPartners(): Promise<ReferralPartner[]> {
    return this.get('/referral-partners?include_inactive=true');
  }

  createReferralPartner(body: Record<string, unknown>): Promise<ReferralPartner> {
    return this.post('/referral-partners', body);
  }

  updateReferralPartner(id: number, body: Record<string, unknown>): Promise<ReferralPartner> {
    return this.patch(`/referral-partners/${id}`, body);
  }

  referralCommissions(): Promise<ReferralCommission[]> {
    return this.get('/referral-commissions?limit=500');
  }

  referralPayouts(): Promise<ReferralPayout[]> {
    return this.get('/referral-payouts?limit=500');
  }

  updateReferralCommission(id: number, body: Record<string, unknown>): Promise<ReferralCommission> {
    return this.patch(`/referral-commissions/${id}`, body);
  }

  payoutReferralCommissions(body: Record<string, unknown>): Promise<ReferralPayoutResult> {
    return this.post('/referral-commissions/payout', body);
  }

  voidReferralPayout(id: number, body: Record<string, unknown>): Promise<ReferralPayout> {
    return this.post(`/referral-payouts/${id}/void`, body);
  }

  installations(clientId: number): Promise<Installation[]> {
    return this.get(`/clients/${clientId}/installations`);
  }

  createInstallation(clientId: number): Promise<Installation> {
    return this.post(`/clients/${clientId}/installations`, {
      kind: 'crm',
      label: 'CRM VPS',
      environment: 'production',
    });
  }

  rotateInstallation(installationId: number): Promise<Installation> {
    return this.post(`/installations/${installationId}/rotate-token`, {});
  }

  campaigns(): Promise<Campaign[]> {
    return this.get('/campaigns');
  }

  createCampaign(body: Record<string, unknown>): Promise<Campaign> {
    return this.post('/campaigns', body);
  }

  updateCampaign(id: number, body: Record<string, unknown>): Promise<Campaign> {
    return this.patch(`/campaigns/${id}`, body);
  }

  providers(): Promise<PaymentProvider[]> {
    return this.get('/payments/providers');
  }

  invoices(): Promise<Invoice[]> {
    return this.get('/invoices?limit=500');
  }

  createInvoice(body: Record<string, unknown>): Promise<Invoice> {
    return this.post('/invoices', body);
  }

  syncPayment(attemptId: number): Promise<PaymentAttempt> {
    return this.post(`/payments/${attemptId}/sync`, {});
  }

  syncPendingPayments(): Promise<Record<string, number>> {
    return this.post('/payments/sync-pending', {});
  }

  markInvoicePaid(invoiceId: number): Promise<Invoice> {
    return this.post(`/invoices/${invoiceId}/mark-paid`, {});
  }

  fiscalSettings(): Promise<FiscalSettings> {
    return this.get('/fiscal/settings');
  }

  saveFiscalSettings(body: FiscalSettings): Promise<FiscalSettings> {
    return this.put('/fiscal/settings', body as unknown as Record<string, unknown>);
  }

  threads(): Promise<SupportThread[]> {
    return this.get('/support/threads');
  }

  messages(threadId: number): Promise<SupportMessage[]> {
    return this.get(`/support/threads/${threadId}/messages`);
  }

  reply(threadId: number, body: string): Promise<SupportMessage> {
    return this.post(`/support/threads/${threadId}/messages`, { body });
  }

  admins(): Promise<AdminUser[]> {
    return this.get('/admin-users');
  }

  createAdmin(body: Record<string, unknown>): Promise<AdminUser> {
    return this.post('/admin-users', body);
  }

  toggleAdmin(id: number, isActive: boolean): Promise<AdminUser> {
    return this.patch(`/admin-users/${id}`, { is_active: isActive });
  }

  resetAdminPassword(id: number, password: string): Promise<{ status: string }> {
    return this.post(`/admin-users/${id}/password`, { password });
  }
}

export const api = new ApiClient();
