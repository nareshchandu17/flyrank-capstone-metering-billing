import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Terminal,
  Activity,
  Code2,
  Cpu,
  Fingerprint,
  Zap,
  BarChart,
  Shield,
  FileText
} from 'lucide-react';

// Word-by-word reveal component for the "Problem" section
const RevealText = ({ text }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 50%"]
  });

  const words = text.split(" ");
  
  return (
    <p ref={ref} className="text-4xl md:text-6xl font-bold tracking-tight text-white flex flex-wrap gap-x-4 gap-y-2 max-w-4xl">
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + (1 / words.length);
        const opacity = useTransform(scrollYProgress, [start, end], [0.1, 1]);
        
        return (
          <motion.span key={i} style={{ opacity }} className="inline-block">
            {word}
          </motion.span>
        );
      })}
    </p>
  );
};

// High-fidelity code snippet visualization
const CodePreview = ({ activeSection }) => (
  <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-2xl transition-all duration-500 w-full">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-[#f5576c]/80" />
        <div className="w-3 h-3 rounded-full bg-[#fbbf24]/80" />
        <div className="w-3 h-3 rounded-full bg-[#4ade80]/80" />
      </div>
      <div className="ml-4 text-xs text-neutral-500 font-mono flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5" />
        {activeSection === 0 ? 'POST /api/usage' 
         : activeSection === 1 ? 'Edge Network Response' 
         : activeSection === 2 ? 'AI Pricing Logic'
         : activeSection === 3 ? 'Stripe Sync.js'
         : 'Fraud Detection'}
      </div>
    </div>
    <div className="p-6 text-sm font-mono leading-relaxed overflow-x-auto min-h-[280px]">
      {activeSection === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          <div className="flex"><span className="text-neutral-600 w-8 select-none">1</span><span className="text-[#f093fb]">await</span><span className="text-white ml-2">meterService.</span><span className="text-[#4facfe]">recordUsage</span><span className="text-white">({'{'}</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">2</span><span className="text-neutral-400 ml-4">tenant_id:</span><span className="text-[#4ade80] ml-2">'req.tenantId'</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">3</span><span className="text-neutral-400 ml-4">usage_type:</span><span className="text-[#4ade80] ml-2">'ai_token'</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">4</span><span className="text-neutral-400 ml-4">idempotency_key:</span><span className="text-[#4ade80] ml-2">'req.headers.x-idemp-key'</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">5</span><span className="text-white">{'}'});</span></div>
          <div className="flex mt-4 opacity-50"><span className="text-neutral-600 w-8 select-none">6</span><span className="text-neutral-500">// Safe to retry 1000x without double charging</span></div>
        </motion.div>
      )}
      {activeSection === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          <div className="flex"><span className="text-neutral-600 w-8 select-none">1</span><span className="text-white">HTTP/2 </span><span className="text-[#4ade80]">402 Payment Required</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">2</span><span className="text-neutral-400">Content-Type:</span><span className="text-white ml-2">application/json</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">3</span><span className="text-neutral-400">X-Latency-Ms:</span><span className="text-[#fbbf24] ml-2">0.8</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">4</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">5</span><span className="text-white">{'{'}</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">6</span><span className="text-neutral-400 ml-4">"error":</span><span className="text-[#f5576c] ml-2">"quota_exceeded"</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">7</span><span className="text-neutral-400 ml-4">"limit":</span><span className="text-[#fbbf24] ml-2">1000000</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">8</span><span className="text-white">{'}'}</span></div>
        </motion.div>
      )}
      {activeSection === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          <div className="flex"><span className="text-neutral-600 w-8 select-none">1</span><span className="text-[#f093fb]">const</span> <span className="text-white ml-2">cost =</span> <span className="text-[#4facfe]">calculateTokens</span><span className="text-white">({'{'}</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">2</span><span className="text-neutral-400 ml-4">model:</span><span className="text-[#4ade80] ml-2">'gpt-4-turbo'</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">3</span><span className="text-neutral-400 ml-4">prompt_tokens:</span><span className="text-[#fbbf24] ml-2">842</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">4</span><span className="text-neutral-400 ml-4">completion_tokens:</span><span className="text-[#fbbf24] ml-2">1024</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">5</span><span className="text-neutral-400 ml-4">cached:</span><span className="text-[#f093fb] ml-2">true</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">6</span><span className="text-white">{'}'});</span></div>
          <div className="flex mt-4 opacity-50"><span className="text-neutral-600 w-8 select-none">7</span><span className="text-neutral-500">// Automatically applies tiered pricing rules</span></div>
        </motion.div>
      )}
      {activeSection === 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          <div className="flex"><span className="text-neutral-600 w-8 select-none">1</span><span className="text-[#f093fb]">await</span> <span className="text-white ml-2">stripe.invoices.</span><span className="text-[#4facfe]">create</span><span className="text-white">({'{'}</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">2</span><span className="text-neutral-400 ml-4">customer:</span><span className="text-[#4ade80] ml-2">tenant.stripeId</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">3</span><span className="text-neutral-400 ml-4">auto_advance:</span><span className="text-[#f093fb] ml-2">true</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">4</span><span className="text-neutral-400 ml-4">collection_method:</span><span className="text-[#4ade80] ml-2">'charge_automatically'</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">5</span><span className="text-white">{'}'});</span></div>
          <div className="flex mt-4 opacity-50"><span className="text-neutral-600 w-8 select-none">6</span><span className="text-neutral-500">// Syncs with Stripe at the end of every month</span></div>
        </motion.div>
      )}
      {activeSection === 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          <div className="flex"><span className="text-neutral-600 w-8 select-none">1</span><span className="text-white">{"{"}</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">2</span><span className="text-neutral-400 ml-4">"alert":</span><span className="text-[#f5576c] ml-2">"anomalous_spike_detected"</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">3</span><span className="text-neutral-400 ml-4">"tenant":</span><span className="text-[#4ade80] ml-2">"tnt_9a8b7c"</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">4</span><span className="text-neutral-400 ml-4">"expected_usage":</span><span className="text-[#fbbf24] ml-2">5000</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">5</span><span className="text-neutral-400 ml-4">"actual_usage":</span><span className="text-[#f5576c] ml-2">850000</span><span className="text-white">,</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">6</span><span className="text-neutral-400 ml-4">"action":</span><span className="text-[#fbbf24] ml-2">"API_KEY_SUSPENDED"</span></div>
          <div className="flex"><span className="text-neutral-600 w-8 select-none">7</span><span className="text-white">{"}"}</span></div>
        </motion.div>
      )}
    </div>
  </div>
);

const FramerLanding = () => {
  const containerRef = useRef(null);
  
  // Hero Scroll Progress
  const { scrollYProgress: heroProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "500px start"]
  });

  // Sticky Section Scroll Progress
  const stickyRef = useRef(null);
  const { scrollYProgress: stickyProgress } = useScroll({
    target: stickyRef,
    offset: ["start center", "end center"]
  });

  // Calculate active section based on scroll progress through the sticky container
  const [activeStickySection, setActiveStickySection] = useState(0);
  
  useEffect(() => {
    return stickyProgress.onChange((latest) => {
      if (latest < 0.2) setActiveStickySection(0);
      else if (latest < 0.4) setActiveStickySection(1);
      else if (latest < 0.6) setActiveStickySection(2);
      else if (latest < 0.8) setActiveStickySection(3);
      else setActiveStickySection(4);
    });
  }, [stickyProgress]);

  // Dashboard Reveal Progress
  const dashRef = useRef(null);
  const { scrollYProgress: dashProgress } = useScroll({
    target: dashRef,
    offset: ["start end", "center center"]
  });

  // Hero transforms
  const opacityHero = useTransform(heroProgress, [0, 1], [1, 0]);
  const scaleHero = useTransform(heroProgress, [0, 1], [1, 0.9]);
  const yHero = useTransform(heroProgress, [0, 1], ["0%", "20%"]);
  
  // Dashboard transforms (removed blur to fix UX)
  const dashScale = useTransform(dashProgress, [0, 1], [0.8, 1]);
  const dashOpacity = useTransform(dashProgress, [0, 1], [0.3, 1]);

  return (
    <div ref={containerRef} className="bg-black min-h-screen text-white selection:bg-[#4facfe]/30 selection:text-white font-sans">
      
      {/* Background Grid - Unified across all sections */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold">F</div>
            <span className="font-semibold text-lg tracking-tight">Flyrank</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Documentation</Link>
            <Link to="/dashboard" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Pricing</Link>
            <Link to="/dashboard" className="text-sm font-medium px-4 py-2 bg-white text-black rounded-md hover:bg-neutral-200 transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      {/* SECTION 1: The Hero */}
      <motion.section 
        style={{ opacity: opacityHero, scale: scaleHero, y: yHero }}
        className="relative z-10 pt-48 pb-32 px-6 min-h-[90vh] flex flex-col items-center justify-center text-center max-w-5xl mx-auto"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] opacity-30 blur-[100px] bg-gradient-to-b from-[#4facfe]/40 to-[#764ba2]/40 rounded-full pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
        >
          <span className="flex h-2 w-2 rounded-full bg-[#4facfe]" />
          <span className="text-xs font-medium text-neutral-300 uppercase tracking-widest">v2.0 Architecture Live</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 mb-8 leading-[0.9]"
        >
          Meter <br /> Everything.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-neutral-400 max-w-2xl font-light mb-12"
        >
          The most powerful metering and billing engine built for modern SaaS. 
          Idempotent APIs, sub-millisecond latency, and intelligent AI-token pricing logic.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link 
            to="/dashboard"
            className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
          >
            Start Building
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border border-white/10 text-white hover:bg-white/5 rounded-lg font-semibold text-sm transition-colors"
          >
            <Code2 className="w-4 h-4" />
            Read Docs
          </Link>
        </motion.div>
      </motion.section>

      {/* SECTION 2: The Problem (Word Reveal) */}
      <section className="relative z-20 py-48 px-6 bg-transparent">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[40vh] text-center">
          <RevealText text="Traditional billing drops events, misses AI token counts, and silently drains your MRR. You are losing revenue to network glitches." />
          <p className="mt-12 text-neutral-500 text-lg max-w-2xl">
            Building a usage-based billing system is incredibly hard. Double charging users leads to churn, while dropping events leads to lost money. You need exactly-once guarantees.
          </p>
        </div>
      </section>

      {/* SECTION 3: The Architecture (Sticky Scroll) */}
      <section ref={stickyRef} className="relative z-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 relative flex items-start">
          
          {/* Left Side: Sticky Visual (Code Block) */}
          <div className="w-1/2 sticky top-0 h-screen hidden lg:flex items-center pr-16">
            <div className="w-full relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#4facfe]/10 to-[#764ba2]/10 blur-[80px] rounded-full" />
              <CodePreview activeSection={activeStickySection} />
            </div>
          </div>

          {/* Right Side: Scrolling Content */}
          <div className="w-full lg:w-1/2 py-[20vh]">
            {/* Feature 1 */}
            <div className={`min-h-[60vh] flex flex-col justify-center transition-opacity duration-500 ${activeStickySection === 0 ? 'opacity-100' : 'opacity-20'}`}>
              <Fingerprint className="w-10 h-10 text-[#4facfe] mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Exactly-once guarantees.
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                Never double-charge a customer. Our core metering endpoints are protected by strict idempotency keys. If a network request drops, your application can safely retry 10,000 times without duplicating usage.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={`min-h-[60vh] flex flex-col justify-center transition-opacity duration-500 ${activeStickySection === 1 ? 'opacity-100' : 'opacity-20'}`}>
              <Zap className="w-10 h-10 text-[#fbbf24] mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Zero latency overhead.
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                Meter at the edge. We respond to your metering requests in sub-millisecond times, instantly returning HTTP 402/429 statuses if a tenant has breached their quota or unpaid limits.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={`min-h-[60vh] flex flex-col justify-center transition-opacity duration-500 ${activeStickySection === 2 ? 'opacity-100' : 'opacity-20'}`}>
              <Cpu className="w-10 h-10 text-[#f093fb] mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Native AI Pricing.
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                Built specifically for LLM wrappers and AI products. Send us input, output, and cached tokens, and our billing engine automatically calculates complex tiered pricing based on the model used.
              </p>
            </div>

            {/* Feature 4 */}
            <div className={`min-h-[60vh] flex flex-col justify-center transition-opacity duration-500 ${activeStickySection === 3 ? 'opacity-100' : 'opacity-20'}`}>
              <FileText className="w-10 h-10 text-[#667eea] mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Automated Invoicing.
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                Stop manually generating PDF invoices. Our engine automatically reconciles a month of massive API usage into clean line items and pushes them directly to Stripe for payment collection.
              </p>
            </div>

            {/* Feature 5 */}
            <div className={`min-h-[60vh] flex flex-col justify-center transition-opacity duration-500 ${activeStickySection === 4 ? 'opacity-100' : 'opacity-20'}`}>
              <Shield className="w-10 h-10 text-[#f5576c] mb-6" />
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Fraud Prevention.
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                Detect anomalous usage spikes and automatically suspend compromised API keys before you rack up huge cloud bills. Intelligent rate limiting keeps your infrastructure safe.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 4: The Scale / Dashboard Reveal */}
      <section ref={dashRef} className="relative z-20 py-48 px-6 bg-transparent overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Visualize your growth.
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-20">
            A beautiful, data-dense dashboard for your finance team to track MRR, active tenants, and realtime API usage across your entire infrastructure.
          </p>
          
          <motion.div 
            style={{ 
              scale: dashScale, 
              opacity: dashOpacity
            }}
            className="relative mx-auto max-w-5xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-[#4facfe]/10"
          >
            {/* Mock Header of the dashboard to look like our app */}
            <div className="bg-[#111] border-b border-white/5 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            
            <img 
              src="/dashboard-mockup.png" 
              alt="Dashboard Preview" 
              className="w-full h-auto block"
            />
          </motion.div>
        </div>
      </section>

      {/* SECTION 5: Footer CTA */}
      <section className="relative z-20 border-t border-white/10 bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#4facfe]/10 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-40 text-center relative z-10">
          <h2 className="text-4xl md:text-7xl font-bold tracking-tight text-white mb-8">
            Deploy your billing <br/>infrastructure today.
          </h2>
          <Link 
            to="/dashboard"
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-black rounded-lg font-semibold text-base transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
          >
            Enter Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default FramerLanding;