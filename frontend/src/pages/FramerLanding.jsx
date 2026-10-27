import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import { 
  ArrowRight, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Coins, 
  CheckCircle2, 
  Activity, 
  Layers, 
  Code2, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Database,
  Lock,
  RefreshCw,
  Sliders,
  Sparkles,
  Server,
  CreditCard,
  Receipt,
  Clock,
  Copy,
  Check
} from 'lucide-react';
import BackgroundAnimation from '../components/BackgroundAnimation';

const FramerLanding = () => {
  const containerRef = useRef(null);

  // Smooth momentum scroll via Lenis
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    let animationFrameId;
    function raf(time) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  // Parallax Scroll Tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const heroMockupY = useTransform(smoothProgress, [0, 0.3], [0, -60]);
  const heroMockupRotate = useTransform(smoothProgress, [0, 0.3], [0, -1.2]);

  // Code Tab state
  const [activeCodeTab, setActiveCodeTab] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  // Interactive Live Event Simulator in Showcase
  const [simEvents, setSimEvents] = useState([
    { id: 1, tenant: 'Acme AI Labs', type: 'ai_tokens', tokens: 4500, cost: '$0.0027', time: 'Just now' },
    { id: 2, tenant: 'Starlight Tech', type: 'api_call', tokens: 1, cost: '$0.0100', time: '2s ago' },
    { id: 3, tenant: 'Nexus Cloud', type: 'ai_tokens', tokens: 12000, cost: '$0.0072', time: '5s ago' }
  ]);
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);

  const handleTriggerSimEvent = () => {
    if (isSimulatingEvent) return;
    const tokenCount = 4500;
    const exactCost = `$${((tokenCount * 0.60) / 1000000).toFixed(4)}`;
    const newEvent = {
      id: Date.now(),
      tenant: 'HyperScale Corp',
      type: 'ai_tokens',
      tokens: tokenCount,
      cost: exactCost,
      time: 'Just now'
    };
    setSimEvents(prev => [newEvent, ...prev.slice(0, 3)]);
    setTimeout(() => setIsSimulatingEvent(false), 600);
  };

  // Interactive Revenue & Token Calculator
  const [calcApiCalls, setCalcApiCalls] = useState(250000);
  const [calcPromptTokens, setCalcPromptTokens] = useState(15000000);
  const [calcReasoningTokens, setCalcReasoningTokens] = useState(4000000);

  const calculatedApiCost = (calcApiCalls * 0.01);
  const calculatedPromptCost = (calcPromptTokens / 1000000) * 0.30;
  const calculatedReasoningCost = (calcReasoningTokens / 1000000) * 0.60;
  const totalSimulatedRevenue = calculatedApiCost + calculatedPromptCost + calculatedReasoningCost;

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const codeSnippets = {
    curl: `curl -X POST https://api.flyrank.io/v1/meter \\
  -H "Authorization: Bearer key_live_98a72b" \\
  -H "Idempotency-Key: 7f3b89a1-002" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenant_id": "cust_829104",
    "usage_type": "ai_tokens",
    "quantity": 4500,
    "metadata": {
      "input_tokens": 3000,
      "cached_tokens": 500,
      "output_tokens": 1000,
      "reasoning_tokens": 500
    }
  }'`,
    node: `import { Flyrank } from '@flyrank/metering';

const client = new Flyrank({ apiKey: process.env.FLYRANK_API_KEY });

await client.meter.record({
  tenantId: 'cust_829104',
  usageType: 'ai_tokens',
  quantity: 4500,
  idempotencyKey: '7f3b89a1-002',
  metadata: {
    inputTokens: 3000,
    cachedTokens: 500,
    outputTokens: 1000,
    reasoningTokens: 500
  }
});`,
    python: `from flyrank import MeteringEngine

client = MeteringEngine(api_key="key_live_98a72b")

client.meter.record(
    tenant_id="cust_829104",
    usage_type="ai_tokens",
    quantity=4500,
    idempotency_key="7f3b89a1-002",
    metadata={
        "input_tokens": 3000,
        "cached_tokens": 500,
        "output_tokens": 1000,
        "reasoning_tokens": 500,
    }
)`
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(codeSnippets[activeCodeTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const faqs = [
    {
      q: "How does Flyrank guarantee exactly-once event metering?",
      a: "Every request accepts an Idempotency-Key header coupled with a SHA-256 hash of the payload body. If network turbulence causes your client to retry the request 5 times, our engine atomically returns the cached response with identical cost calculation without recording duplicate usage."
    },
    {
      q: "How are sub-cent AI token costs billed without rounding to zero?",
      a: "Unlike traditional billing tools that prematurely round micro-transactions to the nearest cent, Flyrank tracks financial usage with decimal precision down to $0.000001. We accumulate the exact aggregate across billing cycles before rolling up to your Stripe invoice."
    },
    {
      q: "Can I test the full workflow in Stripe test mode without real money?",
      a: "Yes. The entire platform natively connects to Stripe Sandbox in test mode. You can provision customers, record usage, generate period invoices, and inspect real Stripe-hosted checkout receipts directly in test mode."
    },
    {
      q: "What happens when a tenant breaches their monthly quota cap?",
      a: "Depending on your settings, tenants on hard-capped free plans receive an instant HTTP 429 quota exceeded response, preventing unauthorized resource consumption. Pro plan accounts seamlessly transition to documented overage rates with deduplicated warning alerts dispatched at 80%."
    },
    {
      q: "How does subscription reconciliation prevent missed webhook data?",
      a: "Our engine executes idempotent webhook processing using database uniqueness constraints. Additionally, an automated reconciliation job regularly cross-checks active Stripe subscription statuses against local database states to heal any transient network drops."
    }
  ];

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#f6f9fc] text-[#0d253d] selection:bg-[#533afd]/15 selection:text-[#533afd] overflow-x-hidden font-sans">
      {/* Signature Stripi Atmospheric Mesh Backdrop */}
      <BackgroundAnimation />

      {/* Top Floating Glass Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e3e8ee]/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-pill bg-[#533afd] flex items-center justify-center text-white shadow-stripi-1">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading-sm font-light text-[#0d253d] tracking-tight">Flyrank</span>
              <span className="pill-tag-soft">Financial Infrastructure</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#showcase" className="hidden sm:inline-block text-sm text-[#64748d] hover:text-[#0d253d] transition-colors">
              Platform
            </a>
            <a href="#features" className="hidden sm:inline-block text-sm text-[#64748d] hover:text-[#0d253d] transition-colors">
              Features
            </a>
            <a href="#calculator" className="hidden sm:inline-block text-sm text-[#64748d] hover:text-[#0d253d] transition-colors">
              Calculator
            </a>
            <a href="#pricing" className="hidden sm:inline-block text-sm text-[#64748d] hover:text-[#0d253d] transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hidden sm:inline-block text-sm text-[#64748d] hover:text-[#0d253d] transition-colors">
              FAQ
            </a>
            <Link to="/dashboard" className="btn-primary-pill text-xs">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* SECTION 1: HERO */}
      {/* ========================================================================= */}
      <section className="relative z-10 pt-36 pb-20 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white border border-[#e3e8ee] shadow-stripi-1 mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-normal text-[#273951]">v2.4 Financial Infrastructure Live · Stripe Verified</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display-xxl text-[#0d253d] max-w-4xl mx-auto leading-tight"
        >
          Infrastructure for <br />
          <span className="text-[#533afd]">usage-based</span> billing.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="font-body-lg text-[#64748d] max-w-2xl mx-auto mt-6"
        >
          Sub-millisecond event ingestion, concurrency-safe quota enforcement, 
          and itemized AI token calculation paired directly with Stripe billing cycles.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
        >
          <Link to="/dashboard" className="btn-primary-pill text-base py-3 px-8 shadow-stripi-2">
            <span>Explore Dashboard</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link to="/dashboard/usage" className="btn-secondary-pill text-base py-3 px-8">
            <Activity className="w-4 h-4 mr-2 text-[#533afd]" />
            <span>Live Usage Ledger</span>
          </Link>
        </motion.div>

        {/* Micro-Signals Strip */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-[#64748d]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Exactly-Once Guarantee
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Stripe Subscription Sync
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Automated Invoicing
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sub-Cent Cost Precision
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: COMPOSITED PRODUCT SHOWCASE (Framer/Dribbble Signature) */}
      {/* ========================================================================= */}
      <section id="showcase" className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <motion.div 
          style={{ y: heroMockupY, rotate: heroMockupRotate }}
          className="card-stripi p-4 sm:p-6 bg-white overflow-hidden shadow-stripi-2 border border-[#e3e8ee]"
        >
          {/* Top Window Chrome */}
          <div className="flex items-center justify-between pb-4 border-b border-[#e3e8ee] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ea2261]" />
              <span className="w-3 h-3 rounded-full bg-[#9b6829]" />
              <span className="w-3 h-3 rounded-full bg-[#10b981]" />
              <span className="text-xs text-[#64748d] font-mono ml-2">flyrank-engine.internal · v2.4.0</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#533afd] font-mono bg-[#533afd]/10 px-2.5 py-0.5 rounded-pill">
                POST /api/meter
              </span>
              <button
                onClick={handleTriggerSimEvent}
                disabled={isSimulatingEvent}
                className="btn-primary-pill text-xs py-1 px-3 shadow-none"
              >
                <Zap className={`w-3 h-3 mr-1 ${isSimulatingEvent ? 'animate-spin' : ''}`} />
                <span>{isSimulatingEvent ? 'Ingesting...' : 'Simulate Event'}</span>
              </button>
            </div>
          </div>

          {/* Multi-Panel Product Composite Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Code IDE Panel */}
            <div className="lg:col-span-6 rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] p-4 flex flex-col justify-between font-mono text-xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#e3e8ee] mb-3">
                  <div className="flex items-center gap-1.5">
                    {['curl', 'node', 'python'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveCodeTab(tab)}
                        className={`px-3 py-1 rounded-pill text-xs capitalize transition-all ${
                          activeCodeTab === tab
                            ? 'bg-white text-[#533afd] font-semibold border border-[#e3e8ee] shadow-sm'
                            : 'text-[#64748d] hover:text-[#0d253d]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded text-[#64748d] hover:text-[#0d253d] transition-colors"
                    title="Copy code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <pre className="text-[#0d253d] overflow-x-auto p-1 leading-relaxed text-[11px] select-all">
                  <code>{codeSnippets[activeCodeTab]}</code>
                </pre>
              </div>

              <div className="pt-3 border-t border-[#e3e8ee] mt-3 flex items-center justify-between text-[11px] text-[#64748d]">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#533afd]" /> HMAC Signed
                </span>
                <span className="tnum">Response: 201 Created (1.8ms)</span>
              </div>
            </div>

            {/* Right: Live Metering Telemetry Ledger & Quota Gauge */}
            <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
              {/* Live Event Stream */}
              <div className="rounded-xl border border-[#e3e8ee] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e3e8ee]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748d] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#533afd]" />
                    Live Metering Feed
                  </span>
                  <span className="pill-tag-soft text-[10px]">Real-Time Tail</span>
                </div>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {simEvents.map((ev) => (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="p-2.5 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ev.type === 'ai_tokens' ? 'bg-[#533afd]' : 'bg-emerald-500'}`} />
                          <span className="font-medium text-[#0d253d]">{ev.tenant}</span>
                          <span className="text-[10px] text-[#64748d] font-mono">{ev.type}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono tnum">
                          <span className="text-[#64748d]">{ev.tokens.toLocaleString()} units</span>
                          <span className="text-emerald-700 font-bold">{ev.cost}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Concurrency Safe Quota Gauge */}
              <div className="rounded-xl border border-[#e3e8ee] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#0d253d]">Active Period Consumption</span>
                  <span className="text-xs font-mono font-bold text-[#533afd] tnum">78.4% of quota</span>
                </div>
                <div className="w-full bg-[#e3e8ee] h-2 rounded-pill overflow-hidden">
                  <div className="bg-[#533afd] h-full rounded-pill transition-all" style={{ width: '78.4%' }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-[#64748d] font-mono tnum">
                  <span>1,960,000 / 2,500,000 units</span>
                  <span>Soft alert threshold: 80%</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: CORE ARCHITECTURAL PILLARS (Bento Grid) */}
      {/* ========================================================================= */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="pill-tag-soft mb-2">Engineered Guarantees</span>
          <h2 className="font-display-xl text-[#0d253d] mt-2">
            Everything your financial stack needs to scale safely.
          </h2>
          <p className="font-body-md text-[#64748d] mt-3">
            Designed to replace brittle bespoke metering scripts with atomic database constraints and verifiable settlement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Exactly-Once Idempotency */}
          <div className="card-stripi p-8 bg-white hover:shadow-stripi-2 transition-all">
            <div className="w-10 h-10 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#533afd] mb-5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-heading-sm text-[#0d253d] mb-2">Exactly-Once Idempotency</h3>
            <p className="font-body-md text-[#64748d] leading-relaxed">
              Every request payload is digested into an atomic SHA-256 hash. If network hiccups trigger rapid automated retries, duplicate usage is rejected instantly.
            </p>
            <div className="mt-4 pt-4 border-t border-[#e3e8ee] text-xs font-mono text-[#533afd] tnum">
              HTTP 200 Cached · Zero Duplicates
            </div>
          </div>

          {/* Card 2: Categorized AI Token Rates */}
          <div className="card-stripi p-8 bg-white hover:shadow-stripi-2 transition-all">
            <div className="w-10 h-10 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#665efd] mb-5">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-heading-sm text-[#0d253d] mb-2">Categorized AI Token Logic</h3>
            <p className="font-body-md text-[#64748d] leading-relaxed">
              Automatically aggregates prompt tokens, cached input tokens, output completions, and reasoning tokens with individual price schedules down to micro-cents.
            </p>
            <div className="mt-4 pt-4 border-t border-[#e3e8ee] text-xs font-mono text-emerald-700 tnum">
              Sub-Cent Financial Precision
            </div>
          </div>

          {/* Card 3: Concurrency-Safe Quota Locks */}
          <div className="card-stripi p-8 bg-white hover:shadow-stripi-2 transition-all">
            <div className="w-10 h-10 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#ea2261] mb-5">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-heading-sm text-[#0d253d] mb-2">Concurrency-Safe Quotas</h3>
            <p className="font-body-md text-[#64748d] leading-relaxed">
              Protected by PostgreSQL row-level locks. Simultaneous incoming requests cannot sneak through quotas or bypass tiered threshold limits.
            </p>
            <div className="mt-4 pt-4 border-t border-[#e3e8ee] text-xs font-mono text-[#ea2261] tnum">
              HTTP 429 Hard Capping
            </div>
          </div>

          {/* Card 4: Automated Period Invoicing */}
          <div className="card-stripi p-8 bg-white hover:shadow-stripi-2 transition-all">
            <div className="w-10 h-10 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#9b6829] mb-5">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="font-heading-sm text-[#0d253d] mb-2">Automated Billing Cycles</h3>
            <p className="font-body-md text-[#64748d] leading-relaxed">
              Generates monthly period invoices with comprehensive itemized line items. Uniqueness constraints guarantee that no customer ever receives two invoices for the same cycle.
            </p>
            <div className="mt-4 pt-4 border-t border-[#e3e8ee] text-xs font-mono text-[#9b6829] tnum">
              Unique Period Constraint
            </div>
          </div>

          {/* Card 5: Stripe Webhook Replay Guard */}
          <div className="card-stripi p-8 bg-white hover:shadow-stripi-2 transition-all">
            <div className="w-10 h-10 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-[#533afd] mb-5">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-heading-sm text-[#0d253d] mb-2">Stripe Replay Protection</h3>
            <p className="font-body-md text-[#64748d] leading-relaxed">
              HMAC signature verification with raw body buffering. Processed webhook event IDs are tracked to eliminate duplicate subscription lifecycle transitions.
            </p>
            <div className="mt-4 pt-4 border-t border-[#e3e8ee] text-xs font-mono text-[#533afd] tnum">
              HMAC SHA-256 Validated
            </div>
          </div>

          {/* Card 6: Deduplicated Warning Alerts */}
          <div className="card-stripi p-8 bg-white hover:shadow-stripi-2 transition-all">
            <div className="w-10 h-10 rounded-pill bg-[#f6f9fc] border border-[#e3e8ee] flex items-center justify-center text-emerald-600 mb-5">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-heading-sm text-[#0d253d] mb-2">Deduplicated Usage Alerts</h3>
            <p className="font-body-md text-[#64748d] leading-relaxed">
              Alerts trigger when usage hits 80% and 100% of limits, deduplicated per tenant, billing period, and metric type to eliminate webhook spam.
            </p>
            <div className="mt-4 pt-4 border-t border-[#e3e8ee] text-xs font-mono text-emerald-700 tnum">
              Clean Signal / Zero Spam
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: INTERACTIVE REVENUE & TOKEN CALCULATOR (Framer Level) */}
      {/* ========================================================================= */}
      <section id="calculator" className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="card-stripi p-8 sm:p-12 bg-white shadow-stripi-2 border border-[#e3e8ee]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="pill-tag-soft mb-2">Interactive Simulation</span>
            <h2 className="font-display-lg text-[#0d253d] mt-2">
              Estimate your monthly metered volume.
            </h2>
            <p className="font-body-md text-[#64748d] mt-2">
              Move the sliders to model expected API calls, prompt tokens, and reasoning workloads.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Sliders Side */}
            <div className="lg:col-span-7 space-y-6">
              {/* Slider 1: API Calls */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#273951]">Monthly Standard API Calls</label>
                  <span className="font-body-tabular text-sm font-semibold text-[#533afd] tnum">
                    {calcApiCalls.toLocaleString()} requests
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={calcApiCalls}
                  onChange={(e) => setCalcApiCalls(parseInt(e.target.value, 10))}
                  className="w-full accent-[#533afd] bg-[#e3e8ee] h-2 rounded-pill cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#64748d] mt-1 font-mono tnum">
                  <span>10,000</span>
                  <span>$0.01 / request</span>
                  <span>1,000,000</span>
                </div>
              </div>

              {/* Slider 2: Prompt Tokens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#273951]">Monthly Input & Output Tokens</label>
                  <span className="font-body-tabular text-sm font-semibold text-[#533afd] tnum">
                    {(calcPromptTokens / 1000000).toFixed(1)}M tokens
                  </span>
                </div>
                <input
                  type="range"
                  min="1000000"
                  max="50000000"
                  step="1000000"
                  value={calcPromptTokens}
                  onChange={(e) => setCalcPromptTokens(parseInt(e.target.value, 10))}
                  className="w-full accent-[#533afd] bg-[#e3e8ee] h-2 rounded-pill cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#64748d] mt-1 font-mono tnum">
                  <span>1M</span>
                  <span>$0.30 / 1M input</span>
                  <span>50M</span>
                </div>
              </div>

              {/* Slider 3: Reasoning Tokens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#273951]">Monthly Complex Reasoning Tokens</label>
                  <span className="font-body-tabular text-sm font-semibold text-[#ea2261] tnum">
                    {(calcReasoningTokens / 1000000).toFixed(1)}M tokens
                  </span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="20000000"
                  step="500000"
                  value={calcReasoningTokens}
                  onChange={(e) => setCalcReasoningTokens(parseInt(e.target.value, 10))}
                  className="w-full accent-[#ea2261] bg-[#e3e8ee] h-2 rounded-pill cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#64748d] mt-1 font-mono tnum">
                  <span>0.5M</span>
                  <span>$0.60 / 1M reasoning</span>
                  <span>20M</span>
                </div>
              </div>
            </div>

            {/* Results Side (Clean White Elevation Panel) */}
            <div className="lg:col-span-5 rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] p-6 space-y-4">
              <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Estimated Revenue Ledger</span>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#e3e8ee]">
                  <span className="text-[#64748d]">Standard API Requests</span>
                  <span className="font-mono text-[#0d253d] tnum font-semibold">${calculatedApiCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#e3e8ee]">
                  <span className="text-[#64748d]">Input & Output Tokens</span>
                  <span className="font-mono text-[#0d253d] tnum font-semibold">${calculatedPromptCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#e3e8ee]">
                  <span className="text-[#64748d]">Reasoning Tokens</span>
                  <span className="font-mono text-[#ea2261] tnum font-semibold">${calculatedReasoningCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e3e8ee]">
                <div className="text-[11px] text-[#64748d] uppercase font-semibold">Total Evaluated Monthly Revenue</div>
                <div className="font-display-lg text-[#0d253d] tnum text-3xl font-light mt-1">
                  ${totalSimulatedRevenue.toFixed(2)}
                </div>
                <p className="text-[11px] text-[#64748d] mt-1">
                  Automated rolling aggregation synchronized with Stripe invoices.
                </p>
              </div>

              <Link to="/dashboard/usage" className="btn-primary-pill w-full mt-4 text-xs py-2">
                <span>Test With Real Metering Feed</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: CHROMATIC WARM CREAM BAND (Stripi Design Signature) */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="card-cream p-10 bg-[#f5e9d4] border border-[#ebdcc0] rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#9b6829]">
                Zero Revenue Leakage Protocol
              </span>
              <h3 className="font-display-lg text-[#0d253d] mt-2 mb-3">
                Never let dropped webhooks or retried requests distort revenue.
              </h3>
              <p className="font-body-md text-[#273951] leading-relaxed">
                Flyrank reconciles state directly against Stripe subscription schedules while validating HMAC signatures 
                and caching processed event IDs. Every line item is mathematically accounted for before invoicing closes.
              </p>
            </div>
            <div className="md:col-span-4 text-right">
              <Link to="/dashboard/history" className="btn-primary-pill text-xs py-2 px-5 bg-[#0d253d] hover:bg-[#1c1e54]">
                <span>Inspect Invoicing Logic</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: TRANSPARENT PRICING TIERS */}
      {/* ========================================================================= */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="pill-tag-soft mb-2">Predictable Pricing</span>
          <h2 className="font-display-xl text-[#0d253d] mt-2">
            Simple tiers configured for developer clarity.
          </h2>
          <p className="font-body-md text-[#64748d] mt-3">
            Connected to real Stripe recurring price IDs. Switch between plans in test mode anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Tier 1: Free Tier */}
          <div className="card-stripi p-8 bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748d]">Developer Sandbox</span>
              <h3 className="font-heading-lg text-[#0d253d] mt-1">Free Tier</h3>
              <div className="my-6">
                <span className="font-display-md text-4xl font-light text-[#0d253d] tnum">$0</span>
                <span className="text-xs text-[#64748d]"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-[#273951]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>10,000 monthly API calls</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100,000 monthly AI tokens</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hard quota rejection (HTTP 429)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Local ledger recording</span>
                </li>
              </ul>
            </div>
            <Link to="/dashboard" className="btn-secondary-pill w-full mt-8 text-xs py-2">
              Start Free
            </Link>
          </div>

          {/* Tier 2: Pro Tier (Featured Stripi Dark Accent Card) */}
          <div className="rounded-xl border border-[#273951] bg-[#1c1e54] text-white p-8 flex flex-col justify-between shadow-stripi-2 relative overflow-hidden">
            <div className="absolute top-4 right-4 pill-tag-soft bg-white/10 text-white border-white/20 text-[10px]">
              Most Popular
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9b9f9]">Production Scale</span>
              <h3 className="font-heading-lg text-white mt-1">Pro Tier</h3>
              <div className="my-6">
                <span className="font-display-md text-4xl font-light text-white tnum">$29</span>
                <span className="text-xs text-[#b9b9f9]"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-[#e3e8ee]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#b9b9f9] shrink-0" />
                  <span>100,000 included API calls</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#b9b9f9] shrink-0" />
                  <span>1,000,000 included AI tokens</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#b9b9f9] shrink-0" />
                  <span>Elastic overage billing without caps</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#b9b9f9] shrink-0" />
                  <span>Live Stripe Test-Mode Checkout</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#b9b9f9] shrink-0" />
                  <span>Automated 80% quota threshold alerts</span>
                </li>
              </ul>
            </div>
            <Link to="/dashboard" className="btn-primary-pill w-full mt-8 text-xs py-2 bg-[#533afd] text-white hover:bg-[#4434d4]">
              Subscribe on Stripe
            </Link>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="card-stripi p-8 bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748d]">Custom Architecture</span>
              <h3 className="font-heading-lg text-[#0d253d] mt-1">Enterprise</h3>
              <div className="my-6">
                <span className="font-display-md text-4xl font-light text-[#0d253d] tnum">$199</span>
                <span className="text-xs text-[#64748d]"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-[#273951]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited multi-tenant accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sub-millisecond dedicated database locks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Custom AI token weight configurations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dedicated HMAC key rotation policies</span>
                </li>
              </ul>
            </div>
            <Link to="/dashboard/settings" className="btn-secondary-pill w-full mt-8 text-xs py-2">
              Configure Settings
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: INTERACTIVE FAQ ACCORDION (AOS Smooth Expansion) */}
      {/* ========================================================================= */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="pill-tag-soft mb-2">Technical Questions</span>
          <h2 className="font-display-lg text-[#0d253d] mt-2">
            Frequently Asked Questions
          </h2>
          <p className="font-body-md text-[#64748d] mt-2">
            Details on idempotency guarantees, token calculations, and webhook sync.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="card-stripi bg-white overflow-hidden border border-[#e3e8ee] transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-medium text-[#0d253d] hover:text-[#533afd] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#64748d] transition-transform duration-200 shrink-0 ml-4 ${openFaq === idx ? 'rotate-180 text-[#533afd]' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-xs text-[#64748d] leading-relaxed border-t border-[#f6f9fc] pt-3">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 8: TOP TIER GRADIENT BACKGROUND CTA (Framer Level) */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="relative rounded-2xl overflow-hidden p-10 sm:p-16 border border-[#533afd]/30 shadow-stripi-2 bg-gradient-to-br from-[#533afd] via-[#4434d4] to-[#1c1e54] text-white text-center">
          {/* Subtle Ambient Mesh Blobs inside CTA */}
          <div className="absolute top-0 right-0 w-[450px] h-[350px] bg-radial from-[#f96bee]/30 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-radial from-[#f5e9d4]/20 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-white/10 border border-white/20 text-xs font-medium text-[#b9b9f9]">
              <Sparkles className="w-3.5 h-3.5 text-[#f96bee]" /> Ready for Real Production Traffic
            </span>

            <h2 className="font-display-xl text-white font-light text-4xl sm:text-5xl leading-tight">
              Start metering usage and billing accurately today.
            </h2>

            <p className="font-body-lg text-[#e3e8ee] max-w-xl mx-auto font-light leading-relaxed">
              Eliminate revenue leakage, automate Stripe period billing, and give your customers transparent financial clarity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link to="/dashboard" className="btn-primary-pill text-base py-3 px-8 bg-white text-[#533afd] hover:bg-[#f6f9fc] shadow-lg">
                <span>Open Dashboard Now</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link to="/dashboard/tenants" className="btn-secondary-pill text-base py-3 px-8 bg-transparent text-white border-white/30 hover:bg-white/10">
                <span>Manage Tenants</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 9: RICH MULTI-COLUMN FOOTER (footer-light matching design.md) */}
      {/* ========================================================================= */}
      <footer className="relative z-10 border-t border-[#e3e8ee] bg-white pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-[#e3e8ee]">
            {/* Column 1: Brand Info */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-pill bg-[#533afd] flex items-center justify-center text-white">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
                <span className="font-heading-sm font-light text-[#0d253d]">Flyrank Engine</span>
              </div>
              <p className="text-xs text-[#64748d] max-w-sm leading-relaxed">
                A high-throughput usage metering and billing infrastructure platform built on deep navy ink, electric indigo, and exact sub-cent token precision.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-[#273951]">All Engine Services Operational</span>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0d253d] mb-3">Platform</h4>
              <ul className="space-y-2 text-xs text-[#64748d]">
                <li><Link to="/dashboard" className="hover:text-[#533afd] transition-colors">Overview Dashboard</Link></li>
                <li><Link to="/dashboard/tenants" className="hover:text-[#533afd] transition-colors">Tenant Scoping</Link></li>
                <li><Link to="/dashboard/usage" className="hover:text-[#533afd] transition-colors">Usage Ledger</Link></li>
                <li><Link to="/dashboard/history" className="hover:text-[#533afd] transition-colors">Invoices & Settlement</Link></li>
                <li><Link to="/dashboard/settings" className="hover:text-[#533afd] transition-colors">Engine Settings</Link></li>
              </ul>
            </div>

            {/* Column 3: Architecture */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0d253d] mb-3">Architecture</h4>
              <ul className="space-y-2 text-xs text-[#64748d]">
                <li><span className="hover:text-[#533afd] cursor-pointer">Idempotency Hashes</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">Postgres Row Locks</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">AI Token Partitioning</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">HMAC Signature Guard</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">Reconciliation Cron</span></li>
              </ul>
            </div>

            {/* Column 4: Compliance & Standards */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0d253d] mb-3">Compliance</h4>
              <ul className="space-y-2 text-xs text-[#64748d]">
                <li><span className="hover:text-[#533afd] cursor-pointer">Stripe Verified Partner</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">SOC-2 Type II Scoped</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">Zero Raw Card Data</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">Tabular Currency Type</span></li>
                <li><span className="hover:text-[#533afd] cursor-pointer">Open Source License</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom Legal Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748d]">
            <div>
              © 2026 Flyrank Technologies, Inc. All rights reserved. Built according to Stripi design language specifications.
            </div>
            <div className="flex items-center gap-6 font-mono text-[11px]">
              <span className="tnum">v2.4.0-stable</span>
              <span>·</span>
              <span>PostgreSQL 18</span>
              <span>·</span>
              <span>Stripe 2024-11</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FramerLanding;