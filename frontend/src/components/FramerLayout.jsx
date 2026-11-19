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
  LogOut,
  Building2,
  Check,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BackgroundAnimation from './BackgroundAnimation';

const FramerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, memberships, activeTenant, currentRole, switchTenant, logout, permissions } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);

  // Dynamic navigation items based on database permissions
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Overview', visible: true },
    { path: '/dashboard/tenants', icon: Users, label: 'Tenants & Members', visible: permissions.canManageTenants || permissions.canManageMembers },
    { path: '/dashboard/usage', icon: BarChart3, label: 'Usage & Events', visible: permissions.canViewUsage },
    { path: '/dashboard/history', icon: History, label: 'Billing & Invoices', visible: permissions.canViewInvoices },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings', visible: true },
  ].filter(item => item.visible);

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentRouteLabel = navItems.find((i) => isActive(i.path))?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#f6f9fc] text-[#0d253d] relative overflow-x-hidden font-sans">
      <BackgroundAnimation />

      {/* Desktop Light Glass Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'w-20' : 'w-64'
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
                <div className="w-8 h-8 rounded-lg bg-[#D4FF28] text-[#0d253d] flex items-center justify-center font-semibold text-sm shadow-[0_2px_8px_rgba(212,255,40,0.4)] transition-transform duration-200 group-hover:scale-105">
                  <Zap className="w-4 h-4 fill-[#0d253d] text-[#0d253d]" />
                </div>
                {!isCollapsed && (
                  <div>
                    <div className="font-normal text-[17px] text-[#0d253d] tracking-tight leading-none flex items-center gap-1.5">
                      Usage<span className="font-medium text-[#4D7C0F]">Meter</span>
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
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'
                    }`}
                />
              </button>
            </div>

                        {/* Tenant Selector Dropdown */}
                        {!isCollapsed && (
                          <div className="mt-4 px-1 relative">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-2 flex items-center justify-between">
                              <span>Active Tenant Context</span>
                              {memberships.length > 0 && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono">
                                  {memberships.length}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-[#f6f9fc] hover:bg-slate-100/80 border border-[#e3e8ee] rounded-xl text-left text-xs transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-7 h-7 rounded-lg bg-[#D4FF28]/25 text-[#3F6212] flex items-center justify-center shrink-0 border border-[#C4EF1E]/40 font-semibold text-xs">
                                  {activeTenant?.tenant_name?.charAt(0)?.toUpperCase() || (permissions.isPlatformAdmin ? 'P' : '?')}
                                </div>
                                <div className="truncate">
                                  <div className="font-medium text-[#0d253d] truncate text-[13px]">
                                    {activeTenant?.tenant_name || (permissions.isPlatformAdmin ? 'Platform Overview' : 'Select a Tenant')}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                    {currentRole || (permissions.isPlatformAdmin ? 'Superadmin' : (memberships.length > 0 ? 'Click to switch' : 'No Tenant Assigned'))}
                                  </div>
                                </div>
                              </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isTenantDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Tenant List Popup */}
                            {isTenantDropdownOpen && (
                              <div className="absolute top-full left-1 right-1 mt-1.5 bg-white border border-[#e3e8ee] rounded-xl shadow-xl z-50 py-1.5 max-h-64 overflow-y-auto animate-in fade-in duration-150">
                                {memberships.length === 0 && !permissions.isPlatformAdmin ? (
                                  <div className="p-4 text-center">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs font-medium text-[#0d253d]">No Tenant Memberships</div>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                      You are not yet a member of any organization tenant.
                                    </p>
                                    <button
                                      onClick={() => {
                                        setIsTenantDropdownOpen(false);
                                        navigate('/dashboard/tenants');
                                      }}
                                      className="mt-3 w-full py-1.5 px-3 bg-[#D4FF28] text-[#0d253d] text-xs font-semibold rounded-lg hover:bg-[#c7f21b] transition-all shadow-sm"
                                    >
                                      Go to Tenants
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                                      Available Tenancies ({memberships.length})
                                    </div>
                                    {memberships.map((m) => {
                                      const isSelected = activeTenant?.tenant_id === m.tenant_id;
                                      return (
                                        <button
                                          key={m.tenant_id}
                                          onClick={() => {
                                            switchTenant(m.tenant_id);
                                            setIsTenantDropdownOpen(false);
                                          }}
                                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${isSelected
                                            ? 'bg-[#D4FF28]/20 font-semibold text-[#0d253d]'
                                            : 'text-slate-700 hover:bg-[#f6f9fc]'
                                            }`}
                                        >
                                          <div className="truncate flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                              {m.tenant_name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="truncate">
                                              <div className="truncate">{m.tenant_name}</div>
                                              <div className="text-[10px] text-slate-400">{m.role}</div>
                                            </div>
                                          </div>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-[#4D7C0F] shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                        )}
                      </div>
                    )}

                  {/* Navigation Pills */}
                  <nav className="mt-5 space-y-1.5">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);

                      return (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[14px] font-normal transition-all duration-150 ${active
                            ? 'bg-[#D4FF28] text-[#0d253d] font-semibold shadow-[0_2px_8px_-2px_rgba(212,255,40,0.5)] border border-[#C4EF1E]'
                            : 'text-[#273951] hover:text-[#0d253d] hover:bg-[#f6f9fc]'
                            } ${isCollapsed ? 'justify-center px-0' : ''}`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <Icon className={`w - 4 h - 4 shrink - 0 ${active ? 'text-[#0d253d]' : 'text-[#64748d]'}`} />
                          {!isCollapsed && <span>{item.label}</span>}
                        </button>
                      );
                    })}
                  </nav>
              </div>

          {/* User Profile & Logout Bottom Section */}
            <div className="border-t border-[#e3e8ee] pt-4 mt-auto">
              {!isCollapsed ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#f6f9fc] border border-[#e3e8ee]">
                  <div className="flex items-center gap-2.5 truncate">
                    {user?.picture ? (
                      <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#D4FF28] text-[#0d253d] font-bold text-xs flex items-center justify-center shrink-0">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#0d253d] truncate">{user?.name || user?.email}</div>
                      <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Log out of Auth0 session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
      </aside>

      {/* Main Top Header Floating over Mesh */}
      <header className={`sticky top - 0 z - 30 transition - all duration - 300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
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

          {/* Top Actions & CTA */}
          <div className="flex items-center gap-3">
              <span className="pill-tag-soft hidden sm:inline-flex items-center gap-1.5 py-1 px-3 bg-[#f6f9fc] border border-[#e3e8ee] rounded-full text-xs font-medium text-[#0d253d]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4D7C0F]" />
                <span>
                  {permissions.isPlatformAdmin
                    ? 'Platform Admin'
                    : currentRole
                      ? `Role: ${currentRole}`
                      : 'Unassigned Account'}
                </span>
              </span>

              {permissions.canManageBilling && (
                <button
                  onClick={() => navigate('/dashboard/history')}
                  className="btn-primary-pill text-xs sm:text-sm"
                >
                  Billing Center
                </button>
              )}
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
            className="lg:hidden fixed inset-x-0 top-[65px] bg-white border-b border-[#e3e8ee] p-4 shadow-xl z-50 space-y-2"
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
                  className={`w - full flex items - center gap - 3 px - 4 py - 3 rounded - xl text - sm transition - all duration - 150 ${active
                      ? 'bg-[#D4FF28] text-[#0d253d] font-semibold border border-[#C4EF1E]'
                      : 'text-[#273951] hover:bg-[#f6f9fc]'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 truncate">{user?.email}</span>
              <button
                onClick={logout}
                className="text-xs text-red-600 font-medium flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Outlet Area */}
      <main className={`relative z - 10 transition - all duration - 300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Minimalist Light Footer */}
      <footer className={`relative z - 10 py - 10 px - 8 border - t border - [#e3e8ee] bg - white transition - all duration - 300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748d]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#0d253d]">UsageMeter Engine</span>
            <span>•</span>
            <span>Auth0 &amp; PostgreSQL RBAC Verified</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="tnum">v2.0.0-auth0-rbac</span>
            <span className="hover:text-[#3F6212] cursor-pointer" onClick={() => navigate('/dashboard/settings')}>Settings</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FramerLayout;
