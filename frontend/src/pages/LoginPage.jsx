import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, LogIn, Zap } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await login({
        appState: { returnTo: '/dashboard' },
      });
    } catch (err) {
      console.error('Login error:', err);
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-md bg-[#0d1527] border border-slate-800 rounded-2xl p-10 shadow-2xl text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-[#D4FF28] rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#070b14]" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">FlyRank</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-sm text-slate-400 mb-8">
          Sign in to your FlyRank account to manage usage, billing, and tenants.
        </p>

        {/* Auth0 Login Button */}
        <button
          onClick={handleLogin}
          disabled={loggingIn}
          className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-[#D4FF28] text-[#070b14] font-semibold rounded-xl hover:bg-[#c7f21b] active:scale-95 transition-all shadow-lg shadow-[#D4FF28]/10 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loggingIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {loggingIn ? 'Redirecting to Auth0...' : 'Log in with Auth0'}
        </button>

        <p className="mt-6 text-xs text-slate-500">
          By signing in you agree to our{' '}
          <a href="#" className="text-slate-400 underline hover:text-white">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-slate-400 underline hover:text-white">Privacy Policy</a>.
        </p>
      </div>

      {/* Back to home */}
      <a
        href="/"
        className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Back to home
      </a>
    </div>
  );
}
