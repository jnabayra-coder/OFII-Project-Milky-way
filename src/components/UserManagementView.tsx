import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  Filter, 
  Edit3, 
  KeyRound, 
  UserX, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Lock, 
  Briefcase, 
  ShieldAlert, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Clock,
  XCircle,
  FileCheck,
  RotateCcw,
  BadgeAlert,
  Info
} from 'lucide-react';
import { UserProfile, CanonicalRole, AccountRegistrationRequest, AccountRequestStatus } from '../types';
import { 
  getRegisteredUsers, 
  saveRegisteredUsers, 
  registerNewUserAccount, 
  updateUserAccount, 
  toggleUserAccountStatus, 
  resetUserPassword,
  generateUniqueLoginId,
  hashPassword,
  getDepartmentForRole,
  getRegistrationRequests,
  saveRegistrationRequests,
  getPendingRequestsCount,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  reopenRegistrationRequest
} from '../data/userAccounts';
import { normalizeUserRole } from '../utils/roleUtils';

interface UserManagementViewProps {
  currentUser: UserProfile;
  initialTab?: 'pending' | 'approved' | 'rejected';
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ 
  currentUser,
  initialTab
}) => {
  const [requests, setRequests] = useState<AccountRegistrationRequest[]>(() => getRegistrationRequests());
  const [users, setUsers] = useState<UserProfile[]>(() => getRegisteredUsers());

  // Top Section Sub-Navigation Tabs (Phase 6.7.2 - Requirement 2)
  const [activeSection, setActiveSection] = useState<'pending' | 'approved' | 'rejected'>(() => {
    if (initialTab) return initialTab;
    const pendingCount = getPendingRequestsCount();
    return pendingCount > 0 ? 'pending' : 'approved';
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals for Approval Workflow (Requirement 2 & 3)
  const [approvingRequest, setApprovingRequest] = useState<AccountRegistrationRequest | null>(null);
  const [approvedRoleSelection, setApprovedRoleSelection] = useState<CanonicalRole>('ENCODER');
  const [rejectingRequest, setRejectingRequest] = useState<AccountRegistrationRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Modals for Approved Accounts Management
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<UserProfile | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<CanonicalRole>('ENCODER');
  const [passwordResetUser, setPasswordResetUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Direct Admin Provisioning Form State
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<CanonicalRole>('ENCODER');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newAssignedClients, setNewAssignedClients] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('NDB-4921');

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const refreshAll = () => {
    setRequests(getRegistrationRequests());
    setUsers(getRegisteredUsers());
  };

  // Sync when storage or external window events change
  useEffect(() => {
    const handleStorageChange = () => refreshAll();
    window.addEventListener('ofii-accounts-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('ofii-accounts-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Filtered Lists
  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'PENDING').filter(r => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        r.loginId.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        r.requestedRole.toLowerCase().includes(q)
      );
    });
  }, [requests, searchQuery]);

  const rejectedRequests = useMemo(() => {
    return requests.filter(r => r.status === 'REJECTED').filter(r => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        r.loginId.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        r.requestedRole.toLowerCase().includes(q) ||
        (r.rejectionReason && r.rejectionReason.toLowerCase().includes(q))
      );
    });
  }, [requests, searchQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        user.name.toLowerCase().includes(q) ||
        (user.loginId && user.loginId.toLowerCase().includes(q)) ||
        (user.username && user.username.toLowerCase().includes(q)) ||
        user.employeeId.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);

      const canonical = normalizeUserRole(user.userRole || user.role);
      const matchesRole = selectedRoleFilter === 'all' || canonical === selectedRoleFilter;

      const isUserActive = user.isActive !== false && user.accountStatus !== 'Disabled';
      const matchesStatus = 
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' && isUserActive) ||
        (selectedStatusFilter === 'disabled' && !isUserActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalRegistered = users.length;
    const active = users.filter(u => u.isActive !== false && u.accountStatus !== 'Disabled').length;
    const disabled = totalRegistered - active;
    const pendingCount = requests.filter(r => r.status === 'PENDING').length;
    const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;
    const approvedCount = totalRegistered;

    return { totalRegistered, active, disabled, pendingCount, rejectedCount, approvedCount };
  }, [users, requests]);

  // ---------------- APPROVAL ACTIONS (Requirement 3) ----------------
  const handleOpenApproveModal = (req: AccountRegistrationRequest) => {
    setApprovingRequest(req);
    setApprovedRoleSelection(req.requestedRole || 'ENCODER');
  };

  const handleConfirmApproval = () => {
    if (!approvingRequest) return;

    // Verify authorized admin
    const actorRole = normalizeUserRole(currentUser.userRole || currentUser.role);
    if (actorRole !== 'ADMIN') {
      showToast('Unauthorized: Only an Administrator is permitted to approve requests.', 'error');
      return;
    }

    const res = approveRegistrationRequest(approvingRequest.id, approvedRoleSelection, currentUser);
    if (!res.success) {
      showToast(res.error || 'Failed to approve account request.', 'error');
      return;
    }

    showToast(`Account approved for ${approvingRequest.name}. Assigned Role: ${approvedRoleSelection}. User can now sign in.`);
    setApprovingRequest(null);
    refreshAll();
  };

  const handleOpenRejectModal = (req: AccountRegistrationRequest) => {
    setRejectingRequest(req);
    setRejectionReasonInput('Non-authorized registration request or invalid department assignment.');
  };

  const handleConfirmRejection = () => {
    if (!rejectingRequest) return;

    // Verify authorized admin
    const actorRole = normalizeUserRole(currentUser.userRole || currentUser.role);
    if (actorRole !== 'ADMIN') {
      showToast('Unauthorized: Only an Administrator is permitted to reject requests.', 'error');
      return;
    }

    const res = rejectRegistrationRequest(
      rejectingRequest.id, 
      rejectionReasonInput.trim() || 'Registration declined by Administrator.', 
      currentUser
    );
    if (!res.success) {
      showToast(res.error || 'Failed to reject registration request.', 'error');
      return;
    }

    showToast(`Registration request for ${rejectingRequest.name} has been rejected.`);
    setRejectingRequest(null);
    refreshAll();
  };

  const handleReopenRequest = (req: AccountRegistrationRequest) => {
    const res = reopenRegistrationRequest(req.id, currentUser);
    if (!res.success) {
      showToast(res.error || 'Failed to reopen request.', 'error');
      return;
    }
    showToast(`Request for ${req.name} has been moved back to Pending Review.`);
    refreshAll();
  };

  // ---------------- APPROVED ACCOUNTS ACTIONS ----------------
  const handleToggleStatus = (targetUser: UserProfile) => {
    const isCurrentlyActive = targetUser.isActive !== false && targetUser.accountStatus !== 'Disabled';
    const actionLabel = isCurrentlyActive ? 'disable' : 'activate';

    if (normalizeUserRole(targetUser.userRole) === 'ADMIN' && isCurrentlyActive) {
      const activeAdmins = users.filter(u => normalizeUserRole(u.userRole) === 'ADMIN' && u.isActive);
      if (activeAdmins.length <= 1) {
        showToast('Security Alert: Cannot disable the primary Administrator account.', 'error');
        return;
      }
    }

    const res = toggleUserAccountStatus(targetUser.id || '', currentUser.userRole || 'ADMIN');
    if (!res.success) {
      showToast(res.error || `Failed to ${actionLabel} account.`, 'error');
      return;
    }

    showToast(`Account for ${targetUser.name} has been ${isCurrentlyActive ? 'disabled' : 'activated'}.`);
    refreshAll();
  };

  const handleConfirmRoleChange = () => {
    if (!roleChangeUser || !roleChangeUser.id) return;

    const res = updateUserAccount(
      roleChangeUser.id,
      {
        userRole: newSelectedRole,
        role: `${newSelectedRole.charAt(0) + newSelectedRole.slice(1).toLowerCase()} Personnel`,
        department: getDepartmentForRole(newSelectedRole),
      },
      currentUser.userRole || 'ADMIN'
    );

    if (!res.success) {
      showToast(res.error || 'Failed to change user role.', 'error');
      return;
    }

    showToast(`Role for ${roleChangeUser.name} updated to ${newSelectedRole}.`);
    setRoleChangeUser(null);
    refreshAll();
  };

  const handleConfirmPasswordReset = () => {
    if (!passwordResetUser || !passwordResetUser.id) return;
    if (newPasswordInput !== confirmPasswordInput) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (newPasswordInput.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    const res = resetUserPassword(passwordResetUser.id, newPasswordInput, currentUser.userRole || 'ADMIN');
    if (!res.success) {
      showToast(res.error || 'Failed to reset password.', 'error');
      return;
    }

    showToast(`Password successfully reset for ${passwordResetUser.name}.`);
    setPasswordResetUser(null);
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    refreshAll();
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    const assignedClients = newRole === 'COORDINATOR' && newAssignedClients.trim()
      ? newAssignedClients.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const res = registerNewUserAccount(
      {
        name: newFullName.trim(),
        userRole: newRole,
        role: `${newRole.charAt(0) + newRole.slice(1).toLowerCase()} Personnel`,
        department: getDepartmentForRole(newRole),
        password: newPassword,
        assignedClients,
        vehiclePlate: newRole === 'DRIVER' ? newVehiclePlate.trim() : undefined,
        accountStatus: 'Active',
        isActive: true,
      },
      currentUser.userRole || 'ADMIN'
    );

    if (!res.success) {
      showToast(res.error || 'Failed to create user account.', 'error');
      return;
    }

    showToast(`Account provisioned for ${newFullName.trim()} with Login ID: ${res.user?.loginId}`);
    setIsAddUserModalOpen(false);
    setNewFullName('');
    setNewPassword('');
    setNewConfirmPassword('');
    setNewAssignedClients('');
    refreshAll();
  };

  const getRoleBadgeStyle = (role: CanonicalRole | null | string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ENCODER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'COORDINATOR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DRIVER':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'VIEWER':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'MANAGEMENT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'TRUCK_PLANNER':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'DISPATCHER':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success' 
              ? 'bg-slate-900 text-white border-emerald-500' 
              : toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-500'
              : 'bg-slate-900 text-white border-blue-500'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-700 text-blue-100 text-[10px] font-bold tracking-wider uppercase">
              Admin Exclusive Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">Phase 6.7.2 Approval Engine</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            Account Management & Admin Approval Workflow
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Review and authorize public account registrations, approve or reject role requests, configure approved accounts, and enforce trusted portal security across the OFII system.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddUserModalOpen(true);
            setNewRole('ENCODER');
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Account Directly</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Pending Requests KPI */}
        <div 
          onClick={() => setActiveSection('pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSection === 'pending'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Pending Requests
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1 flex items-center gap-2">
            <span>{stats.pendingCount}</span>
            {stats.pendingCount > 0 && (
              <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                Needs Review
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting Admin Authorization</div>
        </div>

        {/* Approved Accounts KPI */}
        <div 
          onClick={() => setActiveSection('approved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSection === 'approved'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Approved Accounts
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats.approvedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{stats.active} Active • {stats.disabled} Disabled</div>
        </div>

        {/* Rejected Requests KPI */}
        <div 
          onClick={() => setActiveSection('rejected')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSection === 'rejected'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
              Rejected Requests
            </span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">{stats.rejectedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Access Denied & Blocked</div>
        </div>

        {/* Total Operational Coverage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Roster
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalRegistered}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">6 Active System Roles</div>
        </div>
      </div>

      {/* Module Navigation Tabs (Requirement 2: Dedicated A/B/C Structure) */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSection('pending')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'pending'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Requests</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSection === 'pending'
              ? 'bg-amber-700 text-amber-100'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {stats.pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('approved')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'approved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Approved Accounts</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSection === 'approved'
              ? 'bg-emerald-800 text-emerald-100'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            {stats.approvedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('rejected')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'rejected'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Rejected Requests</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSection === 'rejected'
              ? 'bg-rose-800 text-rose-100'
              : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {stats.rejectedCount}
          </span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeSection === 'pending'
                ? "Search pending applicants by Name, Login ID, or requested role..."
                : activeSection === 'rejected'
                ? "Search rejected requests by Name, reason, or date..."
                : "Search approved users by Name, Login ID, Employee ID, or Email..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        {activeSection === 'approved' && (
          <div className="flex items-center gap-2">
            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">All Roles ({users.length})</option>
              <option value="ADMIN">Admin</option>
              <option value="ENCODER">Encoder</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="DRIVER">Driver</option>
              <option value="VIEWER">Viewer</option>
              <option value="MANAGEMENT">Management</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>
        )}
      </div>

      {/* ================= SECTION A: PENDING REQUESTS ================= */}
      {activeSection === 'pending' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Registration Requests Awaiting Admin Review ({pendingRequests.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Pending accounts have zero access to protected portals until approved.
                </p>
              </div>
            </div>

            {pendingRequests.length > 0 && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                {pendingRequests.length} Pending Approval
              </span>
            )}
          </div>

          <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Pending Registrations</span>
            <span className="text-amber-700 font-medium">Swipe to view columns →</span>
          </div>
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Applicant Name & Department</th>
                  <th className="px-4 py-3.5">Assigned Login ID</th>
                  <th className="px-4 py-3.5">Requested Role</th>
                  <th className="px-4 py-3.5">Registration Date</th>
                  <th className="px-4 py-3.5">Current Status</th>
                  <th className="px-5 py-3.5 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="font-bold text-slate-800">All Registration Requests Reviewed!</p>
                      <p className="text-xs text-slate-500 mt-1">There are currently no pending registration requests awaiting approval.</p>
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Name & Department */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-800 text-xs shrink-0">
                            {req.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{req.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {req.department || 'Operations'} • <span className="text-slate-400">{req.hubLocation || 'OFII Central Hub'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Login ID */}
                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 text-xs">
                          {req.loginId}
                        </span>
                      </td>

                      {/* Requested Role */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border tracking-wide uppercase ${getRoleBadgeStyle(req.requestedRole)}`}>
                          {req.requestedRole}
                        </span>
                      </td>

                      {/* Registration Date */}
                      <td className="px-4 py-4 text-slate-600 font-mono text-[11px]">
                        {req.createdAt}
                      </td>

                      {/* Current Status */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending Review
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenApproveModal(req)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(req)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SECTION B: APPROVED ACCOUNTS ================= */}
      {activeSection === 'approved' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Approved Active Personnel Accounts ({filteredUsers.length})
            </h2>
            <span className="text-[11px] text-slate-500">
              Only approved accounts can access designated operational portals
            </span>
          </div>

          <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Approved Accounts Directory</span>
            <span className="text-emerald-700 font-medium">Swipe to view columns →</span>
          </div>
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Personnel Name & Department</th>
                  <th className="px-4 py-3.5">Login ID / Username</th>
                  <th className="px-4 py-3.5">Approved Role</th>
                  <th className="px-4 py-3.5">Account Status</th>
                  <th className="px-4 py-3.5">Approval Info</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No user accounts found matching your filters.</p>
                      <p className="text-xs text-slate-400 mt-1">Try resetting the search bar or changing role filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const canonical = normalizeUserRole(user.userRole || user.role);
                    const isActive = user.isActive !== false && user.accountStatus !== 'Disabled';

                    return (
                      <tr key={user.id || user.loginId} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name & Department */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {user.name}
                                {user.id === currentUser.id && (
                                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {user.department || 'Operations'} • <span className="font-mono text-slate-400">{user.employeeId}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Login ID */}
                        <td className="px-4 py-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 text-xs">
                            {user.loginId || user.username}
                          </span>
                        </td>

                        {/* Approved Role */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border tracking-wide uppercase ${getRoleBadgeStyle(canonical)}`}>
                            {canonical || 'USER'}
                          </span>
                        </td>

                        {/* Account Status */}
                        <td className="px-4 py-4">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* Approval Info */}
                        <td className="px-4 py-4 text-slate-500 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Approved By:</span>
                            <span className="font-medium text-slate-700">{user.reviewedBy || user.createdBy || 'System'}</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            {user.reviewedAt || user.createdAt || '2026-01-15'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Change Role Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setRoleChangeUser(user);
                                setNewSelectedRole(canonical || 'ENCODER');
                              }}
                              title="Change Role"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            >
                              <Briefcase className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordResetUser(user);
                                setNewPasswordInput('');
                                setConfirmPasswordInput('');
                              }}
                              title="Reset Password"
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Disable / Enable Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              title={isActive ? 'Disable Account' : 'Reactivate Account'}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isActive 
                                  ? 'text-slate-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200' 
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                              }`}
                            >
                              {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SECTION C: REJECTED REQUESTS ================= */}
      {activeSection === 'rejected' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Rejected Registration Requests ({rejectedRequests.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Rejected users are strictly barred from logging into protected application features.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-full">
              {rejectedRequests.length} Rejected Records
            </span>
          </div>

          <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Rejected Requests Archive</span>
            <span className="text-rose-700 font-medium">Swipe to view columns →</span>
          </div>
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Applicant Name</th>
                  <th className="px-4 py-3.5">Requested Role</th>
                  <th className="px-4 py-3.5">Rejection Reason</th>
                  <th className="px-4 py-3.5">Reviewed By Admin</th>
                  <th className="px-4 py-3.5">Decision Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rejectedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-800">No Rejected Requests</p>
                      <p className="text-xs text-slate-500 mt-1">There are no rejected registration requests recorded in the system.</p>
                    </td>
                  </tr>
                ) : (
                  rejectedRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-rose-50/20 transition-colors">
                      {/* Name & Login ID */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{req.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Login ID: {req.loginId}
                        </div>
                      </td>

                      {/* Requested Role */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getRoleBadgeStyle(req.requestedRole)}`}>
                          {req.requestedRole}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-4 max-w-xs">
                        <div className="text-rose-700 bg-rose-50 border border-rose-200 rounded px-2.5 py-1 text-[11px] leading-relaxed">
                          {req.rejectionReason || 'Registration declined by Station Administrator.'}
                        </div>
                      </td>

                      {/* Admin */}
                      <td className="px-4 py-4 text-slate-700 font-medium text-[11px]">
                        {req.reviewedBy || 'Administrator'}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-slate-500 font-mono text-[11px]">
                        {req.reviewedAt || req.createdAt}
                      </td>

                      {/* Reopen Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleReopenRequest(req)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                          title="Move back to Pending Review"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen Request</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. APPROVE REQUEST MODAL (Requirement 3: Explicit role confirmation & authorization) */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Approve Account Registration</h3>
                  <p className="text-[10px] text-emerald-300">Phase 6.7.2 Admin Authorization Protocol</p>
                </div>
              </div>
              <button
                onClick={() => setApprovingRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Applicant</span>
                    <span className="font-bold text-slate-900">{approvingRequest.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">System Login ID</span>
                    <span className="font-mono font-bold text-blue-700">{approvingRequest.loginId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Requested Role</span>
                    <span className="font-semibold text-slate-800">{approvingRequest.requestedRole}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration Date</span>
                    <span className="font-mono text-slate-600">{approvingRequest.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Confirm / Select Approved Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Authorized Role *
                </label>
                <select
                  value={approvedRoleSelection}
                  onChange={(e) => setApprovedRoleSelection(e.target.value as CanonicalRole)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="ENCODER">ENCODER — Operational Data Entry & Dispatching</option>
                  <option value="COORDINATOR">COORDINATOR — Key Accounts & Deliveries</option>
                  <option value="TRUCK_PLANNER">TRUCK PLANNER — Route Planning & Vehicle Assignment</option>
                  <option value="DISPATCHER">DISPATCHER — Gate Logistics & Transport Dispatch Execution</option>
                  <option value="DRIVER">DRIVER — Simple Mobile Delivery Portal</option>
                  <option value="VIEWER">VIEWER — Read-Only Operational Monitoring</option>
                  <option value="MANAGEMENT">MANAGEMENT / SUPERVISOR — Operational Oversight</option>
                  <option value="ADMIN">ADMIN — System Administrator (Full Access)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upon approval, this account will be activated and will be routed to the portal corresponding to <strong className="text-slate-800">{approvedRoleSelection}</strong>.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  Approving this request records your administrator signature (<strong className="font-semibold">{currentUser.name}</strong>) and grants system login permissions immediately.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovingRequest(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Authorize & Activate Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REJECT REQUEST MODAL (Requirement 3: Rejection with reason and audit timestamp) */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Reject Account Registration</h3>
                  <p className="text-[10px] text-rose-300">Phase 6.7.2 Denial of System Access</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Applicant to Reject</span>
                  <span className="font-bold text-slate-900">{rejectingRequest.name}</span> ({rejectingRequest.loginId})
                </div>
                <div className="text-slate-600 text-[11px]">
                  Requested Role: <strong className="text-slate-800">{rejectingRequest.requestedRole}</strong> • Submitted: {rejectingRequest.createdAt}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Rejection Reason (Audit Log & Applicant Message) *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Specify why this registration request is being rejected..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Unverified credentials',
                  'Unauthorized applicant',
                  'Duplicate registration request',
                  'Incorrect role requested',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReasonInput(preset)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer border border-slate-300"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  The applicant will remain strictly blocked from accessing any system screens or data. If they attempt to sign in, they will receive this rejection notice.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Confirm Rejection & Deny Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DIRECT ADMIN PROVISIONING MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                  OFII
                </div>
                <div>
                  <h3 className="font-bold text-sm">Provision Personnel Account</h3>
                  <p className="text-[10px] text-blue-200">Direct Administrator Provisioning (Pre-Approved)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned System Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as CanonicalRole)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="ADMIN">ADMIN (Full System Access & User Management)</option>
                  <option value="ENCODER">ENCODER (Daily Dispatch & Forwarding Data Entry)</option>
                  <option value="COORDINATOR">COORDINATOR (Client Accounts & Consignment Tracking)</option>
                  <option value="TRUCK_PLANNER">TRUCK PLANNER (Route Planning & Truck Runs)</option>
                  <option value="DISPATCHER">DISPATCHER (Gate Logistics & Dispatch Execution)</option>
                  <option value="DRIVER">DRIVER (Dedicated Mobile Delivery Portal)</option>
                  <option value="VIEWER">VIEWER (Read-Only Operational Monitoring)</option>
                  <option value="MANAGEMENT">MANAGEMENT / SUPERVISOR (KPI Oversight & Performance)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Department will automatically align to: <strong className="text-slate-700">{getDepartmentForRole(newRole)}</strong>
                </p>
              </div>

              {/* Conditional: Driver Vehicle Plate */}
              {newRole === 'DRIVER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Vehicle Plate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NDB-4921"
                    value={newVehiclePlate}
                    onChange={(e) => setNewVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              {/* Conditional: Coordinator Assigned Clients */}
              {newRole === 'COORDINATOR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Client Names (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Philippine Charity Sweepstakes Office, Alexandria"
                    value={newAssignedClients}
                    onChange={(e) => setNewAssignedClients(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 chars"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
                >
                  Confirm & Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CHANGE ROLE MODAL */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Change Role for {roleChangeUser.name}
            </h3>
            <p className="text-xs text-slate-600">
              Select the new primary role. The user will be automatically redirected to their new role portal on next login.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Role
              </label>
              <select
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value as CanonicalRole)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="ADMIN">ADMIN — Full System Operations & User Administration</option>
                <option value="ENCODER">ENCODER — Operations Data Entry & Excel Import</option>
                <option value="COORDINATOR">COORDINATOR — Assigned Accounts & Consignment Tracking</option>
                <option value="TRUCK_PLANNER">TRUCK PLANNER — Route Planning & Vehicle Assignment</option>
                <option value="DISPATCHER">DISPATCHER — Gate Logistics & Transport Dispatch Execution</option>
                <option value="DRIVER">DRIVER — Simple Mobile Delivery Portal</option>
                <option value="VIEWER">VIEWER — Read-Only Operational Monitoring</option>
                <option value="MANAGEMENT">MANAGEMENT / SUPERVISOR — KPI Monitoring & Oversight</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleChangeUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
              >
                Apply Role Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. RESET PASSWORD MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Reset Password for {passwordResetUser.name}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Set a temporary or updated password for Login ID: <span className="font-mono font-bold text-blue-700">{passwordResetUser.loginId || passwordResetUser.username}</span>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 6 characters"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat new password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPasswordReset}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm cursor-pointer"
              >
                Set New Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
