import React from 'react';
import { UserProfile, UserRole } from '../types';
import { ShieldAlert, LogOut, ArrowRight, UserCheck, Truck, Users, LayoutDashboard, FileSpreadsheet } from 'lucide-react';

interface RoleNotConfiguredViewProps {
  currentUserProfile: UserProfile | null;
  onLogout: () => void;
  onSelectRole: (role: UserRole) => void;
}

export const RoleNotConfiguredView: React.FC<RoleNotConfiguredViewProps> = ({
  currentUserProfile,
  onLogout,
  onSelectRole,
}) => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 sm:p-8 text-white">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          Security & Access Control
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Role Not Configured
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          The current authenticated session for{' '}
          <span className="font-semibold text-white">
            {currentUserProfile?.name || 'Current User'}
          </span>{' '}
          does not have a valid operational role configured (detected: <code className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-xs text-amber-300">{currentUserProfile?.userRole || 'undefined'}</code>).
        </p>

        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/60 mb-6">
          <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">
            Select an authorized operational portal to proceed:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectRole('dispatcher')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-200">Dispatcher Portal</div>
                  <div className="text-[10px] text-slate-400">Gate & bay operations</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={() => onSelectRole('office_head')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-200">Head Staff Portal</div>
                  <div className="text-[10px] text-slate-400">Executive operations</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
            </button>

            <button
              type="button"
              onClick={() => onSelectRole('coordinator')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-200">Coordinator Portal</div>
                  <div className="text-[10px] text-slate-400">Batches & consignments</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
            </button>

            <button
              type="button"
              onClick={() => onSelectRole('truck_planner')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-teal-900/40 border border-slate-700 hover:border-teal-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-teal-400" />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-teal-200">Truck Planner</div>
                  <div className="text-[10px] text-slate-400">Route planning & runs</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400" />
            </button>

            <button
              type="button"
              onClick={() => onSelectRole('encoder')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-200">Logistics Encoder</div>
                  <div className="text-[10px] text-slate-400">Data forwarding</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
            </button>

            <button
              type="button"
              onClick={() => onSelectRole('driver')}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-200">Driver Portal</div>
                  <div className="text-[10px] text-slate-400">Delivery execution</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <span className="text-xs text-slate-400">
            OFII Monitoring System • RBAC Guard
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
