import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getTenants, 
  createTenant, 
  updateTenant, 
  deleteTenant, 
  getTenantUsage,
  getApiKeys,
  createApiKey,
  rotateApiKey,
  revokeApiKey
} from '../utils/api';
import { 
  Search, 
  Plus, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Crown, 
  Sparkles, 
  X, 
  Trash2, 
  Edit2, 
  Eye, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Activity,
  Layers,
  Zap,
  ExternalLink
} from 'lucide-react';

const FramerTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  
  // Active tenant for inspect/edit
  const [activeTenant, setActiveTenant] = useState(null);
  const [tenantUsage, setTenantUsage] = useState(null);
  const [tenantKeys, setTenantKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Form states
  const [newTenant, setNewTenant] = useState({ name: '', email: '', plan: 'Free' });
  const [editForm, setEditForm] = useState({ name: '', email: '', status: 'active', plan: 'Free' });
  const [submitting, setSubmitting] = useState(false);

  // One-time display of newly generated key
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('Production Key');

  // Notification feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await getTenants();
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      showToast('Failed to load tenants from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Inspect Tenant Details & API Keys
  const handleInspect = async (tenant) => {
    setActiveTenant(tenant);
    setIsInspectOpen(true);
    setNewlyCreatedKey(null);
    setLoadingKeys(true);

    try {
      const [usageData, keysData] = await Promise.all([
        getTenantUsage(tenant.id).catch(() => null),
        getApiKeys(tenant.id).catch(() => [])
      ]);
      setTenantUsage(usageData);
      setTenantKeys(keysData || []);
    } catch (err) {
      console.error('Error fetching inspect details:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (tenant) => {
    setActiveTenant(tenant);
    setEditForm({
      name: tenant.name,
      email: tenant.email,
      status: tenant.status || 'active',
      plan: tenant.plan || 'Free'
    });
    setIsEditOpen(true);
  };

  // Create Tenant Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTenant(newTenant);
      showToast(`Tenant "${newTenant.name}" created successfully!`);
      setIsCreateOpen(false);
      setNewTenant({ name: '', email: '', plan: 'Free' });
      await fetchTenants();
    } catch (error) {
      console.error('Failed to create tenant:', error);
      showToast(error.response?.data?.error || 'Failed to create tenant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Tenant Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSubmitting(true);
    try {
      await updateTenant(activeTenant.id, editForm);
      showToast(`Tenant updated successfully!`);
      setIsEditOpen(false);
      await fetchTenants();
    } catch (error) {
      console.error('Failed to update tenant:', error);
      showToast(error.response?.data?.error || 'Failed to update tenant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete tenant "${tenant.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteTenant(tenant.id);
      showToast(`Tenant "${tenant.name}" deleted.`);
      if (activeTenant?.id === tenant.id) setIsInspectOpen(false);
      await fetchTenants();
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      showToast('Failed to delete tenant', 'error');
    }
  };

  // Create API Key for active tenant
  const handleCreateKey = async () => {
    if (!activeTenant) return;
    try {
      const result = await createApiKey(activeTenant.id, newKeyName);
      setNewlyCreatedKey(result.api_key);
      setNewKeyName('Production Key');
      showToast('New API key generated successfully!');
      // Refresh key list
      const updatedKeys = await getApiKeys(activeTenant.id);
      setTenantKeys(updatedKeys || []);
    } catch (err) {
      console.error('Failed to generate key:', err);
      showToast(err.response?.data?.error || 'Failed to generate API key', 'error');
    }
  };

  // Rotate Key
  const handleRotateKey = async (keyId) => {
    if (!activeTenant) return;
    if (!window.confirm('Rotating this key will immediately revoke the existing key and generate a replacement. Proceed?')) {
      return;
    }
    try {
      const result = await rotateApiKey(activeTenant.id, keyId);
      setNewlyCreatedKey(result.api_key);
      showToast('API key rotated. Store the new key safely!');
      const updatedKeys = await getApiKeys(activeTenant.id);
      setTenantKeys(updatedKeys || []);
    } catch (err) {
      console.error('Failed to rotate key:', err);
      showToast('Failed to rotate API key', 'error');
    }
  };

  // Revoke Key
  const handleRevokeKey = async (keyId) => {
    if (!activeTenant) return;
    if (!window.confirm('Are you sure you want to revoke this API key? Applications using it will lose access immediately.')) {
      return;
    }
    try {
      await revokeApiKey(activeTenant.id, keyId);
      showToast('API key revoked.');
      const updatedKeys = await getApiKeys(activeTenant.id);
      setTenantKeys(updatedKeys || []);
    } catch (err) {
      console.error('Failed to revoke key:', err);
      showToast('Failed to revoke API key', 'error');
    }
  };

  // Copy Key to Clipboard
  const handleCopyKey = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Filtered tenants list
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.plan || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
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
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
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
            Tenants
          </h1>
          <p className="text-neutral-400 mt-1">
            Authorized management of customer accounts, usage scopes, and API credentials.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-medium text-sm shadow-lg shadow-[#667eea]/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Tenant</span>
        </button>
      </motion.div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, plan, or UUID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#667eea] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-neutral-300 text-sm focus:outline-none focus:border-[#667eea]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Suspended</option>
          </select>

          <button
            onClick={fetchTenants}
            className="p-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500 bg-white/[0.01]">
                <th className="py-4 px-6 font-semibold">Tenant Account</th>
                <th className="py-4 px-6 font-semibold">Plan</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-right">MTD Usage</th>
                <th className="py-4 px-6 font-semibold text-right">Estimated Cost</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                      <span>Loading authorized tenants...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-500">
                    {searchTerm ? 'No tenants match your search filter.' : 'No tenants found. Click "New Tenant" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr 
                    key={tenant.id} 
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-sm flex items-center gap-2">
                            <span>{tenant.name}</span>
                          </div>
                          <div className="text-xs text-neutral-400">{tenant.email}</div>
                          <div className="text-[11px] font-mono text-neutral-500 mt-0.5">{tenant.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        tenant.plan === 'Pro' 
                          ? 'bg-[#667eea]/15 text-[#818cf8] border-[#667eea]/30' 
                          : 'bg-white/5 text-neutral-300 border-white/10'
                      }`}>
                        {tenant.plan === 'Pro' ? <Crown className="w-3 h-3 text-[#818cf8]" /> : null}
                        {tenant.plan || 'Free'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        tenant.status === 'active' ? 'text-[#4ade80]' : 'text-neutral-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          tenant.status === 'active' ? 'bg-[#4ade80] animate-pulse' : 'bg-neutral-500'
                        }`} />
                        {tenant.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-mono text-sm text-neutral-300">
                      {tenant.usage ? Number(tenant.usage).toLocaleString() : '0'} units
                    </td>

                    <td className="py-4 px-6 text-right font-mono text-sm font-bold text-white">
                      ${tenant.cost ? parseFloat(tenant.cost).toFixed(2) : '0.00'}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleInspect(tenant)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                          title="Inspect details & API keys"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#667eea]" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(tenant)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                          title="Edit tenant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteTenant(tenant)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                          title="Delete tenant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* INSPECT TENANT & API KEYS MODAL */}
      <AnimatePresence>
        {isInspectOpen && activeTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#0e0e10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold">
                    {activeTenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{activeTenant.name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-normal text-neutral-300">
                        {activeTenant.plan || 'Free'} Plan
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">{activeTenant.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInspectOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* ONE-TIME API KEY BANNER (When newly generated) */}
                {newlyCreatedKey && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/30 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-[#4ade80]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>New Secret API Key Generated (Shown ONCE only)</span>
                    </div>
                    <p className="text-xs text-neutral-300">
                      Copy this secret immediately. For security, it cannot be recovered after you leave this view.
                    </p>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/60 border border-white/10">
                      <span className="font-mono text-xs text-emerald-300 flex-1 break-all select-all">
                        {newlyCreatedKey}
                      </span>
                      <button
                        onClick={() => handleCopyKey(newlyCreatedKey)}
                        className="px-3 py-1.5 rounded-md bg-[#4ade80] hover:bg-[#4ade80]/90 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shrink-0"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Quota & Usage Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#667eea]" />
                      <span>API Calls Used</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {tenantUsage?.usage?.api_calls?.used?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Limit: {tenantUsage?.usage?.api_calls?.limit?.toLocaleString() || '1,000'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#f093fb]" />
                      <span>AI Tokens Used</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {tenantUsage?.usage?.ai_tokens?.used?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Limit: {tenantUsage?.usage?.ai_tokens?.limit?.toLocaleString() || '100,000'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>Month-to-Date Cost</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-[#4ade80]">
                      ${tenantUsage?.costs?.total_dollars || '0.00'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Exact calculated consumption
                    </div>
                  </div>
                </div>

                {/* API KEYS SECTION */}
                <div className="border-t border-white/10 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#667eea]" />
                        <span>API Access Keys</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Manage API keys used to meter programmatic requests for this tenant.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Key label..."
                        className="px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#667eea]"
                      />
                      <button
                        onClick={handleCreateKey}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 transition-all shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Generate Key</span>
                      </button>
                    </div>
                  </div>

                  {/* Keys Table */}
                  <div className="rounded-xl border border-white/10 overflow-hidden bg-black/30">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-neutral-400 bg-white/[0.02]">
                          <th className="py-2.5 px-4 font-semibold">Key Prefix</th>
                          <th className="py-2.5 px-4 font-semibold">Name</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold">Last Used</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {loadingKeys ? (
                          <tr>
                            <td colSpan="5" className="py-6 text-center text-neutral-500 font-sans">
                              Loading keys...
                            </td>
                          </tr>
                        ) : tenantKeys.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-6 text-center text-neutral-500 font-sans">
                              No API keys found for this tenant. Click "Generate Key" to create one.
                            </td>
                          </tr>
                        ) : (
                          tenantKeys.map((key) => {
                            const isRevoked = key.status === 'revoked' || key.revoked_at;
                            return (
                              <tr key={key.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-4 text-neutral-200">
                                  {key.prefix}••••••••
                                </td>
                                <td className="py-2.5 px-4 text-neutral-300 font-sans">
                                  {key.name || 'Default Key'}
                                </td>
                                <td className="py-2.5 px-4 font-sans">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    isRevoked 
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {isRevoked ? 'Revoked' : 'Active'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-neutral-400 text-[11px] font-sans">
                                  {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                                </td>
                                <td className="py-2.5 px-4 text-center font-sans">
                                  {!isRevoked ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => handleRotateKey(key.id)}
                                        className="text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 transition-colors"
                                        title="Rotate key (revokes old and creates new)"
                                      >
                                        Rotate
                                      </button>
                                      <button
                                        onClick={() => handleRevokeKey(key.id)}
                                        className="text-[11px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                        title="Revoke key immediately"
                                      >
                                        Revoke
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-neutral-600">Inactive</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-white/[0.02]">
                <button
                  onClick={() => setIsInspectOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE TENANT MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0e0e10] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create Tenant Account</h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Tenant / Organization Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Corp"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#667eea]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Primary Contact Email</label>
                  <input
                    type="email"
                    required
                    placeholder="billing@acme.com"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#667eea]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Initial Subscription Plan</label>
                  <select
                    value={newTenant.plan}
                    onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
                  >
                    <option value="Free">Free Plan (1k calls / 100k tokens, no overage)</option>
                    <option value="Pro">Pro Plan ($29/mo, 10k calls / 1M tokens, overage enabled)</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {submitting ? 'Creating...' : 'Create Tenant'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TENANT MODAL */}
      <AnimatePresence>
        {isEditOpen && activeTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0e0e10] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Edit Tenant</h2>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Tenant Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FramerTenants;