import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/admin';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getTenants = async () => {
  const response = await api.get('/tenants');
  return response.data;
};

export const getUsageHistory = async () => {
  const response = await api.get('/usage/history');
  return response.data;
};

export const getRealTimeUsage = async () => {
  const response = await api.get('/usage/realtime');
  return response.data;
};

export const getMetrics = async () => {
  const response = await api.get('/metrics');
  return response.data;
};

export const createTenant = async (tenantData) => {
  const response = await api.post('/tenants', tenantData);
  return response.data;
};

export const updateTenant = async (id, tenantData) => {
  const response = await api.put(`/tenants/${id}`, tenantData);
  return response.data;
};

export const deleteTenant = async (id) => {
  const response = await api.delete(`/tenants/${id}`);
  return response.data;
};

export default api;
