const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('auth_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Usage metering
  async recordUsage(tenantId, usageData) {
    return this.request('/usage', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        ...usageData,
      }),
    });
  }

  async getUsageSummary(tenantId) {
    return this.request(`/usage/${tenantId}`);
  }

  // Stripe checkout
  async createCheckoutSession(tenantId, planId) {
    return this.request('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        plan_id: planId,
      }),
    });
  }

  // Tenants (need to add these endpoints to backend)
  async getTenants() {
    return this.request('/tenants');
  }

  async createTenant(tenantData) {
    return this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  }

  async updateTenant(tenantId, tenantData) {
    return this.request(`/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
  }

  async deleteTenant(tenantId) {
    return this.request(`/tenants/${tenantId}`, {
      method: 'DELETE',
    });
  }

  // Plans
  async getPlans() {
    return this.request('/plans');
  }

  // Subscriptions
  async getSubscriptions(tenantId) {
    return this.request(`/subscriptions/${tenantId}`);
  }

  // Usage events
  async getUsageEvents(tenantId, filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/usage-events/${tenantId}?${params}`);
  }

  // Authentication (if we add it)
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Dashboard stats
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }
}

export const api = new ApiService();