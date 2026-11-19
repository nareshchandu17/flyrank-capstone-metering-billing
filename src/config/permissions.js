/**
 * Centralized Permission Map and Roles for RBAC
 * 
 * Roles:
 * 1. Platform Admin - Global access across all tenants, lifecycle, users, config, billing.
 * 2. Tenant Owner   - Full tenant access, members, invitations, API keys, usage, billing, settings.
 * 3. Billing Manager- Billing dashboards, invoices, checkout, upgrade/downgrade, summaries.
 * 4. Developer      - Usage dashboards/history, API keys (create/rotate/revoke), quota analytics.
 * 5. Viewer         - Read-only access to permitted tenant dashboards, usage, and invoices.
 */

const ROLES = {
  PLATFORM_ADMIN: 'Platform Admin',
  TENANT_OWNER: 'Tenant Owner',
  BILLING_MANAGER: 'Billing Manager',
  DEVELOPER: 'Developer',
  VIEWER: 'Viewer'
};

const PERMISSIONS = {
  // Global Platform Permissions
  PLATFORM_MANAGE: 'platform:manage',
  PLATFORM_VIEW: 'platform:view',
  PLATFORM_METRICS: 'platform:metrics',
  TENANTS_CREATE: 'tenants:create',
  TENANTS_DELETE: 'tenants:delete',
  TENANTS_LIST_ALL: 'tenants:list_all',

  // Tenant Administration & Memberships
  TENANT_VIEW: 'tenant:view',
  TENANT_UPDATE: 'tenant:update',
  MEMBERS_MANAGE: 'members:manage',
  MEMBERS_VIEW: 'members:view',

  // API Key Management
  API_KEYS_MANAGE: 'api_keys:manage',
  API_KEYS_VIEW: 'api_keys:view',

  // Usage & Quotas
  USAGE_VIEW: 'usage:view',
  USAGE_ANALYTICS: 'usage:analytics',

  // Billing & Subscriptions
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',
  INVOICES_VIEW: 'invoices:view',
  INVOICES_GENERATE: 'invoices:generate'
};

const ROLE_PERMISSIONS = {
  [ROLES.PLATFORM_ADMIN]: [
    PERMISSIONS.PLATFORM_MANAGE,
    PERMISSIONS.PLATFORM_VIEW,
    PERMISSIONS.PLATFORM_METRICS,
    PERMISSIONS.TENANTS_CREATE,
    PERMISSIONS.TENANTS_DELETE,
    PERMISSIONS.TENANTS_LIST_ALL,
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.TENANT_UPDATE,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.API_KEYS_MANAGE,
    PERMISSIONS.API_KEYS_VIEW,
    PERMISSIONS.USAGE_VIEW,
    PERMISSIONS.USAGE_ANALYTICS,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_GENERATE
  ],

  [ROLES.TENANT_OWNER]: [
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.TENANT_UPDATE,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.API_KEYS_MANAGE,
    PERMISSIONS.API_KEYS_VIEW,
    PERMISSIONS.USAGE_VIEW,
    PERMISSIONS.USAGE_ANALYTICS,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_GENERATE
  ],

  [ROLES.BILLING_MANAGER]: [
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.USAGE_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_GENERATE
  ],

  [ROLES.DEVELOPER]: [
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.API_KEYS_MANAGE,
    PERMISSIONS.API_KEYS_VIEW,
    PERMISSIONS.USAGE_VIEW,
    PERMISSIONS.USAGE_ANALYTICS
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.USAGE_VIEW,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.BILLING_VIEW
  ]
};

/**
 * Check if a role possesses a required permission
 * @param {string} role 
 * @param {string} permission 
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return Array.isArray(permissions) && permissions.includes(permission);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission
};
