#!/usr/bin/env node
require('dotenv').config();
const pool = require('../src/config/database');
const userService = require('../src/services/userService');
const auditService = require('../src/services/auditService');

/**
 * Bootstrap Platform Administrator Script
 * 
 * Usage:
 *   node scripts/bootstrap-admin.js <auth0_sub> [email] [name]
 * 
 * Example:
 *   node scripts/bootstrap-admin.js auth0|654321admin admin@flyrank.com "Platform Administrator"
 */

async function main() {
  const args = process.argv.slice(2);
  const auth0Sub = args[0];
  const email = args[1] || 'admin@flyrank.com';
  const name = args[2] || 'Platform Administrator';

  if (!auth0Sub) {
    console.error('Usage: node scripts/bootstrap-admin.js <auth0_sub> [email] [name]');
    console.error('Example: node scripts/bootstrap-admin.js auth0|123456789 admin@company.com');
    process.exit(1);
  }

  console.log(`[BOOTSTRAP] Registering user ${auth0Sub} (${email})...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure user exists in app_users
    const user = await userService.syncUserFromAuth0({
      sub: auth0Sub,
      email,
      name
    });

    console.log(`[BOOTSTRAP] app_users entry verified: ID ${user.id}`);

    // 2. Grant Platform Admin
    await client.query(
      `INSERT INTO platform_admins (user_id, granted_by)
       VALUES ($1, 'bootstrap_script')
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    await client.query('COMMIT');

    await auditService.log({
      userId: user.id,
      actorSub: 'cli:bootstrap_script',
      action: 'platform_admin.granted',
      resourceType: 'platform_admins',
      resourceId: user.id,
      metadata: { auth0_sub: auth0Sub, email }
    });

    console.log('\n========================================================');
    console.log('SUCCESS: Platform Admin role granted successfully!');
    console.log(`User ID   : ${user.id}`);
    console.log(`Auth0 Sub : ${auth0Sub}`);
    console.log(`Email     : ${email}`);
    console.log('========================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bootstrap error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
