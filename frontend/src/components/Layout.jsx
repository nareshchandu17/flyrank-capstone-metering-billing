import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  History, 
  Settings,
  Zap,
  LogOut,
  ChevronRight
} from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dashboard/tenants', icon: Users, label: 'Tenants' },
    { path: '/dashboard/usage', icon: BarChart3, label: 'Usage' },
    { path: '/dashboard/history', icon: History, label: 'History' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      {/* Premium ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" />
        
        {/* Subtle mesh gradient */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-40" />
        
        {/* Refined ambient glow */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary-500/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-accent-500/2 rounded-full blur-[180px]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 noise-texture" />
      </div>

      {/* Sophisticated Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 lg:w-72 bg-neutral-900/80 backdrop-blur-premium border-r border-white/8 z-50 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-white/5">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex items-center gap-3"
          >
            <div className="relative group">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-sm"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Zap className="w-5 h-5 text-white" />
              </motion.div>
              <motion.div 
                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success-400 rounded-full border-2 border-neutral-900"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Usage<span className="text-primary-400">Meter</span>
              </h1>
              <p className="text-xs text-neutral-500 font-medium">Billing Engine</p>
            </div>
          </motion.div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative group w-full text-left"
              >
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-colors" />
                  <span className="hidden lg:block font-medium text-sm">{item.label}</span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full shadow-glow-sm"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  {!isActive && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary-500/50 rounded-r-full"
                      whileHover={{ height: '1.5rem' }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-white/5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-300 group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-semibold shadow-glow-sm">
                A
              </div>
              <motion.div 
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-400 rounded-full border-2 border-neutral-900"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="hidden lg:block text-left flex-1">
              <div className="text-sm font-medium text-white">Admin User</div>
              <div className="text-xs text-neutral-500">admin@usagemeter.com</div>
            </div>
            <motion.div
              className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity"
              whileHover={{ x: 2 }}
            >
              <LogOut className="w-4 h-4 text-neutral-400" />
            </motion.div>
          </motion.button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="ml-20 lg:ml-72 min-h-screen relative z-10">
        <div className="p-8 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;
