import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Employee, UserSession } from '../types';

interface LoginViewProps {
  employees: Employee[];
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginView({ employees, onLoginSuccess }: LoginViewProps) {
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);

    // Simulate server-side latency for high-quality production experience
    setTimeout(() => {
      if (activeTab === 'admin') {
        if (username.toLowerCase() === 'admin' && password === 'admin123') {
          onLoginSuccess({
            role: 'admin',
            username: 'admin',
            name: 'Administrator'
          });
        } else {
          setError('Invalid administrator credentials.');
          setIsLoading(false);
        }
      } else {
        // Individual Employee check
        const emp = employees.find(
          (e) => e.username.toLowerCase() === username.toLowerCase().trim()
        );
        
        if (emp) {
          if (emp.status === 'Inactive') {
            setError('This employee account is deactivated. Please contact support.');
            setIsLoading(false);
            return;
          }

          if (emp.password === password) {
            onLoginSuccess({
              role: 'employee',
              employeeId: emp.id,
              username: emp.username,
              name: emp.name
            });
          } else {
            setError('Incorrect password. Please try again.');
            setIsLoading(false);
          }
        } else {
          setError('Employee username not found.');
          setIsLoading(false);
        }
      }
    }, 800);
  };

  const handleTabChange = (tab: 'employee' | 'admin') => {
    setActiveTab(tab);
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100 mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans">
            Workforce Portal
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Attendance &amp; Roster Management System
          </p>
        </div>

        {/* Custom Auth Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 relative">
          <button
            onClick={() => handleTabChange('employee')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'employee'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Employee Portal
          </button>
          <button
            onClick={() => handleTabChange('admin')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'admin'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin Console
          </button>
        </div>

        {/* Demo Credentials Box */}
        <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 mb-6 text-xs text-amber-800">
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Quick Demo Credentials:
          </div>
          {activeTab === 'employee' ? (
            <div className="space-y-0.5 font-mono">
              <div>Username: <span className="font-semibold">alice</span> or <span className="font-semibold">bob</span></div>
              <div>Password: <span className="font-semibold">password123</span></div>
            </div>
          ) : (
            <div className="space-y-0.5 font-mono">
              <div>Username: <span className="font-semibold">admin</span></div>
              <div>Password: <span className="font-semibold">admin123</span></div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={activeTab === 'employee' ? 'e.g. alice' : 'e.g. admin'}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-900 text-sm transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-900 text-sm transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-100 pt-5">
          Secure, client-side encrypted connection
        </div>
      </motion.div>
    </div>
  );
}
