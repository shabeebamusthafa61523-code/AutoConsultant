import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username/email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login({ username, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header with Logo */}
        <div className="bg-slate-50 p-8 border-b border-slate-200 text-center flex flex-col items-center">
          <img
            src="/logo.png"
            alt="BENZ Driving School"
            className="w-24 h-24 object-contain mb-3"
          />
          <h1 className="text-xl font-black text-slate-900 tracking-tight">BENZ DRIVING SCHOOL</h1>
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mt-0.5">West Kodur</p>
          <p className="text-xs text-slate-400 mt-2">Management System Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-md flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or admin@benz.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Quick Demo Credentials Reminder */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">Seeded Superadmin Credentials:</p>
              <p className="font-mono text-slate-600 mt-0.5">superadmin / admin123</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUsername('superadmin');
                setPassword('admin123');
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 underline"
            >
              Fill Demo
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition flex items-center justify-center gap-2 shadow-md"
          >
            <LogIn size={18} />
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
