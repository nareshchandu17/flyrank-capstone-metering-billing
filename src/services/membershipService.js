const crypto = require('crypto');
const pool = require('../config/database');
const auditService = require('./auditService');
const { ROLES } = require('../config/permissions');

class MembershipService {
  /**
   * Add a member to a tenant
   */
  async addMember(tenantId, userId, role, actor) {
    if (!Object.values(ROLES).includes(role) || role === ROLES.PLATFORM_ADMIN) {
      const err = new Error(`Invalid tenant role: ${role}`);
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET role = EXCLUDED.role, status = 'active', updated_at = CURRENT_TIMESTAMP
         RETURNING id, tenant_id, user_id, role, status, created_at, updated_at`,
        [tenantId, userId, role]
      );

      await client.query('COMMIT');

      await auditService.log({
        tenantId,
        userId: actor?.id,
        actorSub: actor?.auth0_sub || 'system',
        actorEmail: actor?.email,
        action: 'member.added',
        resourceType: 'tenant_membership',
        resourceId: result.rows[0].id,
        metadata: { target_user_id: userId, role }
      });

      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List all members of a tenant
   */
  async listMembers(tenantId) {
    const result = await pool.query(
      `SELECT tm.id, tm.tenant_id, tm.role, tm.status, tm.created_at, tm.updated_at,
              u.id as user_id, u.email, u.name, u.picture
       FROM tenant_memberships tm
       JOIN app_users u ON tm.user_id = u.id
       WHERE tm.tenant_id = $1
       ORDER BY tm.created_at ASC`,
      [tenantId]
    );
    return result.rows;
  }

  /**
   * Update a member's role or status
   */
  async updateMember(tenantId, memberId, updates, actor) {
    const { role, status } = updates;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const current = await client.query(
        'SELECT id, user_id, role, status FROM tenant_memberships WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [memberId, tenantId]
      );

      if (current.rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('Member not found');
        err.statusCode = 404;
        throw err;
      }

      const member = current.rows[0];

      // Protect against removing the last active Tenant Owner
      if (member.role === ROLES.TENANT_OWNER && (role !== ROLES.TENANT_OWNER || status === 'suspended')) {
        const ownerCountRes = await client.query(
          `SELECT COUNT(*) as count FROM tenant_memberships 
           WHERE tenant_id = $1 AND role = $2 AND status = 'active' AND id != $3`,
          [tenantId, ROLES.TENANT_OWNER, memberId]
        );
        if (parseInt(ownerCountRes.rows[0].count, 10) === 0) {
          await client.query('ROLLBACK');
          const err = new Error('Cannot demote or suspend the last active Tenant Owner');
          err.statusCode = 400;
          throw err;
        }
      }

      const newRole = role || member.role;
      const newStatus = status || member.status;

      const updated = await client.query(
        `UPDATE tenant_memberships 
         SET role = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND tenant_id = $4
         RETURNING id, tenant_id, user_id, role, status, updated_at`,
        [newRole, newStatus, memberId, tenantId]
      );

      await client.query('COMMIT');

      await auditService.log({
        tenantId,
        userId: actor?.id,
        actorSub: actor?.auth0_sub || 'system',
        actorEmail: actor?.email,
        action: 'member.updated',
        resourceType: 'tenant_membership',
        resourceId: memberId,
        metadata: { old_role: member.role, new_role: newRole, old_status: member.status, new_status: newStatus }
      });

      return updated.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a member from a tenant
   */
  async removeMember(tenantId, memberId, actor) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const current = await client.query(
        'SELECT id, user_id, role FROM tenant_memberships WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [memberId, tenantId]
      );

      if (current.rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('Member not found');
        err.statusCode = 404;
        throw err;
      }

      const member = current.rows[0];

      // Protect against deleting the last active Tenant Owner
      if (member.role === ROLES.TENANT_OWNER) {
        const ownerCountRes = await client.query(
          `SELECT COUNT(*) as count FROM tenant_memberships 
           WHERE tenant_id = $1 AND role = $2 AND status = 'active' AND id != $3`,
          [tenantId, ROLES.TENANT_OWNER, memberId]
        );
        if (parseInt(ownerCountRes.rows[0].count, 10) === 0) {
          await client.query('ROLLBACK');
          const err = new Error('Cannot remove the last active Tenant Owner');
          err.statusCode = 400;
          throw err;
        }
      }

      await client.query('DELETE FROM tenant_memberships WHERE id = $1', [memberId]);
      await client.query('COMMIT');

      await auditService.log({
        tenantId,
        userId: actor?.id,
        actorSub: actor?.auth0_sub || 'system',
        actorEmail: actor?.email,
        action: 'member.removed',
        resourceType: 'tenant_membership',
        resourceId: memberId,
        metadata: { removed_user_id: member.user_id, role: member.role }
      });

      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Create a secure invitation for a new tenant member
   */
  async createInvitation(tenantId, email, role, actor) {
    if (!Object.values(ROLES).includes(role) || role === ROLES.PLATFORM_ADMIN) {
      const err = new Error(`Invalid tenant role: ${role}`);
      err.statusCode = 400;
      throw err;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await pool.query(
      `INSERT INTO tenant_invitations (tenant_id, email, role, token, invited_by, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, tenant_id, email, role, token, expires_at, status, created_at`,
      [tenantId, email.toLowerCase().trim(), role, token, actor?.id || null, expiresAt]
    );

    await auditService.log({
      tenantId,
      userId: actor?.id,
      actorSub: actor?.auth0_sub || 'system',
      actorEmail: actor?.email,
      action: 'invitation.created',
      resourceType: 'tenant_invitation',
      resourceId: result.rows[0].id,
      metadata: { email, role, expires_at: expiresAt }
    });

    return result.rows[0];
  }

  /**
   * List pending invitations for a tenant
   */
  async listInvitations(tenantId) {
    const result = await pool.query(
      `SELECT id, tenant_id, email, role, status, expires_at, created_at
       FROM tenant_invitations
       WHERE tenant_id = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  /**
   * Accept an invitation using its secure token
   */
  async acceptInvitation(token, currentUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invResult = await client.query(
        `SELECT id, tenant_id, email, role, status, expires_at 
         FROM tenant_invitations 
         WHERE token = $1 FOR UPDATE`,
        [token]
      );

      if (invResult.rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('Invitation not found or invalid token');
        err.statusCode = 404;
        throw err;
      }

      const inv = invResult.rows[0];

      if (inv.status !== 'pending') {
        await client.query('ROLLBACK');
        const err = new Error(`Invitation is already ${inv.status}`);
        err.statusCode = 400;
        throw err;
      }

      if (new Date(inv.expires_at) < new Date()) {
        await client.query('UPDATE tenant_invitations SET status = \'expired\' WHERE id = $1', [inv.id]);
        await client.query('COMMIT');
        const err = new Error('Invitation has expired');
        err.statusCode = 400;
        throw err;
      }

      // Add membership
      await client.query(
        `INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET role = EXCLUDED.role, status = 'active', updated_at = CURRENT_TIMESTAMP`,
        [inv.tenant_id, currentUser.id, inv.role]
      );

      // Mark invitation accepted
      await client.query(
        `UPDATE tenant_invitations 
         SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [inv.id]
      );

      await client.query('COMMIT');

      await auditService.log({
        tenantId: inv.tenant_id,
        userId: currentUser.id,
        actorSub: currentUser.auth0_sub,
        actorEmail: currentUser.email,
        action: 'invitation.accepted',
        resourceType: 'tenant_invitation',
        resourceId: inv.id,
        metadata: { role: inv.role }
      });

      return { success: true, tenant_id: inv.tenant_id, role: inv.role };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(tenantId, invitationId, actor) {
    const result = await pool.query(
      `UPDATE tenant_invitations 
       SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
       RETURNING id, email, role`,
      [invitationId, tenantId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Invitation not found or already processed');
      err.statusCode = 404;
      throw err;
    }

    await auditService.log({
      tenantId,
      userId: actor?.id,
      actorSub: actor?.auth0_sub || 'system',
      actorEmail: actor?.email,
      action: 'invitation.revoked',
      resourceType: 'tenant_invitation',
      resourceId: invitationId,
      metadata: result.rows[0]
    });

    return { success: true };
  }
}

module.exports = new MembershipService();
