const API_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '';
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let adminToken = localStorage.getItem('admin_token') || '';
let userRole: 'admin' | 'affiliate' | '' = (localStorage.getItem('admin_role') as any) || '';
let userName: string = localStorage.getItem('admin_name') || '';

export function setAdminToken(t: string, role: 'admin' | 'affiliate' = 'admin', name = '') {
  adminToken = t;
  userRole = role;
  userName = name;
  localStorage.setItem('admin_token', t);
  localStorage.setItem('admin_role', role);
  localStorage.setItem('admin_name', name);
}

export function getAdminToken() {
  return adminToken;
}

export function getUserRole() {
  return userRole;
}

export function getUserName() {
  return userName;
}

export function clearAdminToken() {
  adminToken = '';
  userRole = '';
  userName = '';
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_role');
  localStorage.removeItem('admin_name');
}

async function call(action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${API_URL}/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ action, ...extra }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

// ── Overview ──
export const getOverview = () => call('admin.overview');

// ── Licenses ──
export const getLicenses = (page = 1, search = '') =>
  call('admin.licenses', { page, search });
export const createLicense = (data: {
  email: string; plan: 'anual' | 'mensal' | 'vitalicio'; duration: string;
}) => call('admin.license.create', data);
export const editLicense = (licenseId: string, updates: {
  email?: string; plan?: string; status?: string; expiresAt?: string | null; moboId?: string | null;
}) => call('admin.license.edit', { licenseId, ...updates });
export const revokeLicense = (licenseId: string) =>
  call('admin.revoke', { licenseId });
export const transferLicense = (licenseId: string, newMoboId: string) =>
  call('admin.transfer', { licenseId, newMoboId });

// ── Coupons ──
export const getCoupons = () => call('admin.coupons');
export const createCoupon = (data: {
  code: string; discountPct: number; maxUses: number;
}) => call('admin.coupon.create', data);
export const toggleCoupon = (couponId: string, active: boolean) =>
  call('admin.coupon.toggle', { couponId, active });

// ── Affiliates ──
export const getAffiliates = () => call('admin.affiliates');
export const createAffiliate = (data: {
  name: string; email: string; couponCode: string;
  password: string; commissionPct?: number; discountPct?: number;
}) => call('admin.affiliate.create', data);
export const toggleAffiliate = (affiliateId: string, active: boolean) =>
  call('admin.affiliate.toggle', { affiliateId, active });

// ── Payments ──
export const getPayments = (page = 1) => call('admin.payments', { page });

// ── Withdrawals ──
export const getWithdrawals = (status = 'pending') =>
  call('admin.withdrawals', { status });
export const processWithdrawal = (withdrawalId: string, approve: boolean) =>
  call('admin.withdrawal.process', { withdrawalId, approve });

// ── Affiliate Panel (uses affiliate JWT) ──
export const affiliateLogin = async (email: string, password: string) => {
  const res = await fetch(`${API_URL}/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
    },
    body: JSON.stringify({ action: 'affiliate.login', email, password }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Erro desconhecido');
  return data;
};

export const affiliateDashboard = () => call('affiliate.dashboard');
export const affiliateSales = (page = 1) => call('affiliate.sales', { page });
export const affiliateWithdraw = (amount: number, pixKey: string) =>
  call('affiliate.withdraw', { amount, pixKey });
