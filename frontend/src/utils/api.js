import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock data for development (will be replaced with real API calls)
const mockData = {
  tenants: [
    { id: 1, name: 'Acme Corp', email: 'billing@acme.com', status: 'active', plan: 'enterprise', usage: 85, cost: 1250 },
    { id: 2, name: 'TechStart Inc', email: 'admin@techstart.io', status: 'active', plan: 'pro', usage: 62, cost: 450 },
    { id: 3, name: 'Global Solutions', email: 'it@globalsol.com', status: 'active', plan: 'enterprise', usage: 45, cost: 890 },
    { id: 4, name: 'StartupXYZ', email: 'founder@startupxyz.com', status: 'trial', plan: 'starter', usage: 23, cost: 0 },
    { id: 5, name: 'Digital Agency', email: 'team@digitalagency.co', status: 'active', plan: 'pro', usage: 78, cost: 520 },
  ],
  usageHistory: [
    { id: 1, tenant: 'Acme Corp', metric: 'API Calls', value: 150000, unit: 'calls', date: '2024-01-15', cost: 150 },
    { id: 2, tenant: 'TechStart Inc', metric: 'Storage', value: 500, unit: 'GB', date: '2024-01-15', cost: 75 },
    { id: 3, tenant: 'Global Solutions', metric: 'Bandwidth', value: 2000, unit: 'GB', date: '2024-01-15', cost: 200 },
    { id: 4, tenant: 'Acme Corp', metric: 'Compute Hours', value: 500, unit: 'hours', date: '2024-01-14', cost: 250 },
    { id: 5, tenant: 'Digital Agency', metric: 'API Calls', value: 75000, unit: 'calls', date: '2024-01-14', cost: 75 },
  ],
  realTimeUsage: [
    { time: '00:00', value: 120 },
    { time: '04:00', value: 85 },
    { time: '08:00', value: 320 },
    { time: '12:00', value: 580 },
    { time: '16:00', value: 490 },
    { time: '20:00', value: 380 },
  ],
  metrics: {
    totalTenants: 156,
    activeTenants: 142,
    totalRevenue: 45230,
    monthlyGrowth: 23.5,
    avgUsage: 67,
  },
};

export const getTenants = async () => {
  try {
    const response = await api.get('/tenants');
    return response.data;
  } catch (error) {
    console.log('Using mock data for tenants');
    return mockData.tenants;
  }
};

export const getUsageHistory = async () => {
  try {
    const response = await api.get('/usage/history');
    return response.data;
  } catch (error) {
    console.log('Using mock data for usage history');
    return mockData.usageHistory;
  }
};

export const getRealTimeUsage = async () => {
  try {
    const response = await api.get('/usage/realtime');
    return response.data;
  } catch (error) {
    console.log('Using mock data for real-time usage');
    return mockData.realTimeUsage;
  }
};

export const getMetrics = async () => {
  try {
    const response = await api.get('/metrics');
    return response.data;
  } catch (error) {
    console.log('Using mock data for metrics');
    return mockData.metrics;
  }
};

export const createTenant = async (tenantData) => {
  try {
    const response = await api.post('/tenants', tenantData);
    return response.data;
  } catch (error) {
    console.log('Mock create tenant');
    return { ...tenantData, id: mockData.tenants.length + 1 };
  }
};

export const updateTenant = async (id, tenantData) => {
  try {
    const response = await api.put(`/tenants/${id}`, tenantData);
    return response.data;
  } catch (error) {
    console.log('Mock update tenant');
    return { ...tenantData, id };
  }
};

export const deleteTenant = async (id) => {
  try {
    const response = await api.delete(`/tenants/${id}`);
    return response.data;
  } catch (error) {
    console.log('Mock delete tenant');
    return { success: true };
  }
};

export default api;
