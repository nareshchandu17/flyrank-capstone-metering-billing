import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getMetrics, getRealTimeUsage } from '../utils/api';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [realTimeData, setRealTimeData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, realTime] = await Promise.all([
          getMetrics(),
          getRealTimeUsage()
        ]);
        setMetrics(metricsData);
        setRealTimeData(realTime);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Simulate real-time updates
    const interval = setInterval(() => {
      setRealTimeData(prev => {
        const newData = [...prev];
        const lastValue = newData[newData.length - 1]?.value || 100;
        const newValue = Math.max(50, Math.min(600, lastValue + (Math.random() - 0.5) * 100));
        newData.push({
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: Math.round(newValue)
        });
        if (newData.length > 12) newData.shift();
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const pieData = [
    { name: 'API Calls', value: 400, color: '#0ea5e9' },
    { name: 'Storage', value: 300, color: '#a855f7' },
    { name: 'Bandwidth', value: 200, color: '#38bdf8' },
    { name: 'Compute', value: 100, color: '#c084fc' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-8"
    >
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 tracking-tight">
            Dashboard
          </h1>
          <p className="text-neutral-400 text-lg">Real-time overview of your usage metrics</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-all duration-300"
        >
          Last updated: Just now
        </motion.button>
      </div>

      {/* Premium Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: 'Total Revenue',
            value: `$${metrics?.totalRevenue?.toLocaleString() || 0}`,
            change: '+23.5%',
            icon: DollarSign,
            color: 'from-success-500 to-emerald-600',
            positive: true,
          },
          {
            title: 'Active Tenants',
            value: metrics?.activeTenants || 0,
            change: '+12.3%',
            icon: Users,
            color: 'from-primary-500 to-primary-600',
            positive: true,
          },
          {
            title: 'Avg Usage',
            value: `${metrics?.avgUsage || 0}%`,
            change: '-2.1%',
            icon: Activity,
            color: 'from-accent-500 to-accent-600',
            positive: false,
          },
          {
            title: 'Total Tenants',
            value: metrics?.totalTenants || 0,
            change: '+8.7%',
            icon: TrendingUp,
            color: 'from-warning-500 to-orange-600',
            positive: true,
          },
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="metric-card group"
            >
              <div className="flex items-start justify-between mb-4">
                <motion.div 
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-glow-sm`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  metric.positive ? 'text-success-400' : 'text-error-400'
                }`}>
                  {metric.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {metric.change}
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1 tracking-tight">
                {metric.value}
              </div>
              <div className="text-neutral-400 text-sm font-medium">{metric.title}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Premium Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Usage Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">
                Real-time Usage
              </h3>
              <p className="text-neutral-400 text-sm">Live API call volume</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 border border-success-500/20">
              <motion.div 
                className="w-2 h-2 rounded-full bg-success-400"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-success-400 text-sm font-medium">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={realTimeData}>
              <defs>
                <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
                stroke="#737373"
                style={{ fontSize: '12px', fontFamily: 'Inter' }}
              />
              <YAxis 
                stroke="#737373"
                style={{ fontSize: '12px', fontFamily: 'Inter' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(10, 10, 10, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontFamily: 'Inter',
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#0ea5e9" 
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorUsage)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Usage Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
          className="glass-card p-6"
        >
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">
              Usage Distribution
            </h3>
            <p className="text-neutral-400 text-sm">Resource consumption breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(10, 10, 10, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontFamily: 'Inter',
                }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full shadow-sm" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-neutral-300 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Premium Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">
              Recent Activity
            </h3>
            <p className="text-neutral-400 text-sm">Latest usage events and alerts</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
          >
            View All
          </motion.button>
        </div>
        <div className="space-y-3">
          {[
            {
              icon: Zap,
              title: 'High usage detected',
              description: 'Acme Corp exceeded 90% of their plan limit',
              time: '2 minutes ago',
              color: 'text-warning-400',
              bgColor: 'bg-warning-500/10',
              borderColor: 'border-warning-500/20',
            },
            {
              icon: Users,
              title: 'New tenant onboarded',
              description: 'TechStart Inc joined the Enterprise plan',
              time: '15 minutes ago',
              color: 'text-success-400',
              bgColor: 'bg-success-500/10',
              borderColor: 'border-success-500/20',
            },
            {
              icon: AlertCircle,
              title: 'Billing cycle completed',
              description: 'Monthly invoices generated for 142 tenants',
              time: '1 hour ago',
              color: 'text-primary-400',
              bgColor: 'bg-primary-500/10',
              borderColor: 'border-primary-500/20',
            },
            {
              icon: Clock,
              title: 'Usage forecast updated',
              description: 'Predicted 23% increase for next month',
              time: '3 hours ago',
              color: 'text-accent-400',
              bgColor: 'bg-accent-500/10',
              borderColor: 'border-accent-500/20',
            },
          ].map((activity, index) => {
            const Icon = activity.icon;
            return (
              <motion.div
                key={activity.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.08, ease: 'easeOut' }}
                whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-300 cursor-pointer group"
              >
                <div className={`w-10 h-10 rounded-xl ${activity.bgColor} ${activity.borderColor} border flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${activity.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium mb-1">{activity.title}</div>
                  <div className="text-neutral-400 text-sm">{activity.description}</div>
                </div>
                <div className="text-neutral-500 text-sm whitespace-nowrap font-medium">{activity.time}</div>
                <motion.div
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  whileHover={{ scale: 1.1 }}
                >
                  <MoreHorizontal className="w-5 h-5 text-neutral-400" />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
