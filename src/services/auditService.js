const pool = require('../config/database');

/**
 * Service to log security-sensitive and administrative actions.
 */
class AuditService {
  /**
   * Log an audit event
   * @param {Object} params - { tenantId, userId, actorSub, actorEmail, action, resourceType, resourceId, metadata, ipAddress }
   */
  async log(params) {
    const {
      tenantId = null,
      userId = null,
      actorSub,
      actorEmail = null,
      action,
      resourceType,
      resourceId = null,
      metadata = {},
      ipAddress = null
    } = params;

    try {
      await pool.query(
        `INSERT INTO audit_logs 
         (tenant_id, user_id, actor_sub, actor_email, action, resource_type, resource_id, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tenantId,
          userId,
          actorSub || 'anonymous',
          actorEmail,
          action,
          resourceType,
          resourceId,
          JSON.stringify(metadata),
          ipAddress
        ]
      );
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  /**
   * Get audit logs for a tenant or platform
   * @param {Object} filter - { tenantId, limit, offset }
   * @returns {Promise<Array>}
   */
  async getLogs(filter = {}) {
    const limit = Math.min(parseInt(filter.limit, 10) || 50, 100);
    const offset = Math.max(parseInt(filter.offset, 10) || 0, 0);
    const params = [limit, offset];
    let query = `
      SELECT id, tenant_id, user_id, actor_sub, actor_email, action, resource_type, resource_id, metadata, ip_address, created_at
      FROM audit_logs
    `;

    if (filter.tenantId) {
      params.push(filter.tenantId);
      query += ` WHERE tenant_id = $3`;
    }

    query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new AuditService();
