import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenGetter, setActiveTenantHeader, getMe } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: isAuth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    error: auth0Error
  } = useAuth0();

  const [dbUser, setDbUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeTenant, setActiveTenant] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Wire silent token getter into axios interceptor
  useEffect(() => {
      if (isAuthenticated) {
        setTokenGetter(async () => {
          try {
            return await getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE
              }
            });
          } catch (err) {
            console.warn('Failed to get Auth0 access token silently:', err);
            return null;
          }
        });
      } else {
        setTokenGetter(null);
      }
}, [isAuthenticated, getAccessTokenSilently]);

  // Sync user profile and tenant memberships from backend
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const data = await getMe();
      setDbUser(data.user);
      setMemberships(data.memberships || []);

      // If no active tenant selected yet, select the first available membership or saved tenant
      setActiveTenant(prev => {
        if (prev && data.memberships?.some(m => m.tenant_id === prev.tenant_id)) {
          setActiveTenantHeader(prev.tenant_id);
          return prev;
        }
        const savedTenantId = sessionStorage.getItem('active_tenant_id');
        const match = data.memberships?.find(m => m.tenant_id === savedTenantId);
        const selected = match || data.memberships?.[0] || null;
        if (selected?.tenant_id) {
          sessionStorage.setItem('active_tenant_id', selected.tenant_id);
          setActiveTenantHeader(selected.tenant_id);
        }
        return selected;
      });
    } catch (err) {
      console.error('Failed to sync user with backend:', err);
      setSyncError(err.response?.data?.message || err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !isAuth0Loading) {
      refreshUser();
    } else if (!isAuthenticated && !isAuth0Loading) {
      setDbUser(null);
      setMemberships([]);
      setActiveTenant(null);
      sessionStorage.removeItem('active_tenant_id');
      setActiveTenantHeader(null);
    }
  }, [isAuthenticated, isAuth0Loading, refreshUser]);

  // When active tenant changes, update session and request header
  const switchTenant = (tenantId) => {
    const membership = memberships.find(m => m.tenant_id === tenantId);
    if (membership) {
      setActiveTenant(membership);
      sessionStorage.setItem('active_tenant_id', membership.tenant_id);
      setActiveTenantHeader(membership.tenant_id);
      return true;
    }
    // Platform Admins can switch to any tenant even without direct membership
    if (dbUser?.is_platform_admin) {
      const adminContext = {
        tenant_id: tenantId,
        role: 'Platform Admin',
        tenant_name: 'Tenant ' + tenantId.substring(0, 8)
      };
      setActiveTenant(adminContext);
      sessionStorage.setItem('active_tenant_id', tenantId);
      setActiveTenantHeader(tenantId);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (activeTenant?.tenant_id) {
      setActiveTenantHeader(activeTenant.tenant_id);
    }
  }, [activeTenant]);

  const logout = () => {
    sessionStorage.removeItem('active_tenant_id');
    setActiveTenantHeader(null);
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  // Derive permissions based on current role
  const currentRole = activeTenant?.role || (dbUser?.is_platform_admin ? 'Platform Admin' : null);

  const permissions = useMemo(() => {
    const isPlatformAdmin = Boolean(dbUser?.is_platform_admin);
    const isTenantOwner = currentRole === 'Tenant Owner' || isPlatformAdmin;
    const isBillingManager = currentRole === 'Billing Manager' || isTenantOwner;
    const isDeveloper = currentRole === 'Developer' || isTenantOwner;

    return {
      isPlatformAdmin,
      isTenantOwner,
      isBillingManager,
      isDeveloper,
      canManageTenants: isPlatformAdmin,
      canManageMembers: isTenantOwner,
      canManageApiKeys: isDeveloper,
      canViewUsage: true,
      canManageBilling: isBillingManager,
      canViewInvoices: true
    };
  }, [dbUser, currentRole]);

  return (
      <AuthContext.Provider
        value={{
          user: dbUser || auth0User,
          auth0User,
          dbUser,
          isAuthenticated,
          isLoading: isAuth0Loading || isSyncing,
          auth0Error,
          syncError,
          memberships,
          activeTenant,
          currentRole,
          permissions,
          login: loginWithRedirect,
          logout,
          switchTenant,
          refreshUser
        }}
      >
        {children}
      </AuthContext.Provider>
      );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
      if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
      return context;
};
