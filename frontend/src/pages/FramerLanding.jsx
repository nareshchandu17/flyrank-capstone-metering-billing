import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Terminal,
  Activity,
  Code2,
  Cpu,
  Fingerprint
} from 'lucide-react';

// A high-fidelity code snippet visualization
const CodePreview = () => (
  <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-2xl">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-[#f5576c]/80" />
        <div className="w-3 h-3 rounded-full bg-[#fbbf24]/80" />
        <div className="w-3 h-3 rounded-full bg-[#4ade80]/80" />
      </div>
      <div className="ml-4 text-xs text-neutral-500 font-mono flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5" />
        POST /api/usage
      </div>
    </div>
    <div className="p-6 text-sm font-mono leading-relaxed overflow-x-auto">
      <div className="flex">
        <span className="text-neutral-600 w-8 select-none">1</span>
        <span className="text-[#f093fb]">await</span>
        <span className="text-white ml-2">meterService.</span>
        <span className="text-[#4facfe]">recordUsage</span>
        <span className="text-white">({'{'}</span>
      </div>
      <div className="flex">
        <span className="text-neutral-600 w-8 select-none">2</span>
        <span className="text-neutral-400 ml-4">tenant_id:</span>
        <span className="text-[#4ade80] ml-2">'req.tenantId'</span>
        <span className="text-white">,</span>
      </div>
      <div className="flex">
        <span className="text-neutral-600 w-8 select-none">3</span>
        <span className="text-neutral-400 ml-4">usage_type:</span>
        <span className="text-[#4ade80] ml-2">'ai_token'</span>
        <span className="text-white">,</span>
      </div>
      <div className="flex">
        <span className="text-neutral-600 w-8 select-none">4</span>
        <span className="text-neutral-400 ml-4">quantity:</span>
        <span className="text-[#fbbf24] ml-2">4096</span>
        <span className="text-white">,</span>
      </div>
      <div className="flex">
        <span className="text-neutral-600 w-8 select-none">5</span>
        <span className="text-neutral-400 ml-4">idempotency_key:</span>
        <span className="text-[#4ade80] ml-2">'req.headers.x-idemp-key'</span>
      </div>
      <div className="flex">
        <span className="text-neutral-600 w-8 select-none">6</span>
        <span className="text-white">{'}'});</span>
      </div>
      <div className="flex mt-4 opacity-50">
        <span className="text-neutral-600 w-8 select-none">7</span>
        <span className="text-neutral-500">// Returns: 202 Accepted</span>
      </div>
    </div>
  </div>
);

const FramerLanding = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scaleHero = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  
  const yCode = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const rotateCode = useTransform(scrollYProgress, [0, 1], [0, 5]);

  return (
    <div ref={containerRef} className="bg-black min-h-[200vh] text-white selection:bg-[#4facfe]/30 selection:text-white">
      
      {/* Background Grid & Glows */}
      <motion.div style={{ y: yBg }} className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 blur-[120px] bg-gradient-to-b from-[#4facfe]/40 to-transparent rounded-full" />
      </motion.div>

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

      {/* Hero Section */}
      <motion.section 
        style={{ opacity: opacityHero, scale: scaleHero }}
        className="relative z-10 pt-48 pb-32 px-6 flex flex-col items-center justify-center text-center max-w-5xl mx-auto"
      >
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
          className="flex items-center gap-4"
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

      {/* Interactive Architecture Preview */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 pb-48">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Text */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-12"
          >
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Exactly-once <br/>
                <span className="text-neutral-500">guarantees.</span>
              </h2>
              <p className="text-neutral-400 text-lg font-light max-w-md">
                Never double-charge a customer. Our core metering endpoints are protected by strict idempotency keys and database-level constraints.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <Fingerprint className="w-6 h-6 text-[#4facfe] mb-3" />
                <h3 className="font-semibold text-white mb-1">Idempotency</h3>
                <p className="text-sm text-neutral-500">Network glitches? No problem. Retries are silently absorbed.</p>
              </div>
              <div>
                <Activity className="w-6 h-6 text-[#4facfe] mb-3" />
                <h3 className="font-semibold text-white mb-1">Real-time Limits</h3>
                <p className="text-sm text-neutral-500">Instant 402/429 responses when tenants hit quota boundaries.</p>
              </div>
              <div>
                <Cpu className="w-6 h-6 text-[#4facfe] mb-3" />
                <h3 className="font-semibold text-white mb-1">AI Token Math</h3>
                <p className="text-sm text-neutral-500">Built-in support for input, output, and cached token pricing rules.</p>
              </div>
            </div>
          </motion.div>

          {/* Right Code Block (Parallax) */}
          <motion.div 
            style={{ y: yCode, rotate: rotateCode }}
            className="relative lg:h-[600px] flex items-center justify-center lg:justify-end origin-bottom-right"
          >
            {/* Glow behind code block */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#4facfe]/20 to-transparent blur-[80px] rounded-full" />
            
            <div className="w-full max-w-lg relative z-10">
              <CodePreview />
            </div>
          </motion.div>
          
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-20 border-t border-white/10 bg-[#050505]">
        <div className="max-w-5xl mx-auto px-6 py-32 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-8"
          >
            Deploy your billing <br/>infrastructure today.
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <Link 
              to="/dashboard"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-black rounded-lg font-semibold text-base transition-transform hover:scale-105 active:scale-95"
            >
              Enter Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default FramerLanding;