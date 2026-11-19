import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4FF28] mb-4" />
        <p className="text-sm font-medium text-slate-400">Verifying Auth0 session & permissions...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-white px-4">
        <div className="max-w-md w-full bg-[#0d1527] border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 bg-[#D4FF28]/10 text-[#D4FF28] rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#D4FF28]/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-400 mb-6">
            You must be logged in with a valid Auth0 account to access the dashboard and tenant operations.
          </p>
          <button
            onClick={() => login()}
            className="w-full py-3 px-4 bg-[#D4FF28] text-[#070b14] font-semibold rounded-xl hover:bg-[#c7f21b] transition-all shadow-lg shadow-[#D4FF28]/10"
          >
            Log In with Auth0
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
