import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  Handshake,
  KeyRound,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { api } from './api';
import type {
  AdminUser,
  Campaign,
  Client,
  Dashboard,
  FiscalSettings,
  FiscalPreview,
  Installation,
  Invoice,
  PaymentProvider,
  Plan,
  ProductionReadiness,
  ReferralCommission,
  ReferralPayout,
  ReferralPartner,
  SupportMessage,
  SupportThread,
  ViewKey,
} from './types';
import './App.css';

const nav: Array<{ id: ViewKey; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Панель', icon: BarChart3 },
  { id: 'clients', label: 'Клиенты', icon: Building2 },
  { id: 'payments', label: 'Платежи', icon: CreditCard },
  { id: 'referrals', label: 'Партнеры', icon: Handshake },
  { id: 'campaigns', label: 'Акции', icon: Megaphone },
  { id: 'support', label: 'Поддержка', icon: MessageSquare },
  { id: 'plans', label: 'Тарифы', icon: Receipt },
  { id: 'ops', label: 'Готовность', icon: ClipboardCheck },
  { id: 'admins', label: 'Админы', icon: ShieldCheck },
];

const viewMeta: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Панель управления',
    subtitle: 'Подписки, VPS, платежи и поддержка индивидуальных CRM',
  },
  clients: {
    title: 'Клиенты',
    subtitle: 'Организации, подписки, VPS-инсталляции и agent tokens',
  },
  payments: {
    title: 'Платежи',
    subtitle: 'Счета подписок, кассы, pending-сверка и фискализация',
  },
  referrals: {
    title: 'Партнеры',
    subtitle: 'Кто привел клиента, процент и выплаты с подписок',
  },
  campaigns: {
    title: 'Акции',
    subtitle: 'Центральные объявления для CRM-инсталляций',
  },
  support: {
    title: 'Поддержка',
    subtitle: 'Диалоги с клиентами по их VPS-инсталляциям',
  },
  plans: {
    title: 'Тарифы',
    subtitle: 'Планы подписок и лимиты',
  },
  ops: {
    title: 'Production readiness',
    subtitle: 'Кассы, 54-ФЗ, webhook, pending-сверка и эксплуатационные риски',
  },
  admins: {
    title: 'Администраторы',
    subtitle: 'Доступ к центральной панели',
  },
};

const fiscalTaxationOptions = [
  ['osn', 'ОСН'],
  ['usn_income', 'УСН доходы'],
  ['usn_income_outcome', 'УСН доходы-расходы'],
  ['esn', 'ЕСХН'],
  ['patent', 'Патент'],
];

const fiscalVatOptions = [
  ['none', 'Без НДС'],
  ['vat0', 'НДС 0%'],
  ['vat5', 'НДС 5%'],
  ['vat7', 'НДС 7%'],
  ['vat10', 'НДС 10%'],
  ['vat20', 'НДС 20%'],
  ['vat22', 'НДС 22%'],
  ['vat105', 'НДС 5/105'],
  ['vat107', 'НДС 7/107'],
  ['vat110', 'НДС 10/110'],
  ['vat120', 'НДС 20/120'],
  ['vat122', 'НДС 22/122'],
];

const fiscalSubjectOptions = [
  ['service', 'Услуга'],
  ['commodity', 'Товар'],
  ['job', 'Работа'],
  ['payment', 'Платеж'],
  ['agent_commission', 'Агентское вознаграждение'],
  ['another', 'Иное'],
];

const fiscalModeOptions = [
  ['full_payment', 'Полный расчет'],
  ['full_prepayment', 'Полная предоплата'],
  ['prepayment', 'Предоплата'],
  ['advance', 'Аванс'],
  ['partial_payment', 'Частичный расчет'],
  ['credit', 'Передача в кредит'],
  ['credit_payment', 'Оплата кредита'],
];

function money(value?: number | null): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format((value || 0) / 100);
}

function dateTime(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function badgeTone(value?: string | boolean | null): 'ok' | 'warn' | 'danger' {
  if (value === true) return 'ok';
  const normalized = String(value || 'unknown');
  if (['active', 'ok', 'paid', 'succeeded', 'trial', 'open'].includes(normalized)) return 'ok';
  if (['expired', 'failed', 'down', 'suspended', 'canceled', 'cancelled'].includes(normalized)) {
    return 'danger';
  }
  return 'warn';
}

function Badge({ value }: { value?: string | boolean | null }) {
  return <span className={`badge ${badgeTone(value)}`}>{String(value ?? 'unknown')}</span>;
}

function formString(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function formNumber(form: HTMLFormElement, name: string): number | null {
  const value = formString(form, name);
  return value ? Number(value) : null;
}

function isoDate(form: HTMLFormElement, name: string): string | null {
  const value = formString(form, name);
  return value ? new Date(value).toISOString() : null;
}

function fieldDate(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <article className="metric-card">
      <Icon />
      <div>
        <div className="muted">{label}</div>
        <div className="metric-value">{value}</div>
        <div className="muted">{hint}</div>
      </div>
    </article>
  );
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [me, setMe] = useState<AdminUser | null>(null);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ReactNode | null>(null);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fiscal, setFiscal] = useState<FiscalSettings | null>(null);
  const [readiness, setReadiness] = useState<ProductionReadiness | null>(null);
  const [fiscalPreview, setFiscalPreview] = useState<FiscalPreview | null>(null);
  const [referralPartners, setReferralPartners] = useState<ReferralPartner[]>([]);
  const [referralCommissions, setReferralCommissions] = useState<ReferralCommission[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<ReferralPayout[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const selectedThreadTitle = useMemo(
    () => selectedThread?.subject || 'Выберите обращение',
    [selectedThread],
  );

  const run = useCallback(async <T,>(work: () => Promise<T>, success?: string): Promise<T | null> => {
    setError('');
    setNotice('');
    try {
      const result = await work();
      if (success) setNotice(success);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
      return null;
    }
  }, []);

  const loadPlans = useCallback(async () => {
    const data = await api.plans();
    setPlans(data);
    return data;
  }, []);

  const loadClients = useCallback(async () => {
    const [clientRows, , partnerRows] = await Promise.all([
      api.clients(),
      loadPlans(),
      api.referralPartners(),
    ]);
    setClients(clientRows);
    setReferralPartners(partnerRows);
  }, [loadPlans]);

  const loadPayments = useCallback(async () => {
    const [clientRows, planRows, providerRows, invoiceRows, fiscalRow, commissionRows] = await Promise.all([
      api.clients(),
      api.plans(),
      api.providers(),
      api.invoices(),
      api.fiscalSettings(),
      api.referralCommissions(),
    ]);
    setClients(clientRows);
    setPlans(planRows);
    setProviders(providerRows);
    setInvoices(invoiceRows);
    setFiscal(fiscalRow);
    setReferralCommissions(commissionRows);
  }, []);

  const loadReferrals = useCallback(async () => {
    const [partnerRows, commissionRows, payoutRows, clientRows] = await Promise.all([
      api.referralPartners(),
      api.referralCommissions(),
      api.referralPayouts(),
      api.clients(),
    ]);
    setReferralPartners(partnerRows);
    setReferralCommissions(commissionRows);
    setReferralPayouts(payoutRows);
    setClients(clientRows);
  }, []);

  const loadSupport = useCallback(async () => {
    const rows = await api.threads();
    setThreads(rows);
    if (selectedThread) {
      const next = rows.find((thread) => thread.id === selectedThread.id) || null;
      setSelectedThread(next);
    }
  }, [selectedThread]);

  const loadOps = useCallback(async () => {
    const [readinessRow, fiscalRow, providerRows, clientRows] = await Promise.all([
      api.readiness(),
      api.fiscalSettings(),
      api.providers(),
      api.clients(),
    ]);
    setReadiness(readinessRow);
    setFiscal(fiscalRow);
    setProviders(providerRows);
    setClients(clientRows);
  }, []);

  const loadView = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    setError('');
    try {
      if (view === 'dashboard') setDashboard(await api.dashboard());
      if (view === 'clients') await loadClients();
      if (view === 'payments') await loadPayments();
      if (view === 'referrals') await loadReferrals();
      if (view === 'campaigns') {
        await loadPlans();
        setCampaigns(await api.campaigns());
      }
      if (view === 'support') await loadSupport();
      if (view === 'plans') setPlans(await api.plans());
      if (view === 'ops') await loadOps();
      if (view === 'admins') setAdmins(await api.admins());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [loadClients, loadOps, loadPayments, loadPlans, loadReferrals, loadSupport, me, view]);

  useEffect(() => {
    if (!api.token) return;
    api
      .me()
      .then(setMe)
      .catch(() => api.clearToken());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadView();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadView]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await run(() => api.login(formString(form, 'email'), formString(form, 'password')));
    if (!result) return;
    api.setToken(result.access_token);
    setMe(await api.me());
  }

  function logout() {
    api.clearToken();
    setMe(null);
  }

  if (!api.token || !me) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="brand">
            <div className="brand-mark">R</div>
            <div>
              <h1>RepireCRM Admin</h1>
              <span>Центральная панель</span>
            </div>
          </div>
          {error && <div className="alert">{error}</div>}
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" autoComplete="username" required />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="btn primary" type="submit" style={{ width: '100%' }}>
            Войти
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <h1>Admin</h1>
            <span>{me.email}</span>
          </div>
        </div>
        <nav className="nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? 'active' : ''}
                type="button"
                onClick={() => setView(item.id)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="page-title">
            <h1>{viewMeta[view].title}</h1>
            <p>{viewMeta[view].subtitle}</p>
          </div>
          <div className="row-actions">
            <button className="icon-btn" type="button" onClick={loadView} title="Обновить">
              <RefreshCw size={18} />
            </button>
            <button className="btn" type="button" onClick={logout}>
              <LogOut size={16} /> Выйти
            </button>
          </div>
        </header>

        {error && <div className="alert">{error}</div>}
        {notice && <div className="notice">{notice}</div>}
        {loading && <div className="notice">Загрузка данных...</div>}

        {view === 'dashboard' && renderDashboard()}
        {view === 'clients' && renderClients()}
        {view === 'payments' && renderPayments()}
        {view === 'referrals' && renderReferrals()}
        {view === 'campaigns' && renderCampaigns()}
        {view === 'support' && renderSupport()}
        {view === 'plans' && renderPlans()}
        {view === 'ops' && renderOps()}
        {view === 'admins' && renderAdmins()}
      </main>

      {modal && <Modal onClose={() => setModal(null)}>{modal}</Modal>}
    </div>
  );

  function renderDashboard() {
    if (!dashboard) return null;
    return (
      <div className="grid">
        <section className="grid metrics">
          <MetricCard icon={Building2} label="Клиенты" value={dashboard.totals.clients} hint="всего" />
          <MetricCard
            icon={CheckCircle2}
            label="Активные"
            value={dashboard.totals.active_clients}
            hint="с доступом"
          />
          <MetricCard icon={Server} label="Инсталляции" value={dashboard.totals.installations} hint="CRM VPS" />
          <MetricCard icon={CreditCard} label="MRR" value={money(dashboard.revenue.mrr)} hint="подписки" />
          <MetricCard
            icon={Handshake}
            label="Партнерам"
            value={money(dashboard.referrals?.unpaid_amount || 0)}
            hint="к выплате"
          />
        </section>

        <section className="grid two-col">
          <div className="panel">
            <div className="panel-title">
              <h2>Подписки</h2>
            </div>
            <div className="stack">
              {Object.entries(dashboard.subscriptions).map(([key, value]) => (
                <div className="row-actions" key={key}>
                  <Badge value={key} />
                  <strong>{value}</strong>
                </div>
              ))}
              {!Object.keys(dashboard.subscriptions).length && <div className="muted">Нет данных</div>}
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">
              <h2>Здоровье VPS</h2>
            </div>
            <div className="stack">
              {Object.entries(dashboard.health).map(([key, value]) => (
                <div className="row-actions" key={key}>
                  <Badge value={key} />
                  <strong>{value}</strong>
                </div>
              ))}
              {!Object.keys(dashboard.health).length && <div className="muted">Нет данных</div>}
            </div>
          </div>
        </section>

        <section className="grid two-col">
          <ClientTable rows={dashboard.expiring_clients} compact />
          <ThreadList rows={dashboard.recent_threads} />
        </section>
      </div>
    );
  }

  function renderClients() {
    return (
      <section className="grid two-col">
        <ClientTable rows={clients} />
        <form className="panel stack" onSubmit={createClient}>
          <div className="panel-title">
            <h2>Новый клиент</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Компания</span>
              <input className="input" name="name" required />
            </label>
            <label className="field">
              <span>Slug</span>
              <input className="input" name="slug" pattern="[a-z0-9][a-z0-9-]+" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input className="input" name="contact_email" type="email" />
            </label>
            <label className="field">
              <span>Телефон</span>
              <input className="input" name="contact_phone" />
            </label>
            <label className="field">
              <span>Тариф</span>
              <PlanSelect />
            </label>
            <label className="field">
              <span>Подписка</span>
              <StatusSelect name="subscription_status" values={['trial', 'active', 'grace', 'expired', 'suspended']} />
            </label>
            <label className="field">
              <span>Кто привел</span>
              <ReferralPartnerSelect />
            </label>
            <label className="field">
              <span>Комиссия, %</span>
              <input className="input" name="referral_share_percent" type="number" min={0} max={100} defaultValue={50} />
            </label>
            <label className="field">
              <span>Оплачено до</span>
              <input className="input" name="paid_until" type="datetime-local" />
            </label>
            <label className="field">
              <span>Trial до</span>
              <input className="input" name="trial_until" type="datetime-local" />
            </label>
            <label className="field full">
              <span>Комментарий по партнеру</span>
              <input className="input" name="referral_note" />
            </label>
            <label className="field full">
              <span>Заметки</span>
              <textarea className="textarea" name="notes" />
            </label>
          </div>
          <button className="btn primary" type="submit">
            <Plus size={16} /> Создать клиента
          </button>
        </form>
      </section>
    );
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(
      () =>
        api.createClient({
          name: formString(form, 'name'),
          slug: formString(form, 'slug'),
          contact_email: formString(form, 'contact_email') || null,
          contact_phone: formString(form, 'contact_phone') || null,
          plan_id: formNumber(form, 'plan_id'),
          subscription_status: formString(form, 'subscription_status'),
          referral_partner_id: formNumber(form, 'referral_partner_id'),
          referral_share_percent: Number(formNumber(form, 'referral_share_percent') ?? 50),
          referral_note: formString(form, 'referral_note') || null,
          paid_until: isoDate(form, 'paid_until'),
          trial_until: isoDate(form, 'trial_until'),
          notes: formString(form, 'notes') || null,
        }),
      'Клиент создан',
    );
    form.reset();
    await loadClients();
  }

  function ClientTable({ rows, compact = false }: { rows: Client[]; compact?: boolean }) {
    return (
      <div className="panel">
        <div className="panel-title">
          <h2>{compact ? 'Скоро истекают' : 'Клиенты'}</h2>
          {!compact && <span className="muted">{rows.length}</span>}
        </div>
        <div className={`table-wrap ${compact ? 'compact' : ''}`}>
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Подписка</th>
                <th>Тариф</th>
                <th>Оплачено до</th>
                {!compact && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((client) => (
                <tr key={client.id}>
                  <td>
                    <strong>{client.name}</strong>
                    <br />
                    <span className="muted">{client.slug}</span>
                    {client.referral_partner && (
                      <>
                        <br />
                        <span className="muted">Партнер: {client.referral_partner.name}</span>
                      </>
                    )}
                  </td>
                  <td>
                    <Badge value={client.effective_access?.status || client.subscription_status} />
                  </td>
                  <td>{client.plan?.name || '—'}</td>
                  <td>{dateTime(client.paid_until || client.trial_until || client.grace_until)}</td>
                  {!compact && (
                    <td>
                      <div className="row-actions">
                        <button className="btn" type="button" onClick={() => openClient(client)}>
                          Карточка
                        </button>
                        <button className="btn" type="button" onClick={() => createAgentToken(client.id)}>
                          <KeyRound size={16} /> Токен
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="muted" colSpan={compact ? 4 : 5}>
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  async function openClient(client: Client) {
    const installations = await run(() => api.installations(client.id));
    if (!installations) return;
    setModal(
      <ClientModal
        client={client}
        installations={installations}
        onSaved={async () => {
          setModal(null);
          await loadClients();
        }}
      />,
    );
  }

  function ClientModal({
    client,
    installations,
    onSaved,
  }: {
    client: Client;
    installations: Installation[];
    onSaved: () => Promise<void>;
  }) {
    async function save(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = event.currentTarget;
      await run(() =>
        api.updateClient(client.id, {
          plan_id: formNumber(form, 'plan_id'),
          subscription_status: formString(form, 'subscription_status'),
          status: formString(form, 'status'),
          paid_until: isoDate(form, 'paid_until'),
          trial_until: isoDate(form, 'trial_until'),
          referral_partner_id: formNumber(form, 'referral_partner_id'),
          referral_share_percent: Number(formNumber(form, 'referral_share_percent') ?? 50),
          referral_note: formString(form, 'referral_note') || null,
        }),
      );
      await onSaved();
    }

    return (
      <div className="stack">
        <div className="modal-head">
          <h2>{client.name}</h2>
          <button className="btn" type="button" onClick={() => setModal(null)}>
            Закрыть
          </button>
        </div>
        <form className="stack" onSubmit={save}>
          <div className="form-grid">
            <label className="field">
              <span>Тариф</span>
              <PlanSelect current={client.plan_id || ''} />
            </label>
            <label className="field">
              <span>Подписка</span>
              <StatusSelect
                name="subscription_status"
                values={['trial', 'active', 'grace', 'expired', 'suspended']}
                current={client.subscription_status}
              />
            </label>
            <label className="field">
              <span>Статус клиента</span>
              <StatusSelect name="status" values={['lead', 'active', 'suspended', 'cancelled']} current={client.status} />
            </label>
            <label className="field">
              <span>Оплачено до</span>
              <input
                className="input"
                name="paid_until"
                type="datetime-local"
                defaultValue={fieldDate(client.paid_until)}
              />
            </label>
            <label className="field">
              <span>Trial до</span>
              <input
                className="input"
                name="trial_until"
                type="datetime-local"
                defaultValue={fieldDate(client.trial_until)}
              />
            </label>
            <label className="field">
              <span>Кто привел</span>
              <ReferralPartnerSelect current={client.referral_partner_id || ''} />
            </label>
            <label className="field">
              <span>Комиссия, %</span>
              <input
                className="input"
                name="referral_share_percent"
                type="number"
                min={0}
                max={100}
                defaultValue={client.referral_share_percent ?? 50}
              />
            </label>
            <label className="field full">
              <span>Комментарий по партнеру</span>
              <textarea className="textarea" name="referral_note" defaultValue={client.referral_note || ''} />
            </label>
          </div>
          <button className="btn primary" type="submit">
            Сохранить
          </button>
        </form>
        <div className="stack">
          <h3>Инсталляции</h3>
          {installations.map((item) => (
            <div className="token-box" key={item.id}>
              <div className="row-actions">
                <strong>{item.label}</strong>
                <Badge value={item.health_status} />
              </div>
              <div className="muted">
                {item.base_url || 'URL не указан'} · token {item.token_prefix} · {dateTime(item.last_seen_at)}
              </div>
              <button className="btn" type="button" onClick={() => rotateToken(item.id)}>
                <RotateCcw size={16} /> Ротировать token
              </button>
            </div>
          ))}
          {!installations.length && <div className="muted">Инсталляций нет</div>}
        </div>
      </div>
    );
  }

  async function createAgentToken(clientId: number) {
    const created = await run(() => api.createInstallation(clientId));
    if (created?.agent_token) showToken('Agent token', created.agent_token);
  }

  async function rotateToken(installationId: number) {
    const rotated = await run(() => api.rotateInstallation(installationId));
    if (rotated?.agent_token) showToken('Новый agent token', rotated.agent_token);
  }

  function showToken(title: string, token: string) {
    setModal(
      <div className="stack">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn" type="button" onClick={() => setModal(null)}>
            Закрыть
          </button>
        </div>
        <div className="notice">Token показывается один раз. Сохраните его в env CRM-инсталляции.</div>
        <div className="token-box">{token}</div>
      </div>,
    );
  }

  function renderPayments() {
    const fiscalRow = fiscal || {
      enabled: false,
      taxation: 'usn_income',
      vat: 'none',
      payment_subject: 'service',
      payment_mode: 'full_payment',
      item_name: 'Подписка RepireCRM',
      ffd_version: '1.2',
    };
    return (
      <div className="grid">
        <section className="grid two-col">
          <div className="panel">
            <div className="panel-title">
              <h2>Счета</h2>
              <button className="btn" type="button" onClick={syncPending}>
                <RefreshCw size={16} /> Pending
              </button>
            </div>
            <div className="stack">
              {invoices.map((invoice) => (
                <InvoiceCard invoice={invoice} key={invoice.id} />
              ))}
              {!invoices.length && <div className="muted">Счетов нет</div>}
            </div>
          </div>
          <form className="panel stack" onSubmit={createInvoice}>
            <div className="panel-title">
              <h2>Новый счет</h2>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Клиент</span>
                <ClientSelect />
              </label>
              <label className="field">
                <span>Тариф</span>
                <PlanSelect />
              </label>
              <label className="field">
                <span>Касса</span>
                <ProviderSelect />
              </label>
              <label className="field">
                <span>Сумма, коп.</span>
                <input className="input" name="amount" type="number" />
              </label>
              <label className="field">
                <span>Период, дней</span>
                <input className="input" name="period_days" type="number" />
              </label>
              <label className="field full">
                <span>Описание</span>
                <textarea className="textarea" name="description" />
              </label>
            </div>
            <button className="btn primary" type="submit">
              Выставить счет
            </button>
          </form>
        </section>

        <section className="grid two-col">
          <div className="panel">
            <div className="panel-title">
              <h2>Кассы</h2>
            </div>
            <div className="stack">
              {providers.map((provider) => (
                <div className="check-row" key={provider.code}>
                  <div>
                    <strong>{provider.name}</strong>
                    {provider.default && <span className="muted"> · по умолчанию</span>}
                    {provider.issues?.map((issue) => (
                      <div className="muted" key={issue}>
                        {issue}
                      </div>
                    ))}
                  </div>
                  <Badge value={provider.production_ready ? 'active' : provider.configured ? 'warning' : 'expired'} />
                </div>
              ))}
            </div>
          </div>
          <form className="panel stack" onSubmit={saveFiscal}>
            <div className="panel-title">
              <h2>Фискализация 54-ФЗ</h2>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Чеки</span>
                <select className="select" name="enabled" defaultValue={String(fiscalRow.enabled)}>
                  <option value="false">выключены</option>
                  <option value="true">включены</option>
                </select>
              </label>
              <label className="field">
                <span>СНО</span>
                <select className="select" name="taxation" defaultValue={fiscalRow.taxation}>
                  {fiscalTaxationOptions.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>НДС</span>
                <select className="select" name="vat" defaultValue={fiscalRow.vat}>
                  {fiscalVatOptions.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Предмет</span>
                <select className="select" name="payment_subject" defaultValue={fiscalRow.payment_subject}>
                  {fiscalSubjectOptions.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Способ</span>
                <select className="select" name="payment_mode" defaultValue={fiscalRow.payment_mode}>
                  {fiscalModeOptions.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Название в чеке</span>
                <input className="input" name="item_name" defaultValue={fiscalRow.item_name} />
              </label>
              <label className="field">
                <span>ФФД</span>
                <select className="select" name="ffd_version" defaultValue={fiscalRow.ffd_version}>
                  <option value="1.05">1.05</option>
                  <option value="1.1">1.1</option>
                  <option value="1.2">1.2</option>
                </select>
              </label>
              <label className="field">
                <span>Email</span>
                <input className="input" name="merchant_email" defaultValue={fiscalRow.merchant_email || ''} />
              </label>
              <label className="field">
                <span>Телефон</span>
                <input className="input" name="merchant_phone" defaultValue={fiscalRow.merchant_phone || ''} />
              </label>
            </div>
            <button className="btn primary" type="submit">
              Сохранить
            </button>
          </form>
        </section>
      </div>
    );
  }

  function InvoiceCard({ invoice }: { invoice: Invoice }) {
    const lastAttempt = invoice.attempts.at(-1);
    return (
      <article className="invoice-card">
        <div className="row-actions">
          <div>
            <strong>
              #{invoice.id} · {money(invoice.amount)}
            </strong>
            <div className="muted">
              {invoice.client_name} · {invoice.plan_name || '—'} · {dateTime(invoice.created_at)}
            </div>
          </div>
          <Badge value={invoice.status} />
        </div>
        <p className="muted">{invoice.description}</p>
        {invoice.referral_commission && (
          <div className="token-box">
            <div className="row-actions">
              <strong>
                Партнер: {invoice.referral_commission.partner_name || `#${invoice.referral_commission.partner_id}`}
              </strong>
              <Badge value={invoice.referral_commission.status} />
            </div>
            <span className="muted">
              {money(invoice.referral_commission.amount)} · {invoice.referral_commission.share_percent}% от счета
            </span>
          </div>
        )}
        <div className="row-actions">
          {lastAttempt?.payment_url && (
            <button className="btn" type="button" onClick={() => window.open(lastAttempt.payment_url || '', '_blank')}>
              <ExternalLink size={16} /> Оплата
            </button>
          )}
          {lastAttempt && (
            <button className="btn" type="button" onClick={() => run(() => api.syncPayment(lastAttempt.id), 'Платеж синхронизирован').then(loadPayments)}>
              Sync
            </button>
          )}
          <button className="btn" type="button" onClick={() => run(() => api.markInvoicePaid(invoice.id), 'Счет отмечен оплаченным').then(loadPayments)}>
            Вручную
          </button>
          {lastAttempt && <Badge value={lastAttempt.status} />}
        </div>
      </article>
    );
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(
      () =>
        api.createInvoice({
          client_id: formNumber(form, 'client_id'),
          plan_id: formNumber(form, 'plan_id'),
          provider: formString(form, 'provider'),
          amount: formNumber(form, 'amount'),
          period_days: formNumber(form, 'period_days'),
          description: formString(form, 'description') || null,
          create_payment: true,
        }),
      'Счет создан',
    );
    form.reset();
    await loadPayments();
  }

  async function syncPending() {
    const result = await run(() => api.syncPendingPayments());
    if (result) setNotice(`Проверено ${result.checked}, оплачено ${result.succeeded}, ошибок ${result.failed}`);
    await loadPayments();
  }

  async function saveFiscal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(
      () =>
        api.saveFiscalSettings({
          enabled: formString(form, 'enabled') === 'true',
          taxation: formString(form, 'taxation') || 'usn_income',
          vat: formString(form, 'vat') || 'none',
          payment_subject: formString(form, 'payment_subject') || 'service',
          payment_mode: formString(form, 'payment_mode') || 'full_payment',
          item_name: formString(form, 'item_name') || 'Подписка RepireCRM',
          ffd_version: formString(form, 'ffd_version') || '1.2',
          merchant_email: formString(form, 'merchant_email') || null,
          merchant_phone: formString(form, 'merchant_phone') || null,
          payload: {},
        }),
      'Фискализация сохранена',
    );
    await loadPayments();
  }

  function renderOps() {
    if (!readiness) return null;
    const failed = readiness.checks.filter((check) => !check.ok && check.severity !== 'warning').length;
    const warnings = readiness.checks.filter((check) => !check.ok && check.severity === 'warning').length;
    const readyProviders = readiness.providers.filter((provider) => provider.production_ready).length;

    return (
      <div className="grid">
        <section className="grid metrics">
          <MetricCard icon={ClipboardCheck} label="Production" value={readiness.ok ? 'Готов' : 'Не готов'} hint={readiness.environment} />
          <MetricCard icon={CreditCard} label="Боевые кассы" value={readyProviders} hint={`из ${readiness.providers.length}`} />
          <MetricCard icon={Receipt} label="Ошибки" value={failed} hint="нужно исправить" />
          <MetricCard icon={RefreshCw} label="Предупреждения" value={warnings} hint="операционные риски" />
        </section>

        <section className="grid two-col">
          <div className="panel">
            <div className="panel-title">
              <h2>Чеклист запуска</h2>
              <Badge value={readiness.ok ? 'active' : 'failed'} />
            </div>
            <div className="stack">
              {readiness.checks.map((check) => (
                <div className="check-row" key={check.code}>
                  <div>
                    <strong>{check.title}</strong>
                    <div className="muted">{check.message}</div>
                  </div>
                  <Badge value={check.ok ? 'ok' : check.severity === 'warning' ? 'warning' : 'failed'} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              <h2>Платежные провайдеры</h2>
              <span className="muted">default: {readiness.default_provider}</span>
            </div>
            <div className="stack">
              {readiness.providers.map((provider) => (
                <div className="check-row" key={provider.code}>
                  <div>
                    <strong>{provider.name}</strong>
                    {provider.default && <span className="muted"> · по умолчанию</span>}
                    {!provider.issues.length && <div className="muted">Конфигурация выглядит рабочей</div>}
                    {provider.issues.map((issue) => (
                      <div className="muted" key={issue}>
                        {issue}
                      </div>
                    ))}
                  </div>
                  <Badge value={provider.production_ready ? 'active' : provider.configured ? 'warning' : 'expired'} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid two-col">
          <form className="panel stack" onSubmit={previewFiscal}>
            <div className="panel-title">
              <h2>Preview 54-ФЗ payload</h2>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Провайдер</span>
                <ProviderSelect />
              </label>
              <label className="field">
                <span>Клиент</span>
                <select className="select" name="client_id">
                  <option value="">Глобальные настройки</option>
                  {clients.map((client) => (
                    <option value={client.id} key={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Сумма, коп.</span>
                <input className="input" name="amount" type="number" defaultValue={990000} required />
              </label>
              <label className="field">
                <span>Описание</span>
                <input className="input" name="description" defaultValue="Подписка RepireCRM" required />
              </label>
            </div>
            <button className="btn primary" type="submit">
              Проверить payload
            </button>
          </form>

          <div className="panel stack">
            <div className="panel-title">
              <h2>Результат проверки</h2>
              {fiscalPreview && <Badge value={fiscalPreview.ok ? 'ok' : 'failed'} />}
            </div>
            {!fiscalPreview && <div className="muted">Выберите провайдера и проверьте чек до боевого платежа.</div>}
            {fiscalPreview?.error && <div className="alert">{fiscalPreview.error}</div>}
            {fiscalPreview?.ok && <pre className="pre-box">{JSON.stringify(fiscalPreview.payload, null, 2)}</pre>}
          </div>
        </section>

        <section className="panel stack">
          <div className="panel-title">
            <h2>Эксплуатация</h2>
          </div>
          <div className="check-row">
            <div>
              <strong>Admin backup</strong>
              <div className="muted">systemd timer ежедневно делает PostgreSQL dump и хранит 14 дней.</div>
            </div>
            <code>repaircrm-admin-backup.timer</code>
          </div>
          <div className="check-row">
            <div>
              <strong>Deploy</strong>
              <div className="muted">safe rsync сохраняет `.env.production`, backups и runtime-данные.</div>
            </div>
            <code>deploy/deploy-production.sh</code>
          </div>
        </section>
      </div>
    );
  }

  async function previewFiscal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await run(() =>
      api.fiscalPreview({
        provider: formString(form, 'provider') || readiness?.default_provider || 'mock',
        client_id: formNumber(form, 'client_id'),
        amount: Number(formNumber(form, 'amount') ?? 990000),
        description: formString(form, 'description') || 'Подписка RepireCRM',
      }),
    );
    if (result) setFiscalPreview(result);
  }

  function renderReferrals() {
    const unpaid = referralCommissions
      .filter((row) => row.status === 'accrued')
      .reduce((sum, row) => sum + row.amount, 0);
    const paid = referralCommissions
      .filter((row) => row.status === 'paid')
      .reduce((sum, row) => sum + row.amount, 0);

    return (
      <div className="grid">
        <section className="grid metrics">
          <MetricCard icon={Handshake} label="Партнеры" value={referralPartners.length} hint="источники клиентов" />
          <MetricCard icon={Building2} label="Клиенты" value={clients.filter((c) => c.referral_partner_id).length} hint="по рекомендации" />
          <MetricCard icon={CreditCard} label="К выплате" value={money(unpaid)} hint="начислено" />
          <MetricCard icon={CheckCircle2} label="Выплачено" value={money(paid)} hint="закрыто" />
        </section>

        <section className="grid two-col">
          <div className="panel">
            <div className="panel-title">
              <h2>Партнеры</h2>
              <span className="muted">{referralPartners.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Партнер</th>
                    <th>Доля</th>
                    <th>Клиенты</th>
                    <th>К выплате</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {referralPartners.map((partner) => (
                    <tr key={partner.id}>
                      <td>
                        <strong>{partner.name}</strong>
                        <br />
                        <span className="muted">{partner.contact_phone || partner.contact_email || 'контакты не указаны'}</span>
                      </td>
                      <td>{partner.default_share_percent}%</td>
                      <td>{partner.clients_count}</td>
                      <td>{money(partner.unpaid_amount)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn" type="button" onClick={() => editReferralPartner(partner)}>
                            Карточка
                          </button>
                          {partner.unpaid_amount > 0 && (
                            <button className="btn" type="button" onClick={() => openReferralPayout(partner)}>
                              Выплатить всё
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!referralPartners.length && (
                    <tr>
                      <td className="muted" colSpan={5}>Партнеров пока нет</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form className="panel stack" onSubmit={createReferralPartner}>
            <div className="panel-title">
              <h2>Новый партнер</h2>
            </div>
            <label className="field">
              <span>Кто привел</span>
              <input className="input" name="name" required />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Контакт</span>
                <input className="input" name="contact_name" />
              </label>
              <label className="field">
                <span>Доля, %</span>
                <input className="input" name="default_share_percent" type="number" min={0} max={100} defaultValue={50} />
              </label>
              <label className="field">
                <span>Телефон</span>
                <input className="input" name="contact_phone" />
              </label>
              <label className="field">
                <span>Email</span>
                <input className="input" name="contact_email" type="email" />
              </label>
            </div>
            <label className="field">
              <span>Куда выплачивать</span>
              <textarea className="textarea" name="payout_details" />
            </label>
            <button className="btn primary" type="submit">
              <Plus size={16} /> Добавить партнера
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Начисления</h2>
            <span className="muted">{referralCommissions.length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Партнер</th>
                  <th>Клиент</th>
                  <th>Счет</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {referralCommissions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.partner_name || `#${row.partner_id}`}</td>
                    <td>{row.client_name || `#${row.client_id}`}</td>
                    <td>
                      #{row.invoice_id}
                      <br />
                      <span className="muted">{dateTime(row.accrued_at)}</span>
                    </td>
                    <td>
                      <strong>{money(row.amount)}</strong>
                      <br />
                      <span className="muted">{row.share_percent}%</span>
                    </td>
                    <td>
                      <Badge value={row.status} />
                      {row.payout_id && (
                        <>
                          <br />
                          <span className="muted">выплата #{row.payout_id}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {row.status !== 'paid' && (
                        <button className="btn" type="button" onClick={() => markReferralPaid(row)}>
                          Выплачено
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!referralCommissions.length && (
                  <tr>
                    <td className="muted" colSpan={6}>Начислений пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Выплаты</h2>
            <span className="muted">{referralPayouts.length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Партнер</th>
                  <th>Сумма</th>
                  <th>Начисления</th>
                  <th>Референс</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {referralPayouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>{dateTime(payout.paid_at)}</td>
                    <td>{payout.partner_name || `#${payout.partner_id}`}</td>
                    <td>
                      <strong>{money(payout.amount)}</strong>
                    </td>
                    <td>{payout.commissions_count || payout.count}</td>
                    <td>
                      {payout.reference || '—'}
                      {payout.notes && (
                        <>
                          <br />
                          <span className="muted">{payout.notes}</span>
                        </>
                      )}
                      {payout.void_reason && (
                        <>
                          <br />
                          <span className="muted">Отмена: {payout.void_reason}</span>
                        </>
                      )}
                    </td>
                    <td>
                      <Badge value={payout.status} />
                      {payout.voided_at && (
                        <>
                          <br />
                          <span className="muted">{dateTime(payout.voided_at)}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {payout.status === 'paid' && (
                        <button className="btn" type="button" onClick={() => openVoidReferralPayout(payout)}>
                          Отменить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!referralPayouts.length && (
                  <tr>
                    <td className="muted" colSpan={7}>Выплат пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  async function createReferralPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(
      () =>
        api.createReferralPartner({
          name: formString(form, 'name'),
          contact_name: formString(form, 'contact_name') || null,
          contact_email: formString(form, 'contact_email') || null,
          contact_phone: formString(form, 'contact_phone') || null,
          default_share_percent: Number(formNumber(form, 'default_share_percent') ?? 50),
          payout_details: formString(form, 'payout_details') || null,
          is_active: true,
        }),
      'Партнер добавлен',
    );
    form.reset();
    await loadReferrals();
  }

  function editReferralPartner(partner: ReferralPartner) {
    setModal(
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          await run(
            () =>
              api.updateReferralPartner(partner.id, {
                name: formString(form, 'name'),
                contact_name: formString(form, 'contact_name') || null,
                contact_email: formString(form, 'contact_email') || null,
                contact_phone: formString(form, 'contact_phone') || null,
                default_share_percent: Number(formNumber(form, 'default_share_percent') ?? 50),
                payout_details: formString(form, 'payout_details') || null,
                notes: formString(form, 'notes') || null,
                is_active: formString(form, 'is_active') === 'true',
              }),
            'Партнер обновлен',
          );
          setModal(null);
          await loadReferrals();
        }}
      >
        <div className="modal-head">
          <h2>{partner.name}</h2>
          <button className="btn" type="button" onClick={() => setModal(null)}>Закрыть</button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Имя</span>
            <input className="input" name="name" defaultValue={partner.name} required />
          </label>
          <label className="field">
            <span>Статус</span>
            <select className="select" name="is_active" defaultValue={String(partner.is_active)}>
              <option value="true">active</option>
              <option value="false">suspended</option>
            </select>
          </label>
          <label className="field">
            <span>Контакт</span>
            <input className="input" name="contact_name" defaultValue={partner.contact_name || ''} />
          </label>
          <label className="field">
            <span>Доля, %</span>
            <input className="input" name="default_share_percent" type="number" min={0} max={100} defaultValue={partner.default_share_percent} />
          </label>
          <label className="field">
            <span>Телефон</span>
            <input className="input" name="contact_phone" defaultValue={partner.contact_phone || ''} />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" name="contact_email" type="email" defaultValue={partner.contact_email || ''} />
          </label>
          <label className="field full">
            <span>Куда выплачивать</span>
            <textarea className="textarea" name="payout_details" defaultValue={partner.payout_details || ''} />
          </label>
          <label className="field full">
            <span>Заметки</span>
            <textarea className="textarea" name="notes" defaultValue={partner.notes || ''} />
          </label>
        </div>
        <button className="btn primary" type="submit">Сохранить</button>
      </form>,
    );
  }

  function openReferralPayout(partner: ReferralPartner) {
    const rows = referralCommissions.filter(
      (row) => row.partner_id === partner.id && row.status === 'accrued',
    );
    const amount = rows.reduce((sum, row) => sum + row.amount, 0);
    setModal(
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const result = await run(() =>
            api.payoutReferralCommissions({
              partner_id: partner.id,
              commission_ids: rows.map((row) => row.id),
              reference: formString(form, 'reference') || null,
              notes: formString(form, 'notes') || null,
            }),
          );
          if (result) {
            setModal(null);
            setNotice(`Выплачено ${money(result.amount)}: ${result.count} начислений`);
            await loadReferrals();
          }
        }}
      >
        <div className="modal-head">
          <h2>Выплата партнеру</h2>
          <button className="btn" type="button" onClick={() => setModal(null)}>
            Закрыть
          </button>
        </div>
        <div className="token-box">
          <div className="row-actions">
            <strong>{partner.name}</strong>
            <strong>{money(amount)}</strong>
          </div>
          <span className="muted">{rows.length} начислений к закрытию</span>
        </div>
        <label className="field">
          <span>Референс платежа</span>
          <input className="input" name="reference" placeholder="СБП/банк/номер перевода" />
        </label>
        <label className="field">
          <span>Комментарий</span>
          <textarea className="textarea" name="notes" defaultValue={`Выплата партнеру ${partner.name}`} />
        </label>
        <button className="btn primary" type="submit" disabled={!rows.length}>
          Подтвердить выплату
        </button>
      </form>,
    );
  }

  function openVoidReferralPayout(payout: ReferralPayout) {
    setModal(
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const result = await run(() =>
            api.voidReferralPayout(payout.id, {
              reason: formString(form, 'reason') || null,
            }),
          );
          if (result) {
            setModal(null);
            setNotice(`Выплата #${result.id} отменена, начисления вернулись к выплате`);
            await loadReferrals();
          }
        }}
      >
        <div className="modal-head">
          <h2>Отменить выплату</h2>
          <button className="btn" type="button" onClick={() => setModal(null)}>
            Закрыть
          </button>
        </div>
        <div className="token-box">
          <div className="row-actions">
            <strong>{payout.partner_name || `#${payout.partner_id}`}</strong>
            <strong>{money(payout.amount)}</strong>
          </div>
          <span className="muted">
            Выплата #{payout.id} · {payout.commissions_count || payout.count} начислений
          </span>
        </div>
        <label className="field">
          <span>Причина отмены</span>
          <textarea className="textarea" name="reason" required />
        </label>
        <button className="btn primary" type="submit">
          Отменить выплату
        </button>
      </form>,
    );
  }

  async function markReferralPaid(row: ReferralCommission) {
    await run(
      () => api.updateReferralCommission(row.id, { status: 'paid' }),
      'Начисление отмечено выплаченным',
    );
    await loadReferrals();
  }

  function renderCampaigns() {
    return (
      <section className="grid two-col">
        <div className="panel">
          <div className="panel-title">
            <h2>Кампании</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Кампания</th>
                  <th>Статус</th>
                  <th>Аудитория</th>
                  <th>Приоритет</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.title}</strong>
                      <br />
                      <span className="muted">{campaign.subtitle}</span>
                    </td>
                    <td>
                      <Badge value={campaign.status} />
                    </td>
                    <td>{campaign.audience_status}</td>
                    <td>{campaign.priority}</td>
                    <td>
                      <button className="btn" type="button" onClick={() => editCampaign(campaign)}>
                        Править
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <CampaignForm />
      </section>
    );
  }

  function CampaignForm({ campaign }: { campaign?: Campaign }) {
    async function submit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = event.currentTarget;
      const body = {
        title: formString(form, 'title'),
        subtitle: formString(form, 'subtitle') || null,
        message: formString(form, 'message'),
        status: formString(form, 'status'),
        audience_status: formString(form, 'audience_status'),
        target_plan_id: formNumber(form, 'target_plan_id'),
        priority: Number(formNumber(form, 'priority') || 100),
        cta_label: formString(form, 'cta_label') || null,
        cta_url: formString(form, 'cta_url') || null,
        banner_color: formString(form, 'banner_color') || '#2563eb',
      };
      if (campaign) {
        await run(() => api.updateCampaign(campaign.id, body), 'Кампания обновлена');
        setModal(null);
      } else {
        await run(() => api.createCampaign(body), 'Кампания создана');
        form.reset();
      }
      setCampaigns(await api.campaigns());
    }

    return (
      <form className="panel stack" onSubmit={submit}>
        <div className="panel-title">
          <h2>{campaign ? 'Редактировать' : 'Новая кампания'}</h2>
        </div>
        <label className="field">
          <span>Заголовок</span>
          <input className="input" name="title" defaultValue={campaign?.title} required />
        </label>
        <label className="field">
          <span>Подзаголовок</span>
          <input className="input" name="subtitle" defaultValue={campaign?.subtitle || ''} />
        </label>
        <label className="field">
          <span>Сообщение</span>
          <textarea className="textarea" name="message" defaultValue={campaign?.message} required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Статус</span>
            <StatusSelect name="status" values={['draft', 'active', 'paused', 'archived']} current={campaign?.status || 'active'} />
          </label>
          <label className="field">
            <span>Аудитория</span>
            <StatusSelect name="audience_status" values={['all', 'trial', 'active', 'grace', 'expired', 'lead', 'suspended']} current={campaign?.audience_status || 'all'} />
          </label>
          <label className="field">
            <span>Тариф</span>
            <PlanSelect name="target_plan_id" current={campaign?.target_plan_id || ''} />
          </label>
          <label className="field">
            <span>Приоритет</span>
            <input className="input" name="priority" type="number" defaultValue={campaign?.priority || 100} />
          </label>
          <label className="field">
            <span>CTA</span>
            <input className="input" name="cta_label" defaultValue={campaign?.cta_label || ''} />
          </label>
          <label className="field">
            <span>CTA URL</span>
            <input className="input" name="cta_url" defaultValue={campaign?.cta_url || ''} />
          </label>
          <label className="field">
            <span>Цвет</span>
            <input className="input" name="banner_color" defaultValue={campaign?.banner_color || '#2563eb'} />
          </label>
        </div>
        <button className="btn primary" type="submit">
          {campaign ? 'Сохранить' : 'Создать'}
        </button>
      </form>
    );
  }

  function editCampaign(campaign: Campaign) {
    setModal(
      <div className="stack">
        <div className="modal-head">
          <h2>{campaign.title}</h2>
          <button className="btn" type="button" onClick={() => setModal(null)}>
            Закрыть
          </button>
        </div>
        <CampaignForm campaign={campaign} />
      </div>,
    );
  }

  function renderSupport() {
    return (
      <section className="grid two-col">
        <ThreadList rows={threads} selectable />
        <div className="panel stack">
          <div className="panel-title">
            <h2>{selectedThreadTitle}</h2>
          </div>
          <div className="messages stack">
            {messages.map((message) => (
              <article className={`message ${message.author_type}`} key={message.id}>
                <div className="muted">
                  {message.author_type} · {dateTime(message.created_at)}
                </div>
                <p>{message.body}</p>
              </article>
            ))}
            {!selectedThread && <div className="muted">Выберите обращение слева</div>}
          </div>
          {selectedThread && (
            <form className="stack" onSubmit={sendReply}>
              <textarea className="textarea" name="body" required />
              <button className="btn primary" type="submit">
                <Send size={16} /> Ответить
              </button>
            </form>
          )}
        </div>
      </section>
    );
  }

  function ThreadList({ rows, selectable = false }: { rows: SupportThread[]; selectable?: boolean }) {
    return (
      <div className="panel">
        <div className="panel-title">
          <h2>Обращения</h2>
          <span className="muted">{rows.length}</span>
        </div>
        <div className="stack">
          {rows.map((thread) => (
            <button
              className={`thread-card ${selectedThread?.id === thread.id ? 'active' : ''}`}
              key={thread.id}
              type="button"
              onClick={() => selectable && openThread(thread)}
            >
              <div className="row-actions">
                <strong>{thread.subject}</strong>
                <Badge value={thread.status} />
              </div>
              <span className="muted">
                {thread.client_name || `client #${thread.client_id}`} · {thread.priority} · {dateTime(thread.last_message_at)}
              </span>
            </button>
          ))}
          {!rows.length && <div className="muted">Обращений нет</div>}
        </div>
      </div>
    );
  }

  async function openThread(thread: SupportThread) {
    setSelectedThread(thread);
    const rows = await run(() => api.messages(thread.id));
    if (rows) setMessages(rows);
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread) return;
    const body = formString(event.currentTarget, 'body');
    await run(() => api.reply(selectedThread.id, body), 'Ответ отправлен');
    event.currentTarget.reset();
    await openThread(selectedThread);
    await loadSupport();
  }

  function renderPlans() {
    return (
      <section className="grid two-col">
        <div className="panel">
          <div className="panel-title">
            <h2>Тарифы</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Название</th>
                  <th>Цена</th>
                  <th>Лимиты</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.code}</td>
                    <td>{plan.name}</td>
                    <td>{money(plan.price_monthly)}</td>
                    <td>
                      {plan.max_users || '∞'} users · {plan.max_shops || '∞'} shops
                    </td>
                    <td>
                      <Badge value={plan.is_active ? 'active' : 'archived'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form className="panel stack" onSubmit={createPlan}>
          <div className="panel-title">
            <h2>Новый тариф</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Код</span>
              <input className="input" name="code" required />
            </label>
            <label className="field">
              <span>Название</span>
              <input className="input" name="name" required />
            </label>
            <label className="field">
              <span>Цена, коп.</span>
              <input className="input" name="price_monthly" type="number" defaultValue={9900} />
            </label>
            <label className="field">
              <span>Период</span>
              <input className="input" name="interval_days" type="number" defaultValue={30} />
            </label>
            <label className="field">
              <span>Пользователи</span>
              <input className="input" name="max_users" type="number" />
            </label>
            <label className="field">
              <span>Филиалы</span>
              <input className="input" name="max_shops" type="number" />
            </label>
          </div>
          <button className="btn primary" type="submit">
            Создать тариф
          </button>
        </form>
      </section>
    );
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(
      () =>
        api.createPlan({
          code: formString(form, 'code'),
          name: formString(form, 'name'),
          price_monthly: Number(formNumber(form, 'price_monthly') || 0),
          interval_days: Number(formNumber(form, 'interval_days') || 30),
          max_users: formNumber(form, 'max_users'),
          max_shops: formNumber(form, 'max_shops'),
          currency: 'RUB',
          features: {},
          is_active: true,
        }),
      'Тариф создан',
    );
    form.reset();
    setPlans(await api.plans());
  }

  function renderAdmins() {
    return (
      <section className="grid two-col">
        <div className="panel">
          <div className="panel-title">
            <h2>Администраторы</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Статус</th>
                  <th>Вход</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.email}</td>
                    <td>{admin.name}</td>
                    <td>
                      <Badge value={admin.is_active ? 'active' : 'suspended'} />
                    </td>
                    <td>{dateTime(admin.last_login_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn" type="button" onClick={() => toggleAdmin(admin)}>
                          {admin.is_active ? 'Отключить' : 'Включить'}
                        </button>
                        <button className="btn" type="button" onClick={() => passwordModal(admin)}>
                          <KeyRound size={16} /> Пароль
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form className="panel stack" onSubmit={createAdmin}>
          <div className="panel-title">
            <h2>Новый админ</h2>
          </div>
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" required />
          </label>
          <label className="field">
            <span>Имя</span>
            <input className="input" name="name" required />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input className="input" name="password" type="password" minLength={10} required />
          </label>
          <button className="btn primary" type="submit">
            Создать
          </button>
        </form>
      </section>
    );
  }

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(
      () =>
        api.createAdmin({
          email: formString(form, 'email'),
          name: formString(form, 'name'),
          password: formString(form, 'password'),
          is_active: true,
        }),
      'Админ создан',
    );
    form.reset();
    setAdmins(await api.admins());
  }

  async function toggleAdmin(admin: AdminUser) {
    await run(() => api.toggleAdmin(admin.id, !admin.is_active));
    setAdmins(await api.admins());
  }

  function passwordModal(admin: AdminUser) {
    setModal(
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          await run(() => api.resetAdminPassword(admin.id, formString(event.currentTarget, 'password')), 'Пароль обновлен');
          setModal(null);
        }}
      >
        <div className="modal-head">
          <h2>Сброс пароля</h2>
          <button className="btn" type="button" onClick={() => setModal(null)}>
            Закрыть
          </button>
        </div>
        <label className="field">
          <span>{admin.email}</span>
          <input className="input" name="password" type="password" minLength={10} required />
        </label>
        <button className="btn primary" type="submit">
          Сохранить
        </button>
      </form>,
    );
  }

  function PlanSelect({ name = 'plan_id', current = '' }: { name?: string; current?: number | string }) {
    return (
      <select className="select" name={name} defaultValue={String(current || '')}>
        <option value="">—</option>
        {plans.map((plan) => (
          <option value={plan.id} key={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>
    );
  }

  function ReferralPartnerSelect({
    name = 'referral_partner_id',
    current = '',
  }: {
    name?: string;
    current?: number | string;
  }) {
    return (
      <select className="select" name={name} defaultValue={String(current || '')}>
        <option value="">—</option>
        {referralPartners.map((partner) => (
          <option value={partner.id} key={partner.id} disabled={!partner.is_active}>
            {partner.name} · {partner.default_share_percent}%
          </option>
        ))}
      </select>
    );
  }

  function ClientSelect() {
    return (
      <select className="select" name="client_id" required>
        <option value="">—</option>
        {clients.map((client) => (
          <option value={client.id} key={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    );
  }

  function ProviderSelect() {
    return (
      <select className="select" name="provider">
        {providers.map((provider) => (
          <option value={provider.code} key={provider.code} disabled={!provider.configured}>
            {provider.name}
            {provider.configured ? '' : ' · не настроена'}
          </option>
        ))}
      </select>
    );
  }

  function StatusSelect({
    name,
    values,
    current,
  }: {
    name: string;
    values: string[];
    current?: string;
  }) {
    return (
      <select className="select" name={name} defaultValue={current || values[0]}>
        {values.map((value) => (
          <option value={value} key={value}>
            {value}
          </option>
        ))}
      </select>
    );
  }
}

export default App;
