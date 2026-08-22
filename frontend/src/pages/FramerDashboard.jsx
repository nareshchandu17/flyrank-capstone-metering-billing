import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getMetrics, getRealTimeUsage, getTenants, getUsageHistory } from '../utils/api';
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
  Clock,
  MoreHorizontal
} from 'lucide-react';

const FramerDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [realTimeUsage, setRealTimeUsage] = useState([]);
  const [topTenants, setTopTenants] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, usageData, tenantsData, historyData] = await Promise.all([
          getMetrics(),
          getRealTimeUsage(),
          getTenants(),
          getUsageHistory()
        ]);

        setMetrics(metricsData);
        setRealTimeUsage(usageData);
        
        // Sort tenants by revenue/cost
        const sortedTenants = [...tenantsData]
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 5); // top 5
        setTopTenants(sortedTenants);

        // Take latest 4 activities from history
        setRecentActivity(historyData.slice(0, 4).map(item => ({
          tenant: item.tenant,
          action: `${item.metric} usage recorded: ${item.value} ${item.unit}`,
          time: item.date,
          status: item.metric === 'API Calls' ? 'success' : 'info'
        })));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#667eea]/30 border-t-[#667eea] rounded-full animate-spin"></div>
          <p className="text-neutral-400">Loading live data...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${metrics?.totalRevenue || 0}`,
      change: `+${metrics?.monthlyGrowth || 0}%`,
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-[#667eea] to-[#764ba2]'
    },
    {
      title: 'Active Tenants',
      value: metrics?.activeTenants || 0,
      change: 'Active',
      trend: 'up',
      icon: Users,
      gradient: 'from-[#f093fb] to-[#f5576c]'
    },
    {
      title: 'Avg API Usage',
      value: `${metrics?.avgUsage || 0} req/tenant`,
      change: 'Stable',
      trend: 'up',
      icon: Activity,
      gradient: 'from-[#4facfe] to-[#00f2fe]'
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: 'All systems operational',
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
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">
            Overview
          </h1>
          <p className="text-neutral-400">Live system metrics and revenue performance.</p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2, scale: 1.01 }}
              className="group relative"
            >
              <div className="relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-bl-3xl opacity-10`} />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${
                      stat.trend === 'up' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f5576c]/10 text-[#f5576c]'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span className="text-xs font-semibold">{stat.change}</span>
                    </div>
                  </div>
                  
                  <div className="text-3xl font-display font-semibold text-white mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-neutral-500">{stat.title}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Usage Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 group relative"
        >
          <div className="h-full relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-display font-semibold text-white mb-1">Usage Analytics (24h)</h2>
                <p className="text-sm text-neutral-400">Total API and Token requests</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-end gap-3 h-56">
                {realTimeUsage.length > 0 ? realTimeUsage.map((item, i) => {
                  // Mock visualization scaling
                  const height = Math.max(10, Math.min(100, (item.value / 1000) * 100));
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="flex-1 relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-[#667eea] to-[#764ba2] rounded-t-md opacity-70 group-hover:opacity-100 transition-opacity" />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded font-medium border border-white/10 transition-opacity whitespace-nowrap">
                        {item.value} reqs
                      </div>
                    </motion.div>
                  )
                }) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
                    No recent usage data available.
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs font-medium text-neutral-500 px-2">
                {realTimeUsage.map((item, i) => (
                  <span key={i}>{item.time}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="group relative"
        >
          <div className="relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 overflow-hidden h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold text-white">Live Activity</h2>
              <MoreHorizontal className="w-5 h-5 text-neutral-500" />
            </div>
            
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    activity.status === 'success' ? 'bg-[#4ade80]/10' : 
                    activity.status === 'warning' ? 'bg-[#fbbf24]/10' : 'bg-[#667eea]/10'
                  }`}>
                    {activity.status === 'success' ? (
                      <Activity className="w-4 h-4 text-[#4ade80]" />
                    ) : activity.status === 'warning' ? (
                      <Flame className="w-4 h-4 text-[#fbbf24]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#667eea]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium mb-0.5 truncate">{activity.tenant}</div>
                    <div className="text-xs text-neutral-400 truncate">{activity.action}</div>
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mt-1">{activity.time}</div>
                </div>
              )) : (
                <p className="text-sm text-neutral-500 text-center py-4">No recent activity.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Tenants Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="group relative"
      >
        <div className="relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-display font-semibold text-white mb-1">Top Tenants by Revenue</h2>
              <p className="text-sm text-neutral-400">Accounts generating the most value this period</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="pb-4 font-medium px-4">Tenant</th>
                  <th className="pb-4 font-medium px-4">Plan</th>
                  <th className="pb-4 font-medium px-4 text-right">Usage Count</th>
                  <th className="pb-4 font-medium px-4 text-right">Mtd Cost</th>
                </tr>
              </thead>
              <tbody>
                {topTenants.length > 0 ? topTenants.map((tenant, index) => (
                  <tr key={tenant.id || index} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium text-sm">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-neutral-300 border border-white/10">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-neutral-300">
                      {tenant.usage?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-medium text-white">
                      ${tenant.cost?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-sm text-neutral-500">
                      No tenants found. Try creating one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FramerDashboard;