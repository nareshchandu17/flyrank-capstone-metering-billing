const meterService = require('../services/meterService');
const { v4: uuidv4 } = require('uuid');

class MeterController {
  /**
   * Record usage event
   * POST /api/usage
   */
  async recordUsage(req, res) {
    try {
      const tenant_id = req.tenantId; // Inferred from API key
      const { usage_type, quantity, idempotency_key, metadata } = req.body;
      
      // Validate required fields
      if (!usage_type || !quantity || !idempotency_key) {
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
      
      // Validate quantity
      if (quantity <= 0) {
        return res.status(400).json({
          error: 'Quantity must be greater than 0'
        });
      }
      
      const result = await meterService.recordUsage(
        tenant_id,
        usage_type,
        quantity,
        idempotency_key,
        metadata
      );
      
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
      console.error('Error recording usage:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
  
  /**
   * Get usage summary for tenant
   * GET /api/usage/:tenant_id
   */
  async getUsageSummary(req, res) {
    try {
      const { tenant_id } = req.params;
      
      const summary = await meterService.getUsageSummary(tenant_id);
      
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
      
      // Simulate generating response and calculating tokens
      const idempotency_key = uuidv4();
      
      // Basic simulation of tokens
      const inputTokens = Math.max(10, Math.floor(prompt.length / 4));
      const outputTokens = Math.max(20, Math.floor(Math.random() * 50) + 20);
      
      const totalTokens = inputTokens + outputTokens;
      
      const metadata = {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        prompt_preview: prompt.substring(0, 20)
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
      
      // Return simulated generated text along with metering details
      res.status(200).json({
        message: 'Generation successful',
        generated_text: 'This is a simulated AI response based on the prompt.',
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
   * Get invoices for tenant
   * GET /api/invoices/:tenant_id
   */
  async getInvoices(req, res) {
    const pool = require('../config/database');
    try {
      const { tenant_id } = req.params;
      
      const invoicesResult = await pool.query(
        'SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenant_id]
      );
      
      const invoices = invoicesResult.rows;
      
      // Get line items for each invoice
      for (let i = 0; i < invoices.length; i++) {
        const lineItemsResult = await pool.query(
          'SELECT * FROM invoice_line_items WHERE invoice_id = $1',
          [invoices[i].id]
        );
        invoices[i].line_items = lineItemsResult.rows;
        invoices[i].amount_dollars = (invoices[i].amount_cents / 100).toFixed(2);
      }
      
      res.status(200).json(invoices);
      
    } catch (error) {
      console.error('Error getting invoices:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
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
