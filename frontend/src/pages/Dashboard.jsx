import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Sparkles,
  Flame,
  BarChart3,
  Calendar,
  Clock,
  Globe,
  Target,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { api } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.getDashboardStats();
      if (response.success) {
        setStats(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statsData = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-[#667eea] to-[#764ba2]'
    },
    {
      title: 'Active Tenants',
      value: stats.activeTenants.toLocaleString(),
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      gradient: 'from-[#f093fb] to-[#f5576c]'
    },
    {
      title: 'API Requests',
      value: stats.monthlyUsage.toLocaleString(),
      change: '+23.1%',
      trend: 'up',
      icon: Activity,
      gradient: 'from-[#4facfe] to-[#00f2fe]'
    },
    {
      title: 'Total Tenants',
      value: stats.totalTenants.toLocaleString(),
      change: '+5.0%',
      trend: 'up',
      icon: Zap,
      gradient: 'from-[#43e97b] to-[#38f9d7]'
    },
  ];

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
            Dashboard
          </h1>
          <p className="text-neutral-400">Welcome back! Here's what's happening today.</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative"
            >
              <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-6 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-bl-3xl opacity-20" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      stat.trend === 'up' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f5576c]/10 text-[#f5576c]'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="text-sm font-medium">{stat.change}</span>
                    </div>
                  </div>
                  <div className="text-3xl font-display font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-neutral-400">{stat.title}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -5 }}
          className="lg:col-span-2 group relative"
        >
          <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-1">Recent Activity</h2>
                <p className="text-sm text-neutral-400">Latest usage events across all tenants</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0a]/30 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium mb-1">{activity.tenant_name}</div>
                      <div className="text-sm text-neutral-400">{activity.event_type} - {activity.quantity} units</div>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-neutral-400 py-8">No recent activity</div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Top Tenants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -5 }}
          className="group relative"
        >
          <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-display font-bold text-white mb-1">Top Tenants</h2>
                <p className="text-sm text-neutral-400">Highest usage this month</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {stats.topTenants && stats.topTenants.length > 0 ? (
                stats.topTenants.map((tenant, index) => (
                  <motion.div
                    key={tenant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0a]/30 border border-white/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold">
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{tenant.name}</div>
                        <div className="text-sm text-neutral-400">{tenant.usage_count} events</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{tenant.plan_name}</div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-neutral-400 py-8">No tenants yet</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;