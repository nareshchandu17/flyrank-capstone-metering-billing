import { motion } from 'framer-motion';
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

const FramerDashboard = () => {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$284,732',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-[#667eea] to-[#764ba2]'
    },
    {
      title: 'Active Tenants',
      value: '1,247',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      gradient: 'from-[#f093fb] to-[#f5576c]'
    },
    {
      title: 'API Requests',
      value: '2.8M',
      change: '+23.1%',
      trend: 'up',
      icon: Activity,
      gradient: 'from-[#4facfe] to-[#00f2fe]'
    },
    {
      title: 'Avg. Response',
      value: '45ms',
      change: '-15.3%',
      trend: 'down',
      icon: Zap,
      gradient: 'from-[#43e97b] to-[#38f9d7]'
    },
  ];

  const recentActivity = [
    {
      tenant: 'Acme Corp',
      action: 'Quota exceeded',
      time: '2 min ago',
      status: 'warning'
    },
    {
      tenant: 'TechStart Inc',
      action: 'New subscription',
      time: '15 min ago',
      status: 'success'
    },
    {
      tenant: 'Global Finance',
      action: 'Billing invoice generated',
      time: '1 hour ago',
      status: 'info'
    },
    {
      tenant: 'CloudScale Ltd',
      action: 'API rate limit hit',
      time: '2 hours ago',
      status: 'warning'
    },
  ];

  const topTenants = [
    { name: 'Acme Corp', usage: '2.8M', revenue: '$45,230', growth: '+15%' },
    { name: 'TechStart Inc', usage: '1.9M', revenue: '$32,100', growth: '+12%' },
    { name: 'Global Finance', usage: '1.5M', revenue: '$28,450', growth: '+8%' },
    { name: 'CloudScale Ltd', usage: '1.2M', revenue: '$21,890', growth: '+20%' },
    { name: 'DataFlow Systems', usage: '980K', revenue: '$18,340', growth: '+5%' },
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

      {/* Stats Grid - asymmetric layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
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
                {/* Gradient glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Corner accent */}
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-bl-3xl opacity-20`} />
                
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
        {/* Usage Chart - Unique asymmetric design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -5 }}
          className="lg:col-span-2 group relative"
        >
          <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-1">Usage Analytics</h2>
                <p className="text-sm text-neutral-400">Real-time API usage metrics</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-[#667eea]/10 text-[#667eea] rounded-lg text-sm font-medium">7D</button>
                <button className="px-4 py-2 text-neutral-400 hover:text-white rounded-lg text-sm font-medium transition-colors">30D</button>
                <button className="px-4 py-2 text-neutral-400 hover:text-white rounded-lg text-sm font-medium transition-colors">90D</button>
              </div>
            </div>
            
            {/* Custom visualization */}
            <div className="space-y-4">
              <div className="flex items-end gap-2 h-48">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="flex-1 bg-gradient-to-t from-[#667eea] to-[#764ba2] rounded-t-lg opacity-80 hover:opacity-100 transition-opacity"
                  />
                ))}
              </div>
              
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>
            
            {/* Floating accent */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "ease-in-out" }}
              className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-[#f093fb] to-[#f5576c] rounded-xl flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Recent Activity - asymmetric card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -5 }}
          className="group relative"
        >
          <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white">Recent Activity</h2>
              <motion.button
                whileHover={{ rotate: 90 }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-neutral-400" />
              </motion.button>
            </div>
            
            {/* Activity list */}
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-[#0a0a0a]/30 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activity.status === 'success' ? 'bg-[#4ade80]/10' : 
                    activity.status === 'warning' ? 'bg-[#fbbf24]/10' : 'bg-[#667eea]/10'
                  }`}>
                    {activity.status === 'success' ? (
                      <ArrowUpRight className="w-5 h-5 text-[#4ade80]" />
                    ) : activity.status === 'warning' ? (
                      <Flame className="w-5 h-5 text-[#fbbf24]" />
                    ) : (
                      <Clock className="w-5 h-5 text-[#667eea]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium mb-1">{activity.tenant}</div>
                    <div className="text-sm text-neutral-400">{activity.action}</div>
                  </div>
                  <div className="text-xs text-neutral-500">{activity.time}</div>
                </motion.div>
              ))}
            </div>
            
            {/* Bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb]" />
          </div>
        </motion.div>
      </div>

      {/* Top Tenants Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ y: -5 }}
        className="group relative"
      >
        <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-1">Top Tenants</h2>
              <p className="text-sm text-neutral-400">Highest revenue generators this month</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
            >
              <span className="text-sm font-medium">View All</span>
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </div>
          
          {/* Tenant table */}
          <div className="space-y-3">
            {topTenants.map((tenant, index) => (
              <motion.div
                key={tenant.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}
                className="flex items-center gap-6 p-4 rounded-2xl bg-[#0a0a0a]/30 border border-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold">
                    {tenant.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{tenant.name}</div>
                    <div className="text-sm text-neutral-400">{tenant.usage} requests</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-white font-medium">{tenant.revenue}</div>
                  <div className="text-sm text-[#4ade80]">{tenant.growth}</div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(parseFloat(tenant.growth) / 25) * 100}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-[#667eea] to-[#764ba2]"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Corner decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 rounded-bl-3xl" />
        </div>
      </motion.div>
    </div>
  );
};

export default FramerDashboard;