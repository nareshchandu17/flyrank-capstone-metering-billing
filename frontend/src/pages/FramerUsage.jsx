import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Clock,
  Calendar,
  Download,
  Filter,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Flame,
  Globe,
  Server,
  Database,
  Cpu,
  HardDrive,
  Layers
} from 'lucide-react';

const FramerUsage = () => {
  const metrics = [
    { label: 'Total Requests', value: '2.8M', change: '+23%', icon: Activity, gradient: 'from-[#667eea] to-[#764ba2]' },
    { label: 'Avg. Latency', value: '45ms', change: '-15%', icon: Zap, gradient: 'from-[#4ade80] to-[#38f9d7]' },
    { label: 'Error Rate', value: '0.02%', change: '-45%', icon: Flame, gradient: 'from-[#f5576c] to-[#f093fb]' },
    { label: 'Active Sessions', value: '12.4K', change: '+18%', icon: Globe, gradient: 'from-[#f093fb] to-[#f5576c]' },
  ];

  const resourceUsage = [
    { name: 'CPU', usage: 78, icon: Cpu, color: '#667eea' },
    { name: 'Memory', usage: 65, icon: Layers, color: '#f093fb' },
    { name: 'Storage', usage: 45, icon: HardDrive, color: '#4facfe' },
    { name: 'Network', usage: 82, icon: Globe, color: '#43e97b' },
  ];

  const timeSeriesData = [
    { time: '00:00', value: 45 },
    { time: '04:00', value: 32 },
    { time: '08:00', value: 78 },
    { time: '12:00', value: 95 },
    { time: '16:00', value: 85 },
    { time: '20:00', value: 65 },
    { time: '24:00', value: 52 },
  ];

  const topEndpoints = [
    { path: '/api/v1/users', requests: '890K', latency: '23ms', errors: '0.01%' },
    { path: '/api/v1/data', requests: '650K', latency: '45ms', errors: '0.03%' },
    { path: '/api/v1/auth', requests: '420K', latency: '12ms', errors: '0.00%' },
    { path: '/api/v1/ai', requests: '380K', latency: '89ms', errors: '0.05%' },
    { path: '/api/v1/billing', requests: '290K', latency: '34ms', errors: '0.02%' },
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
            Usage Analytics
          </h1>
          <p className="text-neutral-400">Real-time performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/5 rounded-xl text-white hover:border-white/10 transition-all"
          >
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-xl font-medium shadow-lg shadow-[#667eea]/30"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative"
          >
            <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-6 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shadow-lg`}>
                    <metric.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                    metric.change.startsWith('+') ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f5576c]/10 text-[#f5576c]'
                  }`}>
                    {metric.change.startsWith('+') ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="text-sm font-medium">{metric.change}</span>
                  </div>
                </div>
                <div className="text-3xl font-display font-bold text-white mb-1">{metric.value}</div>
                <div className="text-sm text-neutral-400">{metric.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Chart Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Time Series Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -5 }}
          className="lg:col-span-2 group relative"
        >
          <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-1">Request Volume</h2>
                <p className="text-sm text-neutral-400">24-hour usage patterns</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-[#667eea]/10 text-[#667eea] rounded-lg text-sm font-medium">24H</button>
                <button className="px-4 py-2 text-neutral-400 hover:text-white rounded-lg text-sm font-medium transition-colors">7D</button>
                <button className="px-4 py-2 text-neutral-400 hover:text-white rounded-lg text-sm font-medium transition-colors">30D</button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-end gap-3 h-64">
                {timeSeriesData.map((data, i) => (
                  <motion.div
                    key={data.time}
                    initial={{ height: 0 }}
                    animate={{ height: `${data.value}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="w-full bg-gradient-to-t from-[#667eea] to-[#764ba2] rounded-t-lg opacity-80 hover:opacity-100 transition-opacity relative group/bar">
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#0a0a0a] rounded text-xs text-white whitespace-nowrap"
                      >
                        {data.value}%
                      </motion.div>
                    </div>
                    <span className="text-xs text-neutral-500">{data.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Resource Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -5 }}
          className="group relative"
        >
          <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden h-full">
            <h2 className="text-xl font-display font-bold text-white mb-6">Resource Usage</h2>
            
            <div className="space-y-6">
              {resourceUsage.map((resource, index) => (
                <motion.div
                  key={resource.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <resource.icon className="w-5 h-5" style={{ color: resource.color }} />
                      <span className="text-white font-medium">{resource.name}</span>
                    </div>
                    <span className="text-white font-bold">{resource.usage}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${resource.usage}%` }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${resource.color}, ${resource.color}88)` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Endpoints */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ y: -5 }}
        className="group relative"
      >
        <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-1">Top Endpoints</h2>
              <p className="text-sm text-neutral-400">Most active API endpoints</p>
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
          
          <div className="space-y-3">
            {topEndpoints.map((endpoint, index) => (
              <motion.div
                key={endpoint.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}
                className="flex items-center gap-6 p-4 rounded-2xl bg-[#0a0a0a]/30 border border-white/5 transition-all cursor-pointer"
              >
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">{endpoint.path}</div>
                  <div className="text-sm text-neutral-400">{endpoint.requests} requests</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{endpoint.latency}</div>
                  <div className="text-sm text-neutral-400">latency</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{endpoint.errors}</div>
                  <div className="text-sm text-neutral-400">errors</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FramerUsage;