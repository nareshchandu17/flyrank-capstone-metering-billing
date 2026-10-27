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
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FramerDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [realTimeUsage, setRealTimeUsage] = useState([]);
  const [topTenants, setTopTenants] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [metricsData, usageData, tenantsData, historyData] = await Promise.all([
        getMetrics(),
        getRealTimeUsage(),
        getTenants(),
        getUsageHistory({ limit: 6 })
      ]);

      setMetrics(metricsData);
      setRealTimeUsage(usageData || []);
      
      // Sort tenants by revenue/cost
      const sortedTenants = [...(tenantsData || [])]
        .sort((a, b) => (parseFloat(b.cost) || 0) - (parseFloat(a.cost) || 0))
        .slice(0, 5);
      setTopTenants(sortedTenants);

      // Latest activities from real usage events
      setRecentActivity(
        (historyData || []).slice(0, 5).map(item => ({
          tenant: item.tenant,
          action: `${item.metric} usage: ${item.value.toLocaleString()} ${item.unit}`,
          time: item.time ? `${item.date} ${item.time}` : item.date,
          cost: item.cost_formatted || `$${item.cost || '0.00'}`,
          status: item.metric === 'API Calls' ? 'success' : 'info'
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to connect to the backend server. Please verify the API is running on port 3001.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds for live updates
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#667eea]/30 border-t-[#667eea] rounded-full animate-spin" />
          <p className="text-neutral-400 font-medium tracking-wide">Connecting to metering engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-[#0a0a0a]/80 border border-red-500/20 text-center max-w-lg mx-auto my-12 backdrop-blur-xl">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
        <p className="text-sm text-neutral-400 mb-6">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isGrowthPositive = (metrics?.monthlyGrowth || 0) >= 0;

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${metrics?.totalRevenue || '0.00'}`,
      subtitle: `MTD: $${metrics?.monthlyRevenue || '0.00'}`,
      change: `${isGrowthPositive ? '+' : ''}${metrics?.monthlyGrowth || 0}%`,
      trend: isGrowthPositive ? 'up' : 'down',
      icon: DollarSign,
      gradient: 'from-[#667eea] to-[#764ba2]'
    },
    {
      title: 'Active Tenants',
      value: metrics?.activeTenants || 0,
      subtitle: `Total registered: ${metrics?.totalTenants || 0}`,
      change: '100% scoped',
      trend: 'up',
      icon: Users,
      gradient: 'from-[#f093fb] to-[#f5576c]'
    },
    {
      title: 'Total Usage Events',
      value: (metrics?.totalEvents || 0).toLocaleString(),
      subtitle: `Avg: ${metrics?.avgUsage || 0} / tenant`,
      change: `${(metrics?.totalApiCalls || 0).toLocaleString()} calls`,
      trend: 'up',
      icon: Activity,
      gradient: 'from-[#4facfe] to-[#00f2fe]'
    },
    {
      title: 'AI Tokens Processed',
      value: (metrics?.totalAiTokens || 0).toLocaleString(),
      subtitle: 'Sub-cent accuracy',
      change: 'Verified',
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
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-display font-bold text-white tracking-tight">
              Overview
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
              Live DB Synced
            </span>
          </div>
          <p className="text-neutral-400 mt-1">Real-time system telemetry, usage analytics, and billing status.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/tenants')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white text-sm font-medium shadow-lg shadow-[#667eea]/20 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Manage Tenants</span>
          </button>
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
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} rounded-bl-3xl opacity-10`} />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-[#667eea]/20`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      stat.trend === 'up' ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20' : 'bg-[#f5576c]/10 text-[#f5576c] border border-[#f5576c]/20'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  
                  <div className="text-3xl font-display font-bold text-white mb-1 tracking-tight">{stat.value}</div>
                  <div className="text-sm font-medium text-neutral-300">{stat.title}</div>
                  <div className="text-xs text-neutral-500 mt-1">{stat.subtitle}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Billing Status Bar */}
      {metrics?.billingStatus && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#43e97b]/20 to-[#38f9d7]/20 border border-[#43e97b]/30 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-[#4ade80]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Billing & Invoicing Status</h3>
                <p className="text-xs text-neutral-400">Current cycle invoice health & payment reconciliation</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard/history')}
              className="text-xs font-medium text-[#667eea] hover:text-[#764ba2] flex items-center gap-1 transition-colors"
            >
              View Invoices <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle className="w-5 h-5 text-[#4ade80]" />
              <div>
                <div className="text-sm font-bold text-white">{metrics.billingStatus.paid} Paid</div>
                <div className="text-xs text-neutral-500">Settled invoices</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <Clock className="w-5 h-5 text-[#fbbf24]" />
              <div>
                <div className="text-sm font-bold text-white">{metrics.billingStatus.pending} Pending / Open</div>
                <div className="text-xs text-neutral-500">Awaiting collection</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <XCircle className="w-5 h-5 text-[#f5576c]" />
              <div>
                <div className="text-sm font-bold text-white">{metrics.billingStatus.failed} Failed</div>
                <div className="text-xs text-neutral-500">Requires retry / action</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Middle Grid: Usage Analytics Chart & Live Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Usage Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 group relative"
        >
          <div className="h-full relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-display font-semibold text-white mb-1">Usage Trends (24h Activity)</h2>
                <p className="text-sm text-neutral-400">Total API calls and AI tokens logged by hour</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/usage')}
                className="text-xs font-medium text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                Deep Analytics <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-end gap-3 h-56 pt-6 pb-2">
                {realTimeUsage.length > 0 ? (
                  realTimeUsage.map((item, i) => {
                    const maxVal = Math.max(...realTimeUsage.map(r => r.value), 10);
                    const heightPercent = Math.max(8, Math.min(100, Math.round((item.value / maxVal) * 100)));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar relative">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute -top-8 bg-[#1a1a1a] text-white text-xs py-1 px-2.5 rounded-lg border border-white/10 shadow-xl whitespace-nowrap z-20 pointer-events-none">
                          {item.value.toLocaleString()} units
                        </div>

                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPercent}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                          className="w-full bg-gradient-to-t from-[#667eea] to-[#764ba2] rounded-t-lg opacity-75 group-hover/bar:opacity-100 transition-opacity cursor-pointer shadow-lg shadow-[#667eea]/20"
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
                    No recent usage events in the database.
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs font-medium text-neutral-500 px-1 border-t border-white/5 pt-3">
                {realTimeUsage.map((item, i) => (
                  <span key={i}>{item.time}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Live Activity Stream */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="group relative"
        >
          <div className="relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-semibold text-white">Live Activity</h2>
                <p className="text-xs text-neutral-400">Recent metered requests</p>
              </div>
              <Activity className="w-5 h-5 text-[#667eea]" />
            </div>
            
            <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#667eea]/10 text-[#667eea] border border-[#667eea]/20">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-white text-sm font-semibold truncate">{activity.tenant}</span>
                        <span className="text-xs font-mono text-[#4ade80] font-bold">{activity.cost}</span>
                      </div>
                      <div className="text-xs text-neutral-400 truncate">{activity.action}</div>
                      <div className="text-[10px] text-neutral-500 mt-1">{activity.time}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-neutral-500">No events recorded yet.</p>
                  <p className="text-xs text-neutral-600 mt-1">Make an API request to see it live.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Tenants Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="group relative"
      >
        <div className="relative bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-display font-semibold text-white mb-1">Top Tenants by Usage & Cost</h2>
              <p className="text-sm text-neutral-400">Real-time consumption calculated from monthly events</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/tenants')}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              View All Tenants
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="pb-4 font-semibold px-4">Tenant</th>
                  <th className="pb-4 font-semibold px-4">Email</th>
                  <th className="pb-4 font-semibold px-4">Plan</th>
                  <th className="pb-4 font-semibold px-4 text-right">Total Units</th>
                  <th className="pb-4 font-semibold px-4 text-right">MTD Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topTenants.length > 0 ? (
                  topTenants.map((tenant, index) => (
                    <tr key={tenant.id || index} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white font-medium text-sm block">{tenant.name}</span>
                            <span className="text-[11px] text-neutral-500 font-mono">{tenant.id?.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-neutral-400">{tenant.email}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          tenant.plan === 'Pro' 
                            ? 'bg-[#667eea]/10 text-[#667eea] border-[#667eea]/30' 
                            : 'bg-white/5 text-neutral-300 border-white/10'
                        }`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-sm font-mono text-neutral-300">
                        {tenant.usage?.toLocaleString() || 0}
                      </td>
                      <td className="py-4 px-4 text-right text-sm font-mono font-bold text-white">
                        ${tenant.cost ? parseFloat(tenant.cost).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sm text-neutral-500">
                      No tenants found. Click "Manage Tenants" to create your first tenant.
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