import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getUsageHistory } from '../utils/api';
import { 
  History as HistoryIcon, 
  Search, 
  Filter,
  Download,
  Activity,
  Calendar,
  FileText,
  BrainCircuit,
  MessageSquare,
  Network
} from 'lucide-react';

const FramerHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getUsageHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching usage history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (metric) => {
    if (metric.includes('API')) return <Network className="w-4 h-4 text-[#4facfe]" />;
    if (metric.includes('Token')) return <BrainCircuit className="w-4 h-4 text-[#f093fb]" />;
    return <Activity className="w-4 h-4 text-[#667eea]" />;
  };

  const filteredHistory = history.filter(item => 
    item.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.metric.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#667eea]/30 border-t-[#667eea] rounded-full animate-spin"></div>
          <p className="text-neutral-400">Loading activity stream...</p>
        </div>
      </div>
    );
  }

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
            Activity Stream
          </h1>
          <p className="text-neutral-400">Live feed of all metered API and AI events</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-lg text-white hover:border-white/20 transition-all text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-lg font-semibold transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input
          type="text"
          placeholder="Search by tenant or metric type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#667eea]/50 focus:ring-1 focus:ring-[#667eea]/50 transition-all font-medium"
        />
      </motion.div>

      {/* Transaction List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500 bg-white/[0.02]">
                <th className="py-4 font-medium px-6">Event Type</th>
                <th className="py-4 font-medium px-6">Tenant</th>
                <th className="py-4 font-medium px-6 text-right">Quantity</th>
                <th className="py-4 font-medium px-6 text-right">Date</th>
                <th className="py-4 font-medium px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item, index) => (
                <motion.tr
                  key={item.id || index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-default"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        {getMetricIcon(item.metric)}
                      </div>
                      <span className="text-white font-medium text-sm">{item.metric}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border border-white/10 flex items-center justify-center bg-[#111] text-xs font-bold text-neutral-400">
                        {item.tenant.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-neutral-300">{item.tenant}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm font-medium text-white">
                      {item.value?.toLocaleString()} <span className="text-neutral-500 text-xs font-normal ml-1">{item.unit}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-neutral-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                      Recorded
                    </span>
                  </td>
                </motion.tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-sm text-neutral-500">
                    No activity found. Generate some usage via API!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default FramerHistory;