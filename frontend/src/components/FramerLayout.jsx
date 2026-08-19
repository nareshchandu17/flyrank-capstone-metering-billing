import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  History, 
  Settings,
  Zap,
  ChevronRight,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import BackgroundAnimation from './BackgroundAnimation';

const FramerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', gradient: 'from-[#667eea] to-[#764ba2]' },
    { path: '/dashboard/tenants', icon: Users, label: 'Tenants', gradient: 'from-[#f093fb] to-[#f5576c]' },
    { path: '/dashboard/usage', icon: BarChart3, label: 'Usage', gradient: 'from-[#4facfe] to-[#00f2fe]' },
    { path: '/dashboard/history', icon: History, label: 'History', gradient: 'from-[#43e97b] to-[#38f9d7]' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings', gradient: 'from-[#fa709a] to-[#fee140]' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-[#000000] relative overflow-hidden">
      <BackgroundAnimation />
      
      {/* Animated sidebar */}
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
        className={`fixed left-0 top-0 h-full z-50 ${
          isCollapsed ? 'w-20' : 'w-72'
        } transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`}
      >
        {/* Glass sidebar background */}
        <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-3xl border-r border-white/5" />
        
        {/* Sidebar content */}
        <div className="relative h-full flex flex-col">
          {/* Logo - asymmetric design */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-8 border-b border-white/5"
          >
            <div className="flex items-center gap-4">
              <motion.div 
                className="relative group cursor-pointer"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-2xl shadow-[#667eea]/30 group-hover:shadow-[#667eea]/50 transition-shadow">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <motion.div 
                  className="absolute -top-1 -right-1 w-4 h-4 bg-[#4ade80] rounded-full border-2 border-[#0a0a0a] animate-pulse"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                />
              </motion.div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1"
                  >
                    <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                      Usage<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#667eea] to-[#764ba2]">Meter</span>
                    </h1>
                    <p className="text-xs text-neutral-400 tracking-widest uppercase mt-1">Premium Edition</p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-auto p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ChevronRight 
                  className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${
                    isCollapsed ? 'rotate-0' : 'rotate-180'
                  }`}
                />
              </motion.button>
            </div>
          </motion.div>

          {/* Navigation - asymmetric layout */}
          <div className="flex-1 py-8 px-4 space-y-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative group w-full text-left overflow-hidden`}
                >
                  {/* Background glow effect */}
                  {active && (
                    <motion.div
                      layoutId="navGlow"
                      className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-20 blur-xl`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.2 }}
                    />
                  )}
                  
                  {/* Button content */}
                  <div className={`relative flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${
                    active 
                      ? 'text-white' 
                      : 'text-neutral-400 hover:text-white'
                  }`}>
                    <div className={`relative p-2 rounded-xl transition-all duration-300 ${
                      active 
                        ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] shadow-lg shadow-[#667eea]/30' 
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex-1"
                        >
                          <span className="font-medium text-sm tracking-wide">{item.label}</span>
                          {active && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#667eea] to-[#764ba2] rounded-full"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Hover glow effect */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300`}
                    initial={false}
                    whileHover={{ opacity: 0.1 }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Bottom section - asymmetric layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 border-t border-white/5"
          >
            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all duration-300 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    A
                  </div>
                  <motion.div 
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#4ade80] rounded-full border-2 border-[#0a0a0a]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex-1"
                    >
                      <div className="text-sm font-semibold text-white">Admin User</div>
                      <div className="text-xs text-neutral-500">admin@usagemeter.com</div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                  className="hidden lg:block p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </motion.div>
              </motion.div>
              
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#667eea] to-[#764ba2] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"
                initial={false}
                whileHover={{ opacity: 0.2 }}
              />
            </div>
          </motion.div>
        </div>
      </motion.aside>

      {/* Mobile menu button */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:hidden fixed top-6 right-6 z-50 p-3 rounded-2xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
      </motion.button>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-3xl z-40 flex items-center justify-center"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-72 max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <motion.button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                        active 
                          ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' 
                          : 'bg-[#1a1a1a] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative z-10 transition-all duration-500 ${
          isCollapsed ? 'ml-20' : 'ml-72'
        }`}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
};

export default FramerLayout;