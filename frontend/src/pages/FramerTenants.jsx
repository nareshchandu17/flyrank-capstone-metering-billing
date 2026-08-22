import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTenants, createTenant } from '../utils/api';
import { 
  Search, 
  Plus, 
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Crown,
  Sparkles,
  X
} from 'lucide-react';

const FramerTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', email: '', plan: 'Free' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createTenant(newTenant);
      await fetchTenants();
      setIsModalOpen(false);
      setNewTenant({ name: '', email: '', plan: 'Free' });
    } catch (error) {
      console.error('Failed to create tenant:', error);
      alert('Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-[#4ade80]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />;
      case 'suspended':
        return <XCircle className="w-4 h-4 text-[#f5576c]" />;
      default:
        return null;
    }
  };

  const getTierIcon = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise':
        return <Crown className="w-4 h-4 text-[#fbbf24]" />;
      case 'pro':
        return <Sparkles className="w-4 h-4 text-[#667eea]" />;
      default:
        return <Users className="w-4 h-4 text-neutral-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#667eea]/30 border-t-[#667eea] rounded-full animate-spin"></div>
          <p className="text-neutral-400">Loading tenants...</p>
        </div>
      </div>
    );
  }

  const activeTenants = tenants.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">
            Tenants
          </h1>
          <p className="text-neutral-400">Provision and manage customer accounts</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Tenant</span>
        </motion.button>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Provisioned', value: tenants.length, icon: Users, gradient: 'from-[#667eea] to-[#764ba2]' },
          { label: 'Active Status', value: activeTenants, icon: CheckCircle, gradient: 'from-[#4ade80] to-[#38f9d7]' },
          { label: 'Suspended/Warning', value: tenants.length - activeTenants, icon: AlertTriangle, gradient: 'from-[#fbbf24] to-[#f59e0b]' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -2 }}
            className="group relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 overflow-hidden"
          >
            <div className="relative z-10 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg opacity-80`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-white mb-0.5">{stat.value}</div>
                <div className="text-sm font-medium text-neutral-500">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          className="w-full pl-12 pr-4 py-3.5 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#667eea]/50 focus:ring-1 focus:ring-[#667eea]/50 transition-all font-medium"
        />
      </motion.div>

      {/* Tenant Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500 bg-white/[0.02]">
                <th className="py-4 font-medium px-6">Tenant Name</th>
                <th className="py-4 font-medium px-6">Plan Tier</th>
                <th className="py-4 font-medium px-6 text-right">API / Token Usage</th>
                <th className="py-4 font-medium px-6 text-right">Cost (MTD)</th>
                <th className="py-4 font-medium px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, index) => (
                <motion.tr
                  key={tenant.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm mb-0.5">{tenant.name}</div>
                        <div className="text-xs text-neutral-500">{tenant.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {getTierIcon(tenant.plan)}
                      <span className="text-sm text-neutral-300 font-medium">{tenant.plan}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm text-white font-medium">{tenant.usage?.toLocaleString() || 0}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm text-white font-medium">${tenant.cost?.toFixed(2) || '0.00'}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {getStatusIcon(tenant.status)}
                      <span className="text-xs font-medium capitalize text-neutral-300">{tenant.status}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-sm text-neutral-500">
                    No tenants found. Click "New Tenant" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create Tenant Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-display font-bold text-white mb-6">Create New Tenant</h2>
              
              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Company Name</label>
                  <input
                    type="text"
                    required
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                    className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#667eea] transition-colors text-sm"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({...newTenant, email: e.target.value})}
                    className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#667eea] transition-colors text-sm"
                    placeholder="admin@acme.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Billing Plan</label>
                  <select
                    value={newTenant.plan}
                    onChange={(e) => setNewTenant({...newTenant, plan: e.target.value})}
                    className="w-full px-3 py-2.5 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#667eea] transition-colors text-sm appearance-none"
                  >
                    <option value="Free">Free Tier</option>
                    <option value="Pro">Pro Plan</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 rounded-lg font-semibold transition-colors text-sm"
                  >
                    {creating ? 'Provisioning...' : 'Create Tenant'}
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