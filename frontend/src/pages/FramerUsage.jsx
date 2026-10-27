import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUsageHistory, getTenants, exportUsageToCsv, recordUsage } from '../utils/api';
import { 
  BarChart3, 
  Download, 
  Search, 
  RefreshCw, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  BrainCircuit,
  Coins,
  Activity,
  Layers,
  Zap,
  ArrowUpRight
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
      showToast('Failed to load usage events from engine', 'error');
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

  const totalCalculatedCost = filteredEvents
    .reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0);

  // CSV Export handler
  const handleExportCsv = () => {
    try {
      exportUsageToCsv(filteredEvents, `usage-meter-report-${new Date().toISOString().split('T')[0]}.csv`);
      showToast(`Exported ${filteredEvents.length} events to CSV`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export CSV', 'error');
    }
  };

  // Simulate Ingestion Event
  const handleSimulateEvent = async (e) => {
    e.preventDefault();
    if (!simTenantId) {
      showToast('Select a tenant', 'error');
      return;
    }

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? `sim-${crypto.randomUUID()}` 
        : `sim-${Date.now()}-${performance.now().toString(36)}`;
      const payload = {
        tenant_id: simTenantId,
        usage_type: simType,
        quantity: parseInt(simQuantity, 10),
        idempotency_key: idempotencyKey,
        metadata: simType === 'ai_tokens' ? simTokens : null
      };

      await recordUsage(payload);
      showToast(`Ingested ${payload.quantity} ${simType === 'api_call' ? 'API calls' : 'tokens'} successfully`);
      setIsSimulateOpen(false);
      fetchData(true);
    } catch (err) {
      console.error('Simulation error:', err);
      showToast(err.message || 'Failed to ingest event', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-full text-xs font-medium shadow-level-2 flex items-center gap-2 border ${
              toast.type === 'error'
                ? 'bg-white text-[#ea2261] border-[#ea2261]/30'
                : 'bg-white text-emerald-800 border-emerald-200'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-[#ea2261]" /> : <CheckCircle2 className="w-4 h-4 text-[#10b981]" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Single Indigo CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill-tag-soft">
              <Activity className="w-3.5 h-3.5" />
              Real-Time Ledger
            </span>
          </div>
          <h1 className="font-display-lg text-[#0d253d] tracking-display-lg">
            Usage History & Event Ledger
          </h1>
          <p className="text-[#64748d] text-[15px] font-normal mt-1 max-w-2xl leading-relaxed">
            Audit itemized API calls and categorized AI token distributions with sub-cent price accumulation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={filteredEvents.length === 0}
            className="btn-secondary-pill"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsSimulateOpen(true)}
            className="btn-primary-pill"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest Event</span>
          </button>
        </div>
      </div>

      {/* Aggregated Financial & Unit Counters on White Surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-stripi p-6 bg-white">
          <div className="flex items-center justify-between text-xs text-[#64748d] uppercase tracking-wider mb-2">
            <span>Filtered Metered Calls</span>
            <Activity className="w-4 h-4 text-[#533afd]" />
          </div>
          <div className="font-display-md text-[#0d253d] tracking-display-md font-mono tnum mb-1">
            {totalCalls.toLocaleString()}
          </div>
          <div className="text-xs text-[#64748d]">$0.01 per standard call</div>
        </div>

        <div className="card-stripi p-6 bg-white">
          <div className="flex items-center justify-between text-xs text-[#64748d] uppercase tracking-wider mb-2">
            <span>Filtered AI Tokens</span>
            <BrainCircuit className="w-4 h-4 text-[#665efd]" />
          </div>
          <div className="font-display-md text-[#0d253d] tracking-display-md font-mono tnum mb-1">
            {totalTokens.toLocaleString()}
          </div>
          <div className="text-xs text-[#64748d]">Prompt, cached, output & reasoning</div>
        </div>

        <div className="card-stripi p-6 bg-white">
          <div className="flex items-center justify-between text-xs text-[#64748d] uppercase tracking-wider mb-2">
            <span>Total Evaluated Cost</span>
            <Coins className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="font-display-md text-[#0d253d] tracking-display-md font-mono tnum mb-1">
            ${totalCalculatedCost.toFixed(4)}
          </div>
          <div className="text-xs text-[#10b981]">Exact sub-cent accumulation</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card-stripi p-4 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748d]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenant or idempotency key..."
            className="text-input-stripi pl-9 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tenant Selector */}
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="text-input-stripi text-xs py-1.5"
          >
            <option value="all">All Accounts ({tenants.length})</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="text-input-stripi text-xs py-1.5"
          >
            <option value="all">All Metrics</option>
            <option value="api_call">API Calls Only</option>
            <option value="ai_tokens">AI Tokens Only</option>
          </select>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn-secondary-pill text-xs py-1.5 px-3"
            title="Refresh event list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#533afd] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Real Usage Events Table on White Surface */}
      <div className="card-stripi bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc] text-xs uppercase tracking-wider text-[#64748d]">
                <th className="py-3 px-6 font-normal">Timestamp</th>
                <th className="py-3 px-6 font-normal">Account</th>
                <th className="py-3 px-6 font-normal">Metric Type</th>
                <th className="py-3 px-6 font-normal">Token Categorization</th>
                <th className="py-3 px-6 font-normal text-right">Units</th>
                <th className="py-3 px-6 font-normal text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e8ee]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748d]">
                    <div className="w-6 h-6 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching real-time usage ledger...
                  </td>
                </tr>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => {
                  const isApi = event.usage_type === 'api_call' || event.metric.includes('API');
                  const meta = event.metadata;
                  return (
                    <tr key={event.id} className="hover:bg-[#f6f9fc] transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-6 font-mono text-xs text-[#64748d] tnum">
                        <div>{event.date}</div>
                        <div className="text-[10px] text-[#61718a]">{event.time || ''}</div>
                      </td>

                      {/* Tenant Account */}
                      <td className="py-3.5 px-6">
                        <div className="font-normal text-[#0d253d]">{event.tenant}</div>
                        <div className="text-[11px] text-[#64748d] font-mono tnum truncate max-w-[160px]">
                          {event.idempotency_key || event.tenant_id}
                        </div>
                      </td>

                      {/* Metric Badge */}
                      <td className="py-3.5 px-6">
                        <span className="pill-tag-soft">
                          {event.metric}
                        </span>
                      </td>

                      {/* Detailed Token Categorization */}
                      <td className="py-3.5 px-6 text-xs text-[#64748d]">
                        {!isApi && meta ? (
                          <div className="flex flex-wrap gap-2 text-[11px] font-mono tnum">
                            <span className="text-[#0d253d]" title="Input tokens">In: {(meta.input_tokens || 0).toLocaleString()}</span>
                            <span className="text-[#64748d]" title="Cached input tokens">Cached: {(meta.cached_input_tokens || meta.cached_tokens || 0).toLocaleString()}</span>
                            <span className="text-[#533afd]" title="Output tokens">Out: {(meta.output_tokens || 0).toLocaleString()}</span>
                            {meta.reasoning_tokens ? (
                              <span className="text-[#ea2261]" title="Reasoning tokens">Reason: {meta.reasoning_tokens.toLocaleString()}</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[#64748d] text-xs font-mono">Standard HTTP API Request</span>
                        )}
                      </td>

                      {/* Units */}
                      <td className="py-3.5 px-6 text-right font-mono tnum text-[#0d253d]">
                        {event.value.toLocaleString()}
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-6 text-right font-medium text-[#0d253d] font-mono tnum">
                        {event.cost_formatted || `$${event.cost || '0.00'}`}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748d] text-sm">
                    No usage events recorded matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SIMULATOR MODAL */}
      <AnimatePresence>
        {isSimulateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSimulateOpen(false)}
              className="absolute inset-0 bg-[#0d253d]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative card-stripi bg-white p-6 max-w-lg w-full shadow-level-3"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#e3e8ee] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#533afd]/10 text-[#533afd] flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-normal text-[#0d253d]">Live Event Simulator</h3>
                    <p className="text-xs text-[#64748d]">Inject real billable usage into the metering engine</p>
                  </div>
                </div>
                <button onClick={() => setIsSimulateOpen(false)} className="text-[#64748d] hover:text-[#0d253d]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSimulateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Target Account
                  </label>
                  <select
                    value={simTenantId}
                    onChange={(e) => setSimTenantId(e.target.value)}
                    required
                    className="text-input-stripi w-full"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.plan || 'Free'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Usage Metric Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSimType('api_call')}
                      className={`p-3 rounded-lg border text-left text-xs transition-all ${
                        simType === 'api_call'
                          ? 'border-[#533afd] bg-[#533afd]/5 text-[#533afd] font-medium'
                          : 'border-[#e3e8ee] hover:bg-[#f6f9fc] text-[#273951]'
                      }`}
                    >
                      <div className="font-normal text-sm mb-0.5">API Call</div>
                      <div className="text-[11px] text-[#64748d]">$0.01 fixed / request</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimType('ai_tokens')}
                      className={`p-3 rounded-lg border text-left text-xs transition-all ${
                        simType === 'ai_tokens'
                          ? 'border-[#533afd] bg-[#533afd]/5 text-[#533afd] font-medium'
                          : 'border-[#e3e8ee] hover:bg-[#f6f9fc] text-[#273951]'
                      }`}
                    >
                      <div className="font-normal text-sm mb-0.5">AI Tokens</div>
                      <div className="text-[11px] text-[#64748d]">Prompt & reasoning rates</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#64748d] uppercase tracking-wider mb-1">
                    Total Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={simQuantity}
                    onChange={(e) => setSimQuantity(e.target.value)}
                    className="text-input-stripi w-full font-mono tnum"
                  />
                </div>

                {simType === 'ai_tokens' && (
                  <div className="p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] space-y-3">
                    <span className="text-xs font-medium text-[#0d253d] block">
                      Token Breakdown Composition
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-[#64748d] mb-1">Input ($0.30/1M)</label>
                        <input
                          type="number"
                          value={simTokens.input_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, input_tokens: parseInt(e.target.value) || 0 })}
                          className="text-input-stripi w-full font-mono tnum"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#64748d] mb-1">Cached ($0.10/1M)</label>
                        <input
                          type="number"
                          value={simTokens.cached_input_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, cached_input_tokens: parseInt(e.target.value) || 0 })}
                          className="text-input-stripi w-full font-mono tnum"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#64748d] mb-1">Output ($0.60/1M)</label>
                        <input
                          type="number"
                          value={simTokens.output_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, output_tokens: parseInt(e.target.value) || 0 })}
                          className="text-input-stripi w-full font-mono tnum"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#64748d] mb-1">Reasoning ($0.60/1M)</label>
                        <input
                          type="number"
                          value={simTokens.reasoning_tokens}
                          onChange={(e) => setSimTokens({ ...simTokens, reasoning_tokens: parseInt(e.target.value) || 0 })}
                          className="text-input-stripi w-full font-mono tnum"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSimulateOpen(false)}
                    className="btn-secondary-pill text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={simulating}
                    className="btn-primary-pill text-xs"
                  >
                    {simulating ? 'Ingesting...' : 'Ingest Real Event'}
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