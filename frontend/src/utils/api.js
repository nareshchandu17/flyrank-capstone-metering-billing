import axios from 'axios';

// Resolve backend base URL
const getBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    return '/api';
  };

  const API_BASE_URL = getBaseUrl();

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

      // Dynamic Auth0 token getter and active tenant tracking
      let tokenGetter = null;
      let activeTenantId = null;

      export const setTokenGetter = (fn) => {
        tokenGetter = fn;
      };

      export const setActiveTenantHeader = (tenantId) => {
        activeTenantId = tenantId;
      };

      // Request Interceptor: Attach Auth0 Bearer token and active tenant header
      api.interceptors.request.use(async (config) => {
        if (tokenGetter && typeof tokenGetter === 'function') {
          try {
            const token = await tokenGetter();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (err) {
            console.warn('Error fetching token for request interceptor:', err);
          }
        }

        if (activeTenantId && !config.headers['X-Tenant-ID']) {
          config.headers['X-Tenant-ID'] = activeTenantId;
        }

        return config;
      });

      // Response Interceptor: Handle 401 unauthorized gracefully
      api.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 401) {
            console.warn('Unauthorized API response - session may be expired or invalid');
          }
          return Promise.reject(error);
        }
      );

      // ==========================================
      // 1. AUTH & USER PROFILE
      // ==========================================
      export const getMe = async () => {
        const response = await api.get('/auth/me');
        return response.data;
      };

      export const acceptInvitation = async (token) => {
        const response = await api.post('/auth/invitations/accept', { token });
        return response.data;
      };

      // ==========================================
      // 2. OVERVIEW & METRICS (Platform Admin / Scoped)
      // ==========================================
      export const getMetrics = async () => {
        try {
          const response = await api.get('/admin/metrics');
          return response.data;
        } catch (err) {
          const status = err.response?.status;
          if (status === 403 || status === 401) {
            if (!activeTenantId) {
              return {
                monthlyRevenue: '0.00',
                totalRevenue: '0.00',
                monthlyGrowth: 0,
                activeTenants: 0,
                totalTenants: 0,
                totalEvents: 0,
                avgUsage: 0,
                totalApiCalls: 0,
                totalAiTokens: 0,
                billingStatus: { paid: 0, pending: 0, failed: 0 }
              };
            }
            try {
              const fallback = await api.get('/dashboard/stats');
              return fallback.data.data || fallback.data;
            } catch {
              return null;
            }
          }
          throw err;
        }
      };

      export const getRealTimeUsage = async () => {
        try {
          const response = await api.get('/admin/usage/realtime');
          return response.data || [];
        } catch (err) {
          if (err.response?.status === 403 || err.response?.status === 401) {
            return [];
          }
          return [];
        }
      };

      export const getDashboardStats = async (tenantId) => {
        const response = await api.get('/dashboard/stats', {
          headers: tenantId ? { 'X-Tenant-ID': tenantId } : {}
        });
        return response.data.data;
      };

      // ==========================================
      // 3. TENANTS MANAGEMENT
      // ==========================================
      export const getTenants = async () => {
        try {
          const response = await api.get('/tenants');
          return response.data.tenants || response.data || [];
        } catch (err) {
          if (err.response?.status === 403 || err.response?.status === 401) {
            try {
              const me = await getMe();
              return (me.memberships || []).map(m => ({
                id: m.tenant_id,
                name: m.tenant_name,
                plan: m.plan_name || 'Free',
                status: m.membership_status || 'active',
                role: m.role
              }));
            } catch {
              return [];
            }
          }
          return [];
        }
      };

        export const getTenant = async (id) => {
          const response = await api.get(`/tenants/${id}`);
          return response.data;
        };

        export const getTenantUsage = async (id) => {
          const response = await api.get(`/tenants/${id}/usage`);
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

        // ==========================================
        // 4. MEMBERSHIP & INVITATIONS
        // ==========================================
          export const getTenantMembers = async (tenantId) => {
            const response = await api.get(`/tenants/${tenantId}/members`);
            return response.data;
          };

            export const updateTenantMember = async (tenantId, memberId, data) => {
              const response = await api.put(`/tenants/${tenantId}/members/${memberId}`, data);
              return response.data;
            };

              export const removeTenantMember = async (tenantId, memberId) => {
                const response = await api.delete(`/tenants/${tenantId}/members/${memberId}`);
                return response.data;
              };

                export const getTenantInvitations = async (tenantId) => {
                  const response = await api.get(`/tenants/${tenantId}/invitations`);
                  return response.data;
                };

                export const inviteTenantMember = async (tenantId, invitationData) => {
                  const response = await api.post(`/tenants/${tenantId}/invitations`, invitationData);
                  return response.data;
                };

                export const revokeTenantInvitation = async (tenantId, invitationId) => {
                  const response = await api.delete(`/tenants/${tenantId}/invitations/${invitationId}`);
                  return response.data;
                };

                // ==========================================
                // 5. API KEYS (Scoped to active tenant)
                // ==========================================
                export const getApiKeys = async (tenantId) => {
                  const target = tenantId || activeTenantId;
                  if (!target) return [];
                  const response = await api.get(`/tenants/${target}/api-keys`);
                  return response.data.data || response.data;
                };

                  export const createApiKey = async (tenantId, name) => {
                    const target = tenantId || activeTenantId;
                    const response = await api.post(`/tenants/${target}/api-keys`, { name });
                    return response.data.data || response.data;
                  };

                  export const rotateApiKey = async (tenantId, keyId) => {
                    const target = tenantId || activeTenantId;
                    const response = await api.post(`/tenants/${target}/api-keys/${keyId}/rotate`);
                    return response.data.data || response.data;
                  };

                  export const revokeApiKey = async (tenantId, keyId) => {
                    const target = tenantId || activeTenantId;
                    const response = await api.delete(`/tenants/${target}/api-keys/${keyId}`);
                    return response.data;
                  };

                  // ==========================================
                  // 6. USAGE & ANALYTICS
                  // ==========================================
                  export const getUsageStats = async (tenantId) => {
                    const response = await api.get('/usage/stats', {
                      headers: tenantId ? { 'X-Tenant-ID': tenantId } : {}
                    });
                    return response.data.data;
                  };

                  export const getUsageHistory = async (params = {}) => {
                    try {
                      const response = await api.get('/admin/usage/history', { params });
                      return response.data || [];
                    } catch (err) {
                      const status = err.response?.status;
                      if (status === 403 || status === 401) {
                        if (!activeTenantId) return [];
                        try {
                          const fallback = await api.get('/history/transactions', { params });
                          return (fallback.data.data || fallback.data || []).map(item => ({
                            id: item.id,
                            tenant: item.tenant_name || item.tenant_id,
                            metric: item.usage_type === 'api_call' ? 'API Calls' : 'AI Tokens',
                            value: item.quantity,
                            unit: item.usage_type === 'api_call' ? 'requests' : 'tokens',
                            date: item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
                            time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                            cost: (item.amount_cents ? (item.amount_cents / 100).toFixed(2) : '0.00'),
                            cost_formatted: `$${(item.amount_cents ? (item.amount_cents / 100).toFixed(2) : '0.00')}`,
                            usage_type: item.usage_type,
                            metadata: item.metadata
                          }));
                        } catch {
                          return [];
                        }
                      }
                      return [];
                    }
                  };

                  export const recordUsage = async (usageData) => {
                    const response = await api.post('/usage', usageData);
                    return response.data;
                  };

                  export const exportUsageToCsv = (events, filename = 'usage_export.csv') => {
                    if (!events || events.length === 0) return;
                    const headers = ['ID', 'Tenant', 'Type', 'Quantity', 'Date'];
                    const rows = events.map(e => [
                      e.id,
                      e.tenant_name || e.tenant_id,
                      e.usage_type,
                      e.quantity,
                      e.created_at
                    ]);
                    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  };

                  export const getUsageEvents = async (tenantId, limit = 50, offset = 0) => {
                    const target = tenantId || activeTenantId;
                    const response = await api.get(`/usage/events/${target}`, {
                      params: { limit, offset }
                    });
                    return response.data.data || response.data;
                  };

                  export const getTopEndpoints = async (tenantId) => {
                    const response = await api.get('/usage/endpoints', {
                      headers: tenantId ? { 'X-Tenant-ID': tenantId } : {}
                    });
                    return response.data.data;
                  };

                  export const getSystemResources = async () => {
                    const response = await api.get('/usage/resources');
                    return response.data.data;
                  };

                  // ==========================================
                  // 7. INVOICING & BILLING
                  // ==========================================
                    export const getInvoices = async (tenantId) => {
                      const response = await api.get('/history/invoices', {
                        headers: tenantId ? { 'X-Tenant-ID': tenantId } : {}
                      });
                      return response.data.data || response.data;
                    };

                      export const getInvoiceDetail = async (id) => {
                        const response = await api.get(`/invoices/detail/${id}`);
                        return response.data;
                      };

                      export const generateInvoice = async (tenantId, billingPeriod) => {
                        const response = await api.post('/invoices/generate', {
                          tenant_id: tenantId,
                          billing_period: billingPeriod
                        });
                        return response.data;
                      };

                        export const getTransactions = async (tenantId, limit = 50, offset = 0) => {
                          const response = await api.get('/history/transactions', {
                            params: { limit, offset },
                            headers: tenantId ? { 'X-Tenant-ID': tenantId } : {}
                          });
                          return response.data.data;
                        };

                        export const getBillingSummary = async (tenantId) => {
                          const response = await api.get('/history/summary', {
                            headers: tenantId ? { 'X-Tenant-ID': tenantId } : {}
                          });
                          return response.data.data;
                        };

                        // ==========================================
                        // 8. STRIPE CHECKOUT & RECONCILIATION
                        // ==========================================
                        export const createCheckoutSession = async (tenantId, planName) => {
                          const response = await api.post('/stripe/checkout', {
                            tenant_id: tenantId,
                            plan_name: planName
                          });
                          return response.data;
                        };

                        export const reconcileSubscriptions = async (tenantId) => {
                          const url = tenantId ? `/stripe/reconcile/${tenantId}` : '/stripe/reconcile';
                          const response = await api.post(url, tenantId ? { tenant_id: tenantId } : {});
                          return response.data;
                        };

                        export const getWebhookEvents = async (status, limit = 50) => {
                          const response = await api.get('/stripe/webhooks/events', {
                            params: { status, limit }
                          });
                          return response.data;
                        };

                        // ==========================================
                        // 9. AUDIT LOGS
                        // ==========================================
                        export const getAuditLogs = async (tenantId) => {
                          const url = tenantId ? `/tenants/${tenantId}/audit-logs` : '/admin/audit-logs';
                          const response = await api.get(url);
                          return response.data;
                        };

                        // Client Settings (theme, alert preferences) - completely removed hardcoded admin credentials
                        export const getSettings = () => {
                          const saved = localStorage.getItem('usage_metering_settings');
                          if (saved) {
                            try {
                              return JSON.parse(saved);
                            } catch {
                              // Fallback
                            }
                          }
                          return {
                            alertThresholdPercent: 80,
                            stripeLiveMode: false,
                            autoReconcile: true,
                            currency: 'USD',
                            webhookNotifications: true
                          };
                        };

                        export const saveSettings = (newSettings) => {
                          localStorage.setItem('usage_metering_settings', JSON.stringify(newSettings));
                          return { success: true, message: 'Settings saved successfully' };
                        };

                        export default api;
