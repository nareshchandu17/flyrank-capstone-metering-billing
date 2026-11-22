import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getMetrics, getRealTimeUsage, getTenants, getUsageHistory } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import {
  DollarSign,
  Users,
  Activity,
  Zap,
  RefreshCw,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Terminal,
  Plus,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FramerDashboard = () => {
  const navigate = useNavigate();
  const { activeTenant, permissions, isSyncing } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [realTimeUsage, setRealTimeUsage] = useState([]);
  const [topTenants, setTopTenants] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [metricsRes, usageRes, tenantsRes, historyRes] = await Promise.allSettled([
        getMetrics(),
        getRealTimeUsage(),
        getTenants(),
        getUsageHistory({ limit: 6 })
      ]);

      const metricsData = metricsRes.status === 'fulfilled' ? metricsRes.value : null;
      const usageData = usageRes.status === 'fulfilled' ? usageRes.value : [];
      const tenantsData = tenantsRes.status === 'fulfilled' ? tenantsRes.value : [];
      const historyData = historyRes.status === 'fulfilled' ? historyRes.value : [];

      setMetrics(metricsData);
      setRealTimeUsage(Array.isArray(usageData) ? usageData : []);

      const sortedTenants = [...(Array.isArray(tenantsData) ? tenantsData : [])]
        .sort((a, b) => (parseFloat(b.cost) || 0) - (parseFloat(a.cost) || 0))
        .slice(0, 5);
      setTopTenants(sortedTenants);

      setRecentActivity(
        (Array.isArray(historyData) ? historyData : []).slice(0, 5).map(item => ({
          id: item.id,
          tenant: item.tenant,
          metric: item.metric,
          value: item.value,
          unit: item.unit,
          time: item.time ? `${item.date} ${item.time}` : item.date,
          cost: item.cost_formatted || `$${item.cost || '0.00'}`,
          type: item.metric === 'API Calls' ? 'api' : 'ai'
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError('auth');
      } else {
        setError('connection');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData, activeTenant?.tenant_id]);

  /* ── Skeleton loader while loading or Auth0 context syncing ── */
  if (loading || isSyncing) {
    const SkeletonBar = ({ w = 'w-full', h = 'h-4' }) => (
      <div className={`${w} ${h} rounded-lg bg-[#e3e8ee] animate-pulse`} />
    );
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBar w="w-48" h="h-5" />
            <SkeletonBar w="w-72" h="h-3" />
          </div>
          <SkeletonBar w="w-28" h="h-9" />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#e3e8ee] rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <SkeletonBar w="w-24" h="h-3" />
                <div className="w-8 h-8 rounded-lg bg-[#e3e8ee] animate-pulse" />
              </div>
              <SkeletonBar w="w-32" h="h-7" />
              <SkeletonBar w="w-40" h="h-3" />
            </div>
          ))}
        </div>

        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#e3e8ee] rounded-2xl p-6 space-y-4 shadow-sm">
            <SkeletonBar w="w-40" h="h-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <SkeletonBar w="w-24" h="h-3" />
                <div className="flex-1"><SkeletonBar h="h-2" /></div>
                <SkeletonBar w="w-12" h="h-3" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#e3e8ee] rounded-2xl p-6 space-y-4 shadow-sm">
            <SkeletonBar w="w-32" h="h-4" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#e3e8ee] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <SkeletonBar h="h-3" />
                  <SkeletonBar w="w-2/3" h="h-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const defaultMetrics = {
    monthlyRevenue: '0.00',
    totalRevenue: '0.00',
    monthlyGrowth: 0,
    activeTenants: 0,
    totalTenants: 0,
    totalEvents: 0,
    avgUsage: 0,
    totalApiCalls: 0,
    totalAiTokens: 0,
    billingStatus: { paid: 0, pending: 0, failed: 0 }
  };
  const activeMetrics = metrics || defaultMetrics;
  const isGrowthPositive = (activeMetrics.monthlyGrowth || 0) >= 0;

  const statCards = [
    {
      title: 'Monthly Billed Revenue',
      value: `$${activeMetrics.monthlyRevenue || '0.00'}`,
      aux: `Total Lifetime: $${activeMetrics.totalRevenue || '0.00'}`,
      badge: `${isGrowthPositive ? '+' : ''}${activeMetrics.monthlyGrowth || 0}%`,
      badgePositive: isGrowthPositive,
      icon: DollarSign,
    },
    {
      title: 'Active Provisioned Tenants',
      value: activeMetrics.activeTenants || 0,
      aux: `Registered: ${activeMetrics.totalTenants || 0} scoped accounts`,
      badge: 'Active Scoped',
      badgePositive: true,
      icon: Users,
    },
    {
      title: 'Total Billable Events',
      value: (activeMetrics.totalEvents || 0).toLocaleString(),
      aux: `Avg: ${activeMetrics.avgUsage || 0} / tenant`,
      badge: `${(activeMetrics.totalApiCalls || 0).toLocaleString()} calls`,
      badgePositive: true,
      icon: Activity,
    },
    {
      title: 'AI Tokens Accumulated',
      value: (activeMetrics.totalAiTokens || 0).toLocaleString(),
      aux: 'Sub-cent micro-unit arithmetic ($0.000001)',
      badge: 'Exact Rate',
      badgePositive: true,
      icon: Zap,
    },
  ];

  const isUnassigned = !activeTenant && !permissions.isPlatformAdmin;

  return (
    <div className="space-y-8">
      {/* Onboarding Callout when logged in user has no active tenant */}
      {isUnassigned && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-[#D4FF28]/15 via-white to-white border border-[#D4FF28]/50 rounded-2xl shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4FF28] text-[#0d253d] flex items-center justify-center shrink-0 shadow-sm font-semibold">
              <Sparkles className="w-5 h-5 text-[#3F6212]" />
            </div>
            <div>
              <div className="font-semibold text-sm text-[#0d253d] flex items-center gap-2">
                <span>Welcome to FlyRank Metering Engine</span>
                <span className="text-[10px] bg-[#D4FF28]/40 text-[#3F6212] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  Initial Setup
                </span>
              </div>
              <p className="text-xs text-[#64748d] mt-0.5 leading-relaxed">
                You do not have an active organization tenant assigned yet. Provision your first tenant to unlock scoped API keys, real-time token metering, and Stripe subscriptions.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/tenants')}
            className="btn-primary-pill text-xs py-2 px-4 shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Provision Tenant
          </button>
        </div>
      )}

      {/* Non-blocking Notice Banner if connection offline */}
      {error === 'connection' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-950 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-amber-800">
                Backend Telemetry Offline
              </div>
              <div className="text-xs text-amber-900 mt-0.5">
                Unable to reach backend service at port 3001. Ensure database (port 5434) and API server are running.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchData(true)}
              className="btn-secondary-pill text-xs py-1.5 px-3 bg-white"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
      {/* Editorial Headline Tier */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill-tag-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16] animate-pulse" />
              Real-time Ingestion Engine
            </span>
          </div>
          <h1 className="font-display-xl text-[#0d253d] tracking-display-xl">
            Financial & Metering Overview
          </h1>
          <p className="text-[#64748d] text-[15px] font-normal mt-1 max-w-2xl leading-relaxed">
            Consolidated telemetry on usage events, sub-cent pricing accumulation, and Stripe test-mode subscriptions.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn-secondary-pill"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4D7C0F] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/tenants')}
            className="btn-primary-pill"
          >
            <span>+ Provision Tenant</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards on Near-White Surfaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-stripi p-6 bg-white relative overflow-hidden group hover:border-[#a8c3de]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-[#64748d] uppercase tracking-wider">
                {stat.title}
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full tnum ${stat.badgePositive
                ? 'bg-[#10b981]/10 text-[#059669]'
                : 'bg-[#ea2261]/10 text-[#ea2261]'
                }`}>
                {stat.badgePositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.badge}
              </span>
            </div>

            {/* Tabular Figure Display Number */}
            <div className="font-display-lg text-[#0d253d] tracking-display-lg tnum mb-1">
              {stat.value}
            </div>

            <div className="text-[12px] text-[#64748d] tnum leading-tight">
              {stat.aux}
            </div>

            {/* Discreet bottom accent hairline on hover */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4FF28] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </motion.div>
        ))}
      </div>

      {/* Billing Status Bar */}
      {
        metrics?.billingStatus && (
          <div className="card-stripi p-6 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#D4FF28]/25 text-[#3F6212] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-normal text-[#0d253d] tracking-tight">
                    Billing Period Lifecycle & Settlement
                  </h3>
                  <p className="text-xs text-[#64748d]">Monthly cycle reconciliation with Stripe test mode</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/dashboard/history')}
                className="text-xs font-normal text-[#3F6212] hover:text-[#1A2E05] flex items-center gap-1 transition-colors self-start sm:self-auto font-medium"
              >
                View All Invoices <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee]">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                <div>
                  <div className="text-sm font-normal text-[#0d253d] tnum">
                    <span className="font-medium">{metrics.billingStatus.paid}</span> Paid & Settled
                  </div>
                  <div className="text-[11px] text-[#64748d]">Synchronized via Stripe webhooks</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee]">
                <Clock className="w-4 h-4 text-[#9b6829] shrink-0" />
                <div>
                  <div className="text-sm font-normal text-[#0d253d] tnum">
                    <span className="font-medium">{metrics.billingStatus.pending}</span> Open / Pending
                  </div>
                  <div className="text-[11px] text-[#64748d]">Generated with unique period lock</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee]">
                <AlertTriangle className="w-4 h-4 text-[#ea2261] shrink-0" />
                <div>
                  <div className="text-sm font-normal text-[#0d253d] tnum">
                    <span className="font-medium">{metrics.billingStatus.failed}</span> Payment Failed
                  </div>
                  <div className="text-[11px] text-[#64748d]">Requires automatic retry or update</div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Middle Section: 24h Usage Trend Chart & Composited Dark Console Log */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Real-time Usage Trend Chart */}
        <div className="lg:col-span-7 card-stripi p-6 sm:p-8 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading-md text-[#0d253d]">Hourly Consumption Trend</h2>
              <p className="text-xs text-[#64748d] mt-0.5">Aggregated hourly units across all registered tenants (24h)</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/usage')}
              className="btn-secondary-pill text-xs py-1.5 px-3"
            >
              Usage Explorer
            </button>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4">
            <div className="flex items-end gap-3 sm:gap-4 h-48 pb-2">
              {realTimeUsage.length > 0 ? (
                realTimeUsage.map((item, idx) => {
                  const maxVal = Math.max(...realTimeUsage.map(r => r.value), 10);
                  const heightPercent = Math.max(10, Math.min(100, Math.round((item.value / maxVal) * 100)));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#0d253d] text-white text-[11px] py-1 px-2 rounded font-mono shadow-lg whitespace-nowrap pointer-events-none z-10 tnum">
                        {item.value.toLocaleString()} units
                      </div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.04 }}
                        className="w-full bg-[#D4FF28] hover:bg-[#BEF218] rounded-t-sm transition-colors cursor-pointer border-t border-[#C4EF1E]"
                        style={{
                          background: idx === realTimeUsage.length - 1
                            ? 'linear-gradient(180deg, #D4FF28 0%, #A3E635 100%)'
                            : '#D4FF28'
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#64748d] text-sm">
                  No telemetry recorded in past 24 hours.
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-[#e3e8ee] pt-3 text-[11px] text-[#64748d] font-mono tnum">
              {realTimeUsage.map((item, idx) => (
                <span key={idx}>{item.time}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Live Stream Panel on Pure White Surface */}
        <div className="lg:col-span-5 card-stripi p-6 bg-white text-[#0d253d] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#e3e8ee] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ea2261]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#9b6829]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-xs text-[#3F6212] font-mono ml-2 font-medium">stream.metered_events</span>
              </div>
              <span className="text-[10px] text-[#64748d] font-mono uppercase tracking-wider">Live Tail</span>
            </div>

            <div className="space-y-2.5 overflow-hidden">
              {recentActivity.length > 0 ? (
                recentActivity.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] text-xs font-mono">
                    <div className="flex items-center justify-between text-[#0d253d] mb-1">
                      <span className="font-semibold truncate max-w-[150px]">{act.tenant}</span>
                      <span className="text-emerald-700 font-bold tnum">{act.cost}</span>
                    </div>
                    <div className="text-[11px] text-[#64748d] flex items-center justify-between">
                      <span className="tnum">{act.value.toLocaleString()} {act.unit}</span>
                      <span className="text-[10px] text-[#61718a] tnum">{act.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center mx-auto text-slate-400">
                      <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
                    </div>
                    <div className="text-xs font-mono text-[#0d253d] font-medium">Stream Idle</div>
                    <div className="text-[11px] text-[#64748d] font-mono">Listening on /api/usage for incoming telemetry...</div>
                  </div>
                        )}
                </div>
                    </div>

            <div className="pt-4 border-t border-[#e3e8ee] mt-4 flex items-center justify-between text-xs text-[#64748d]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#4D7C0F]" />
                HMAC SHA-256 Validated
              </span>
              <button
                onClick={() => navigate('/dashboard/usage')}
                className="text-[#3F6212] hover:text-[#1A2E05] font-medium transition-colors flex items-center gap-1"
              >
                Inspect Feed <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Warm Cream Interlude Card (Stripi Chromatic Interlude) */}
        <div className="card-cream p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9b6829]">Financial Guarantee</span>
            </div>
            <h3 className="font-heading-md text-[#0d253d] mb-1">
              Zero Sub-Cent Financial Rounding Loss
            </h3>
            <p className="text-sm text-[#273951] max-w-2xl leading-relaxed">
              Requests consuming micro-token payloads ($0.000045) are never rounded down to zero. The accumulator preserves sub-cent fractional values across billing cycles for exact invoicing.
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard/settings')}
            className="btn-on-dark-pill shrink-0 self-start md:self-auto"
          >
            View Pricing Rules
          </button>
        </div>

        {/* Top Tenants Table on White Surface */}
        <div className="card-stripi p-6 sm:p-8 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e3e8ee]">
            <div>
              <h2 className="font-heading-md text-[#0d253d]">Active Account Consumption</h2>
              <p className="text-xs text-[#64748d] mt-0.5">MTD consumption and billable totals ranked by tenant</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/tenants')}
              className="btn-secondary-pill text-xs py-1.5 px-3 self-start sm:self-auto"
            >
              Manage Accounts
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e3e8ee] text-xs uppercase tracking-wider text-[#64748d]">
                  <th className="pb-3 font-normal">Account Name</th>
                  <th className="pb-3 font-normal">Billing Email</th>
                  <th className="pb-3 font-normal">Tier</th>
                  <th className="pb-3 font-normal text-right">Metered Units</th>
                  <th className="pb-3 font-normal text-right">MTD Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e8ee]">
                {topTenants.length > 0 ? (
                  topTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-[#f6f9fc] transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-normal text-[#0d253d]">{tenant.name}</div>
                        <div className="text-[11px] text-[#64748d] font-mono tnum">{tenant.id.substring(0, 8)}...</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#273951]">{tenant.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="pill-tag-soft">
                          {tenant.plan || 'Free'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tnum text-[#0d253d]">
                        {(tenant.usage || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 pl-4 text-right font-medium text-[#0d253d] tnum">
                        ${tenant.cost ? parseFloat(tenant.cost).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                      <td colSpan="5" className="py-12 text-center">
                        <div className="max-w-xs mx-auto text-center">
                          <div className="w-10 h-10 rounded-xl bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center mx-auto mb-2.5 text-slate-400">
                            <Users className="w-5 h-5 text-[#4D7C0F]" />
                          </div>
                          <div className="text-xs font-semibold text-[#0d253d] mb-1">No Tenants Registered</div>
                          <p className="text-[11px] text-[#64748d] mb-3">
                            Accounts provisioned with meter quotas will appear here ranked by consumption.
                          </p>
                          <button
                            onClick={() => navigate('/dashboard/tenants')}
                            className="btn-primary-pill text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3 h-3" />
                            Provision Tenant
                          </button>
                        </div>
                      </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      );
          };

      export default FramerDashboard;