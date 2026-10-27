import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSettings, saveSettings, reconcileSubscriptions } from '../utils/api';
import { 
  Settings as SettingsIcon, 
  Key, 
  CreditCard, 
  Bell, 
  Sliders, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  RotateCw, 
  ShieldCheck,
  RefreshCw,
  Zap,
  Globe
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
      showToast('Settings saved successfully! Changes active immediately.');
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
      showToast(`Stripe test connection verified! Processed ${res.total_tenants || 0} customer subscriptions.`);
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
    showToast('Settings reset to defaults.');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'error' 
                ? 'bg-red-950/80 border-red-500/30 text-red-200' 
                : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">
            Engine Settings
          </h1>
          <p className="text-neutral-400 mt-1">
            Configured parameters backed by active save, update, and authentication operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 text-xs font-semibold transition-all"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-medium text-sm shadow-lg shadow-[#667eea]/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: AUTHENTICATION */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white shadow-md">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Administrative Authentication</h2>
              <p className="text-xs text-neutral-400">Master key used for administrative routes and tenant management</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Admin API Key (ADMIN_API_KEY)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                required
                value={settings.adminApiKey}
                onChange={(e) => setSettings({ ...settings, adminApiKey: e.target.value })}
                className="w-full pl-4 pr-12 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#667eea]"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Passed via Authorization: Bearer &lt;key&gt; header to access administrative endpoints.
            </p>
          </div>
        </motion.div>

        {/* SECTION 2: STRIPE TEST-MODE CONFIGURATION */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f093fb] to-[#f5576c] flex items-center justify-center text-white shadow-md">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Stripe Test-Mode & Reconciliation</h2>
                <p className="text-xs text-neutral-400">Live subscription billing and price ID mappings</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestStripe}
              disabled={testingStripe}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#f093fb] ${testingStripe ? 'animate-spin' : ''}`} />
              <span>{testingStripe ? 'Testing...' : 'Test & Reconcile'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Pro Plan Price ID (STRIPE_PRICE_PRO)
              </label>
              <input
                type="text"
                value={settings.stripePricePro}
                onChange={(e) => setSettings({ ...settings, stripePricePro: e.target.value })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#667eea]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Free Plan Price ID (STRIPE_PRICE_FREE)
              </label>
              <input
                type="text"
                value={settings.stripePriceFree}
                onChange={(e) => setSettings({ ...settings, stripePriceFree: e.target.value })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#667eea]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Nightly Automated Reconciliation</div>
              <div className="text-[11px] text-neutral-400">Nightly cron job catches missed webhooks and syncs DB</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoReconcile}
                onChange={(e) => setSettings({ ...settings, autoReconcile: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#667eea]"></div>
            </label>
          </div>
        </motion.div>

        {/* SECTION 3: USAGE ALERTS & QUOTAS */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center text-white shadow-md">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Deduplicated Usage Alerts</h2>
              <p className="text-xs text-neutral-400">Threshold alerts deduplicated per tenant, billing period, and metric type</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300">Warning Alert Threshold</label>
                <span className="text-xs font-mono font-bold text-[#818cf8]">{settings.alertThresholdPercent}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.alertThresholdPercent}
                onChange={(e) => setSettings({ ...settings, alertThresholdPercent: parseInt(e.target.value, 10) })}
                className="w-full accent-[#667eea] bg-white/10 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-neutral-500 mt-1">Dispatches deduplicated alert when tenant reaches this quota %.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300">Critical Cap Threshold</label>
                <span className="text-xs font-mono font-bold text-red-400">{settings.criticalThresholdPercent}%</span>
              </div>
              <input
                type="range"
                min="90"
                max="100"
                step="5"
                value={settings.criticalThresholdPercent}
                onChange={(e) => setSettings({ ...settings, criticalThresholdPercent: parseInt(e.target.value, 10) })}
                className="w-full accent-[#f5576c] bg-white/10 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-neutral-500 mt-1">Rejects requests for non-overage plans when 100% is reached.</p>
            </div>
          </div>
        </motion.div>

        {/* SECTION 4: DISPLAY PREFERENCES */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#43e97b] to-[#38f9d7] flex items-center justify-center text-white shadow-md">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Display & Telemetry Polling</h2>
              <p className="text-xs text-neutral-400">Polling frequency and currency formatting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Currency Display</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
              >
                <option value="USD">USD ($) - Default</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Live Polling Interval (Seconds)</label>
              <select
                value={settings.pollIntervalSeconds}
                onChange={(e) => setSettings({ ...settings, pollIntervalSeconds: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
              >
                <option value="15">15 Seconds (Rapid Telemetry)</option>
                <option value="30">30 Seconds (Standard)</option>
                <option value="60">60 Seconds (Low Bandwidth)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-[#667eea]/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default FramerSettings;