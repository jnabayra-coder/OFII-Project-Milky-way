import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  KeyRound, 
  User, 
  AlertCircle, 
  UserPlus, 
  Eye, 
  EyeOff,
  Briefcase,
  Truck,
  Eye as ViewerIcon,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { UserRole, CanonicalRole } from '../types';
import { 
  authenticateUser, 
  saveAuthSession, 
  getDefaultUserForRole, 
} from '../data/userAccounts';
import { normalizeUserRole } from '../utils/roleUtils';

interface LoginScreenProps {
  onLogin: () => void;
  onCreateAccount: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onCreateAccount }) => {
  const { setCurrentUserProfile } = useData();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoCredentials, setShowDemoCredentials] = useState(true);

  // Quick 1-Click login for testing/evaluating any of the 6 roles
  const executeQuickLogin = (role: CanonicalRole | string, specificName?: string) => {
    setErrorMessage(null);
    const targetUser = getDefaultUserForRole(role, specificName);
    saveAuthSession(targetUser);
    setCurrentUserProfile(targetUser);
    onLogin();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const authRes = authenticateUser(username, password);
    if (!authRes.success || !authRes.user) {
      setErrorMessage(authRes.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    // Authenticated user
    saveAuthSession(authRes.user);
    setCurrentUserProfile(authRes.user);
    onLogin();
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Subtle corporate background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Bar / Corporate Header */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* OFII Logo Placeholder */}
            <div className="w-10 h-10 rounded bg-blue-700 flex items-center justify-center text-white font-bold text-lg tracking-wider border border-blue-500/40 shadow-sm">
              OFII
            </div>
            <div>
              <div className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
                ORIENT FREIGHT INTERNATIONAL, INC.
                <span className="hidden sm:inline-block text-[10px] uppercase px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded">
                  EST. 1974
                </span>
              </div>
              <p className="text-xs text-slate-400">Total Logistics Services Provider • Philippines</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              6-Role RBAC Active
            </span>
            <span className="text-slate-700">|</span>
            <span>Support: +63 (2) 8851-8888</span>
          </div>
        </div>
      </header>

      {/* Center Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Card Header */}
          <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-2 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              OFII Monitoring System
            </h1>
            <p className="text-xs text-blue-200/90 mt-1 font-medium">
              Logistics & Shipment Monitoring Portal
            </p>
          </div>

          {/* Form Content */}
          <div className="p-4 sm:p-7 bg-white space-y-5">
            
            {/* Quick 1-Click Role Evaluator Panel (All Roles) */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                  Quick 1-Click Role Sign-In:
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  All Portals Restored & Active
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => executeQuickLogin('ADMIN')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-purple-900 hover:text-white text-purple-900 border border-purple-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Admin Portal (Full Access & User Management)"
                >
                  <span className="truncate">1. Admin</span>
                  <ArrowRight className="w-3 h-3 text-purple-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => executeQuickLogin('ENCODER')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-blue-900 hover:text-white text-blue-900 border border-blue-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Encoder Portal (Daily Dispatch, Forwarding, Excel Import)"
                >
                  <span className="truncate">2. Encoder</span>
                  <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => executeQuickLogin('COORDINATOR', 'Alodia Manalansan')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-emerald-900 hover:text-white text-emerald-900 border border-emerald-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Coordinator Portal (Assigned Accounts & Batches)"
                >
                  <span className="truncate">3. Coordinator</span>
                  <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => executeQuickLogin('DRIVER', 'Danilo P. Hernandez')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-amber-900 hover:text-white text-amber-900 border border-amber-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Driver Portal (Simple Mobile Delivery App)"
                >
                  <span className="truncate">4. Driver</span>
                  <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => executeQuickLogin('VIEWER')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-slate-800 hover:text-white text-slate-800 border border-slate-300 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Viewer Portal (Read-Only Operational Monitoring)"
                >
                  <span className="truncate">5. Viewer</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => executeQuickLogin('MANAGEMENT')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-indigo-900 hover:text-white text-indigo-900 border border-indigo-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Management Portal (Executive Oversight & KPIs)"
                >
                  <span className="truncate">6. Management</span>
                  <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => executeQuickLogin('TRUCK_PLANNER', 'Vicente L. Santos')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-teal-900 hover:text-white text-teal-900 border border-teal-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Truck Planner Portal (Route Planning & Truck Runs)"
                >
                  <span className="truncate">7. Planner</span>
                  <ArrowRight className="w-3 h-3 text-teal-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => executeQuickLogin('DISPATCHER', 'Eduardo G. Ramos')}
                  className="px-2 py-1.5 text-xs font-bold bg-white hover:bg-cyan-900 hover:text-white text-cyan-900 border border-cyan-200 rounded text-left flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
                  title="Dispatcher Portal (Gate & Loading Staging)"
                >
                  <span className="truncate">8. Dispatcher</span>
                  <ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" />
                </button>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username / Login ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username / Login ID
                </label>
                <div className="relative rounded-md shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors font-mono"
                    placeholder="e.g. admin, juan.delacruz, danilo.hernandez"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter your unique Login ID or corporate email
                </p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[10px] text-slate-400">Default: Password123!</span>
                </div>
                <div className="relative rounded-md shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <span>Authorize & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Create Account Link */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need new personnel credentials?</span>
              <button
                type="button"
                onClick={onCreateAccount}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-slate-900/90 py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Orient Freight International, Inc. All rights reserved. • ISO 9001:2015 Certified Logistics</p>
      </footer>
    </div>
  );
};
