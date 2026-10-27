import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  Database
} from 'lucide-react';
import BackgroundAnimation from '../components/BackgroundAnimation';

const FramerLanding = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [activeCodeTab, setActiveCodeTab] = useState('curl');

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
      "output_tokens": 1000
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
    outputTokens: 1000
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
    }
)`
  };

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
            <Link to="/dashboard" className="hidden sm:inline-block text-sm text-[#64748d] hover:text-[#0d253d] transition-colors">
              Features
            </Link>
            <Link to="/dashboard/history" className="hidden sm:inline-block text-sm text-[#64748d] hover:text-[#0d253d] transition-colors">
              Billing & Pricing
            </Link>
            <Link to="/dashboard" className="btn-primary-pill text-xs">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-36 pb-20 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white border border-[#e3e8ee] shadow-stripi-1 mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-normal text-[#273951]">Production-Grade Usage Metering Engine</span>
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
      </section>

      {/* METRIC STRIP (4 CLEAN WHITE CARDS) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="card-stripi p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Idempotency</span>
              <ShieldCheck className="w-4 h-4 text-[#533afd]" />
            </div>
            <div className="font-display-md text-[#0d253d] tnum">Exactly 1x</div>
            <p className="text-xs text-[#64748d] mt-1">Replay-safe SHA-256 payload hashing</p>
          </div>

          <div className="card-stripi p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Precision</span>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-display-md text-[#0d253d] tnum">$0.000001</div>
            <p className="text-xs text-[#64748d] mt-1">Sub-cent exact cost tracking</p>
          </div>

          <div className="card-stripi p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Settlement</span>
              <Zap className="w-4 h-4 text-[#9b6829]" />
            </div>
            <div className="font-display-md text-[#0d253d] tnum">Automated</div>
            <p className="text-xs text-[#64748d] mt-1">Stripe invoices with full line items</p>
          </div>

          <div className="card-stripi p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[#64748d]">Latency</span>
              <Cpu className="w-4 h-4 text-[#665efd]" />
            </div>
            <div className="font-display-md text-[#0d253d] tnum">&lt; 3.2 ms</div>
            <p className="text-xs text-[#64748d] mt-1">Concurrency-safe DB row locks</p>
          </div>
        </div>
      </section>

      {/* CODE & ARCHITECTURE SECTION (PURE WHITE CARD ON NEAR-WHITE CANVAS) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="card-stripi p-8 bg-white overflow-hidden shadow-stripi-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="pill-tag-soft">Developer Experience</span>
              <h2 className="font-display-lg text-[#0d253d]">
                Engineered for immediate integration.
              </h2>
              <p className="font-body-md text-[#64748d] leading-relaxed">
                Send single API calls or complex multi-tier token payloads with full metadata categorization. 
                Our engine automatically partitions prompt, cached, output, and reasoning units into auditable financial ledger records.
              </p>
              <div className="pt-2">
                <Link to="/dashboard" className="btn-secondary-pill text-xs">
                  <span>View Full API Reference</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 text-[#533afd]" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] p-4 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[#e3e8ee] mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ea2261]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9b6829]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-[11px] text-[#64748d] ml-2">POST /api/meter</span>
                </div>
                <div className="flex items-center gap-1">
                  {['curl', 'node', 'python'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveCodeTab(tab)}
                      className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                        activeCodeTab === tab
                          ? 'bg-white text-[#533afd] font-semibold border border-[#e3e8ee] shadow-sm'
                          : 'text-[#64748d] hover:text-[#0d253d]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="text-[#0d253d] overflow-x-auto p-2 leading-relaxed">
                <code>{codeSnippets[activeCodeTab]}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CHROMATIC WARM CREAM BAND (Stripi Design Signature) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="card-cream p-10 bg-[#f5e9d4] border border-[#ebdcc0] rounded-xl">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#9b6829]">
              Reconciliation & Replay Protection
            </span>
            <h3 className="font-display-lg text-[#0d253d] mt-2 mb-3">
              Never let dropped webhooks or retried requests distort revenue.
            </h3>
            <p className="font-body-md text-[#273951] leading-relaxed">
              Flyrank reconciles state directly against Stripe subscription schedules while validating HMAC signatures 
              and caching processed event IDs. Every line item is mathematically accounted for before invoicing closes.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#e3e8ee] bg-white py-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748d]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-pill bg-[#533afd] flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-medium text-[#0d253d]">Flyrank Usage Engine</span>
            <span>·</span>
            <span>Inspired by Stripi Design Language</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="hover:text-[#0d253d] transition-colors">Overview</Link>
            <Link to="/dashboard/tenants" className="hover:text-[#0d253d] transition-colors">Tenants</Link>
            <Link to="/dashboard/usage" className="hover:text-[#0d253d] transition-colors">Usage</Link>
            <Link to="/dashboard/history" className="hover:text-[#0d253d] transition-colors">Invoices</Link>
            <Link to="/dashboard/settings" className="hover:text-[#0d253d] transition-colors">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FramerLanding;