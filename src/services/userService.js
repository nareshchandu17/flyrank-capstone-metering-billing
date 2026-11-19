const pool = require('../config/database');

/**
 * Service to sync and manage application users from verified Auth0 JWT claims.
 */
class UserService {
  /**
   * Synchronize an authenticated user from Auth0 into PostgreSQL.
   * Uses verified JWT claims only.
   * 
   * @param {Object} claims - { sub, email, name, picture }
   * @returns {Promise<Object>} app_user record
   */
  async syncUserFromAuth0(claims) {
    const { sub, email, name, picture } = claims;
    if (!sub) {
      throw new Error('JWT subject (sub) claim is mandatory');
    }

    const safeEmail = email || `${sub.replace('|', '_')}@auth0.local`;
    const safeName = name || (email ? email.split('@')[0] : 'Auth0 User');

    const result = await pool.query(
      `INSERT INTO app_users (auth0_sub, email, name, picture, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (auth0_sub) DO UPDATE
       SET email = EXCLUDED.email,
           name = COALESCE(EXCLUDED.name, app_users.name),
           picture = COALESCE(EXCLUDED.picture, app_users.picture),
           updated_at = CURRENT_TIMESTAMP
       RETURNING id, auth0_sub, email, name, picture, created_at, updated_at`,
      [sub, safeEmail, safeName, picture || null]
    );

    const user = result.rows[0];

    // Check if user is a Platform Admin
    const adminCheck = await pool.query(
      'SELECT id, granted_by, created_at FROM platform_admins WHERE user_id = $1',
      [user.id]
    );
    user.isPlatformAdmin = adminCheck.rows.length > 0;

    return user;
  }

  /**
   * Get all active tenant memberships for a user
   * @param {string} userId - UUID of app_users
   * @returns {Promise<Array>} List of tenant memberships with tenant details
   */
  async getUserTenantMemberships(userId) {
    const result = await pool.query(
      `SELECT tm.id as membership_id, tm.tenant_id, tm.role, tm.status as membership_status,
              t.name as tenant_name, t.email as tenant_email, t.status as tenant_status,
              p.name as plan_name
       FROM tenant_memberships tm
       JOIN tenants t ON tm.tenant_id = t.id
       LEFT JOIN plans p ON t.plan_id = p.id
       WHERE tm.user_id = $1 AND tm.status = 'active'
       ORDER BY t.name ASC`,
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows;
    }

    // If platform admin and has no specific tenant memberships, auto-populate all available tenants with Platform Admin role
    const adminCheck = await pool.query(
      'SELECT id FROM platform_admins WHERE user_id = $1',
      [userId]
    );
    if (adminCheck.rows.length > 0) {
      const allTenants = await pool.query(
        `SELECT t.id as tenant_id, 'Platform Admin' as role, 'active' as membership_status,
                t.name as tenant_name, t.email as tenant_email, t.status as tenant_status,
                p.name as plan_name
         FROM tenants t
         LEFT JOIN plans p ON t.plan_id = p.id
         WHERE t.status = 'active'
         ORDER BY t.name ASC`
      );
      return allTenants.rows;
    }

    return [];
  }

  /**
   * Get a user's membership for a specific tenant
   * @param {string} userId - UUID of app_users
   * @param {string} tenantId - UUID of tenants
   * @returns {Promise<Object|null>}
   */
  async getUserMembershipForTenant(userId, tenantId) {
    const result = await pool.query(
      `SELECT tm.id as membership_id, tm.tenant_id, tm.role, tm.status as membership_status,
              t.name as tenant_name, t.email as tenant_email, t.status as tenant_status
       FROM tenant_memberships tm
       JOIN tenants t ON tm.tenant_id = t.id
       WHERE tm.user_id = $1 AND tm.tenant_id = $2`,
      [userId, tenantId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UserService();
