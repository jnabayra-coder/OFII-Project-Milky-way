import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Briefcase,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { CanonicalRole, AccountRegistrationRequest } from '../types';
import { submitRegistrationRequest, generateUniqueLoginId } from '../data/userAccounts';

interface CreateAccountScreenProps {
  onBackToLogin: () => void;
}

export const CreateAccountScreen: React.FC<CreateAccountScreenProps> = ({ onBackToLogin }) => {
  // Form Fields (Name, Role, Password, Confirm Password)
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<CanonicalRole>('ENCODER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<AccountRegistrationRequest | null>(null);

  // Live preview of generated Login ID
  const previewLoginId = useMemo(() => {
    if (!fullName.trim()) return '';
    return generateUniqueLoginId(fullName.trim());
  }, [fullName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage('Full Name is required.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    if (!confirmPassword) {
      setErrorMessage('Confirm Password is required.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    // Security check: Unauthenticated users can only request operational roles
    if (selectedRole === 'ADMIN' || selectedRole === 'MANAGEMENT') {
      setErrorMessage('Security Alert: Admin and Management roles must be provisioned directly by an authorized Station Administrator.');
      return;
    }

    const regRes = submitRegistrationRequest({
      name: cleanName,
      requestedRole: selectedRole,
      password: password,
    });

    if (!regRes.success || !regRes.request) {
      setErrorMessage(regRes.error || 'Failed to submit registration request. Please check your details.');
      return;
    }

    setSubmittedRequest(regRes.request);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background subtle grid pattern */}
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

          <button
            type="button"
            onClick={onBackToLogin}
            className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Login</span>
          </button>
        </div>
      </header>

      {/* Center Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Card Header */}
          <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-2 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Register Personnel Account
            </h1>
            <p className="text-xs text-blue-200/90 mt-1 font-medium">
              OFII Monitoring System • Account Registration Request
            </p>
          </div>

          {/* Form Content / Confirmation Screen */}
          <div className="p-4 sm:p-7 bg-white">
            {submittedRequest ? (
              /* Awaiting Admin Approval Confirmation View (Requirement 1 & 4) */
              <div className="space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                  <Clock className="w-9 h-9 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full inline-block">
                    Request Status: PENDING ADMIN APPROVAL
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">
                    Registration Submitted Successfully
                  </h2>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Thank you, <strong className="text-slate-900">{submittedRequest.name}</strong>. Your account registration request has been submitted and is awaiting review and authorization by an OFII Station Administrator.
                  </p>
                </div>

                {/* Registration Request Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Application Summary</span>
                    <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pending Review
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Applicant Name</span>
                      <span className="font-semibold text-slate-800">{submittedRequest.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Requested Role</span>
                      <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">
                        {submittedRequest.requestedRole}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Assigned Login ID</span>
                      <span className="font-mono font-bold text-slate-800">{submittedRequest.loginId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Submission Date</span>
                      <span className="text-slate-700">{submittedRequest.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Security Access Notice */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-left text-xs text-amber-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="font-semibold">Access Restriction:</strong> In accordance with OFII authorization policy, no portal access is granted until an Administrator verifies your identity and activates your account. Attempting to log in prior to approval will remain restricted.
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Return to Login Screen</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Public Registration Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Security Note on Roles & Admin Approval */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="font-bold">Approval Workflow:</strong> New accounts are submitted with <span className="font-semibold text-amber-800">PENDING</span> status. An authorized Administrator will review and approve your role before access is enabled.
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative rounded-md shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eduardo Ramos"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors font-medium"
                    />
                  </div>
                  {previewLoginId && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <span>Generated Login ID:</span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        {previewLoginId}
                      </span>
                    </p>
                  )}
                </div>

                {/* 2. Role Selector (Preserves Role field) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Requested Role *
                  </label>
                  <div className="relative rounded-md shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as CanonicalRole)}
                      className="block w-full pl-9 pr-3 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors font-semibold cursor-pointer"
                    >
                      <option value="ENCODER">ENCODER — Operational Data Entry & Excel Import</option>
                      <option value="COORDINATOR">COORDINATOR — Client Deliveries & Consignment Tracking</option>
                      <option value="TRUCK_PLANNER">TRUCK PLANNER — Route Planning & Vehicle Assignment</option>
                      <option value="DISPATCHER">DISPATCHER — Gate Logistics & Transport Dispatch Execution</option>
                      <option value="DRIVER">DRIVER — Simple Mobile Delivery Portal</option>
                      <option value="VIEWER">VIEWER — Read-Only Operational Monitoring</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Your requested role will be verified and confirmed by the Administrator upon approval.
                  </p>
                </div>

                {/* 3. Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <div className="relative rounded-md shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
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

                {/* 4. Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative rounded-md shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer mt-4"
                >
                  <span>Submit Registration Request</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Already registered or approved? </span>
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            )}
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

