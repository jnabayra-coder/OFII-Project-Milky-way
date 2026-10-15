import React from 'react';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Home } from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { getUserRoleDisplayLabel, normalizeUserRole } from '../utils/roleUtils';

interface AccessDeniedViewProps {
  userRole?: UserRole | string;
  user: UserProfile;
  attemptedTab?: string;
  onReturnToAuthorizedPortal: () => void;
  onNavigateToDashboard?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  userRole,
  user,
  attemptedTab,
  onReturnToAuthorizedPortal,
  onNavigateToDashboard,
}) => {
  const roleDisplay = getUserRoleDisplayLabel(user);

  return (
    <div className="min-h-[65vh] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-6">
        
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8 text-rose-600" />
        </div>

        {/* Access Restricted Header */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-bold tracking-wider px-3 py-1 bg-rose-100 text-rose-800 rounded-full inline-block">
            Access Restricted
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            You do not have permission to access this section.
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Your current account role (<strong className="text-slate-800">{roleDisplay.roleLabel}</strong>) does not have clearance for this module.
          </p>
        </div>

        {/* Security Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Authenticated Personnel:</span>
            <span className="font-semibold text-slate-900">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Assigned Portal:</span>
            <span className="font-bold text-blue-700">{roleDisplay.portalName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Access Policy:</span>
            <span className="text-slate-700 font-mono text-[11px]">Role-Based Access Control (RBAC)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onReturnToAuthorizedPortal}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Portal</span>
          </button>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
