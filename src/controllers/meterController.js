const meterService = require('../services/meterService');
const invoiceService = require('../services/invoiceService');
const crypto = require('crypto');
const uuidv4 = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
const pool = require('../config/database');

class MeterController {
  /**
   * Record usage event
   * POST /api/usage
   */
  async recordUsage(req, res) {
    try {
      // Inferred securely from API key (or admin request)
      const tenant_id = req.tenantId || (req.isAdmin ? req.body.tenant_id : null);
      const { usage_type, quantity, idempotency_key, metadata } = req.body;
      
      if (!tenant_id) {
        return res.status(400).json({
          error: 'Tenant ID could not be identified from authentication'
        });
      }

      // Validate required fields
      if (!usage_type || quantity === undefined || quantity === null || !idempotency_key) {
        return res.status(400).json({
          error: 'Missing required fields: usage_type, quantity, idempotency_key'
        });
      }
      
      // Validate usage type
      if (!['api_call', 'ai_tokens'].includes(usage_type)) {
        return res.status(400).json({
          error: 'Invalid usage_type. Must be "api_call" or "ai_tokens"'
        });
      }
      
      // Validate quantity is strictly a positive integer
      if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          error: 'Quantity must be a positive integer greater than zero'
        });
      }
      
      const result = await meterService.recordUsage(
        tenant_id,
        usage_type,
        quantity,
        idempotency_key,
        metadata
      );
      
      if (result.status === 'conflict') {
        return res.status(result.statusCode || 409).json({
          error: result.message
        });
      }

      if (result.status === 'rejected') {
        return res.status(result.statusCode).json({
          error: result.message,
          quota_info: result.quotaInfo
        });
      }
      
      if (result.status === 'duplicate') {
        return res.status(200).json({
          message: result.message,
          data: result.data
        });
      }
      
      res.status(201).json({
        message: result.message,
        data: result.data
      });
      
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message
        });
      }
      console.error('Error recording usage:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
  
  /**
   * Get usage summary for tenant
   * GET /api/usage/:tenant_id or GET /api/usage
   */
  async getUsageSummary(req, res) {
    try {
      const targetTenantId = req.params.tenant_id || req.tenantId;
      
      if (!targetTenantId) {
        return res.status(400).json({
          error: 'Tenant ID is required'
        });
      }

      // Enforce tenant scoping: non-admin tenants can only view their own usage
      if (!req.isAdmin && req.tenantId && req.tenantId !== targetTenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only access data for your own tenant'
        });
      }
      
      const summary = await meterService.getUsageSummary(targetTenantId);
      
      res.status(200).json(summary);
      
    } catch (error) {
      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          error: 'Tenant not found'
        });
      }
      
      console.error('Error getting usage summary:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
  
  /**
   * Dummy billable endpoint
   * POST /api/generate
   */
  async generate(req, res) {
    try {
      const tenant_id = req.tenantId; // Inferred from API key
      const { prompt, model = 'gpt-4' } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          error: 'Missing required fields: prompt'
        });
      }
      
      // Generate deterministic response and calculate actual token counts
      const generated_text = `Processed completion for: "${prompt.trim()}". Engine completed generation under model ${model} with temperature 0.7.`;
      const inputTokens = Math.max(1, Math.ceil(prompt.trim().length / 4));
      const outputTokens = Math.max(1, Math.ceil(generated_text.length / 4));
      const totalTokens = inputTokens + outputTokens;
      
      const idempotency_key = uuidv4();
      
      const metadata = {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        prompt_preview: prompt.substring(0, 50)
      };
      
      // Call meter service
      const result = await meterService.recordUsage(
        tenant_id,
        'ai_tokens',
        totalTokens,
        idempotency_key,
        metadata
      );
      
      if (result.status === 'rejected') {
        return res.status(result.statusCode).json({
          error: result.message,
          quota_info: result.quotaInfo
        });
      }
      
      // Return generated text along with real metering calculation
      res.status(200).json({
        message: 'Generation successful',
        generated_text,
        billing_info: {
          usage_recorded: result.data,
          tokens: metadata
        }
      });
      
    } catch (error) {
      console.error('Error in /generate endpoint:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Generate an invoice for a tenant and billing period
   * POST /api/invoices/generate
   */
  async generateInvoice(req, res) {
    try {
      const targetTenantId = req.body.tenant_id || req.tenantId;
      const { billing_period, create_stripe_invoice = true } = req.body;

      if (!targetTenantId) {
        return res.status(400).json({
          error: 'tenant_id is required'
        });
      }

      if (!req.isAdmin && req.tenantId && req.tenantId !== targetTenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only generate invoices for your own tenant'
        });
      }

      const result = await invoiceService.generateInvoice(targetTenantId, billing_period, {
        createStripeInvoice: create_stripe_invoice
      });

      const statusCode = result.status === 'created' ? 201 : 200;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Error generating invoice:', error.message);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get invoices for tenant
   * GET /api/invoices/:tenant_id or GET /api/invoices
   */
  async getInvoices(req, res) {
    try {
      const targetTenantId = req.params.tenant_id || req.tenantId;

      if (!targetTenantId) {
        return res.status(400).json({
          error: 'Tenant ID is required'
        });
      }

      // Enforce tenant scoping: non-admin tenants can only view their own invoices
      if (!req.isAdmin && req.tenantId && req.tenantId !== targetTenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only access data for your own tenant'
        });
      }
      
      const invoices = await invoiceService.getInvoicesForTenant(targetTenantId);
      res.status(200).json(invoices);
      
    } catch (error) {
      console.error('Error getting invoices:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get invoice detail by ID
   * GET /api/invoices/detail/:id
   */
  async getInvoiceDetail(req, res) {
    try {
      const { id } = req.params;
      const tenantScope = req.isAdmin ? null : req.tenantId;
      const invoice = await invoiceService.getInvoiceById(id, tenantScope);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.status(200).json(invoice);
    } catch (error) {
      console.error('Error getting invoice detail:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Health check endpoint
   * GET /api/health
   */
  async healthCheck(req, res) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new MeterController();
