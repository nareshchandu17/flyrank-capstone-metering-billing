import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSettings, saveSettings, reconcileSubscriptions } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import {
  CreditCard,
  Bell,
  Sliders,
  Save,
  CheckCircle,
  XCircle,
  RotateCw,
  RotateCcw,
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';

const FramerSettings = () => {
  const { user, activeTenant, currentRole, permissions } = useAuth();

  const [settings, setSettings] = useState({
    alertThresholdPercent: 80,
    criticalThresholdPercent: 100,
    stripePricePro: '',
    stripePriceFree: '',
    autoReconcile: true,
    currency: 'USD',
    pollIntervalSeconds: 30
  });

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
    } catch {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestStripe = async () => {
    setTestingStripe(true);
    try {
      const res = await reconcileSubscriptions(activeTenant?.tenant_id);
      showToast(`Stripe test connection verified. Processed ${res.total_tenants || 0} subscriptions.`);
    } catch (err) {
      console.error('Stripe test failed:', err);
      showToast(err.response?.data?.error || 'Stripe connection test failed', 'error');
    } finally {
      setTestingStripe(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset client preferences to default configuration?')) return;
    const defaults = {
      alertThresholdPercent: 80,
      criticalThresholdPercent: 100,
      stripePricePro: '',
      stripePriceFree: '',
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
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-stripi-2 flex items-center gap-3 backdrop-blur-xl ${toast.type === 'error'
              ? 'bg-white border-[#ea2261]/30 text-[#ea2261]'
              : 'bg-white border-emerald-500/30 text-emerald-800'
              }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-5 h-5 text-[#ea2261]" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#e3e8ee]">
        <div>
          <h1 className="font-heading-lg text-[#0d253d] tracking-tight">System &amp; Tenant Settings</h1>
          <p className="text-sm text-[#64748d] mt-1">
            Verified Auth0 identity, active tenant RBAC context, and metering thresholds
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn-secondary-pill text-xs py-2 px-3.5"
            title="Reset to system defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: AUTH0 IDENTITY & RBAC CONTEXT */}
        <div className="card-stripi p-6 bg-white space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e3e8ee]">
            <div className="w-8 h-8 rounded-pill bg-[#D4FF28]/20 border border-[#C4EF1E]/40 flex items-center justify-center text-[#3F6212]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading-sm text-[#0d253d]">Auth0 Identity &amp; RBAC Context</h2>
              <p className="text-xs text-[#64748d]">Cryptographically verified user session and PostgreSQL permissions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[#f6f9fc] border border-[#e3e8ee]">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#4D7C0F]" /> Authenticated Identity
              </div>
              <div className="text-sm font-medium text-[#0d253d] truncate">{user?.name || user?.email}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{user?.auth0_sub || user?.email}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f6f9fc] border border-[#e3e8ee]">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#4D7C0F]" /> Active Tenant &amp; Role
              </div>
              <div className="text-sm font-medium text-[#0d253d]">
                {activeTenant?.tenant_name || (permissions?.isPlatformAdmin ? 'Platform Overview' : 'No Tenant Selected')}
              </div>
              <div className="text-xs font-semibold text-[#3F6212] mt-0.5">
                Role: {currentRole || (permissions?.isPlatformAdmin ? 'Platform Admin' : 'Viewer')}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#64748d]">
            Access tokens are obtained silently using <code className="font-mono text-[#0d253d] bg-[#f6f9fc] px-1 py-0.5 rounded text-[11px]">getAccessTokenSilently()</code> and verified via Auth0 RS256 JWKS. Hardcoded credentials and localStorage tokens are strictly forbidden.
          </p>
        </div>

        {/* SECTION 2: STRIPE RECONCILIATION */}
          { Boolean(permissions?.canManageBilling) && (
            <div className="card-stripi p-6 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3e8ee]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-pill bg-[#D4FF28]/20 border border-[#C4EF1E]/40 flex items-center justify-center text-[#3F6212]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-heading-sm text-[#0d253d]">Stripe Billing &amp; Reconciliation</h2>
                    <p className="text-xs text-[#64748d]">Subscription recurring price identifiers and state reconciliation</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestStripe}
                  disabled={testingStripe}
                  className="btn-secondary-pill text-xs py-1.5 px-3"
                >
                  <RotateCw className={`w-3.5 h-3.5 mr-1.5 text-[#4D7C0F] ${testingStripe ? 'animate-spin' : ''}`} />
                  <span>{testingStripe ? 'Reconciling...' : 'Reconcile Subscriptions'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#273951] mb-1">
                    Pro Plan Price ID (<span className="font-mono text-[11px] text-[#3F6212]">STRIPE_PRICE_PRO</span>)
                  </label>
                  <input
                    type="text"
                    value={settings?.stripePricePro || ''}
                    onChange={(e) => setSettings({ ...settings, stripePricePro: e.target.value })}
                    className="text-input-stripi w-full font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#273951] mb-1">
                    Free Plan Price ID (<span className="font-mono text-[11px] text-[#3F6212]">STRIPE_PRICE_FREE</span>)
                  </label>
                  <input
                    type="text"
                    value={settings?.stripePriceFree || ''}
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
                    checked={Boolean(settings?.autoReconcile)}
                    onChange={(e) => setSettings({ ...settings, autoReconcile: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[#e3e8ee] peer-focus:outline-none rounded-pill peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-pill after:h-4 after:w-4 after:transition-all peer-checked:bg-[#BEF218] peer-checked:border peer-checked:border-[#A8DC10]"></div>
                </label>
              </div>
            </div>
          )}

        {/* SECTION 3: USAGE THRESHOLDS & ALERTS */}
        <div className="card-stripi p-6 bg-white space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e3e8ee]">
            <div className="w-8 h-8 rounded-pill bg-[#D4FF28]/20 border border-[#C4EF1E]/40 flex items-center justify-center text-[#3F6212]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading-sm text-[#0d253d]">Quota Enforcement Thresholds</h2>
              <p className="text-xs text-[#64748d]">Trigger percentages for soft warnings and hard quota blocks</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">
                Warning Alert Threshold (% of limit)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={settings?.alertThresholdPercent ?? 80}
                  onChange={(e) => setSettings({ ...settings, alertThresholdPercent: Number(e.target.value) })}
                  className="w-full accent-[#BEF218]"
                />
                <span className="font-mono text-xs font-semibold text-[#0d253d] w-12 text-right">
                  {settings?.alertThresholdPercent ?? 80}%
                </span>
              </div>
              <p className="text-[11px] text-[#64748d] mt-1">Dispatches notification webhook and email warning.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">
                Critical Block Threshold (% of limit)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="95"
                  max="120"
                  step="5"
                  value={settings?.criticalThresholdPercent ?? 100}
                  onChange={(e) => setSettings({ ...settings, criticalThresholdPercent: Number(e.target.value) })}
                  className="w-full accent-[#ea2261]"
                />
                <span className="font-mono text-xs font-semibold text-[#0d253d] w-12 text-right">
                  {settings?.criticalThresholdPercent ?? 100}%
                </span>
              </div>
              <p className="text-[11px] text-[#64748d] mt-1">Hard blocks incoming requests on Free tier without overage permission.</p>
            </div>
          </div>
        </div>

        {/* SECTION 4: ENGINE PARAMETERS */}
        <div className="card-stripi p-6 bg-white space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e3e8ee]">
            <div className="w-8 h-8 rounded-pill bg-[#D4FF28]/20 border border-[#C4EF1E]/40 flex items-center justify-center text-[#3F6212]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading-sm text-[#0d253d]">Engine Telemetry &amp; Currency</h2>
              <p className="text-xs text-[#64748d]">Dashboard polling frequencies and billing currency formats</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">Billing Currency</label>
              <select
                value={settings?.currency || 'USD'}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="text-input-stripi w-full"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#273951] mb-1">
                Telemetry Polling Interval (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={settings?.pollIntervalSeconds ?? 30}
                onChange={(e) => setSettings({ ...settings, pollIntervalSeconds: Number(e.target.value) })}
                className="text-input-stripi w-full"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e3e8ee]">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary-pill text-sm py-2.5 px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default FramerSettings;
