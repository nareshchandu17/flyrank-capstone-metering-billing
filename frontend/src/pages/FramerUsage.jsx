import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUsageHistory, getTenants, exportUsageToCsv, recordUsage } from '../utils/api';
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Clock, 
  Download, 
  Filter, 
  Activity, 
  ArrowUpRight, 
  Sparkles, 
  Layers, 
  Search, 
  RefreshCw, 
  Plus, 
  X, 
  CheckCircle, 
  AlertTriangle,
  BrainCircuit,
  FileSpreadsheet,
  Coins
} from 'lucide-react';

const FramerUsage = () => {
  const [events, setEvents] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulator Modal State
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simTenantId, setSimTenantId] = useState('');
  const [simType, setSimType] = useState('ai_tokens');
  const [simQuantity, setSimQuantity] = useState(5000);
  const [simTokens, setSimTokens] = useState({
    input_tokens: 3000,
    cached_input_tokens: 500,
    output_tokens: 1000,
    reasoning_tokens: 500
  });
  const [simulating, setSimulating] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [historyData, tenantsData] = await Promise.all([
        getUsageHistory({ limit: 100 }),
        getTenants()
      ]);

      setEvents(historyData || []);
      setTenants(tenantsData || []);
      if (tenantsData && tenantsData.length > 0 && !simTenantId) {
        setSimTenantId(tenantsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching usage data:', err);
      showToast('Failed to load usage data from server', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesTenant = selectedTenant === 'all' || event.tenant_id === selectedTenant || event.tenant === selectedTenant;
    const matchesMetric = selectedMetric === 'all' || event.usage_type === selectedMetric || (selectedMetric === 'api_call' && event.metric.includes('API')) || (selectedMetric === 'ai_tokens' && event.metric.includes('Token'));
    const matchesSearch = 
      (event.tenant || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.idempotency_key || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.metric || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTenant && matchesMetric && matchesSearch;
  });

  // Aggregated breakdowns from real events
  const totalCalls = filteredEvents
    .filter(e => e.usage_type === 'api_call' || e.metric.includes('API'))
    .reduce((sum, e) => sum + (e.value || 0), 0);

  const totalTokens = filteredEvents
    .filter(e => e.usage_type === 'ai_tokens' || e.metric.includes('Token'))
    .reduce((sum, e) => sum + (e.value || 0), 0);

  const totalCost = filteredEvents
    .reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0);

  // Token categories
  let inputTokensSum = 0;
  let cachedTokensSum = 0;
  let outputTokensSum = 0;
  let reasoningTokensSum = 0;

  filteredEvents.forEach(e => {
    if (e.metadata && typeof e.metadata === 'object') {
      inputTokensSum += parseInt(e.metadata.input_tokens || 0, 10);
      cachedTokensSum += parseInt(e.metadata.cached_input_tokens || e.metadata.cached_tokens || 0, 10);
      outputTokensSum += parseInt(e.metadata.output_tokens || 0, 10);
      reasoningTokensSum += parseInt(e.metadata.reasoning_tokens || 0, 10);
    } else if (e.usage_type === 'ai_tokens' || e.metric.includes('Token')) {
      inputTokensSum += (e.value || 0);
    }
  });

  // Export CSV
  const handleExport = () => {
    try {
      exportUsageToCsv(filteredEvents, `usage-export-${new Date().toISOString().split('T')[0]}.csv`);
      showToast('Usage CSV exported successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Record a genuine usage event via UI
  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    if (!simTenantId) {
      showToast('Please select a tenant', 'error');
      return;
    }
    setSimulating(true);

    try {
      const idempotencyKey = `ui-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const payload = {
        tenant_id: simTenantId,
        usage_type: simType,
        quantity: simType === 'api_call' ? parseInt(simQuantity, 10) : (simTokens.input_tokens + simTokens.cached_input_tokens + simTokens.output_tokens + simTokens.reasoning_tokens),
        idempotency_key: idempotencyKey,
        metadata: simType === 'ai_tokens' ? simTokens : { source: 'dashboard_ui' }
      };

      await recordUsage(payload);
      showToast(`Usage event recorded! Added to database telemetry.`);
      setIsSimulateOpen(false);
      await fetchData(true);
    } catch (err) {
      console.error('Error recording usage:', err);
      showToast(err.response?.data?.error || 'Failed to record usage event', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'error' 
                ? 'bg-red-950/80 border-red-500/30 text-red-200' 
                : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">
            Usage & Telemetry
          </h1>
          <p className="text-neutral-400 mt-1">
            Real-time event streams, token category aggregations, and verified exports.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-medium text-sm shadow-lg shadow-[#667eea]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Simulate Event</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-all"
          >
            <Download className="w-4 h-4 text-neutral-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchData(true)}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Top Aggregation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white mb-4 shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-white font-mono mb-1">
            {filteredEvents.length.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Filtered Events</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center text-white mb-4 shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-white font-mono mb-1">
            {totalCalls.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total API Calls (1¢/call)</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f093fb] to-[#f5576c] flex items-center justify-center text-white mb-4 shadow-md">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-white font-mono mb-1">
            {totalTokens.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total AI Tokens</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#43e97b] to-[#38f9d7] flex items-center justify-center text-white mb-4 shadow-md">
            <Coins className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-[#4ade80] font-mono mb-1">
            ${totalCost.toFixed(2)}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Exact Computed Value</div>
        </motion.div>
      </div>

      {/* AI Token Breakdown Panel */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#818cf8]" />
              <span>AI Token Category Breakdown</span>
            </h2>
            <p className="text-xs text-neutral-400">Priced transparently with sub-cent micro-accumulation</p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300">
            {totalTokens.toLocaleString()} Total Tokens
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Input Tokens */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-white">Input Tokens</span>
              <span className="font-mono text-[#818cf8]">$0.30 / 1M</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {inputTokensSum.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              ${((inputTokensSum * 0.30) / 1000000).toFixed(4)}
            </div>
          </div>

          {/* Cached Input Tokens */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-white">Cached Input</span>
              <span className="font-mono text-teal-400">$0.10 / 1M</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {cachedTokensSum.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              ${((cachedTokensSum * 0.10) / 1000000).toFixed(4)}
            </div>
          </div>

          {/* Output Tokens */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-white">Output Tokens</span>
              <span className="font-mono text-fuchsia-400">$0.60 / 1M</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {outputTokensSum.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              ${((outputTokensSum * 0.60) / 1000000).toFixed(4)}
            </div>
          </div>

          {/* Reasoning Tokens */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-white">Reasoning Tokens</span>
              <span className="font-mono text-amber-400">$0.60 / 1M</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {reasoningTokensSum.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              ${((reasoningTokensSum * 0.60) / 1000000).toFixed(4)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tenant name, metric, or idempotency key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#667eea]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tenant Selector */}
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="px-3.5 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-neutral-300 text-sm focus:outline-none focus:border-[#667eea]"
          >
            <option value="all">All Tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3.5 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-neutral-300 text-sm focus:outline-none focus:border-[#667eea]"
          >
            <option value="all">All Usage Types</option>
            <option value="api_call">API Calls</option>
            <option value="ai_tokens">AI Tokens</option>
          </select>
        </div>
      </div>

      {/* Real Events Stream Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500 bg-white/[0.01]">
                <th className="py-4 px-6 font-semibold">Timestamp</th>
                <th className="py-4 px-6 font-semibold">Tenant</th>
                <th className="py-4 px-6 font-semibold">Metric</th>
                <th className="py-4 px-6 font-semibold text-right">Units</th>
                <th className="py-4 px-6 font-semibold text-right">Computed Cost</th>
                <th className="py-4 px-6 font-semibold">Idempotency Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                      <span>Loading real usage telemetry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-500">
                    No usage events match your current filter. Click "Simulate Event" to record one!
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 text-xs text-neutral-400 font-mono whitespace-nowrap">
                      {event.date} {event.time || ''}
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-white font-medium text-sm block">{event.tenant}</span>
                      <span className="text-[11px] font-mono text-neutral-500">{event.tenant_id?.substring(0, 8)}...</span>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        event.usage_type === 'api_call' || event.metric.includes('API')
                          ? 'bg-[#4facfe]/15 text-[#38bdf8] border-[#4facfe]/30'
                          : 'bg-[#f093fb]/15 text-[#f472b6] border-[#f093fb]/30'
                      }`}>
                        {event.usage_type === 'api_call' || event.metric.includes('API') ? (
                          <Activity className="w-3 h-3 text-[#38bdf8]" />
                        ) : (
                          <BrainCircuit className="w-3 h-3 text-[#f472b6]" />
                        )}
                        {event.metric}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-mono text-sm text-neutral-200">
                      {Number(event.value).toLocaleString()}
                    </td>

                    <td className="py-4 px-6 text-right font-mono text-sm font-bold text-[#4ade80]">
                      {event.cost_formatted || `$${event.cost || '0.00'}`}
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-xs font-mono text-neutral-400 bg-white/5 px-2 py-1 rounded max-w-[200px] truncate block" title={event.idempotency_key}>
                        {event.idempotency_key}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* SIMULATE EVENT MODAL */}
      <AnimatePresence>
        {isSimulateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0e0e10] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#667eea]" />
                    <span>Record Billable Event</span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Sends a live metered event through engine validation</p>
                </div>
                <button
                  onClick={() => setIsSimulateOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSimulateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Target Tenant</label>
                  <select
                    value={simTenantId}
                    onChange={(e) => setSimTenantId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.plan} Plan)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Usage Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSimType('api_call')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        simType === 'api_call' 
                          ? 'bg-[#667eea]/20 border-[#667eea] text-white' 
                          : 'bg-black/40 border-white/10 text-neutral-400'
                      }`}
                    >
                      <div className="font-semibold text-sm">API Call</div>
                      <div className="text-xs text-neutral-500">1 cent / request</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimType('ai_tokens')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        simType === 'ai_tokens' 
                          ? 'bg-[#667eea]/20 border-[#667eea] text-white' 
                          : 'bg-black/40 border-white/10 text-neutral-400'
                      }`}
                    >
                      <div className="font-semibold text-sm">AI Tokens</div>
                      <div className="text-xs text-neutral-500">Sub-cent breakdown</div>
                    </button>
                  </div>
                </div>

                {simType === 'api_call' ? (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Quantity (Calls)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={simQuantity}
                      onChange={(e) => setSimQuantity(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-xs font-semibold text-white mb-2">Token Distribution</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Input Tokens</label>
                        <input
                          type="number"
                          min="0"
                          value={simTokens.input_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, input_tokens: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Cached Input</label>
                        <input
                          type="number"
                          min="0"
                          value={simTokens.cached_input_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, cached_input_tokens: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Output Tokens</label>
                        <input
                          type="number"
                          min="0"
                          value={simTokens.output_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, output_tokens: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Reasoning Tokens</label>
                        <input
                          type="number"
                          min="0"
                          value={simTokens.reasoning_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, reasoning_tokens: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSimulateOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={simulating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {simulating ? 'Recording...' : 'Send Usage Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FramerUsage;