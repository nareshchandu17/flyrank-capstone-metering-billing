import { motion } from 'framer-motion';
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

const FramerHistory = () => {
  const transactions = [
    {
      id: 'TXN-001',
      type: 'invoice',
      status: 'completed',
      tenant: 'Acme Corporation',
      amount: '$4,523.00',
      date: '2024-01-15',
      description: 'Monthly usage invoice'
    },
    {
      id: 'TXN-002',
      type: 'payment',
      status: 'completed',
      tenant: 'TechStart Inc',
      amount: '$3,210.00',
      date: '2024-01-14',
      description: 'Credit card payment'
    },
    {
      id: 'TXN-003',
      type: 'invoice',
      status: 'pending',
      tenant: 'Global Finance',
      amount: '$2,845.00',
      date: '2024-01-13',
      description: 'Monthly usage invoice'
    },
    {
      id: 'TXN-004',
      type: 'refund',
      status: 'completed',
      tenant: 'CloudScale Ltd',
      amount: '$218.90',
      date: '2024-01-12',
      description: 'Overcharge refund'
    },
    {
      id: 'TXN-005',
      type: 'invoice',
      status: 'failed',
      tenant: 'DataFlow Systems',
      amount: '$1,834.00',
      date: '2024-01-11',
      description: 'Monthly usage invoice'
    },
    {
      id: 'TXN-006',
      type: 'payment',
      status: 'completed',
      tenant: 'Acme Corporation',
      amount: '$4,523.00',
      date: '2024-01-10',
      description: 'Bank transfer'
    },
  ];

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

  const stats = [
    { label: 'Total Revenue', value: '$284,732', icon: DollarSign, gradient: 'from-[#667eea] to-[#764ba2]' },
    { label: 'Transactions', value: '1,247', icon: Receipt, gradient: 'from-[#f093fb] to-[#f5576c]' },
    { label: 'Pending', value: '45', icon: Clock, gradient: 'from-[#fbbf24] to-[#f59e0b]' },
    { label: 'Failed', value: '12', icon: AlertCircle, gradient: 'from-[#f5576c] to-[#f093fb]' },
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
        {stats.map((stat, index) => (
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
          {transactions.map((transaction, index) => (
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
                  {transaction.tenant.charAt(0)}
                </div>
                <span className="text-white">{transaction.tenant}</span>
              </div>

              {/* Amount */}
              <div className="col-span-2 flex items-center">
                <span className="text-white font-medium">{transaction.amount}</span>
              </div>

              {/* Date */}
              <div className="col-span-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span className="text-white">{transaction.date}</span>
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
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default FramerHistory;