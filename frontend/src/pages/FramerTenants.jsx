import { motion } from 'framer-motion';
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
  Sparkles
} from 'lucide-react';

const FramerTenants = () => {
  const tenants = [
    {
      id: 1,
      name: 'Acme Corporation',
      tier: 'Enterprise',
      status: 'active',
      usage: '2.8M',
      revenue: '$45,230',
      growth: '+15%',
      quota: 85,
      apiKey: 'pk_live_••••••••••••••••',
      created: '2024-01-15'
    },
    {
      id: 2,
      name: 'TechStart Inc',
      tier: 'Pro',
      status: 'active',
      usage: '1.9M',
      revenue: '$32,100',
      growth: '+12%',
      quota: 72,
      apiKey: 'pk_live_••••••••••••••••',
      created: '2024-02-20'
    },
    {
      id: 3,
      name: 'Global Finance',
      tier: 'Enterprise',
      status: 'active',
      usage: '1.5M',
      revenue: '$28,450',
      growth: '+8%',
      quota: 65,
      apiKey: 'pk_live_••••••••••••••••',
      created: '2024-03-10'
    },
    {
      id: 4,
      name: 'CloudScale Ltd',
      tier: 'Pro',
      status: 'warning',
      usage: '1.2M',
      revenue: '$21,890',
      growth: '+20%',
      quota: 95,
      apiKey: 'pk_live_••••••••••••••••',
      created: '2024-04-05'
    },
    {
      id: 5,
      name: 'DataFlow Systems',
      tier: 'Starter',
      status: 'active',
      usage: '980K',
      revenue: '$18,340',
      growth: '+5%',
      quota: 45,
      apiKey: 'pk_live_••••••••••••••••',
      created: '2024-05-18'
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-[#4ade80]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-[#f5576c]" />;
      default:
        return null;
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
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-xl font-medium shadow-lg shadow-[#667eea]/30"
        >
          <Plus className="w-5 h-5" />
          <span>Add Tenant</span>
        </motion.button>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Tenants', value: '1,247', icon: Users, gradient: 'from-[#667eea] to-[#764ba2]' },
          { label: 'Active', value: '1,198', icon: CheckCircle, gradient: 'from-[#4ade80] to-[#38f9d7]' },
          { label: 'At Risk', value: '45', icon: AlertTriangle, gradient: 'from-[#fbbf24] to-[#f59e0b]' },
          { label: 'Total Revenue', value: '$284K', icon: TrendingUp, gradient: 'from-[#f093fb] to-[#f5576c]' },
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
            <div className="col-span-2 text-sm font-medium text-neutral-400">Tier</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Usage</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Revenue</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Quota</div>
            <div className="col-span-1 text-sm font-medium text-neutral-400">Status</div>
          </div>

          {/* Table Rows */}
          {tenants.map((tenant, index) => (
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
                  <div className="text-xs text-neutral-500">{tenant.apiKey}</div>
                </div>
              </div>

              {/* Tier */}
              <div className="col-span-2 flex items-center gap-2">
                {getTierIcon(tenant.tier)}
                <span className="text-white">{tenant.tier}</span>
              </div>

              {/* Usage */}
              <div className="col-span-2 flex items-center">
                <span className="text-white">{tenant.usage}</span>
              </div>

              {/* Revenue */}
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-white">{tenant.revenue}</span>
                <span className="text-xs text-[#4ade80]">{tenant.growth}</span>
              </div>

              {/* Quota */}
              <div className="col-span-2 flex items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400">{tenant.quota}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tenant.quota}%` }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                      className={`h-full rounded-full ${
                        tenant.quota > 90 ? 'bg-gradient-to-r from-[#f5576c] to-[#f093fb]' :
                        tenant.quota > 70 ? 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]' :
                        'bg-gradient-to-r from-[#667eea] to-[#764ba2]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="col-span-1 flex items-center justify-between">
                {getStatusIcon(tenant.status)}
                <motion.button
                  whileHover={{ rotate: 90 }}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-5 h-5 text-neutral-400" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default FramerTenants;