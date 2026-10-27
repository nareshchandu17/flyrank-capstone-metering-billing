import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  History, 
  Settings,
  ChevronRight,
  ShieldCheck,
  Zap,
  Menu,
  X,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import BackgroundAnimation from './BackgroundAnimation';

const FramerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { path: '/dashboard/tenants', icon: Users, label: 'Tenants' },
    { path: '/dashboard/usage', icon: BarChart3, label: 'Usage & Events' },
    { path: '/dashboard/history', icon: History, label: 'Billing & Invoices' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentRouteLabel = navItems.find(i => isActive(i.path))?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#f6f9fc] text-[#0d253d] relative overflow-x-hidden font-sans">
      {/* Stripi Atmospheric Gradient Mesh Backdrop */}
      <BackgroundAnimation />
      
      {/* Desktop Light Glass Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCollapsed ? 'w-20' : 'w-64'
        } hidden lg:block`}
      >
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-r border-[#e3e8ee] shadow-[0_1px_3px_rgba(0,55,112,0.04)]" />
        
        <div className="relative h-full flex flex-col justify-between p-4">
          <div>
            {/* Logo Wordmark */}
            <div className="flex items-center justify-between pb-6 pt-2 px-2 border-b border-[#e3e8ee]">
              <div 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#533afd] text-white flex items-center justify-center font-semibold text-sm shadow-[0_2px_8px_rgba(83,58,253,0.35)] transition-transform duration-200 group-hover:scale-105">
                  <Zap className="w-4 h-4 fill-white text-white" />
                </div>
                {!isCollapsed && (
                  <div>
                    <div className="font-normal text-[17px] text-[#0d253d] tracking-tight leading-none flex items-center gap-1.5">
                      Usage<span className="font-medium text-[#533afd]">Meter</span>
                    </div>
                    <div className="text-[10px] text-[#64748d] tracking-wider uppercase mt-1 font-medium">
                      Financial Engine
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-full text-[#64748d] hover:text-[#0d253d] hover:bg-[#f6f9fc] transition-colors"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronRight 
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isCollapsed ? 'rotate-0' : 'rotate-180'
                  }`}
                />
              </button>
            </div>

            {/* Navigation Pills */}
            <nav className="mt-6 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[14px] font-normal transition-all duration-150 ${
                      active 
                        ? 'bg-[#533afd] text-white font-medium shadow-[0_1px_3px_rgba(83,58,253,0.3)]' 
                        : 'text-[#273951] hover:text-[#0d253d] hover:bg-[#f6f9fc]'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#64748d]'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Card / System Trust Indicator */}
          {!isCollapsed ? (
            <div className="p-3.5 rounded-xl bg-[#f6f9fc] border border-[#e3e8ee] mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                <span className="text-[12px] font-medium text-[#0d253d]">Stripe Test Mode</span>
              </div>
              <p className="text-[11px] text-[#64748d] leading-relaxed">
                Sub-cent arithmetic & webhook replay guards active.
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" title="System Healthy" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Top Header Floating over Mesh */}
      <header className={`sticky top-0 z-30 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="mx-auto px-6 py-4 flex items-center justify-between bg-white/70 backdrop-blur-xl border-b border-[#e3e8ee]/80 shadow-[0_1px_2px_rgba(0,55,112,0.02)]">
          {/* Breadcrumb & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-full border border-[#e3e8ee] text-[#0d253d] hover:bg-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-sm text-[#64748d]">
              <span>Infrastructure</span>
              <span>/</span>
              <span className="text-[#0d253d] font-medium">{currentRouteLabel}</span>
            </div>
          </div>

          {/* Top Actions & Single Indigo CTA rule */}
          <div className="flex items-center gap-3">
            <span className="pill-tag-soft hidden sm:inline-flex">
              <ShieldCheck className="w-3.5 h-3.5" />
              API Scoped
            </span>

            <button 
              onClick={() => window.location.reload()}
              className="btn-secondary-pill hidden sm:inline-flex"
              title="Refresh engine state"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#533afd]" />
              Sync
            </button>

            <button
              onClick={() => navigate('/dashboard/history')}
              className="btn-primary-pill text-xs sm:text-sm"
            >
              Run Invoicing
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed inset-x-0 top-[65px] bg-white border-b border-[#e3e8ee] p-4 shadow-xl z-50 space-y-1.5"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm ${
                    active ? 'bg-[#533afd] text-white font-medium' : 'text-[#273951] hover:bg-[#f6f9fc]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Outlet Area */}
      <main className={`relative z-10 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Stripi Minimalist Light Footer */}
      <footer className={`relative z-10 py-10 px-8 border-t border-[#e3e8ee] bg-white transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748d]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#0d253d]">UsageMeter Engine</span>
            <span>•</span>
            <span>Micro-Cent Financial Arithmetic ($0.000001)</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="tnum">v1.0.0-production</span>
            <span className="hover:text-[#533afd] cursor-pointer" onClick={() => navigate('/dashboard/settings')}>Documentation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FramerLayout;