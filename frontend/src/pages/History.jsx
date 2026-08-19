import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar,
  Download,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Zap,
  HardDrive,
  Network,
  Cpu,
  FileText,
  DollarSign
} from 'lucide-react';
import { getUsageHistory } from '../utils/api';

const History = () => {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMetric, setFilterMetric] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getUsageHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.metric.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterMetric === 'all' || item.metric.toLowerCase().includes(filterMetric.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const getMetricIcon = (metric) => {
    const icons = {
      'API Calls': Zap,
      'Storage': HardDrive,
      'Bandwidth': Network,
      'Compute Hours': Cpu,
    };
    return icons[metric] || FileText;
  };

  const getMetricColor = (metric) => {
    const colors = {
      'API Calls': 'from-primary-500 to-blue-500',
      'Storage': 'from-accent-500 to-purple-500',
      'Bandwidth': 'from-green-500 to-emerald-500',
      'Compute Hours': 'from-orange-500 to-red-500',
    };
    return colors[metric] || 'from-gray-500 to-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            Usage History
          </h1>
          <p className="text-gray-400">Detailed records of all usage events and billing</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export All
        </motion.button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Records', value: history.length, icon: FileText, color: 'from-primary-500 to-blue-500' },
          { label: 'Total Cost', value: `$${history.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}`, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
          { label: 'Avg Cost/Event', value: `$${(history.reduce((sum, item) => sum + item.cost, 0) / history.length || 0).toFixed(2)}`, icon: TrendingUp, color: 'from-accent-500 to-purple-500' },
          { label: 'This Month', value: `$${history.slice(0, 5).reduce((sum, item) => sum + item.cost, 0).toLocaleString()}`, icon: Calendar, color: 'from-orange-500 to-red-500' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="metric-card"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-white">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Filter className="w-5 h-5 text-gray-400" />
          {['all', 'API', 'Storage', 'Bandwidth', 'Compute'].map((metric) => (
            <motion.button
              key={metric}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterMetric(metric)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterMetric === metric
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* History Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredHistory.map((item, index) => {
            const Icon = getMetricIcon(item.metric);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.01, x: 5 }}
                className="glass-card-light p-6 cursor-pointer group"
              >
                <div className="flex items-start gap-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getMetricColor(item.metric)} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-display font-semibold text-white mb-1">
                          {item.tenant}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <span>{item.metric}</span>
                          <span className="text-gray-600">•</span>
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-display font-bold text-white">
                          ${item.cost}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {item.value.toLocaleString()} {item.unit}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <ArrowUpRight className="w-4 h-4 text-green-400" />
                        <span>+12.5% from last period</span>
                      </div>
                      <div className="flex-1" />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                      >
                        View Details
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Load More */}
      {filteredHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-secondary px-8"
          >
            Load More Records
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default History;
