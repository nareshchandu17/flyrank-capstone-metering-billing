import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  Filter,
  Download,
  ArrowUpRight,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Calendar,
  Receipt,
  CreditCard,
  AlertCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

const History = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistoryData();
    const interval = setInterval(fetchHistoryData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, statsRes] = await Promise.all([
        api.request('/history/transactions'),
        api.request('/history/summary'),
      ]);

      if (transactionsRes.success) setTransactions(transactionsRes.data);
      if (statsRes.success) setStats(statsRes.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch history data:', err);
      setError('Failed to load history data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type) => {
    switch (type) {
      case 'invoice':
        return <Receipt className="w-5 h-5" />;
      case 'payment':
        return <CreditCard className="w-5 h-5" />;
      case 'refund':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-[#4ade80] bg-[#4ade80]/10';
      case 'pending':
        return 'text-[#fbbf24] bg-[#fbbf24]/10';
      case 'failed':
        return 'text-[#f5576c] bg-[#f5576c]/10';
      default:
        return 'text-neutral-400 bg-neutral-400/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">Loading transaction history...</div>
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

  const statsData = [
    { label: 'Total Revenue', value: '$0', icon: DollarSign, gradient: 'from-[#667eea] to-[#764ba2]' },
    { label: 'Transactions', value: stats?.total_transactions?.toLocaleString() || '0', icon: Receipt, gradient: 'from-[#f093fb] to-[#f5576c]' },
    { label: 'Pending', value: stats?.pending_invoices?.toLocaleString() || '0', icon: Clock, gradient: 'from-[#fbbf24] to-[#f59e0b]' },
    { label: 'Failed', value: '0', icon: AlertCircle, gradient: 'from-[#f5576c] to-[#f093fb]' },
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
            Transaction History
          </h1>
          <p className="text-neutral-400">View all billing transactions and payments</p>
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

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
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

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/5 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:border-[#667eea]/50 transition-all"
        />
      </motion.div>

      {/* Transaction List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-6 border-b border-white/5">
            <div className="col-span-2 text-sm font-medium text-neutral-400">Type</div>
            <div className="col-span-3 text-sm font-medium text-neutral-400">Tenant</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Amount</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Date</div>
            <div className="col-span-2 text-sm font-medium text-neutral-400">Status</div>
            <div className="col-span-1 text-sm font-medium text-neutral-400">Action</div>
          </div>

          {/* Table Rows */}
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="grid grid-cols-12 gap-4 p-6 border-b border-white/5 last:border-0 transition-all cursor-pointer group"
              >
                {/* Type */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white">
                    {getTypeIcon(transaction.type)}
                  </div>
                  <span className="text-white capitalize">{transaction.type}</span>
                </div>

                {/* Tenant */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                    {transaction.tenant_name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-white">{transaction.tenant_name || 'Unknown'}</span>
                </div>

                {/* Amount */}
                <div className="col-span-2 flex items-center">
                  <span className="text-white font-medium">{transaction.amount}</span>
                </div>

                {/* Date */}
                <div className="col-span-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span className="text-white">{new Date(transaction.created_at).toLocaleDateString()}</span>
                </div>

                {/* Status */}
                <div className="col-span-2 flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-1 flex items-center justify-end">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 45 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ArrowUpRight className="w-5 h-5 text-neutral-400" />
                  </motion.button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center text-neutral-400 py-8">No transactions found</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default History;