const pool = require('../config/database');
const stripeService = require('./stripeService');
const {
  PRICING_CONFIG,
  calculateAPICallCost,
  getBillingPeriodDates,
  getCurrentBillingPeriod,
  isValidBillingPeriod,
} = require('../config/pricing');

class InvoiceService {
  /**
   * Helper to get Stripe client from stripeService
   */
  getStripeClient() {
    return stripeService.getStripeClient();
  }

  /**
   * Generate an invoice for a tenant and billing period.
   * Completely idempotent: protected by UNIQUE(tenant_id, billing_period).
   * 
   * @param {string} tenantId - Tenant UUID
   * @param {string} [billingPeriod] - 'YYYY-MM' (defaults to current month)
   * @param {Object} [options] - Additional generation options
   * @returns {Promise<Object>} - The generated or existing invoice with line items
   */
  async generateInvoice(tenantId, billingPeriod, options = {}) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const period = billingPeriod || getCurrentBillingPeriod();
    if (!isValidBillingPeriod(period)) {
      throw new Error(`Invalid billing period: ${period}. Format must be YYYY-MM`);
    }

    const { startDate, endDate } = getBillingPeriodDates(period);

    // 1. Idempotency Check: check if invoice already exists
    const existing = await pool.query(
      `SELECT * FROM invoices WHERE tenant_id = $1 AND billing_period = $2`,
      [tenantId, period]
    );

    if (existing.rows.length > 0) {
      const existingInvoice = existing.rows[0];
      const lineItemsResult = await pool.query(
        'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id ASC',
        [existingInvoice.id]
      );
      existingInvoice.line_items = lineItemsResult.rows;
      existingInvoice.amount_dollars = (existingInvoice.amount_cents / 100).toFixed(2);
      return {
        status: 'existing',
        message: 'Invoice already generated for this billing period',
        invoice: existingInvoice
      };
    }

    // 2. Fetch tenant & plan details
    const tenantResult = await pool.query(
      `SELECT t.id, t.name, t.email, t.stripe_customer_id, t.status as tenant_status,
              p.id as plan_id, p.name as plan_name, p.api_calls_limit, p.ai_tokens_limit, p.allow_overage
       FROM tenants t
       JOIN plans p ON t.plan_id = p.id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenant = tenantResult.rows[0];
    const planConfig = PRICING_CONFIG.plans[tenant.plan_name] || PRICING_CONFIG.plans.Free;

    // 3. Query usage events in the billing period
    const aggregationQuery = `
      SELECT 
        usage_type,
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(COALESCE((metadata->>'input_tokens')::numeric, 0)), 0) as total_input_tokens,
        COALESCE(SUM(COALESCE((metadata->>'cached_input_tokens')::numeric, (metadata->>'cached_tokens')::numeric, 0)), 0) as total_cached_input_tokens,
        COALESCE(SUM(COALESCE((metadata->>'output_tokens')::numeric, 0)), 0) as total_output_tokens,
        COALESCE(SUM(COALESCE((metadata->>'reasoning_tokens')::numeric, 0)), 0) as total_reasoning_tokens
      FROM usage_events
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at < $3
      GROUP BY usage_type
    `;

    const aggResult = await pool.query(aggregationQuery, [tenantId, startDate.toISOString(), endDate.toISOString()]);

    let apiCallsUsed = 0;
    let aiTokensUsed = 0;
    let inputTokens = 0;
    let cachedInputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;

    aggResult.rows.forEach(row => {
      if (row.usage_type === 'api_call') {
        apiCallsUsed = parseInt(row.total_quantity, 10);
      } else if (row.usage_type === 'ai_tokens') {
        aiTokensUsed = parseInt(row.total_quantity, 10);
        inputTokens = parseInt(row.total_input_tokens, 10);
        cachedInputTokens = parseInt(row.total_cached_input_tokens, 10);
        outputTokens = parseInt(row.total_output_tokens, 10);
        reasoningTokens = parseInt(row.total_reasoning_tokens, 10);

        const brokenDown = inputTokens + cachedInputTokens + outputTokens + reasoningTokens;
        if (aiTokensUsed > brokenDown) {
          inputTokens += (aiTokensUsed - brokenDown);
        }
      }
    });

    // 4. Construct accurate line items
    const lineItems = [];

    // Base Plan Subscription fee (e.g. Pro $29/mo)
    const basePlanCents = planConfig.base_price_cents || 0;
    if (basePlanCents > 0) {
      lineItems.push({
        description: `${tenant.plan_name} Plan Monthly Subscription`,
        quantity: 1,
        amount_cents: basePlanCents
      });
    }

    // API Calls Usage
    const apiCallCost = calculateAPICallCost(apiCallsUsed);
    if (apiCallsUsed > 0) {
      lineItems.push({
        description: `API Calls Usage (${apiCallsUsed.toLocaleString()} calls @ $0.01/call)`,
        quantity: apiCallsUsed,
        amount_cents: apiCallCost
      });
    }

    // AI Token components calculated accurately without flooring small amounts
    const inputExact = (inputTokens * PRICING_CONFIG.ai_tokens.input_tokens.cost_per_million) / 1000000;
    const cachedExact = (cachedInputTokens * PRICING_CONFIG.ai_tokens.cached_input_tokens.cost_per_million) / 1000000;
    const outputExact = (outputTokens * PRICING_CONFIG.ai_tokens.output_tokens.cost_per_million) / 1000000;
    const reasoningExact = (reasoningTokens * PRICING_CONFIG.ai_tokens.reasoning_tokens.cost_per_million) / 1000000;

    const inputCents = inputExact > 0 && inputExact < 1 ? 1 : Math.round(inputExact);
    const cachedCents = cachedExact > 0 && cachedExact < 1 ? 1 : Math.round(cachedExact);
    const outputCents = outputExact > 0 && outputExact < 1 ? 1 : Math.round(outputExact);
    const reasoningCents = reasoningExact > 0 && reasoningExact < 1 ? 1 : Math.round(reasoningExact);

    if (inputTokens > 0) {
      lineItems.push({
        description: `AI Input Tokens (${inputTokens.toLocaleString()} tokens @ $0.30/1M)`,
        quantity: inputTokens,
        amount_cents: inputCents
      });
    }

    if (cachedInputTokens > 0) {
      lineItems.push({
        description: `AI Cached Input Tokens (${cachedInputTokens.toLocaleString()} tokens @ $0.10/1M)`,
        quantity: cachedInputTokens,
        amount_cents: cachedCents
      });
    }

    if (outputTokens > 0) {
      lineItems.push({
        description: `AI Output Tokens (${outputTokens.toLocaleString()} tokens @ $0.60/1M)`,
        quantity: outputTokens,
        amount_cents: outputCents
      });
    }

    if (reasoningTokens > 0) {
      lineItems.push({
        description: `AI Reasoning Tokens (${reasoningTokens.toLocaleString()} tokens @ $0.60/1M)`,
        quantity: reasoningTokens,
        amount_cents: reasoningCents
      });
    }

    // If tenant had zero usage and base price is zero, add 1 informational line item
    if (lineItems.length === 0) {
      lineItems.push({
        description: `${tenant.plan_name} Plan Base Usage (${period})`,
        quantity: 1,
        amount_cents: 0
      });
    }

    const totalAmountCents = lineItems.reduce((sum, item) => sum + item.amount_cents, 0);

    // 5. Atomic DB Insertion with conflict safety
    const client = await pool.connect();
    let invoiceId;
    let initialStatus = 'pending';

    try {
      await client.query('BEGIN');

      const insertInvoiceResult = await client.query(
        `INSERT INTO invoices (tenant_id, billing_period, amount_cents, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, billing_period) DO NOTHING
         RETURNING id, created_at, updated_at`,
        [tenantId, period, totalAmountCents, initialStatus]
      );

      // Handle race condition where another request created the invoice concurrently
      if (insertInvoiceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        const winner = await pool.query(
          'SELECT * FROM invoices WHERE tenant_id = $1 AND billing_period = $2',
          [tenantId, period]
        );
        const winnerInvoice = winner.rows[0];
        const items = await pool.query(
          'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id ASC',
          [winnerInvoice.id]
        );
        winnerInvoice.line_items = items.rows;
        winnerInvoice.amount_dollars = (winnerInvoice.amount_cents / 100).toFixed(2);
        return {
          status: 'existing',
          message: 'Invoice already generated for this billing period',
          invoice: winnerInvoice
        };
      }

      invoiceId = insertInvoiceResult.rows[0].id;

      // Insert line items
      for (const item of lineItems) {
        await client.query(
          `INSERT INTO invoice_line_items (invoice_id, description, quantity, amount_cents)
           VALUES ($1, $2, $3, $4)`,
          [invoiceId, item.description, item.quantity, item.amount_cents]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error inserting local invoice:', err);
      throw err;
    } finally {
      client.release();
    }

    // 6. Stripe Test-Mode Integration: Create actual Stripe Invoice if customer exists
    let stripeInvoiceId = null;
    let hostedInvoiceUrl = null;
    let invoicePdf = null;
    let finalStatus = initialStatus;
    let paidAt = null;

    const stripe = this.getStripeClient();
    if (stripe && tenant.stripe_customer_id && totalAmountCents > 0) {
      try {
        // Create line items in Stripe
        for (const item of lineItems) {
          if (item.amount_cents > 0) {
            await stripe.invoiceItems.create({
              customer: tenant.stripe_customer_id,
              amount: item.amount_cents,
              currency: 'usd',
              description: item.description,
            });
          }
        }

        // Create Stripe Invoice
        const stripeInvoice = await stripe.invoices.create({
          customer: tenant.stripe_customer_id,
          auto_advance: true,
          collection_method: 'charge_automatically',
          metadata: {
            tenant_id: tenantId,
            billing_period: period,
            local_invoice_id: invoiceId
          }
        });

        // Finalize invoice so it is ready for payment
        const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
        stripeInvoiceId = finalized.id;
        hostedInvoiceUrl = finalized.hosted_invoice_url || null;
        invoicePdf = finalized.invoice_pdf || null;

        if (finalized.status === 'paid') {
          finalStatus = 'paid';
          paidAt = new Date();
        } else {
          finalStatus = finalized.status || 'open';
        }

        // Update local invoice with Stripe data
        await pool.query(
          `UPDATE invoices 
           SET stripe_invoice_id = $1, 
               hosted_invoice_url = $2, 
               invoice_pdf = $3, 
               status = $4,
               paid_at = $5,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [stripeInvoiceId, hostedInvoiceUrl, invoicePdf, finalStatus, paidAt, invoiceId]
        );
      } catch (stripeErr) {
        console.error('Stripe invoice creation error (retaining local invoice):', stripeErr.message);
      }
    }

    return {
      status: 'created',
      message: 'Invoice created successfully',
      invoice: {
        id: invoiceId,
        tenant_id: tenantId,
        billing_period: period,
        amount_cents: totalAmountCents,
        amount_dollars: (totalAmountCents / 100).toFixed(2),
        status: finalStatus,
        stripe_invoice_id: stripeInvoiceId,
        hosted_invoice_url: hostedInvoiceUrl,
        invoice_pdf: invoicePdf,
        paid_at: paidAt,
        line_items: lineItems
      }
    };
  }

  /**
   * Get all invoices for a tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>}
   */
  async getInvoicesForTenant(tenantId) {
    const result = await pool.query(
      `SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY billing_period DESC, created_at DESC`,
      [tenantId]
    );

    const invoices = result.rows;
    for (const inv of invoices) {
      const items = await pool.query(
        'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id ASC',
        [inv.id]
      );
      inv.line_items = items.rows;
      inv.amount_dollars = (inv.amount_cents / 100).toFixed(2);
    }

    return invoices;
  }

  /**
   * Get single invoice by ID with line items
   * @param {string} invoiceId - Invoice UUID
   * @param {string} [tenantId] - Optional tenant scoping
   * @returns {Promise<Object>}
   */
  async getInvoiceById(invoiceId, tenantId = null) {
    let query = 'SELECT * FROM invoices WHERE id = $1';
    const params = [invoiceId];

    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return null;
    }

    const invoice = result.rows[0];
    const items = await pool.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id ASC',
      [invoice.id]
    );
    invoice.line_items = items.rows;
    invoice.amount_dollars = (invoice.amount_cents / 100).toFixed(2);

    return invoice;
  }

  /**
   * Synchronize invoice paid status from webhook or payment completion
   * @param {string} stripeInvoiceId - Stripe invoice ID
   * @param {string} [paymentIntentId] - Stripe payment intent ID
   * @param {Date} [paidAt] - Timestamp
   */
  async syncInvoicePaidStatus(stripeInvoiceId, paymentIntentId = null, paidAt = new Date()) {
    const result = await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           stripe_payment_intent_id = COALESCE($1, stripe_payment_intent_id),
           paid_at = COALESCE($2, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_invoice_id = $3
       RETURNING id, tenant_id, billing_period, amount_cents, status, paid_at`,
      [paymentIntentId, paidAt, stripeInvoiceId]
    );

    return result.rows[0] || null;
  }
}

module.exports = new InvoiceService();
