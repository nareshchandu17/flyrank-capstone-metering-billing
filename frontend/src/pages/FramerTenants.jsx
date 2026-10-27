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
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Trash2, 
  Edit2, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Activity,
  Layers,
  Zap,
  ArrowRight
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
      console.error('Error fetching tenant details:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Create new tenant
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!newTenant.name || !newTenant.email) {
      showToast('Name and email are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await createTenant(newTenant);
      showToast(`Tenant "${newTenant.name}" created successfully`);
      setIsCreateOpen(false);
      setNewTenant({ name: '', email: '', plan: 'Free' });
      fetchTenants();
    } catch (error) {
      console.error('Error creating tenant:', error);
      showToast(error.message || 'Failed to create tenant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit tenant
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

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await updateTenant(activeTenant.id, editForm);
      showToast(`Tenant "${editForm.name}" updated successfully`);
      setIsEditOpen(false);
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant:', error);
      showToast(error.message || 'Failed to update tenant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete tenant
  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete "${tenant.name}"? This action will revoke all keys and purge historical events.`)) {
      return;
    }

    try {
      await deleteTenant(tenant.id);
      showToast(`Tenant "${tenant.name}" deleted successfully`);
      fetchTenants();
      if (isInspectOpen && activeTenant?.id === tenant.id) {
        setIsInspectOpen(false);
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      showToast(error.message || 'Failed to delete tenant', 'error');
    }
  };

  // Create API Key
  const handleCreateKey = async () => {
    if (!activeTenant) return;
    try {
      const result = await createApiKey(activeTenant.id, newKeyName);
      setNewlyCreatedKey(result.api_key);
      setCopiedKey(false);
      showToast(`Generated new key: ${newKeyName}`);
      const updatedKeys = await getApiKeys(activeTenant.id);
      setTenantKeys(updatedKeys || []);
    } catch (err) {
      console.error('Error creating API key:', err);
      showToast(err.message || 'Failed to generate key', 'error');
    }
  };

  // Rotate API Key
  const handleRotateKey = async (keyId) => {
    if (!activeTenant) return;
    if (!window.confirm('Rotating this key will immediately revoke the current key and issue a new secret. Proceed?')) {
      return;
    }

    try {
      const result = await rotateApiKey(activeTenant.id, keyId);
      setNewlyCreatedKey(result.api_key);
      setCopiedKey(false);
      showToast('Key rotated successfully. Save the new secret key.');
      const updatedKeys = await getApiKeys(activeTenant.id);
      setTenantKeys(updatedKeys || []);
    } catch (err) {
      console.error('Error rotating API key:', err);
      showToast(err.message || 'Failed to rotate key', 'error');
    }
  };

  // Revoke API Key
  const handleRevokeKey = async (keyId) => {
    if (!activeTenant) return;
    if (!window.confirm('Are you sure you want to revoke this API key? Requests using it will fail immediately.')) {
      return;
    }

    try {
      await revokeApiKey(activeTenant.id, keyId);
      showToast('API key revoked successfully');
      const updatedKeys = await getApiKeys(activeTenant.id);
      setTenantKeys(updatedKeys || []);
    } catch (err) {
      console.error('Error revoking API key:', err);
      showToast(err.message || 'Failed to revoke key', 'error');
    }
  };

  const handleCopyKey = (keyString) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Filter tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || (t.status || 'active') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-full text-xs font-medium shadow-level-2 flex items-center gap-2 border ${
              toast.type === 'error'
                ? 'bg-white text-[#ea2261] border-[#ea2261]/30'
                : 'bg-[#1c1e54] text-white border-[#533afd]/30'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-[#ea2261]" /> : <CheckCircle2 className="w-4 h-4 text-[#10b981]" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Single Indigo CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill-tag-soft">
              <Users className="w-3.5 h-3.5" />
              Multi-Tenant Scoping
            </span>
          </div>
          <h1 className="font-display-lg text-[#0d253d] tracking-display-lg">
            Tenants & Access Management
          </h1>
          <p className="text-[#64748d] text-[15px] font-normal mt-1 max-w-2xl leading-relaxed">
            Provision accounts, inspect real-time quota gauges, and issue cryptographic API access keys.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary-pill"
        >
          <Plus className="w-4 h-4" />
          <span>New Tenant</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card-stripi p-4 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748d]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, or UUID..."
            className="text-input-stripi pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-[#64748d] font-normal mr-1">Status:</span>
          {['all', 'active', 'suspended', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-normal transition-all capitalize ${
                statusFilter === status
                  ? 'bg-[#533afd] text-white font-medium shadow-sm'
                  : 'bg-white text-[#273951] hover:bg-[#f6f9fc] border border-[#e3e8ee]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table on White Surface */}
      <div className="card-stripi bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc] text-xs uppercase tracking-wider text-[#64748d]">
                <th className="py-3 px-6 font-normal">Account & Identifier</th>
                <th className="py-3 px-6 font-normal">Plan Tier</th>
                <th className="py-3 px-6 font-normal">Status</th>
                <th className="py-3 px-6 font-normal text-right">Units</th>
                <th className="py-3 px-6 font-normal text-right">Cost</th>
                <th className="py-3 px-6 font-normal text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e8ee]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748d]">
                    <div className="w-6 h-6 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching tenant records...
                  </td>
                </tr>
              ) : filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => {
                  const status = tenant.status || 'active';
                  return (
                    <tr key={tenant.id} className="hover:bg-[#f6f9fc] transition-colors">
                      <td className="py-4 px-6">
                        <div 
                          onClick={() => handleInspect(tenant)}
                          className="cursor-pointer group flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#533afd]/10 text-[#533afd] font-medium flex items-center justify-center text-xs shrink-0">
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-normal text-[#0d253d] group-hover:text-[#533afd] transition-colors flex items-center gap-1.5">
                              <span>{tenant.name}</span>
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-[#64748d]">{tenant.email}</div>
                            <div className="text-[11px] text-[#61718a] font-mono tnum mt-0.5">{tenant.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="pill-tag-soft">
                          {tenant.plan || 'Free'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-normal ${
                          status === 'active' 
                            ? 'bg-[#10b981]/10 text-[#059669]' 
                            : 'bg-[#ea2261]/10 text-[#ea2261]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-[#10b981]' : 'bg-[#ea2261]'}`} />
                          <span className="capitalize">{status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right font-mono tnum text-[#0d253d]">
                        {(tenant.usage || 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-6 text-right font-medium text-[#0d253d] font-mono tnum">
                        ${tenant.cost ? parseFloat(tenant.cost).toFixed(2) : '0.00'}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleInspect(tenant)}
                            className="p-1.5 rounded-full text-[#64748d] hover:text-[#533afd] hover:bg-[#533afd]/10 transition-colors"
                            title="Inspect Usage & API Keys"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(tenant)}
                            className="p-1.5 rounded-full text-[#64748d] hover:text-[#0d253d] hover:bg-[#f6f9fc] transition-colors"
                            title="Edit Plan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(tenant)}
                            className="p-1.5 rounded-full text-[#64748d] hover:text-[#ea2261] hover:bg-[#ea2261]/10 transition-colors"
                            title="Delete Tenant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748d] text-sm">
                    No accounts matching your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {isInspectOpen && activeTenant && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInspectOpen(false)}
              className="absolute inset-0 bg-[#0d253d]/40 backdrop-blur-sm"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="w-screen max-w-2xl bg-white shadow-level-3 border-l border-[#e3e8ee] flex flex-col justify-between"
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-[#e3e8ee] bg-[#f6f9fc] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-normal text-[#0d253d]">{activeTenant.name}</h2>
                      <span className="pill-tag-soft">{activeTenant.plan || 'Free'}</span>
                    </div>
                    <div className="text-xs text-[#64748d] mt-1 font-mono tnum">{activeTenant.id}</div>
                  </div>
                  <button
                    onClick={() => setIsInspectOpen(false)}
                    className="p-2 rounded-full text-[#64748d] hover:text-[#0d253d] hover:bg-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Newly Created Key Alert (One-Time Reveal) */}
                  {newlyCreatedKey && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-[#1c1e54] text-white border border-[#533afd]/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-4 h-4 text-[#ea2261]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#ea2261]">
                          Important: Copy Your Secret API Key
                        </span>
                      </div>
                      <p className="text-xs text-[#a8c3de] mb-3 leading-relaxed">
                        This key will never be displayed in plaintext again. Copy and store it in your environment secrets.
                      </p>
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0d253d] border border-[#273951] font-mono text-xs text-[#4ade80]">
                        <span className="truncate">{newlyCreatedKey}</span>
                        <button
                          onClick={() => handleCopyKey(newlyCreatedKey)}
                          className="btn-primary-pill text-xs py-1 px-3"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Quota Gauges */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#64748d] uppercase tracking-wider mb-3">
                      Current Period Quota Status
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee]">
                        <div className="text-[11px] text-[#64748d] mb-1">API Calls Used</div>
                        <div className="text-lg font-normal text-[#0d253d] font-mono tnum">
                          {tenantUsage?.usage?.api_calls?.used?.toLocaleString() || '0'}
                        </div>
                        <div className="text-[10px] text-[#64748d] mt-1 tnum">
                          Limit: {tenantUsage?.usage?.api_calls?.limit?.toLocaleString() || '1,000'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee]">
                        <div className="text-[11px] text-[#64748d] mb-1">AI Tokens Used</div>
                        <div className="text-lg font-normal text-[#0d253d] font-mono tnum">
                          {tenantUsage?.usage?.ai_tokens?.used?.toLocaleString() || '0'}
                        </div>
                        <div className="text-[10px] text-[#64748d] mt-1 tnum">
                          Limit: {tenantUsage?.usage?.ai_tokens?.limit?.toLocaleString() || '100,000'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee]">
                        <div className="text-[11px] text-[#64748d] mb-1">MTD Total Cost</div>
                        <div className="text-lg font-medium text-[#0d253d] font-mono tnum">
                          ${tenantUsage?.costs?.total_dollars || '0.00'}
                        </div>
                        <div className="text-[10px] text-[#10b981] mt-1">Exact sub-cent rate</div>
                      </div>
                    </div>
                  </div>

                  {/* API Keys Manager */}
                  <div className="border-t border-[#e3e8ee] pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-base font-normal text-[#0d253d]">Scoped API Keys</h3>
                        <p className="text-xs text-[#64748d]">Programmatic credentials for this tenant account</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="Key label..."
                          className="text-input-stripi text-xs py-1.5 px-3 w-36"
                        />
                        <button
                          onClick={handleCreateKey}
                          className="btn-primary-pill text-xs py-1.5 px-3"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Generate Key</span>
                        </button>
                      </div>
                    </div>

                    <div className="border border-[#e3e8ee] rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc] text-[#64748d]">
                            <th className="py-2.5 px-3 font-normal">Prefix</th>
                            <th className="py-2.5 px-3 font-normal">Name</th>
                            <th className="py-2.5 px-3 font-normal">Status</th>
                            <th className="py-2.5 px-3 font-normal text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e3e8ee] font-mono">
                          {loadingKeys ? (
                            <tr>
                              <td colSpan="4" className="py-4 text-center text-[#64748d] font-sans">
                                Loading keys...
                              </td>
                            </tr>
                          ) : tenantKeys.length > 0 ? (
                            tenantKeys.map((key) => (
                              <tr key={key.id} className="hover:bg-[#f6f9fc]">
                                <td className="py-2.5 px-3 text-[#0d253d] font-bold tnum">{key.prefix}...</td>
                                <td className="py-2.5 px-3 text-[#273951] font-sans">{key.name}</td>
                                <td className="py-2.5 px-3 font-sans">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                                    key.status === 'active' 
                                      ? 'bg-[#10b981]/10 text-[#059669]' 
                                      : 'bg-[#ea2261]/10 text-[#ea2261]'
                                  }`}>
                                    {key.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-sans">
                                  {key.status === 'active' && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleRotateKey(key.id)}
                                        className="text-[11px] text-[#533afd] hover:underline"
                                      >
                                        Rotate
                                      </button>
                                      <span className="text-[#e3e8ee]">|</span>
                                      <button
                                        onClick={() => handleRevokeKey(key.id)}
                                        className="text-[11px] text-[#ea2261] hover:underline"
                                      >
                                        Revoke
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="py-4 text-center text-[#64748d] font-sans">
                                No active API keys. Click "Generate Key" above.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-[#e3e8ee] bg-[#f6f9fc] flex justify-end">
                  <button
                    onClick={() => setIsInspectOpen(false)}
                    className="btn-secondary-pill text-xs"
                  >
                    Close Inspection
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE TENANT MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-[#0d253d]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative card-stripi bg-white p-6 max-w-md w-full shadow-level-3"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#e3e8ee] mb-4">
                <h3 className="text-lg font-normal text-[#0d253d]">Provision New Tenant</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-[#64748d] hover:text-[#0d253d]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    placeholder="e.g. Acme AI Corp"
                    className="text-input-stripi w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Billing Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    placeholder="billing@acme.com"
                    className="text-input-stripi w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Plan Subscription
                  </label>
                  <select
                    value={newTenant.plan}
                    onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value })}
                    className="text-input-stripi w-full"
                  >
                    <option value="Free">Free Tier (1k calls / 100k tokens)</option>
                    <option value="Pro">Pro Plan ($29/mo, 100k calls / 50M tokens)</option>
                    <option value="Enterprise">Enterprise Plan ($299/mo, 1M calls)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="btn-secondary-pill text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary-pill text-xs"
                  >
                    {submitting ? 'Provisioning...' : 'Provision Tenant'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="absolute inset-0 bg-[#0d253d]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative card-stripi bg-white p-6 max-w-md w-full shadow-level-3"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#e3e8ee] mb-4">
                <h3 className="text-lg font-normal text-[#0d253d]">Update Account Details</h3>
                <button onClick={() => setIsEditOpen(false)} className="text-[#64748d] hover:text-[#0d253d]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTenant} className="space-y-4">
                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-input-stripi w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Billing Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="text-input-stripi w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="text-input-stripi w-full"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={editForm.plan}
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                    className="text-input-stripi w-full"
                  >
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="btn-secondary-pill text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary-pill text-xs"
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