const pool = require('../config/database');
const crypto = require('crypto');

/**
 * Middleware to authenticate API requests using Bearer token
 */
const requireApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected format: Bearer <API_KEY>'
      });
    }

    const apiKey = authHeader.split(' ')[1];
    
    // Hash the provided key to compare with the database
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const result = await pool.query(
      `SELECT k.id, k.tenant_id, t.status 
       FROM api_keys k
       JOIN tenants t ON k.tenant_id = t.id
       WHERE k.key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    const tenant = result.rows[0];

    if (tenant.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Tenant account is inactive or suspended'
      });
    }

    // Attach tenantId to the request object
    req.tenantId = tenant.tenant_id;
    
    // Update last_used_at async (don't block the request)
    pool.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [tenant.id])
      .catch(err => console.error('Failed to update API key last_used_at:', err));

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = { requireApiKey };
