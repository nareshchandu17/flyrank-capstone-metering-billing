import axios from 'axios';

// Dynamically determine the backend API URL
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // If environment variable is configured, use it
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    // Default to port 3001 on the same host
    return `${window.location.protocol}//${window.location.hostname}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject admin / tenant auth token into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_api_key') || 'admin-secret-key';
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==========================================
// 1. OVERVIEW & METRICS
// ==========================================
export const getMetrics = async () => {
  const response = await api.get('/admin/metrics');
  return response.data;
};

export const getRealTimeUsage = async () => {
  const response = await api.get('/admin/usage/realtime');
  return response.data;
};

// ==========================================
// 2. TENANTS MANAGEMENT
// ==========================================
export const getTenants = async () => {
  const response = await api.get('/admin/tenants');
  return response.data;
};

export const getTenantDetails = async (id) => {
  const response = await api.get(`/tenants/${id}`);
  return response.data;
};

export const getTenantUsage = async (id) => {
  const response = await api.get(`/usage/${id}`);
  return response.data;
};

export const createTenant = async (tenantData) => {
  const response = await api.post('/admin/tenants', tenantData);
  return response.data;
};

export const updateTenant = async (id, tenantData) => {
  const response = await api.put(`/admin/tenants/${id}`, tenantData);
  return response.data;
};

export const deleteTenant = async (id) => {
  const response = await api.delete(`/admin/tenants/${id}`);
  return response.data;
};

// ==========================================
// 3. USAGE & ANALYTICS
// ==========================================
export const getUsageHistory = async (params = {}) => {
  const response = await api.get('/admin/usage/history', { params });
  return response.data;
};

export const getUsageStats = async () => {
  const response = await api.get('/usage/stats');
  return response.data;
};

export const recordUsage = async (usageData) => {
  const response = await api.post('/usage', usageData);
  return response.data;
};

// Helper to export usage history to CSV
export const exportUsageToCsv = (historyData, filename = 'usage-events-export.csv') => {
  if (!historyData || historyData.length === 0) {
    throw new Error('No usage data available to export');
  }

  const headers = ['ID', 'Date', 'Time', 'Tenant', 'Metric Type', 'Quantity', 'Cost ($)', 'Idempotency Key'];
  const rows = historyData.map(item => [
    item.id,
    item.date,
    item.time || '',
    `"${(item.tenant || '').replace(/"/g, '""')}"`,
    item.metric,
    item.value,
    item.cost || '0.0000',
    item.idempotency_key || ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ==========================================
// 4. API KEYS MANAGEMENT
// ==========================================
export const getApiKeys = async (tenantId) => {
  const response = await api.get(`/tenants/${tenantId}/api-keys`);
  return response.data.data || response.data;
};

export const createApiKey = async (tenantId, name = 'Production Key') => {
  const response = await api.post(`/tenants/${tenantId}/api-keys`, { name });
  return response.data.data || response.data;
};

export const rotateApiKey = async (tenantId, keyId) => {
  const response = await api.post(`/tenants/${tenantId}/api-keys/${keyId}/rotate`);
  return response.data.data || response.data;
};

export const revokeApiKey = async (tenantId, keyId) => {
  const response = await api.post(`/tenants/${tenantId}/api-keys/${keyId}/revoke`);
  return response.data.data || response.data;
};

// ==========================================
// 5. BILLING & INVOICES
// ==========================================
export const getInvoices = async (tenantId = null) => {
  const url = tenantId ? `/invoices/${tenantId}` : '/history/invoices';
  try {
    const response = await api.get(url);
    return response.data.data || response.data;
  } catch (err) {
    // Fallback to /invoices if history routes differ
    const fallbackRes = await api.get(tenantId ? `/invoices/${tenantId}` : '/invoices');
    return fallbackRes.data.data || fallbackRes.data;
  }
};

export const getInvoiceDetail = async (invoiceId) => {
  const response = await api.get(`/invoices/detail/${invoiceId}`);
  return response.data;
};

export const generateInvoice = async (tenantId, billingPeriod) => {
  const response = await api.post('/invoices/generate', {
    tenant_id: tenantId,
    billing_period: billingPeriod,
  });
  return response.data;
};

export const reconcileSubscriptions = async (tenantId = null) => {
  const url = tenantId ? `/stripe/reconcile/${tenantId}` : '/stripe/reconcile';
  const response = await api.post(url);
  return response.data;
};

// ==========================================
// 6. SETTINGS MANAGEMENT
// ==========================================
export const getSettings = () => {
  const saved = localStorage.getItem('usage_metering_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // Fallback
    }
  }
  return {
    adminApiKey: localStorage.getItem('admin_api_key') || 'admin-secret-key',
    alertThresholdPercent: 80,
    stripeLiveMode: false,
    autoReconcile: true,
    currency: 'USD',
    webhookNotifications: true
  };
};

export const saveSettings = (newSettings) => {
  localStorage.setItem('usage_metering_settings', JSON.stringify(newSettings));
  if (newSettings.adminApiKey) {
    localStorage.setItem('admin_api_key', newSettings.adminApiKey);
  }
  return { success: true, message: 'Settings saved successfully' };
};

export default api;
