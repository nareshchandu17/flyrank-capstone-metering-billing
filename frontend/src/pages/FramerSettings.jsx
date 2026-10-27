import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSettings, saveSettings, reconcileSubscriptions } from '../utils/api';
import { 
  Key, 
  CreditCard, 
  Bell, 
  Sliders, 
  Save, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff, 
  RotateCw, 
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

const FramerSettings = () => {
  const [settings, setSettings] = useState({
    adminApiKey: 'admin-secret-key',
    alertThresholdPercent: 80,
    criticalThresholdPercent: 100,
    stripePricePro: 'price_pro_plan_id',
    stripePriceFree: 'price_free_plan_id',
    autoReconcile: true,
    currency: 'USD',
    pollIntervalSeconds: 30
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loaded = getSettings();
    setSettings(prev => ({ ...prev, ...loaded }));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      saveSettings(settings);
      showToast('Settings saved successfully. Changes active immediately.');
    } catch (err) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestStripe = async () => {
    setTestingStripe(true);
    try {
      const res = await reconcileSubscriptions();
      showToast(`Stripe test connection verified. Processed ${res.total_tenants || 0} subscriptions.`);
    } catch (err) {
      console.error('Stripe test failed:', err);
      showToast(err.response?.data?.error || 'Stripe connection test failed', 'error');
    } finally {
      setTestingStripe(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset all settings to default configuration?')) return;
    const defaults = {
      adminApiKey: 'admin-secret-key',
      alertThresholdPercent: 80,
      criticalThresholdPercent: 100,
      stripePricePro: 'price_pro_plan_id',
      stripePriceFree: 'price_free_plan_id',
      autoReconcile: true,
      currency: 'USD',
      pollIntervalSeconds: 30
    };
    setSettings(defaults);
    saveSettings(defaults);
    showToast('Settings reset to system defaults.');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-stripi-2 flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'error' 
                ? 'bg-white border-[#ea2261]/30 text-[#ea2261]' 
                : 'bg-white border-emerald-500/30 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-[#ea2261]" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
            <span className="text-xs font-medium text-[#0d253d]">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="pill-tag-soft">Platform Configuration</span>
            <span className="text-[11px] text-[#64748d]">Live Synchronized Settings</span>
          </div>
          <h1 className="font-display-lg text-[#0d253d]">
            Engine Settings
          </h1>
          <p className="font-body-md text-[#64748d] mt-1">
            Authentication secrets, Stripe price mapping, quota thresholds, and polling frequencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn-secondary-pill"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-[#64748d]" />
            <span>Reset Defaults</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary-pill"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: AUTHENTICATION */}
        <div className="card-stripi space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e3e8ee]">
            <div className="w-8 h-8 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#533afd]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading-sm text-[#0d253d]">Administrative Authentication</h2>
              <p className="text-xs text-[#64748d]">Master credential used for administrative routes and tenant provisioning</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#273951] mb-1.5">
              Admin API Key (<span className="font-mono text-[11px] text-[#533afd]">ADMIN_API_KEY</span>)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                required
                value={settings.adminApiKey}
                onChange={(e) => setSettings({ ...settings, adminApiKey: e.target.value })}
                className="text-input-stripi w-full pr-12 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#0d253d]"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#64748d] mt-1.5">
              Transmitted via <code className="font-mono text-[#0d253d] bg-[#f6f9fc] px-1 py-0.5 rounded text-[11px]">Authorization: Bearer &lt;key&gt;</code> to access administrative engine endpoints.
            </p>
          </div>
        </div>

        {/* SECTION 2: STRIPE TEST-MODE CONFIGURATION */}
        <div className="card-stripi space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e3e8ee]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#533afd]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-heading-sm text-[#0d253d]">Stripe Test-Mode & Reconciliation</h2>
                <p className="text-xs text-[#64748d]">Subscription recurring price identifiers and state reconciliation</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestStripe}
              disabled={testingStripe}
              className="btn-secondary-pill text-xs py-1.5 px-3"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 text-[#533afd] ${testingStripe ? 'animate-spin' : ''}`} />
              <span>{testingStripe ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">
                Pro Plan Price ID (<span className="font-mono text-[11px] text-[#533afd]">STRIPE_PRICE_PRO</span>)
              </label>
              <input
                type="text"
                value={settings.stripePricePro}
                onChange={(e) => setSettings({ ...settings, stripePricePro: e.target.value })}
                className="text-input-stripi w-full font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">
                Free Plan Price ID (<span className="font-mono text-[11px] text-[#533afd]">STRIPE_PRICE_FREE</span>)
              </label>
              <input
                type="text"
                value={settings.stripePriceFree}
                onChange={(e) => setSettings({ ...settings, stripePriceFree: e.target.value })}
                className="text-input-stripi w-full font-mono text-xs"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#0d253d]">Nightly Automated Reconciliation</div>
              <div className="text-[11px] text-[#64748d]">Periodic sync verifies local database state against Stripe subscription objects</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoReconcile}
                onChange={(e) => setSettings({ ...settings, autoReconcile: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#e3e8ee] peer-focus:outline-none rounded-pill peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-pill after:h-4 after:w-4 after:transition-all peer-checked:bg-[#533afd]"></div>
            </label>
          </div>
        </div>

        {/* SECTION 3: USAGE ALERTS & QUOTAS */}
        <div className="card-stripi space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e3e8ee]">
            <div className="w-8 h-8 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#533afd]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading-sm text-[#0d253d]">Deduplicated Usage Alerts & Quota Caps</h2>
              <p className="text-xs text-[#64748d]">Threshold dispatch deduplicated per tenant, billing period, and metric type</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#273951]">Warning Alert Threshold</label>
                <span className="font-body-tabular text-xs font-semibold text-[#533afd] tnum">{settings.alertThresholdPercent}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.alertThresholdPercent}
                onChange={(e) => setSettings({ ...settings, alertThresholdPercent: parseInt(e.target.value, 10) })}
                className="w-full accent-[#533afd] bg-[#e3e8ee] h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-[#64748d] mt-1.5">Dispatches single deduplicated alert when monthly usage crosses this mark.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#273951]">Critical Hard Cap Threshold</label>
                <span className="font-body-tabular text-xs font-semibold text-[#ea2261] tnum">{settings.criticalThresholdPercent}%</span>
              </div>
              <input
                type="range"
                min="90"
                max="100"
                step="5"
                value={settings.criticalThresholdPercent}
                onChange={(e) => setSettings({ ...settings, criticalThresholdPercent: parseInt(e.target.value, 10) })}
                className="w-full accent-[#ea2261] bg-[#e3e8ee] h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-[#64748d] mt-1.5">Rejects incoming events with HTTP 429 once strict non-overage plans reach 100%.</p>
            </div>
          </div>
        </div>

        {/* SECTION 4: DISPLAY PREFERENCES */}
        <div className="card-stripi space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e3e8ee]">
            <div className="w-8 h-8 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#533afd]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading-sm text-[#0d253d]">Display & Telemetry Polling</h2>
              <p className="text-xs text-[#64748d]">Polling interval and currency representation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">Currency Display</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="text-input-stripi w-full"
              >
                <option value="USD">USD ($) - Default</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">Live Polling Interval</label>
              <select
                value={settings.pollIntervalSeconds}
                onChange={(e) => setSettings({ ...settings, pollIntervalSeconds: parseInt(e.target.value, 10) })}
                className="text-input-stripi w-full"
              >
                <option value="15">15 Seconds (Real-Time Telemetry)</option>
                <option value="30">30 Seconds (Balanced Standard)</option>
                <option value="60">60 Seconds (Low Network Footprint)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary-pill"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default FramerSettings;