import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Zap, 
  BarChart3, 
  Shield, 
  Globe, 
  Clock,
  CheckCircle,
  Sparkles,
  Play,
  ChevronRight,
  Infinity,
  TrendingUp,
  Lock,
  Flame,
  Star
} from 'lucide-react';
import BackgroundAnimation from '../components/BackgroundAnimation';

const FramerLanding = () => {
  const features = [
    {
      icon: Zap,
      title: 'Precision Metering',
      description: 'Millisecond-accurate usage tracking with exactly-once semantics',
      gradient: 'from-[#667eea] to-[#764ba2]'
    },
    {
      icon: BarChart3,
      title: 'Predictive Analytics',
      description: 'AI-powered forecasting with deep learning models',
      gradient: 'from-[#f093fb] to-[#f5576c]'
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security',
      description: 'SOC 2 compliant with zero-trust architecture',
      gradient: 'from-[#4facfe] to-[#00f2fe]'
    },
    {
      icon: Globe,
      title: 'Global Infrastructure',
      description: 'Edge deployment across 150+ data centers',
      gradient: 'from-[#43e97b] to-[#38f9d7]'
    },
    {
      icon: Clock,
      title: 'Real-Time Billing',
      description: 'Automated invoicing with 100+ payment methods',
      gradient: 'from-[#fa709a] to-[#fee140]'
    },
    {
      icon: Lock,
      title: 'Enterprise Compliance',
      description: 'GDPR, HIPAA, SOC 2 Type II certified',
      gradient: 'from-[#f5576c] to-[#f093fb]'
    },
  ];

  const stats = [
    { value: '99.999%', label: 'Uptime', icon: Infinity },
    { value: '50M+', label: 'Events/Hour', icon: TrendingUp },
    { value: '<10ms', label: 'Latency', icon: Zap },
    { value: '0', label: 'Downtime', icon: Flame },
  ];

  const testimonials = [
    {
      quote: "UsageMeter transformed our billing operations. The precision is unmatched in the industry.",
      author: "Sarah Chen",
      role: "CTO, TechCorp",
      rating: 5
    },
    {
      quote: "The real-time analytics and predictive capabilities have saved us millions in infrastructure costs.",
      author: "Michael Rodriguez",
      role: "VP Engineering, ScaleUp Inc",
      rating: 5
    },
    {
      quote: "Best-in-class security with compliance built-in. The ease of integration was remarkable.",
      author: "Emily Watson",
      role: "CISO, SecureBank",
      rating: 5
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] relative overflow-hidden">
      <BackgroundAnimation />
      
      {/* Floating geometric shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
            borderRadius: ['30%', '50%', '30%']
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 right-20 w-64 h-64 border border-[#667eea]/20 rotate-45"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.3, 1],
            borderRadius: ['40%', '60%', '40%']
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-32 left-32 w-48 h-48 border border-[#f093fb]/20 -rotate-12"
        />
        <motion.div
          animate={{
            rotate: 180,
            scale: [1, 1.15, 1],
            borderRadius: ['35%', '55%', '35%']
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/2 left-1/2 w-32 h-32 border border-[#4facfe]/20 rotate-45"
        />
      </div>

      {/* Hero Section - Unique asymmetric layout */}
      <section className="relative min-h-screen flex items-center justify-center px-6 z-10 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left side - typography-focused */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#667eea]/10 border border-[#667eea]/30"
              >
                <Sparkles className="w-4 h-4 text-[#667eea]" />
                <span className="text-sm font-medium text-[#667eea] tracking-widest uppercase">
                  Next-Generation Billing
                </span>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-6xl lg:text-8xl font-display font-bold text-white leading-[1.1] tracking-tight"
              >
                Usage <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb]">
                  Metering
                </span>
                <br />
                <span className="text-neutral-400">Reimagined</span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-neutral-400 leading-relaxed max-w-xl"
              >
                Enterprise-grade usage tracking with exactly-once semantics, real-time analytics, and 
                predictive cost forecasting. Built for scale, designed for precision.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Link
                  to="/dashboard"
                  className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-2xl font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-[#667eea]/30"
                >
                  <span className="relative z-10">Get Started</span>
                  <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-[#764ba2] to-[#f093fb] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </Link>
                <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-semibold transition-all duration-300 border border-white/10">
                  <Play className="w-5 h-5" />
                  <span className="relative z-10">Watch Demo</span>
                  <motion.div
                    className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </button>
              </motion.div>
            </motion.div>
            
            {/* Right side - visual-focused */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative"
            >
              {/* 3D-style floating card */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotateY: [0, 5, 0],
                  rotateX: [0, -5, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "ease-in-out"
                }}
                className="relative w-full aspect-square max-w-md mx-auto"
              >
                {/* Main card */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl shadow-2xl/20 backdrop-blur-xl p-8">
                  {/* Animated graph visualization */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-widest">Live Usage</div>
                        <div className="text-2xl font-bold text-white">2,847 events/min</div>
                      </div>
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-3 h-3 bg-[#4ade80] rounded-full"
                      />
                    </div>
                    
                    {/* Custom graph bars */}
                    <div className="space-y-3">
                      {[65, 85, 45, 90, 75, 95, 55, 80].map((height, i) => (
                        <motion.div
                          key={i}
                          initial={{ width: 0 }}
                          animate={{ width: `${height}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className="h-2 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2]"
                        />
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Cost</div>
                        <div className="text-xl font-bold text-white">$2,847</div>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5">
                        <div className="text-neutral-500 uppercase tracking-widest mb-1">API Calls</div>
                        <div className="text-xl font-bold text-white">1.2M</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <motion.div
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, 10, 0]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "ease-in-out"
                  }}
                  className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-[#f093fb] to-[#f5576c] rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl flex items-center justify-center"
                >
                  <Zap className="w-10 h-10 text-white" />
                </motion.div>
                
                <motion.div
                  animate={{
                    y: [0, 15, 0],
                    rotate: [0, -10, 0]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "ease-in-out"
                  }}
                  className="absolute -bottom-8 -left-8 w-20 h-20 bg-gradient-to-br from-[#4facfe] to-[#00f2fe] rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl flex items-center justify-center"
                >
                  <TrendingUp className="w-8 h-8 text-white" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section - asymmetric layout */}
      <section className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                  />
                  <stat.icon className="w-8 h-8 text-[#667eea] mb-4" />
                  <div className="text-4xl font-display font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-neutral-400 uppercase tracking-widest">{stat.label}</div>
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-br-2xl" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section - unique card design */}
      <section className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#667eea] to-[#f093fb]">Excellence</span>
            </h2>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
              Every component designed with obsessive attention to detail
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group relative"
                >
                  <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
                    {/* Gradient border glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                    
                    {/* Unique card design */}
                    <div className="relative z-10">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                      <p className="text-neutral-400 leading-relaxed">{feature.description}</p>
                      
                      {/* Interactive accent */}
                      <motion.div
                        className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof - unique layout */}
      <section className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#667eea] to-[#f093fb]">Industry Leaders</span>
            </h2>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="relative group"
              >
                <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8">
                  {/* Quote mark */}
                  <motion.div
                    animate={{
                      rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "ease-in-out" }}
                    className="absolute top-4 left-4 text-6xl text-[#667eea]/20 font-serif"
                  >
                    "
                  </motion.div>
                  
                  <div className="relative z-10 pt-8">
                    <p className="text-lg text-white leading-relaxed mb-6 italic">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold">
                        {testimonial.author.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{testimonial.author}</div>
                        <div className="text-sm text-neutral-500">{testimonial.role}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating).keys()].map(() => (
                        <Star key={Math.random()} className="w-4 h-4 text-[#fbbf24] fill-current" />
                      ))}
                    </div>
                  </div>
                  
                  {/* Accent */}
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-tr-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - unique design */}
      <section className="relative py-32 z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#667eea]/20 to-[#764ba2]/20 blur-3xl rounded-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-5xl font-display font-bold text-white mb-6">
                Ready to transform your billing?
              </h2>
              <p className="text-xl text-neutral-400 mb-8">
                Join thousands of companies already using our platform
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-[#667eea]/50 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default FramerLanding;