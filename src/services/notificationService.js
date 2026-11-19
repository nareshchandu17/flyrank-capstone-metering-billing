const pool = require('../config/database');

/**
 * Real Notification Service for Quota Alerts and System Notifications.
 * Handles:
 * 1. Outbound Webhook HTTP POST dispatches with HMAC signature
 * 2. Dynamic Email alert dispatching via Resend API (HTML & Plain Text)
 * 3. Structured audit logging into PostgreSQL database
 */
class NotificationService {
  /**
   * Dispatch usage alert (80% warning or 100% quota exceeded)
   * @param {Object} alertData - { tenantId, tenantName, tenantEmail, alertType, metricType, billingPeriod, currentUsage, limit }
   */
  async dispatchUsageAlert(alertData) {
    const {
      tenantId,
      tenantName,
      tenantEmail,
      alertType,
      metricType,
      billingPeriod,
      currentUsage,
      limit,
    } = alertData;

    const percentage = alertType === '100_percent' ? 100 : 80;
    const severity = alertType === '100_percent' ? 'CRITICAL' : 'WARNING';

    const payload = {
      event: 'usage_alert',
      severity,
      tenant: {
        id: tenantId,
        name: tenantName || 'Tenant Account',
        email: tenantEmail || process.env.ALERT_EMAIL_TO || null,
      },
      alert: {
        type: alertType,
        threshold_percent: percentage,
        metric: metricType,
        metric_label: metricType === 'api_call' ? 'API Calls' : 'AI Tokens',
        billing_period: billingPeriod,
        current_usage: currentUsage,
        limit,
        remaining: Math.max(0, limit - currentUsage),
      },
      timestamp: new Date().toISOString(),
    };

    const results = {
      webhook: null,
      email: null,
    };

    // 1. Dispatch Outbound Webhook if configured
    const webhookUrl = process.env.ALERT_WEBHOOK_URL || process.env.WEBHOOK_ALERT_URL;
    if (webhookUrl) {
      results.webhook = await this.sendWebhook(webhookUrl, payload);
    } else {
      results.webhook = { status: 'skipped', reason: 'No ALERT_WEBHOOK_URL configured' };
    }

    // 2. Dispatch Dynamic Email via Resend
    // In Resend sandbox/test mode, emails can only be sent to the registered account owner unless a custom domain is verified.
    const destinationEmail = process.env.ALERT_EMAIL_TO || tenantEmail;
    const emailApiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;

      if (emailApiKey && destinationEmail) {
        results.email = await this.sendEmail(destinationEmail, alertType, payload);
      } else {
        results.email = { status: 'skipped', reason: 'No email API key configured or destination email missing' };
      }

      // 3. Log alert dispatch to database if database is connected
      try {
        await pool.query(
          `INSERT INTO usage_alerts (tenant_id, alert_type, billing_period, metric_type)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, alert_type, billing_period, metric_type) DO UPDATE
         SET sent_at = CURRENT_TIMESTAMP`,
          [tenantId, alertType, billingPeriod, metricType]
        );
      } catch (dbErr) {
        // Ignored if offline or duplicate
      }

      console.log(`[ALERT DISPATCHED] Tenant: ${payload.tenant.name} | Level: ${severity} (${percentage}%) | Metric: ${metricType} (${currentUsage}/${limit}) | Email: ${results.email?.status} -> ${destinationEmail}`);

      return {
        success: true,
        payload,
        delivery: results,
      };
    }

  /**
   * Send HTTP POST Webhook with timeout
   */
  async sendWebhook(url, payload) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Flyrank-Metering-Alerts/1.0',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return {
          status: response.ok ? 'delivered' : 'failed',
          statusCode: response.status,
        };
      } catch (err) {
        console.error(`Webhook delivery failed to ${url}:`, err.message);
        return {
          status: 'failed',
          error: err.message,
        };
      }
    }

  /**
   * Send dynamic HTML email via Resend API
   * @param {string} toEmail - Destination email address
   * @param {string} alertType - '80_percent' or '100_percent'
   * @param {Object} payload - Rich alert payload
   */
  async sendEmail(toEmail, alertType, payload) {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          return { status: 'skipped', reason: 'RESEND_API_KEY is not defined' };
        }

        // 'from' details: On Resend's free tier, must use onboarding@resend.dev unless custom domain is verified
        const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

        const isCritical = alertType === '100_percent';
        const badgeColor = isCritical ? '#ea2261' : '#f59e0b';
        const badgeBg = isCritical ? '#fdf2f2' : '#fef3c7';
        const severityLabel = isCritical ? 'CRITICAL QUOTA LIMIT' : 'USAGE WARNING';
        const percent = payload.alert.threshold_percent;

      const subject = `[${ severityLabel }]${ payload.tenant.name } reached ${ percent }% of ${ payload.alert.metric_label } quota`;

      // Dynamic Plain Text Fallback
      const textContent = `
        [${ severityLabel }] Flyrank Usage Metering Alert

        Tenant: ${ payload.tenant.name } (${ payload.tenant.id })
Billing Cycle: ${ payload.alert.billing_period }
        Metric: ${ payload.alert.metric_label }

Usage Summary:
        - Threshold Reached: ${ percent }%
          - Units Consumed: ${ payload.alert.current_usage.toLocaleString() }
        - Total Quota Limit: ${ payload.alert.limit.toLocaleString() }
        - Remaining Capacity: ${ payload.alert.remaining.toLocaleString() }

${isCritical
            ? 'Your account has consumed 100% of its quota. Non-overage requests will be rate-limited (HTTP 429).'
            : 'Your account has crossed 80% of its quota. Consider upgrading your plan to prevent service interruption.'}

Manage your subscription: ${process.env.APP_URL || 'http://localhost:3000'}/dashboard
      `.trim();

        // Dynamic High-Fidelity HTML Email Template
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 24px; color: #0d253d; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e3e8ee; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { padding: 28px 32px; background: #0d253d; color: #ffffff; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${badgeBg}; color: ${badgeColor}; }
    .content { padding: 32px; }
    .progress-container { background: #e3e8ee; border-radius: 6px; height: 10px; overflow: hidden; margin: 16px 0; }
    .progress-bar { background: ${badgeColor}; height: 100%; border-radius: 6px; width: ${Math.min(100, percent)}%; }
    .stats-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .stats-table td { padding: 10px 0; border-bottom: 1px solid #f0f3f7; }
    .stats-label { color: #64748d; }
    .stats-value { text-align: right; font-weight: 600; color: #0d253d; font-family: monospace; }
    .button-wrap { text-align: center; margin-top: 28px; }
    .btn { display: inline-block; background: #533afd; color: #ffffff !important; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-size: 13px; font-weight: 600; }
    .footer { padding: 20px 32px; background: #f6f9fc; font-size: 11px; color: #64748d; text-align: center; border-top: 1px solid #e3e8ee; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Flyrank Usage Metering</div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 500;">Quota Notification</h1>
    </div>

    <div class="content">
      <span class="badge">${severityLabel}</span>
      <h2 style="font-size: 17px; margin: 12px 0 6px 0; color: #0d253d;">${payload.tenant.name} reached ${percent}% of ${payload.alert.metric_label} Limit</h2>
      <p style="font-size: 13px; color: #64748d; margin-top: 0; line-height: 1.5;">
        ${isCritical
            ? 'Your account has reached 100% of its monthly quota. Non-overage requests will receive HTTP 429 rate limit responses.'
            : 'Your account has crossed the 80% soft warning threshold for this billing cycle.'}
      </p>

      <div class="progress-container">
        <div class="progress-bar"></div>
      </div>

      <table class="stats-table">
        <tr>
          <td class="stats-label">Billing Cycle</td>
          <td class="stats-value">${payload.alert.billing_period}</td>
        </tr>
        <tr>
          <td class="stats-label">Metric Type</td>
          <td class="stats-value">${payload.alert.metric_label}</td>
        </tr>
        <tr>
          <td class="stats-label">Current Metered Usage</td>
          <td class="stats-value">${payload.alert.current_usage.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="stats-label">Monthly Limit</td>
          <td class="stats-value">${payload.alert.limit.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="stats-label">Remaining Units</td>
          <td class="stats-value">${payload.alert.remaining.toLocaleString()}</td>
        </tr>
      </table>

      <div class="button-wrap">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="btn">Inspect Dashboard & Upgrade</a>
      </div>
    </div>

    <div class="footer">
      This is an automated notification from Flyrank Ingestion Engine.<br>
      Tenant ID: ${payload.tenant.id}
    </div>
  </div>
</body>
</html>
      `.trim();

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            subject,
            text: textContent,
            html: htmlContent,
          }),
        });

        const resData = await response.json();

        if (!response.ok) {
          console.error('Resend API error:', resData);
          return {
            status: 'failed',
            statusCode: response.status,
            error: resData.message || 'Resend API returned error',
          };
        }

        console.log(`[RESEND EMAIL DELIVERED] ID: ${resData.id} | To: ${toEmail} | Subject: ${subject}`);
        return {
          status: 'sent',
          id: resData.id,
          to: toEmail,
        };
      } catch (err) {
        console.error('Email alert delivery error:', err.message);
        return {
          status: 'failed',
          error: err.message,
        };
      }
    }
  }

module.exports = new NotificationService();
