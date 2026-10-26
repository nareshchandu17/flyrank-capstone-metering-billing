import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Filter,
  ArrowUpRight,
  TrendingUp,
  Users,
  Building2,
  Globe,
  Calendar,
  Zap,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Crown,
  Sparkles,
  Edit,
  Trash2,
  Activity,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await api.getTenants();
      if (response.success) {
        setTenants(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (tenantData) => {
    try {
      const response = await api.createTenant(tenantData);
      if (response.success) {
        await fetchTenants();
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Failed to create tenant:', err);
      alert('Failed to create tenant');
    }
  };

  const handleUpdateTenant = async (tenantId, tenantData) => {
    try {
      const response = await api.updateTenant(tenantId, tenantData);
      if (response.success) {
        await fetchTenants();
        setEditingTenant(null);
      }
    } catch (err) {
      console.error('Failed to update tenant:', err);
      alert('Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    
    try {
      const response = await api.deleteTenant(tenantId);
      if (response.success) {
        await fetchTenants();
      }
    } catch (err) {
      console.error('Failed to delete tenant:', err);
      alert('Failed to delete tenant');
    }
  };

  const handleUpgradePlan = async (tenantId, planId) => {
    try {
      setUpgrading(true);
      const response = await api.createCheckoutSession(tenantId, planId);
      if (response.success && response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      alert('Checkout failed. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-[#4ade80]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-[#f5576c]" />;
      default:
        return <CheckCircle className="w-5 h-5 text-[#4ade80]" />;
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'Enterprise':
        return <Crown className="w-5 h-5 text-[#fbbf24]" />;
      case 'Pro':
        return <Sparkles className="w-5 h-5 text-[#667eea]" />;
      default:
        return <Users className="w-5 h-5 text-neutral-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Tenant Management
          </h1>
          <p className="text-neutral-400">Manage all your customers and their usage patterns</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-xl font-medium shadow-lg shadow-[#667eea]/30"
        >
          <Plus className="w-5 h-5" />
          <span>Add Tenant</span>
        </motion.button>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Tenants', value: tenants.length, icon: Users, gradient: 'from-[#667eea] to-[#764ba2]' },
          { label: 'Active', value: tenants.filter(t => t.plan_name !== 'Free').length, icon: CheckCircle, gradient: 'from-[#4ade80] to-[#38f9d7]' },
          { label: 'Monthly Events', value: tenants.reduce((sum, t) => sum + (parseInt(t.monthly_events) || 0), 0).toLocaleString(), icon: Activity, gradient: 'from-[#fbbf24] to-[#f59e0b]' },
          { label: 'Total Events', value: tenants.reduce((sum, t) => sum + (parseInt(t.total_events) || 0), 0).toLocaleString(), icon: TrendingUp, gradient: 'from-[#f093fb] to-[#f5576c]' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative"
          >
            <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-6 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <div className="relative z-10">
                <stat.icon className={`w-6 h-6 mb-3 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} />
                <div className="text-2xl font-display font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-neutral-400">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/5 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:border-[#667eea]/50 transition-all"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/5 rounded-xl text-white hover:border-white/10 transition-all"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </motion.button>
      </motion.div>

      {/* Tenant List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-6 border-b border-white/5">
            <div className="col-span-3 text-sm font-medium text-neutral-400">Tenant</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Plan</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Usage</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Total Events</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Status</div>
            <div className="col-span-1 text-sm font-medium text-neutral-400">Actions</div>
          </div>

          {/* Table Rows */}
          {filteredTenants.map((tenant, index) => (
            <motion.div
              key={tenant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.03)' }}
              className="grid grid-cols-12 gap-4 p-6 border-b border-white/5 last:border-0 transition-all cursor-pointer group"
            >
              {/* Tenant Info */}
              <div className="col-span-3 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold">
                  {tenant.name.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-medium mb-1">{tenant.name}</div>
                  <div className="text-xs text-neutral-500">{tenant.email}</div>
                </div>
              </div>

              {/* Plan */}
              <div className="col-span-2 flex items-center gap-2">
                {getTierIcon(tenant.plan_name)}
                <span className="text-white">{tenant.plan_name}</span>
              </div>

              {/* Usage */}
              <div className="col-span-2 flex items-center">
                <span className="text-white">{tenant.monthly_events || 0}</span>
              </div>

              {/* Total Events */}
              <div className="col-span-2 flex items-center">
                <span className="text-white">{tenant.total_events || 0}</span>
              </div>

              {/* Status */}
              <div className="col-span-2 flex items-center">
                {getStatusIcon('active')}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingTenant(tenant)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Edit className="w-4 h-4 text-neutral-400" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setShowUpgradeModal(true);
                  }}
                  className="p-2 rounded-lg hover:bg-[#667eea]/10 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-[#667eea]" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteTenant(tenant.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 w-full max-w-md"
          >
            <h2 className="text-2xl font-display font-bold text-white mb-6">Add New Tenant</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleCreateTenant({
                name: formData.get('name'),
                email: formData.get('email'),
                plan_id: 1
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#667eea]/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#667eea]/50"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl text-white font-medium"
                >
                  Create Tenant
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 w-full max-w-md"
          >
            <h2 className="text-2xl font-display font-bold text-white mb-6">Edit Tenant</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleUpdateTenant(editingTenant.id, {
                name: formData.get('name'),
                email: formData.get('email'),
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">Name</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={editingTenant.name}
                    required
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#667eea]/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingTenant.email}
                    required
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#667eea]/50"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl text-white font-medium"
                >
                  Update Tenant
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 w-full max-w-lg"
          >
            <h2 className="text-2xl font-display font-bold text-white mb-2">Upgrade Plan</h2>
            <p className="text-neutral-400 mb-6">Upgrade {selectedTenant.name} to a higher tier</p>
            
            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleUpgradePlan(selectedTenant.id, 2)}
                disabled={upgrading}
                className="w-full p-6 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] border border-white/10 hover:border-[#667eea]/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-white font-bold text-xl">Pro Plan</div>
                    <div className="text-neutral-300 text-sm">$29/month</div>
                  </div>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={upgrading}
                className="w-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-white font-bold text-xl">Free Plan</div>
                    <div className="text-neutral-300 text-sm">$0/month</div>
                  </div>
                  <Users className="w-6 h-6 text-neutral-400" />
                </div>
              </motion.button>
            </div>
            
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full mt-6 px-4 py-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Tenants;