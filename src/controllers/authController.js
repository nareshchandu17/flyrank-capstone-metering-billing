const userService = require('../services/userService');
const membershipService = require('../services/membershipService');
const auditService = require('../services/auditService');

class AuthController {
  /**
   * Get authenticated user profile and all tenant memberships
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      const user = req.user;
      const memberships = await userService.getUserTenantMemberships(user.id);

      res.status(200).json({
        user: {
          id: user.id,
          auth0_sub: user.auth0_sub,
          email: user.email,
          name: user.name,
          picture: user.picture,
          is_platform_admin: user.isPlatformAdmin
        },
        memberships
      });
    } catch (err) {
      console.error('Error in getMe:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Accept an invitation using token
   * POST /api/auth/invitations/accept
   */
  async acceptInvitation(req, res) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Invitation token is required' });
      }

      const result = await membershipService.acceptInvitation(token, req.user);
      res.status(200).json(result);
    } catch (err) {
      console.error('Error accepting invitation:', err.message);
      res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * List members of a tenant
   * GET /api/tenants/:tenant_id/members
   */
  async listMembers(req, res) {
    try {
      const tenantId = req.params.tenant_id;
      const members = await membershipService.listMembers(tenantId);
      res.status(200).json(members);
    } catch (err) {
      console.error('Error listing members:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a member's role or status
   * PUT /api/tenants/:tenant_id/members/:member_id
   */
  async updateMember(req, res) {
    try {
      const { tenant_id, member_id } = req.params;
      const { role, status } = req.body;
      const updated = await membershipService.updateMember(tenant_id, member_id, { role, status }, req.user);
      res.status(200).json(updated);
    } catch (err) {
      console.error('Error updating member:', err.message);
      res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Remove a member from a tenant
   * DELETE /api/tenants/:tenant_id/members/:member_id
   */
  async removeMember(req, res) {
    try {
      const { tenant_id, member_id } = req.params;
      const result = await membershipService.removeMember(tenant_id, member_id, req.user);
      res.status(200).json(result);
    } catch (err) {
      console.error('Error removing member:', err.message);
      res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Create an invitation for a new tenant member
   * POST /api/tenants/:tenant_id/invitations
   */
  async createInvitation(req, res) {
    try {
      const tenantId = req.params.tenant_id;
      const { email, role } = req.body;
      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' });
      }

      const inv = await membershipService.createInvitation(tenantId, email, role, req.user);
      res.status(201).json(inv);
    } catch (err) {
      console.error('Error creating invitation:', err.message);
      res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * List invitations for a tenant
   * GET /api/tenants/:tenant_id/invitations
   */
  async listInvitations(req, res) {
    try {
      const tenantId = req.params.tenant_id;
      const invitations = await membershipService.listInvitations(tenantId);
      res.status(200).json(invitations);
    } catch (err) {
      console.error('Error listing invitations:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Revoke an invitation
   * DELETE /api/tenants/:tenant_id/invitations/:invitation_id
   */
  async revokeInvitation(req, res) {
    try {
      const { tenant_id, invitation_id } = req.params;
      const result = await membershipService.revokeInvitation(tenant_id, invitation_id, req.user);
      res.status(200).json(result);
    } catch (err) {
      console.error('Error revoking invitation:', err.message);
      res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Get audit logs (Platform Admin gets all; Tenant Owner gets their tenant's)
   * GET /api/audit-logs
   */
  async getAuditLogs(req, res) {
    try {
      const tenantId = req.isPlatformAdmin ? req.query.tenant_id : req.tenantId;
      const { limit, offset } = req.query;
      const logs = await auditService.getLogs({ tenantId, limit, offset });
      res.status(200).json(logs);
    } catch (err) {
      console.error('Error getting audit logs:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();
