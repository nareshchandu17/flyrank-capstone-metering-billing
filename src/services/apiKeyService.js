const crypto = require('crypto');
const pool = require('../config/database');

class ApiKeyService {
  /**
   * Create a new API key for a tenant
   * @param {string} tenantId - Tenant UUID
   * @param {string} name - Human-readable label for key
   * @returns {Object} API key metadata including plaintext key (only exposed on creation)
   */
  async createApiKey(tenantId, name = 'Default Key') {
    // Verify tenant exists and is active
    const tenantCheck = await pool.query(
      'SELECT id, status FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantCheck.rows.length === 0) {
      const err = new Error('Tenant not found');
      err.statusCode = 404;
      throw err;
    }

    if (tenantCheck.rows[0].status !== 'active') {
      const err = new Error('Tenant account is not active');
      err.statusCode = 403;
      throw err;
    }

    // Generate cryptographically secure API key
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const rawApiKey = `sk_live_${rawSecret}`;
    const prefix = rawApiKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    const result = await pool.query(
      `INSERT INTO api_keys (tenant_id, key_hash, prefix, name, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, tenant_id, prefix, name, status, created_at`,
      [tenantId, keyHash, prefix, name]
    );

    const record = result.rows[0];

    return {
      ...record,
      api_key: rawApiKey, // Revealed only once upon creation
    };
  }

  /**
   * List API keys for a tenant (without revealing secret hashes)
   * @param {string} tenantId - Tenant UUID
   * @returns {Array} List of API key records
   */
  async listApiKeys(tenantId) {
    const result = await pool.query(
      `SELECT id, tenant_id, prefix, name, status, last_used_at, created_at, revoked_at
       FROM api_keys
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );

    return result.rows;
  }

  /**
   * Rotate an API key: atomically revokes old key and creates a new one
   * @param {string} tenantId - Tenant UUID
   * @param {string} keyId - API key UUID to rotate
   * @returns {Object} Revoked old key details and active new key details with plaintext key
   */
  async rotateApiKey(tenantId, keyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify existing key
      const keyCheck = await client.query(
        'SELECT id, name, status FROM api_keys WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [keyId, tenantId]
      );

      if (keyCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('API key not found');
        err.statusCode = 404;
        throw err;
      }

      const existingKey = keyCheck.rows[0];

      // Revoke the old key
      const revokeResult = await client.query(
        `UPDATE api_keys 
         SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, prefix, name, status, revoked_at`,
        [keyId, tenantId]
      );

      // Generate the new replacement key
      const rawSecret = crypto.randomBytes(24).toString('hex');
      const rawApiKey = `sk_live_${rawSecret}`;
      const prefix = rawApiKey.substring(0, 12);
      const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
      const keyName = `${existingKey.name} (Rotated)`;

      const insertResult = await client.query(
        `INSERT INTO api_keys (tenant_id, key_hash, prefix, name, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, tenant_id, prefix, name, status, created_at`,
        [tenantId, keyHash, prefix, keyName]
      );

      await client.query('COMMIT');

      return {
        old_key: revokeResult.rows[0],
        new_key: {
          ...insertResult.rows[0],
          api_key: rawApiKey,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke an API key
   * @param {string} tenantId - Tenant UUID
   * @param {string} keyId - API key UUID to revoke
   * @returns {Object} Revoked key details
   */
  async revokeApiKey(tenantId, keyId) {
    const result = await pool.query(
      `UPDATE api_keys
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, tenant_id, prefix, name, status, revoked_at`,
      [keyId, tenantId]
    );

    if (result.rows.length === 0) {
      const err = new Error('API key not found');
      err.statusCode = 404;
      throw err;
    }

    return result.rows[0];
  }
}

module.exports = new ApiKeyService();
