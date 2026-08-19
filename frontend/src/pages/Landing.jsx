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
  Play
} from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Zap,
      title: 'Real-time Tracking',
      description: 'Monitor usage metrics in real-time with millisecond precision',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Deep insights into consumption patterns with predictive analytics',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption and compliance with SOC 2 standards',
    },
    {
      icon: Globe,
      title: 'Global Scale',
      description: 'Handle millions of events across distributed systems',
    },
    {
      icon: Clock,
      title: 'Instant Billing',
      description: 'Automated invoicing with support for 100+ payment methods',
    },
    {
      icon: Sparkles,
      title: 'Smart Alerts',
      description: 'AI-powered anomaly detection and usage forecasting',
    },
  ];

  const stats = [
    { value: '99.99%', label: 'Uptime' },
    { value: '10M+', label: 'Events Processed' },
    { value: '<50ms', label: 'Latency' },
    { value: '150+', label: 'Countries' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Netflix-Style Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-[#141414]/30 to-[#0a0a0a]" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#e50914]/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#6a00ff]/3 rounded-full blur-[150px]" />
      </div>
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e50914]/10 border border-[#e50914]/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-[#e50914]" />
              <span className="text-sm font-medium text-primary-300">
                Next-Generation Usage Metering
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight"
            >
              <span className="gradient-text">Usage Metering</span>
              <br />
              <span className="text-white">Reimagined</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            >
              Track, analyze, and bill usage with enterprise-grade precision. 
              Real-time metrics, intelligent forecasting, and seamless integration.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#e50914] hover:bg-[#f40612] text-white rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-[#e50914]/30"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all duration-300 border border-white/20">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                className="glass-card-light p-6 text-center"
              >
                <div className="text-3xl lg:text-4xl font-display font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4">
              Everything You Need to
              <span className="gradient-text"> Scale</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful features designed for modern SaaS and infrastructure companies
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-[#e50914]/10 border border-[#e50914]/30 flex items-center gap-3 w-full p-4 rounded-xl group cursor-pointer hover:bg-[#e50914]/20 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#e50914]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7 text-[#e50914]" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-3 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-border p-12 text-center"
          >
            <h2 className="text-4xl font-display font-bold mb-4">
              Ready to Transform Your
              <span className="gradient-text"> Usage Metering</span>?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of companies already using our platform
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#e50914] hover:bg-[#f40612] text-white rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-[#e50914]/30"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
