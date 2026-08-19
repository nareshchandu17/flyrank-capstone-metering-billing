import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Legend
} from 'recharts';
import { 
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Zap,
  HardDrive,
  Network,
  Cpu
} from 'lucide-react';

const Usage = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);

  const usageData = {
    '7d': [
      { date: 'Mon', api: 45000, storage: 120, bandwidth: 450, compute: 80 },
      { date: 'Tue', api: 52000, storage: 125, bandwidth: 480, compute: 85 },
      { date: 'Wed', api: 48000, storage: 130, bandwidth: 520, compute: 90 },
      { date: 'Thu', api: 61000, storage: 135, bandwidth: 580, compute: 95 },
      { date: 'Fri', api: 55000, storage: 140, bandwidth: 550, compute: 88 },
      { date: 'Sat', api: 38000, storage: 145, bandwidth: 420, compute: 75 },
      { date: 'Sun', api: 42000, storage: 150, bandwidth: 450, compute: 78 },
    ],
    '30d': [
      { date: 'Week 1', api: 320000, storage: 850, bandwidth: 3200, compute: 580 },
      { date: 'Week 2', api: 350000, storage: 880, bandwidth: 3400, compute: 620 },
      { date: 'Week 3', api: 380000, storage: 920, bandwidth: 3600, compute: 650 },
      { date: 'Week 4', api: 410000, storage: 950, bandwidth: 3800, compute: 680 },
    ],
    '90d': [
      { date: 'Month 1', api: 1200000, storage: 3200, bandwidth: 12000, compute: 2200 },
      { date: 'Month 2', api: 1350000, storage: 3500, bandwidth: 13500, compute: 2400 },
      { date: 'Month 3', api: 1500000, storage: 3800, bandwidth: 15000, compute: 2600 },
    ],
  };

  const currentData = usageData[timeRange];

  const metrics = [
    {
      title: 'API Calls',
      value: currentData.reduce((sum, item) => sum + item.api, 0).toLocaleString(),
      change: '+18.5%',
      icon: Zap,
      color: 'from-primary-500 to-blue-500',
      positive: true,
    },
    {
      title: 'Storage',
      value: `${currentData.reduce((sum, item) => sum + item.storage, 0)} GB`,
      change: '+12.3%',
      icon: HardDrive,
      color: 'from-accent-500 to-purple-500',
      positive: true,
    },
    {
      title: 'Bandwidth',
      value: `${currentData.reduce((sum, item) => sum + item.bandwidth, 0)} GB`,
      change: '-5.2%',
      icon: Network,
      color: 'from-green-500 to-emerald-500',
      positive: false,
    },
    {
      title: 'Compute',
      value: `${currentData.reduce((sum, item) => sum + item.compute, 0)} hrs`,
      change: '+8.7%',
      icon: Cpu,
      color: 'from-orange-500 to-red-500',
      positive: true,
    },
  ];

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">
            Usage Analytics
          </h1>
          <p className="text-gray-400">Monitor and analyze your resource consumption</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="glass-card p-2 flex gap-2 w-fit">
        {['7d', '30d', '90d'].map((range) => (
          <motion.button
            key={range}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTimeRange(range)}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              timeRange === range
                ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
          </motion.button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="metric-card"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  metric.positive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metric.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {metric.change}
                </div>
              </div>
              <div className="text-2xl font-display font-bold text-white mb-1">
                {metric.value}
              </div>
              <div className="text-gray-400 text-sm">{metric.title}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-display font-semibold text-white mb-1">
              API Call Volume
            </h3>
            <p className="text-gray-400 text-sm">Total API requests over time</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={currentData}>
            <defs>
              <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => value.toLocaleString()}
            />
            <Area 
              type="monotone" 
              dataKey="api" 
              stroke="#0ea5e9" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorApi)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="mb-6">
            <h3 className="text-xl font-display font-semibold text-white mb-1">
              Storage Usage
            </h3>
            <p className="text-gray-400 text-sm">Storage consumption over time</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="storage" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="glass-card p-6"
        >
          <div className="mb-6">
            <h3 className="text-xl font-display font-semibold text-white mb-1">
              Compute Hours
            </h3>
            <p className="text-gray-400 text-sm">Compute time utilization</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="compute" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Usage Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="glass-card p-6"
      >
        <div className="mb-6">
          <h3 className="text-xl font-display font-semibold text-white mb-1">
            Usage by Category
          </h3>
          <p className="text-gray-400 text-sm">Resource consumption breakdown</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={currentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="api" name="API Calls" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            <Bar dataKey="storage" name="Storage (GB)" fill="#a855f7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="bandwidth" name="Bandwidth (GB)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="compute" name="Compute (hrs)" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
};

export default Usage;
