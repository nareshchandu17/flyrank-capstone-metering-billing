import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getInvoices, 
  getInvoiceDetail, 
  generateInvoice, 
  getTenants, 
  reconcileSubscriptions 
} from '../utils/api';
import { 
  Receipt, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  X, 
  ExternalLink, 
  Calendar, 
  Building2, 
  DollarSign, 
  CreditCard,
  FileText,
  AlertTriangle,
  RotateCw,
  Eye
} from 'lucide-react';

const FramerHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('all');

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Generate Invoice form
  const [genTenantId, setGenTenantId] = useState('');
  const [genPeriod, setGenPeriod] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [generating, setGenerating] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBillingData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [invoicesData, tenantsData] = await Promise.all([
        getInvoices(),
        getTenants()
      ]);

      setInvoices(invoicesData || []);
      setTenants(tenantsData || []);
      if (tenantsData && tenantsData.length > 0 && !genTenantId) {
        setGenTenantId(tenantsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
      showToast('Failed to load invoices from server', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  // Inspect invoice detail with full line items
  const handleInspectInvoice = async (inv) => {
    setSelectedInvoice(inv);
    setIsDetailOpen(true);
    setLoadingDetail(true);

    try {
      const detail = await getInvoiceDetail(inv.id);
      setSelectedInvoice(detail);
    } catch (err) {
      console.error('Error loading invoice detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Generate invoice on demand
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!genTenantId || !genPeriod) return;
    setGenerating(true);

    try {
      const result = await generateInvoice(genTenantId, genPeriod);
      if (result.status === 'existing') {
        showToast(`Invoice for ${genPeriod} already existed. Displaying current invoice.`, 'info');
      } else {
        showToast(`Invoice generated for period ${genPeriod}!`);
      }
      setIsGenerateOpen(false);
      await fetchBillingData(true);
      if (result.invoice) {
        handleInspectInvoice(result.invoice);
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      showToast(err.response?.data?.error || 'Failed to generate invoice', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Reconcile with Stripe
  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await reconcileSubscriptions();
      showToast(`Stripe reconciliation complete! Synced subscriptions.`);
      await fetchBillingData(true);
    } catch (err) {
      console.error('Error reconciling with Stripe:', err);
      showToast(err.response?.data?.error || 'Failed to reconcile with Stripe', 'error');
    } finally {
      setReconciling(false);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.tenant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.billing_period || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.stripe_invoice_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesTenant = selectedTenantFilter === 'all' || inv.tenant_id === selectedTenantFilter;

    return matchesSearch && matchesStatus && matchesTenant;
  });

  // Calculate totals
  const totalBilledCents = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0);
  const paidCount = filteredInvoices.filter(i => i.status === 'paid').length;
  const pendingCount = filteredInvoices.filter(i => i.status === 'pending' || i.status === 'open').length;

  return (
    <div className="space-y-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'error' 
                ? 'bg-red-950/80 border-red-500/30 text-red-200' 
                : toast.type === 'info'
                ? 'bg-sky-950/80 border-sky-500/30 text-sky-200'
                : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
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
            Billing & Invoices
          </h1>
          <p className="text-neutral-400 mt-1">
            Period billing cycles, itemized line items, and Stripe payment reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-medium text-sm shadow-lg shadow-[#667eea]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Invoice</span>
          </button>

          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-all"
            title="Synchronize subscription state with Stripe"
          >
            <RotateCw className={`w-4 h-4 text-[#818cf8] ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Syncing...' : 'Stripe Reconcile'}</span>
          </button>

          <button
            onClick={() => fetchBillingData(true)}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white mb-4 shadow-md">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-white font-mono mb-1">
            {filteredInvoices.length}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total Invoices</div>
        </div>

        <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#43e97b] to-[#38f9d7] flex items-center justify-center text-white mb-4 shadow-md">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-[#4ade80] font-mono mb-1">
            ${(totalBilledCents / 100).toFixed(2)}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total Billed Volume</div>
        </div>

        <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center text-white mb-4 shadow-md">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-white font-mono mb-1">
            {paidCount}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Paid / Settled</div>
        </div>

        <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f093fb] to-[#f5576c] flex items-center justify-center text-white mb-4 shadow-md">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-3xl font-display font-bold text-amber-300 font-mono mb-1">
            {pendingCount}
          </div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Pending Collection</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tenant, period (YYYY-MM), or invoice ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#667eea]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedTenantFilter}
            onChange={(e) => setSelectedTenantFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-neutral-300 text-sm focus:outline-none focus:border-[#667eea]"
          >
            <option value="all">All Tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-[#0a0a0a]/80 border border-white/10 rounded-xl text-neutral-300 text-sm focus:outline-none focus:border-[#667eea]"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="payment_failed">Payment Failed</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500 bg-white/[0.01]">
                <th className="py-4 px-6 font-semibold">Billing Period</th>
                <th className="py-4 px-6 font-semibold">Tenant</th>
                <th className="py-4 px-6 font-semibold text-right">Amount</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold">Stripe Reference</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-500">
                    No invoices found. Click "Generate Invoice" to create one for a billing cycle.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-sm text-white font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#818cf8]" />
                        <span>{inv.billing_period}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-white font-medium text-sm block">
                        {inv.tenant_name || (tenants.find(t => t.id === inv.tenant_id)?.name || 'Unknown')}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">ID: {inv.id.substring(0, 8)}...</span>
                    </td>

                    <td className="py-4 px-6 text-right font-mono text-sm font-bold text-white">
                      ${(inv.amount_cents / 100).toFixed(2)}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : inv.status === 'payment_failed'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {inv.status === 'paid' ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                        ) : inv.status === 'payment_failed' ? (
                          <XCircle className="w-3 h-3 text-red-400" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-300" />
                        )}
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-mono text-xs text-neutral-400">
                      {inv.stripe_invoice_id ? (
                        <div className="flex items-center gap-1 text-[#818cf8]">
                          <span>{inv.stripe_invoice_id.substring(0, 16)}...</span>
                        </div>
                      ) : (
                        <span className="text-neutral-500">Local Ledger</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleInspectInvoice(inv)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition-colors mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#667eea]" />
                        <span>Inspect Line Items</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* INSPECT INVOICE & LINE ITEMS MODAL */}
      <AnimatePresence>
        {isDetailOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0e0e10] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#667eea]" />
                    <span>Invoice #{selectedInvoice.id?.substring(0, 8)}</span>
                  </h2>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    Billing Period: {selectedInvoice.billing_period}
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto flex-1 pr-1">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <div className="text-[11px] text-neutral-500 uppercase font-semibold">Total Amount</div>
                    <div className="text-lg font-bold font-mono text-[#4ade80]">
                      ${(selectedInvoice.amount_cents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-500 uppercase font-semibold">Status</div>
                    <div className="text-sm font-semibold text-white capitalize">{selectedInvoice.status}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-500 uppercase font-semibold">Paid Timestamp</div>
                    <div className="text-xs font-mono text-neutral-300">
                      {selectedInvoice.paid_at ? new Date(selectedInvoice.paid_at).toLocaleDateString() : 'Unpaid'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-500 uppercase font-semibold">Stripe ID</div>
                    <div className="text-xs font-mono text-[#818cf8] truncate">
                      {selectedInvoice.stripe_invoice_id || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Itemized Billable Line Items</h3>
                  <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-neutral-400">
                          <th className="py-2.5 px-4 font-semibold">Description</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Quantity</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Amount ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {loadingDetail ? (
                          <tr>
                            <td colSpan="3" className="py-6 text-center text-neutral-500">Loading line items...</td>
                          </tr>
                        ) : selectedInvoice.line_items && selectedInvoice.line_items.length > 0 ? (
                          selectedInvoice.line_items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="py-3 px-4 text-white font-medium">{item.description}</td>
                              <td className="py-3 px-4 text-right font-mono text-neutral-300">
                                {Number(item.quantity).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-white">
                                ${(item.amount_cents / 100).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="py-6 text-center text-neutral-500">No line items recorded.</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10 bg-white/[0.02] font-semibold text-sm">
                          <td className="py-3 px-4 text-white">Total</td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 text-right font-mono text-[#4ade80]">
                            ${(selectedInvoice.amount_cents / 100).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Stripe Hosted Link */}
                {selectedInvoice.hosted_invoice_url && (
                  <div className="p-4 rounded-xl bg-[#667eea]/10 border border-[#667eea]/20 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Stripe Test-Mode Hosted Invoice</div>
                      <div className="text-[11px] text-neutral-400">View genuine customer payment checkout page on Stripe</div>
                    </div>
                    <a
                      href={selectedInvoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-[#667eea] hover:bg-[#667eea]/90 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GENERATE INVOICE MODAL */}
      <AnimatePresence>
        {isGenerateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0e0e10] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Generate Monthly Invoice</h2>
                <button
                  onClick={() => setIsGenerateOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Tenant</label>
                  <select
                    value={genTenantId}
                    onChange={(e) => setGenTenantId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#667eea]"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.plan} Plan)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Billing Period (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    pattern="^\d{4}-\d{2}$"
                    placeholder="2026-10"
                    value={genPeriod}
                    onChange={(e) => setGenPeriod(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#667eea]"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Calendar month in YYYY-MM format.</p>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGenerateOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {generating ? 'Calculating...' : 'Generate Invoice'}
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

export default FramerHistory;