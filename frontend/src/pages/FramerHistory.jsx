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
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  X, 
  ExternalLink, 
  Calendar, 
  RotateCw,
  Eye,
  CreditCard,
  Layers,
  ArrowUpRight
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
      await reconcileSubscriptions();
      showToast(`Stripe reconciliation complete. All subscriptions synced.`);
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-stripi-2 flex items-center gap-3 backdrop-blur-xl ${
              toast.type === 'error' 
                ? 'bg-white border-[#ea2261]/30 text-[#ea2261]' 
                : toast.type === 'info'
                ? 'bg-white border-[#533afd]/30 text-[#533afd]'
                : 'bg-white border-emerald-500/30 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-[#ea2261]" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
            <span className="text-xs font-medium text-[#0d253d]">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with single-indigo CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="pill-tag-soft">Financial Engine</span>
            <span className="text-[11px] text-[#64748d]">Idempotent Invoicing & Webhook Sync</span>
          </div>
          <h1 className="font-display-lg text-[#0d253d]">
            Invoices & Settlement
          </h1>
          <p className="font-body-md text-[#64748d] mt-1">
            Calendar billing periods, itemized token line items, and Stripe test-mode hosted receipts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="btn-primary-pill"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Generate Period Invoice</span>
          </button>

          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="btn-secondary-pill"
            title="Synchronize subscription state with Stripe"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 text-[#533afd] ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Syncing...' : 'Reconcile Subscriptions'}</span>
          </button>

          <button
            onClick={() => fetchBillingData(true)}
            className="p-2 bg-white hover:bg-[#f6f9fc] border border-[#e3e8ee] rounded-pill text-[#64748d] hover:text-[#0d253d] transition-colors shadow-stripi-1"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card-stripi p-6 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Total Invoices</span>
            <div className="w-8 h-8 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#533afd]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display-md text-[#0d253d] tnum">
            {filteredInvoices.length}
          </div>
          <div className="text-[11px] text-[#64748d] mt-1">
            Unique period statements
          </div>
        </div>

        <div className="card-stripi p-6 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Billed Volume</span>
            <div className="w-8 h-8 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display-md text-[#0d253d] tnum">
            ${(totalBilledCents / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#64748d] mt-1">
            Aggregated usage value
          </div>
        </div>

        <div className="card-stripi p-6 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Settled / Paid</span>
            <div className="w-8 h-8 rounded-pill bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display-md text-emerald-700 tnum">
            {paidCount}
          </div>
          <div className="text-[11px] text-[#64748d] mt-1">
            Stripe charge confirmed
          </div>
        </div>

        <div className="card-stripi p-6 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Pending Collection</span>
            <div className="w-8 h-8 rounded-pill bg-[#f5e9d4] border border-[#9b6829]/20 flex items-center justify-center text-[#9b6829]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display-md text-[#9b6829] tnum">
            {pendingCount}
          </div>
          <div className="text-[11px] text-[#64748d] mt-1">
            Awaiting cycle payment
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-stripi p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#64748d] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tenant, period (YYYY-MM), or invoice ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-input-stripi w-full pl-9"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedTenantFilter}
            onChange={(e) => setSelectedTenantFilter(e.target.value)}
            className="text-input-stripi py-1.5 px-3 text-xs"
          >
            <option value="all">All Tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-input-stripi py-1.5 px-3 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="payment_failed">Payment Failed</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card-stripi p-0 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc] text-[11px] uppercase tracking-wider text-[#64748d]">
                <th className="py-3 px-5 font-semibold">Billing Period</th>
                <th className="py-3 px-5 font-semibold">Tenant</th>
                <th className="py-3 px-5 font-semibold text-right">Amount</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Stripe Reference</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e8ee]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748d]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading billing records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748d]">
                    <Receipt className="w-8 h-8 text-[#64748d]/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-[#0d253d]">No invoices found</p>
                    <p className="text-xs text-[#64748d] mt-1">Click "Generate Period Invoice" to calculate the current billing cycle.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f6f9fc] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#533afd]" />
                        <span className="font-body-tabular text-sm font-medium text-[#0d253d] tnum">{inv.billing_period}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="text-sm font-medium text-[#0d253d]">
                        {inv.tenant_name || (tenants.find(t => t.id === inv.tenant_id)?.name || 'Unknown')}
                      </div>
                      <div className="text-[10px] text-[#64748d] font-mono tnum">ID: {inv.id.substring(0, 8)}...</div>
                    </td>

                    <td className="py-3.5 px-5 text-right font-body-tabular text-sm font-medium text-[#0d253d] tnum">
                      ${(inv.amount_cents / 100).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[11px] font-medium border ${
                        inv.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : inv.status === 'payment_failed'
                          ? 'bg-red-50 text-[#ea2261] border-red-200'
                          : 'bg-[#f5e9d4] text-[#9b6829] border-[#9b6829]/20'
                      }`}>
                        {inv.status === 'paid' ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : inv.status === 'payment_failed' ? (
                          <XCircle className="w-3 h-3 text-[#ea2261]" />
                        ) : (
                          <Clock className="w-3 h-3 text-[#9b6829]" />
                        )}
                        <span className="capitalize">{inv.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      {inv.stripe_invoice_id ? (
                        <div className="text-xs text-[#533afd] font-mono tnum">
                          {inv.stripe_invoice_id.substring(0, 16)}...
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#64748d]">Local Ledger Only</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleInspectInvoice(inv)}
                        className="btn-secondary-pill text-xs py-1 px-3"
                      >
                        <Eye className="w-3 h-3 mr-1 text-[#533afd]" />
                        <span>Inspect Line Items</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT INVOICE & LINE ITEMS MODAL */}
      <AnimatePresence>
        {isDetailOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d253d]/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-2xl bg-white border border-[#e3e8ee] rounded-xl shadow-stripi-2 p-6 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#e3e8ee] mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="pill-tag-soft">Itemized Statement</span>
                    <span className="text-xs text-[#64748d] tnum">Period: {selectedInvoice.billing_period}</span>
                  </div>
                  <h2 className="font-display-md text-[#0d253d] mt-1">
                    Invoice #{selectedInvoice.id?.substring(0, 8)}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 rounded-pill text-[#64748d] hover:text-[#0d253d] hover:bg-[#f6f9fc]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto flex-1 pr-1">
                {/* Meta Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee]">
                  <div>
                    <div className="text-[11px] text-[#64748d] uppercase font-semibold">Total Amount</div>
                    <div className="text-lg font-light text-[#0d253d] tnum">
                      ${(selectedInvoice.amount_cents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748d] uppercase font-semibold">Status</div>
                    <div className="text-sm font-medium text-[#0d253d] capitalize mt-0.5">{selectedInvoice.status}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748d] uppercase font-semibold">Paid Timestamp</div>
                    <div className="text-xs text-[#273951] tnum mt-0.5">
                      {selectedInvoice.paid_at ? new Date(selectedInvoice.paid_at).toLocaleDateString() : 'Unpaid'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748d] uppercase font-semibold">Stripe ID</div>
                    <div className="text-xs font-mono text-[#533afd] truncate tnum mt-0.5">
                      {selectedInvoice.stripe_invoice_id || 'None'}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748d] mb-2.5">Billable Line Items</h3>
                  <div className="rounded-lg border border-[#e3e8ee] overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc] text-[#64748d]">
                          <th className="py-2.5 px-4 font-semibold">Description</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Quantity</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Amount ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e3e8ee]">
                        {loadingDetail ? (
                          <tr>
                            <td colSpan="3" className="py-6 text-center text-[#64748d]">Loading line items...</td>
                          </tr>
                        ) : selectedInvoice.line_items && selectedInvoice.line_items.length > 0 ? (
                          selectedInvoice.line_items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-[#f6f9fc]/50">
                              <td className="py-3 px-4 text-[#0d253d] font-medium">{item.description}</td>
                              <td className="py-3 px-4 text-right font-body-tabular text-[#273951] tnum">
                                {Number(item.quantity).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-body-tabular font-medium text-[#0d253d] tnum">
                                ${(item.amount_cents / 100).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="py-6 text-center text-[#64748d]">No billable items for this period.</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[#e3e8ee] bg-[#f6f9fc] font-medium text-xs">
                          <td className="py-3 px-4 text-[#0d253d]">Total Settlement</td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 text-right font-body-tabular text-sm font-semibold text-[#0d253d] tnum">
                            ${(selectedInvoice.amount_cents / 100).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Stripe Hosted Link */}
                {selectedInvoice.hosted_invoice_url && (
                  <div className="p-4 rounded-lg bg-[#533afd]/5 border border-[#533afd]/20 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#0d253d]">Stripe Test-Mode Hosted Invoice</div>
                      <div className="text-[11px] text-[#64748d]">Open customer payment checkout page in Stripe Sandbox</div>
                    </div>
                    <a
                      href={selectedInvoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary-pill text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <span>Open Checkout</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#e3e8ee] flex justify-end">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="btn-secondary-pill text-xs py-1.5 px-4"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d253d]/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-white border border-[#e3e8ee] rounded-xl shadow-stripi-2 p-6"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#e3e8ee]">
                <div>
                  <h2 className="font-heading-lg text-[#0d253d]">Generate Period Invoice</h2>
                  <p className="text-xs text-[#64748d] mt-0.5">Calculates usage tiers and creates idempotent ledger record</p>
                </div>
                <button
                  onClick={() => setIsGenerateOpen(false)}
                  className="p-1 rounded-pill text-[#64748d] hover:text-[#0d253d]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#273951] mb-1">Target Tenant</label>
                  <select
                    value={genTenantId}
                    onChange={(e) => setGenTenantId(e.target.value)}
                    required
                    className="text-input-stripi w-full"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.plan} Plan)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#273951] mb-1">Billing Period (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    pattern="^\d{4}-\d{2}$"
                    placeholder="2026-10"
                    value={genPeriod}
                    onChange={(e) => setGenPeriod(e.target.value)}
                    className="text-input-stripi w-full font-body-tabular tnum"
                  />
                  <p className="text-[11px] text-[#64748d] mt-1">Single calendar month in YYYY-MM format.</p>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsGenerateOpen(false)}
                    className="btn-secondary-pill text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="btn-primary-pill text-xs"
                  >
                    {generating ? 'Calculating...' : 'Run Invoicing'}
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