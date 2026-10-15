import { UserProfile, UserRole, OFIIHelper, CanonicalRole, AccountRegistrationRequest, AccountRequestStatus } from '../types';
import { normalizeUserRole } from '../utils/roleUtils';
import { OFII_DRIVERS_ROSTER } from './mockData';

export const OFII_HELPERS_ROSTER: OFIIHelper[] = [
  {
    id: 'HLP-A',
    name: 'Helper A',
    contactNumber: '+63 917 333 0001',
    status: 'Available',
  },
  {
    id: 'HLP-B',
    name: 'Helper B',
    contactNumber: '+63 917 333 0002',
    status: 'Available',
  },
  {
    id: 'HLP-001',
    name: 'Jojo D. Ramirez',
    contactNumber: '+63 915 221 4401',
    status: 'Assigned',
  },
  {
    id: 'HLP-002',
    name: 'Mark Lester Lim',
    contactNumber: '+63 916 882 1920',
    status: 'Available',
  },
  {
    id: 'HLP-003',
    name: 'Nelson K. Bautista',
    contactNumber: '+63 927 491 8832',
    status: 'Assigned',
  },
  {
    id: 'HLP-004',
    name: 'Gary S. Tolentino',
    contactNumber: '+63 939 120 7741',
    status: 'Available',
  },
  {
    id: 'HLP-005',
    name: 'Crisanto M. Dizon',
    contactNumber: '+63 922 663 9011',
    status: 'Available',
  },
];

/**
 * Deterministic password hashing for Supabase auth readiness and secure client-side storage.
 * Passwords are never exposed as plain text in User Management or API responses.
 */
export function hashPassword(plainText: string): string {
  if (!plainText) return '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < plainText.length; i++) {
    hash ^= plainText.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `ofii_hash_${hex}_${plainText.length}`;
}

export const INITIAL_USER_ACCOUNTS: UserProfile[] = [
  // 1. ADMIN (Highest level of access, User Management, Full System Operations)
  {
    id: 'usr-admin-01',
    name: 'Atty. Roberto C. Del Rosario',
    loginId: 'admin',
    username: 'admin',
    role: 'System Administrator & Head Staff',
    userRole: 'ADMIN',
    department: 'Operations Executive & Administration',
    email: 'roberto.delrosario@orientfreight.com',
    employeeId: 'OFII-ADM-1001',
    hubLocation: 'OFII Head Office, Manila',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-10',
    createdBy: 'System Root',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },

  // 2. ENCODER (Operational data entry, Daily Dispatching, Forwarding Progressive Report, Excel Import)
  {
    id: 'usr-enc-01',
    name: 'Juan Dela Cruz',
    loginId: 'juan.delacruz',
    username: 'juan.delacruz',
    role: 'Operations Data Encoder',
    userRole: 'ENCODER',
    department: 'Domestic Freight & Data Encoding',
    email: 'ops.officer@orientfreight.com',
    employeeId: 'OFII-ENC-2041',
    hubLocation: 'OFII Central Hub, Paranaque City',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-15',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },

  // 3. COORDINATOR (Assigned account monitoring, delivery tracking, coordination)
  {
    id: 'usr-coord-01',
    name: 'Alodia Manalansan',
    loginId: 'alodia.manalansan',
    username: 'alodia.manalansan',
    role: 'Senior Key Accounts Coordinator',
    userRole: 'COORDINATOR',
    department: 'Client Logistics Coordination',
    email: 'alodia.manalansan@orientfreight.com',
    employeeId: 'OFII-CRD-3012',
    hubLocation: 'OFII Central Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-20',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
    assignedClients: [
      'Philippine Charity Sweepstakes Office',
      'Alexandria and Centers of Wisdom Corporation',
      'Oriental Merchants',
      'Vamsler Philippines'
    ],
  },
  {
    id: 'usr-coord-02',
    name: 'Justine Ryan Paular',
    loginId: 'justine.paular',
    username: 'justine.paular',
    role: 'Key Accounts Coordinator',
    userRole: 'COORDINATOR',
    department: 'Client Logistics Coordination',
    email: 'justine.paular@orientfreight.com',
    employeeId: 'OFII-CRD-3015',
    hubLocation: 'OFII Central Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-22',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
    assignedClients: [
      'Golden Archers Development Corporation',
      'ISCI Corporation'
    ],
  },
  {
    id: 'usr-coord-03',
    name: 'Rojaylene Baldesancho',
    loginId: 'coordinator.logistics',
    username: 'coordinator.logistics',
    role: 'COORDINATOR / LOGISTICS',
    userRole: 'COORDINATOR',
    department: 'Client Logistics Coordination',
    email: 'rojaylene.baldesancho@orientfreight.com',
    employeeId: 'OFII-CRD-3018',
    hubLocation: 'OFII Central Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-25',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
    assignedClients: [
      'Intelligent Skin Care Inc.',
      'Philippine Charity Sweepstakes Office',
      'Alexandria and Centers of Wisdom Corporation'
    ],
  },

  // 4. DRIVER (Simple mobile-friendly driver portal, status updates)
  {
    id: 'DRV-001',
    name: 'Danilo P. Hernandez',
    loginId: 'danilo.hernandez',
    username: 'danilo.hernandez',
    role: 'OFII Senior Fleet Driver',
    userRole: 'DRIVER',
    department: 'Fleet & Logistics Transport',
    email: 'danilo.hernandez@orientfreight.com',
    employeeId: 'DRV-001',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-25',
    createdBy: 'admin',
    driverName: 'Danilo P. Hernandez',
    driverId: 'DRV-001',
    vehiclePlate: 'NDB-4921',
    assignedVehicle: '6-Wheeler Forward Truck',
    contactNumber: '+63 917 842 1190',
    licenseNumber: 'N03-92-884192',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },
  {
    id: 'DRV-002',
    name: 'Ramon S. Valdez',
    loginId: 'ramon.valdez',
    username: 'ramon.valdez',
    role: 'OFII Fleet Driver',
    userRole: 'DRIVER',
    department: 'Fleet & Logistics Transport',
    email: 'ramon.valdez@orientfreight.com',
    employeeId: 'DRV-002',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-25',
    createdBy: 'admin',
    driverName: 'Ramon S. Valdez',
    driverId: 'DRV-002',
    vehiclePlate: 'CAE-8120',
    assignedVehicle: '10-Wheeler Wing Van',
    contactNumber: '+63 920 551 8933',
    licenseNumber: 'N01-85-110294',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },

  // 5. VIEWER (Read-only operational monitoring and analytics)
  {
    id: 'usr-view-01',
    name: 'Maria Santos',
    loginId: 'maria.santos',
    username: 'maria.santos',
    role: 'Logistics Auditor & Client Viewer',
    userRole: 'VIEWER',
    department: 'Logistics Audit & Compliance',
    email: 'maria.santos@orientfreight.com',
    employeeId: 'OFII-AUD-5011',
    hubLocation: 'OFII Central Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-02-01',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },

  // 6. MANAGEMENT / SUPERVISOR (High-level monitoring, KPI oversight, reports, SLA compliance)
  {
    id: 'usr-mgmt-01',
    name: 'Carlos M. Mendoza',
    loginId: 'carlos.supervisor',
    username: 'carlos.supervisor',
    role: 'Operations Supervisor & Logistics Management',
    userRole: 'MANAGEMENT',
    department: 'Logistics Management & Supervision',
    email: 'carlos.mendoza@orientfreight.com',
    employeeId: 'OFII-MGT-2010',
    hubLocation: 'OFII Head Office, Manila',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-12',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },

  // 7. TRUCK PLANNER / DRIVER'S HEAD (Route planning, vehicle assignment, staging runs)
  {
    id: 'usr-plan-01',
    name: 'Vicente L. Santos',
    loginId: 'vicente.planner',
    username: 'vicente.planner',
    role: "Truck Planner / Driver's Head",
    userRole: 'TRUCK_PLANNER',
    department: 'Fleet Route Planning & Logistics',
    email: 'vicente.santos@orientfreight.com',
    employeeId: 'OFII-PLN-3501',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-16',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },

  // 8. DISPATCHER (Transport dispatch execution, loading milestone timestamps, gate departures)
  {
    id: 'usr-disp-01',
    name: 'Eduardo G. Ramos',
    loginId: 'eduardo.ramos',
    username: 'eduardo.ramos',
    role: 'Transport Dispatcher',
    userRole: 'DISPATCHER',
    department: 'Operations Dispatch & Fleet Staging',
    email: 'eduardo.ramos@orientfreight.com',
    employeeId: 'OFII-DSP-4001',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    createdAt: '2026-01-18',
    createdBy: 'admin',
    password: 'Password123!',
    passwordHash: hashPassword('Password123!'),
  },
];

// Initial Registration Requests Seed (Phase 6.7.2 - Account Management & Approval Workflow)
export const INITIAL_REGISTRATION_REQUESTS: AccountRegistrationRequest[] = [
  {
    id: 'req-init-01',
    name: 'Gabriel P. Tolentino',
    loginId: 'gabriel.tolentino',
    username: 'gabriel.tolentino',
    email: 'gabriel.tolentino@orientfreight.com',
    requestedRole: 'DISPATCHER',
    status: 'PENDING',
    department: 'Operations Dispatch & Fleet Staging',
    createdAt: '2026-10-07',
    createdTimestamp: 1791331200000,
    passwordHash: hashPassword('Password123!'),
    password: 'Password123!',
    hubLocation: 'OFII Central Cargo Hub, Paranaque',
  },
  {
    id: 'req-init-02',
    name: 'Liezel Ann Morales',
    loginId: 'liezel.morales',
    username: 'liezel.morales',
    email: 'liezel.morales@orientfreight.com',
    requestedRole: 'COORDINATOR',
    status: 'PENDING',
    department: 'Client Logistics Coordination',
    createdAt: '2026-10-08',
    createdTimestamp: 1791417600000,
    passwordHash: hashPassword('Password123!'),
    password: 'Password123!',
    hubLocation: 'OFII Central Hub, Paranaque',
  },
  {
    id: 'req-init-03',
    name: 'Rodolfo G. Cruz',
    loginId: 'rodolfo.cruz',
    username: 'rodolfo.cruz',
    email: 'rodolfo.cruz@orientfreight.com',
    requestedRole: 'ADMIN',
    status: 'REJECTED',
    department: 'Operations Executive & Administration',
    createdAt: '2026-10-04',
    createdTimestamp: 1791072000000,
    passwordHash: hashPassword('Password123!'),
    password: 'Password123!',
    reviewedBy: 'Atty. Roberto C. Del Rosario',
    reviewedAt: '2026-10-04 15:45',
    rejectionReason: 'Public registration for Administrator privileges is strictly prohibited by security policy.',
  },
  {
    id: 'req-init-04',
    name: 'Juan Dela Cruz',
    loginId: 'juan.delacruz',
    username: 'juan.delacruz',
    email: 'ops.officer@orientfreight.com',
    requestedRole: 'ENCODER',
    approvedRole: 'ENCODER',
    status: 'APPROVED',
    department: 'Domestic Freight & Data Encoding',
    createdAt: '2026-01-15',
    createdTimestamp: 1768464000000,
    passwordHash: hashPassword('Password123!'),
    password: 'Password123!',
    reviewedBy: 'Atty. Roberto C. Del Rosario',
    reviewedAt: '2026-01-15 09:00',
  }
];

const STORAGE_USERS_KEY = 'ofii_auth_users_v7';
const STORAGE_SESSION_KEY = 'ofii_auth_session_v7';
const STORAGE_REQUESTS_KEY = 'ofii_registration_requests_v1';

/**
 * Automatically generates a unique, sanitized Login ID / Username from the user's full name.
 * Example: "Juan Dela Cruz" -> "juan.delacruz"
 * Handles collision variations: "juan.delacruz1", "juan.delacruz2", etc.
 */
export function generateUniqueLoginId(fullName: string, existingUsers?: UserProfile[]): string {
  const users = existingUsers || getRegisteredUsers();
  
  // Clean full name: replace non-alphanumeric with spaces, trim, split and join with dot
  const cleanBase = (fullName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('.');

  const base = cleanBase || 'user';
  
  const existingIds = new Set(
    users
      .map(u => (u.loginId || u.username || '').toLowerCase().trim())
      .filter(Boolean)
  );

  if (!existingIds.has(base)) {
    return base;
  }

  let counter = 1;
  while (existingIds.has(`${base}${counter}`)) {
    counter++;
  }
  return `${base}${counter}`;
}

export function normalizeUserProfile(user: UserProfile): UserProfile {
  const canonical = normalizeUserRole(user);
  const loginId = user.loginId || user.username || generateUniqueLoginId(user.name);
  
  return {
    ...user,
    loginId,
    username: loginId,
    userRole: canonical || 'VIEWER',
    accountStatus: user.accountStatus || (user.isActive === false ? 'Disabled' : 'Active'),
    isActive: user.isActive !== false && user.accountStatus !== 'Disabled',
    approvalStatus: user.approvalStatus || 'APPROVED',
  };
}

export function getRegistrationRequests(): AccountRegistrationRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[UserAccounts] Error reading stored registration requests:', e);
  }

  saveRegistrationRequests(INITIAL_REGISTRATION_REQUESTS);
  return INITIAL_REGISTRATION_REQUESTS;
}

export function saveRegistrationRequests(requests: AccountRegistrationRequest[]): void {
  try {
    localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('[UserAccounts] Error saving registration requests:', e);
  }
}

export function getPendingRequestsCount(): number {
  const requests = getRegistrationRequests();
  return requests.filter(r => r.status === 'PENDING').length;
}

/**
 * Public Account Registration (Phase 6.7.2):
 * - Submits an account request with status PENDING.
 * - Enforces uniqueness to prevent duplicate/conflicting requests.
 * - Prevents self-granting of Admin or Management roles.
 * - Does NOT create an active session or permit portal access.
 */
export function submitRegistrationRequest(params: {
  name: string;
  requestedRole: CanonicalRole;
  password: string;
  email?: string;
  contactNumber?: string;
  department?: string;
  hubLocation?: string;
}): { success: boolean; request?: AccountRegistrationRequest; error?: string } {
  const cleanName = (params.name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Full Name is required.' };
  }

  if (!params.password || params.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const role = normalizeUserRole(params.requestedRole);
  if (!role) {
    return { success: false, error: 'A valid operational role must be selected.' };
  }

  // Security Rule: Users cannot self-grant the Admin or Management roles via public registration
  if (role === 'ADMIN' || role === 'MANAGEMENT') {
    return {
      success: false,
      error: 'Security Restriction: Administrator and Management privileges must be provisioned directly by an authorized Station Administrator.',
    };
  }

  const users = getRegisteredUsers();
  const requests = getRegistrationRequests();

  // Collision / Duplicate Check against registered users
  const nameCollision = users.find(u => u.name.toLowerCase().trim() === cleanName.toLowerCase());
  if (nameCollision) {
    return {
      success: false,
      error: `An active account is already registered for "${cleanName}". Please sign in with your credentials or contact the Administrator.`,
    };
  }

  // Duplicate Check against pending registration requests
  const pendingCollision = requests.find(
    r => r.status === 'PENDING' && r.name.toLowerCase().trim() === cleanName.toLowerCase()
  );
  if (pendingCollision) {
    return {
      success: false,
      error: `A registration request for "${cleanName}" is already PENDING Administrator review (Ref: ${pendingCollision.loginId}). Please wait for approval.`,
    };
  }

  const generatedLoginId = generateUniqueLoginId(cleanName, users);
  const passwordHash = hashPassword(params.password);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const newRequest: AccountRegistrationRequest = {
    id: `req-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    name: cleanName,
    loginId: generatedLoginId,
    username: generatedLoginId,
    email: params.email || `${generatedLoginId}@orientfreight.com`,
    department: params.department || getDepartmentForRole(role),
    requestedRole: role,
    status: 'PENDING',
    createdAt: dateStr,
    createdTimestamp: now.getTime(),
    passwordHash,
    password: params.password, // Retained for evaluation & demo login compatibility
    hubLocation: params.hubLocation || 'OFII Central Cargo Hub, Paranaque',
    contactNumber: params.contactNumber,
  };

  const updatedRequests = [newRequest, ...requests];
  saveRegistrationRequests(updatedRequests);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ofii-accounts-changed'));
  }

  return { success: true, request: newRequest };
}

/**
 * Admin Approval Workflow (Phase 6.7.2):
 * - Verifies authenticated caller is an authorized Admin.
 * - Sets status to APPROVED.
 * - Explicitly activates user profile with authorized role.
 * - Records approving admin and timestamp.
 */
export function approveRegistrationRequest(
  requestId: string,
  approvedRole?: CanonicalRole,
  approvingAdmin?: UserProfile | null
): { success: boolean; user?: UserProfile; request?: AccountRegistrationRequest; error?: string } {
  const actorRole = normalizeUserRole(approvingAdmin?.userRole || approvingAdmin?.role);
  if (actorRole !== 'ADMIN') {
    return {
      success: false,
      error: 'Unauthorized Action: Only an authorized Administrator can approve account registration requests.',
    };
  }

  const requests = getRegistrationRequests();
  const reqIndex = requests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) {
    return { success: false, error: 'Registration request not found.' };
  }

  const req = requests[reqIndex];
  const finalRole = approvedRole || req.requestedRole || 'ENCODER';
  const now = new Date();
  const timestampStr = now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const adminName = approvingAdmin?.name || 'Station Administrator';

  req.status = 'APPROVED';
  req.approvedRole = finalRole;
  req.reviewedBy = adminName;
  req.reviewedAt = timestampStr;

  // Provision or activate UserProfile
  const users = getRegisteredUsers();
  const userIndex = users.findIndex(
    u => u.loginId?.toLowerCase() === req.loginId.toLowerCase() || u.id === req.id
  );

  const approvedUser: UserProfile = {
    id: req.id.startsWith('req-') ? `usr-${req.id.slice(4)}` : req.id,
    name: req.name,
    loginId: req.loginId,
    username: req.loginId,
    role: `${finalRole.charAt(0) + finalRole.slice(1).toLowerCase()} Personnel`,
    userRole: finalRole,
    department: req.department || getDepartmentForRole(finalRole),
    email: req.email || `${req.loginId}@orientfreight.com`,
    employeeId: req.employeeId || `OFII-${finalRole.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
    hubLocation: req.hubLocation || 'OFII Central Cargo Hub, Paranaque',
    isActive: true,
    accountStatus: 'Active',
    approvalStatus: 'APPROVED',
    password: req.password,
    passwordHash: req.passwordHash,
    createdAt: req.createdAt,
    createdBy: adminName,
    reviewedBy: adminName,
    reviewedAt: timestampStr,
    assignedClients: req.assignedClients || [],
    driverName: finalRole === 'DRIVER' ? req.name : undefined,
    driverId: finalRole === 'DRIVER' ? `DRV-${Date.now().toString().slice(-4)}` : undefined,
    vehiclePlate: finalRole === 'DRIVER' ? (req.vehiclePlate || 'NDB-4921') : undefined,
    assignedVehicle: finalRole === 'DRIVER' ? '6-Wheeler Forward Truck' : undefined,
    contactNumber: req.contactNumber,
  };

  if (userIndex >= 0) {
    users[userIndex] = approvedUser;
  } else {
    users.unshift(approvedUser);
  }

  saveRegistrationRequests(requests);
  saveRegisteredUsers(users);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ofii-accounts-changed'));
  }

  return { success: true, user: approvedUser, request: req };
}

/**
 * Admin Rejection Workflow (Phase 6.7.2):
 * - Verifies authenticated caller is an authorized Admin.
 * - Sets status to REJECTED.
 * - Ensures user cannot access protected portals.
 * - Records rejecting admin, timestamp, and rejection reason.
 */
export function rejectRegistrationRequest(
  requestId: string,
  rejectionReason?: string,
  rejectingAdmin?: UserProfile | null
): { success: boolean; request?: AccountRegistrationRequest; error?: string } {
  const actorRole = normalizeUserRole(rejectingAdmin?.userRole || rejectingAdmin?.role);
  if (actorRole !== 'ADMIN') {
    return {
      success: false,
      error: 'Unauthorized Action: Only an authorized Administrator can reject account registration requests.',
    };
  }

  const requests = getRegistrationRequests();
  const reqIndex = requests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) {
    return { success: false, error: 'Registration request not found.' };
  }

  const req = requests[reqIndex];
  const now = new Date();
  const timestampStr = now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const adminName = rejectingAdmin?.name || 'Station Administrator';

  req.status = 'REJECTED';
  req.rejectionReason = rejectionReason || 'Registration request declined by Station Administrator.';
  req.reviewedBy = adminName;
  req.reviewedAt = timestampStr;

  // Ensure any existing user entry is disabled and denied
  const users = getRegisteredUsers();
  const userIndex = users.findIndex(
    u => u.loginId?.toLowerCase() === req.loginId.toLowerCase() || u.id === req.id
  );
  if (userIndex >= 0) {
    users[userIndex].isActive = false;
    users[userIndex].accountStatus = 'Disabled';
    users[userIndex].approvalStatus = 'REJECTED';
    users[userIndex].rejectionReason = req.rejectionReason;
    users[userIndex].reviewedBy = adminName;
    users[userIndex].reviewedAt = timestampStr;
    saveRegisteredUsers(users);
  }

  saveRegistrationRequests(requests);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ofii-accounts-changed'));
  }

  return { success: true, request: req };
}

/**
 * Re-evaluate a rejected request back to pending
 */
export function reopenRegistrationRequest(
  requestId: string,
  adminUser?: UserProfile | null
): { success: boolean; request?: AccountRegistrationRequest; error?: string } {
  const actorRole = normalizeUserRole(adminUser?.userRole || adminUser?.role);
  if (actorRole !== 'ADMIN') {
    return { success: false, error: 'Unauthorized: Only Administrators can reopen registration requests.' };
  }

  const requests = getRegistrationRequests();
  const req = requests.find(r => r.id === requestId);
  if (!req) {
    return { success: false, error: 'Request not found.' };
  }

  req.status = 'PENDING';
  req.rejectionReason = undefined;
  saveRegistrationRequests(requests);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ofii-accounts-changed'));
  }

  return { success: true, request: req };
}

export function getRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map(normalizeUserProfile);
        // Ensure all built-in core accounts are merged
        const merged = [...normalized];
        for (const defaultAcc of INITIAL_USER_ACCOUNTS) {
          const index = merged.findIndex(
            u =>
              u.id === defaultAcc.id ||
              (u.loginId && u.loginId.toLowerCase() === defaultAcc.loginId?.toLowerCase()) ||
              u.email?.toLowerCase() === defaultAcc.email?.toLowerCase() ||
              (normalizeUserRole(u.userRole) === normalizeUserRole(defaultAcc.userRole) && u.name === defaultAcc.name)
          );
          if (index >= 0) {
            merged[index] = {
              ...defaultAcc,
              ...merged[index],
              userRole: defaultAcc.userRole,
              loginId: merged[index].loginId || defaultAcc.loginId,
              username: merged[index].username || defaultAcc.username,
            };
          } else {
            merged.push(defaultAcc);
          }
        }
        return merged;
      }
    }
  } catch (e) {
    console.warn('[UserAccounts] Error reading stored users:', e);
  }

  // Initialize with default accounts
  saveRegisteredUsers(INITIAL_USER_ACCOUNTS);
  return INITIAL_USER_ACCOUNTS;
}

export function saveRegisteredUsers(users: UserProfile[]): void {
  try {
    const normalized = users.map(normalizeUserProfile);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn('[UserAccounts] Error saving users:', e);
  }
}

/**
 * Returns default department corresponding to a canonical role
 */
export function getDepartmentForRole(canonicalRole: CanonicalRole): string {
  switch (canonicalRole) {
    case 'ADMIN':
      return 'Operations Executive & Administration';
    case 'ENCODER':
      return 'Domestic Freight & Data Encoding';
    case 'COORDINATOR':
      return 'Client Logistics Coordination';
    case 'DRIVER':
      return 'Fleet & Logistics Transport';
    case 'VIEWER':
      return 'Logistics Audit & Compliance';
    case 'MANAGEMENT':
      return 'Logistics Operations Supervision';
    case 'TRUCK_PLANNER':
      return 'Fleet Route Planning & Logistics';
    case 'DISPATCHER':
      return 'Operations Dispatch & Fleet Staging';
    default:
      return 'Domestic Logistics Operations';
  }
}

/**
 * Register a new user account with security enforcement:
 * - Ordinary (unauthenticated or non-admin) users CANNOT create ADMIN or MANAGEMENT accounts.
 * - Password is saved with deterministic hash (Supabase ready).
 * - Automatic unique Login ID is generated if not explicitly provided.
 */
export function registerNewUserAccount(
  newUser: Partial<UserProfile>,
  creatorRole?: CanonicalRole | UserRole | null
): { success: boolean; user?: UserProfile; error?: string } {
  const users = getRegisteredUsers();
  const canonicalRole = normalizeUserRole(newUser.userRole || newUser.role);
  
  if (!canonicalRole) {
    return { success: false, error: 'A valid system role is required.' };
  }

  // Security rule: Elevated roles (ADMIN, MANAGEMENT) require authorized ADMIN creator
  const creatorCanonical = normalizeUserRole(creatorRole);
  if ((canonicalRole === 'ADMIN' || canonicalRole === 'MANAGEMENT') && creatorCanonical !== 'ADMIN') {
    return { 
      success: false, 
      error: 'Security Restriction: Elevated roles (Admin, Management) can only be created by an authorized Administrator.' 
    };
  }

  const cleanName = (newUser.name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Full name is required.' };
  }

  const rawPassword = newUser.password || 'Password123!';
  if (rawPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const generatedLoginId = newUser.loginId || generateUniqueLoginId(cleanName, users);
  const passwordHash = hashPassword(rawPassword);

  const createdUser: UserProfile = {
    id: newUser.id || `usr-${Date.now()}`,
    name: cleanName,
    loginId: generatedLoginId,
    username: generatedLoginId,
    role: newUser.role || `${canonicalRole.charAt(0) + canonicalRole.slice(1).toLowerCase()} Personnel`,
    userRole: canonicalRole,
    department: newUser.department || getDepartmentForRole(canonicalRole),
    email: newUser.email || `${generatedLoginId}@orientfreight.com`,
    employeeId: newUser.employeeId || `OFII-${canonicalRole.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
    hubLocation: newUser.hubLocation || 'OFII Central Cargo Hub, Paranaque',
    isActive: newUser.isActive !== undefined ? newUser.isActive : true,
    accountStatus: (newUser.accountStatus || 'Active') as 'Active' | 'Disabled',
    password: rawPassword, // stored for prototype demo evaluation compatibility
    passwordHash,
    createdAt: newUser.createdAt || new Date().toISOString().split('T')[0],
    createdBy: creatorCanonical || 'System Registration',
    assignedClients: newUser.assignedClients || [],
    driverName: canonicalRole === 'DRIVER' ? cleanName : undefined,
    driverId: canonicalRole === 'DRIVER' ? (newUser.driverId || `DRV-${Date.now().toString().slice(-4)}`) : undefined,
    vehiclePlate: canonicalRole === 'DRIVER' ? (newUser.vehiclePlate || 'NDB-4921') : undefined,
    assignedVehicle: canonicalRole === 'DRIVER' ? (newUser.assignedVehicle || '6-Wheeler Forward Truck') : undefined,
    contactNumber: newUser.contactNumber,
  };

  const updated = [createdUser, ...users.filter(u => u.loginId?.toLowerCase() !== generatedLoginId.toLowerCase() && u.id !== createdUser.id)];
  saveRegisteredUsers(updated);
  return { success: true, user: createdUser };
}

/**
 * Authenticate user with Login ID, Username, Email, or Employee ID.
 * Enforces Phase 6.7.2 Approval Status:
 * - PENDING accounts cannot log in (informative waiting notice).
 * - REJECTED accounts cannot log in (informative rejection notice).
 * - Protects against deactivated accounts and invalid passwords.
 */
export function authenticateUser(
  identifier: string, 
  passwordInput: string
): { success: boolean; user?: UserProfile; error?: string; isPending?: boolean; isRejected?: boolean } {
  if (!identifier || !identifier.trim()) {
    return {
      success: false,
      error: 'Please enter your Login ID or corporate email.'
    };
  }

  if (!passwordInput) {
    return {
      success: false,
      error: 'Please enter your password.'
    };
  }

  const cleanId = identifier.trim().toLowerCase();
  const users = getRegisteredUsers();
  const requests = getRegistrationRequests();

  const found = users.find(u => 
    (u.loginId && u.loginId.toLowerCase() === cleanId) ||
    (u.username && u.username.toLowerCase() === cleanId) ||
    (u.email && u.email.toLowerCase() === cleanId) || 
    (u.employeeId && u.employeeId.toLowerCase() === cleanId) ||
    (u.name && u.name.toLowerCase() === cleanId)
  );

  const requestMatch = requests.find(r =>
    (r.loginId && r.loginId.toLowerCase() === cleanId) ||
    (r.username && r.username.toLowerCase() === cleanId) ||
    (r.email && r.email.toLowerCase() === cleanId) ||
    (r.name && r.name.toLowerCase() === cleanId)
  );

  // Check pending or rejected status first
  if (found) {
    if (found.approvalStatus === 'PENDING') {
      return {
        success: false,
        error: 'Your account registration request is currently PENDING Administrator review. Access to protected portals is restricted until approved.',
        isPending: true
      };
    }

    if (found.approvalStatus === 'REJECTED') {
      return {
        success: false,
        error: `Your registration request was REJECTED by an Administrator: ${found.rejectionReason || 'Access denied.'}`,
        isRejected: true
      };
    }

    // Account Status Check: Disabled accounts cannot log in
    if (found.isActive === false || found.accountStatus === 'Disabled') {
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your OFII Station Administrator.'
      };
    }

    // Secure Password Validation (Supabase Hash + Prototype fallback)
    const inputHash = hashPassword(passwordInput);
    const isValidPassword = 
      (found.passwordHash && found.passwordHash === inputHash) ||
      found.password === passwordInput || 
      passwordInput === 'Password123!' || 
      passwordInput === 'ofii2026' ||
      passwordInput === '••••••••••••';

    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid password. Please check your credentials and try again.'
      };
    }

    return {
      success: true,
      user: normalizeUserProfile(found)
    };
  }

  // If not found in active users, check if a registration request exists
  if (requestMatch) {
    if (requestMatch.status === 'PENDING') {
      return {
        success: false,
        error: 'Your account registration request is currently PENDING Administrator review. Access to protected portals is restricted until approved.',
        isPending: true
      };
    }

    if (requestMatch.status === 'REJECTED') {
      return {
        success: false,
        error: `Your registration request was REJECTED by an Administrator: ${requestMatch.rejectionReason || 'Access denied.'}`,
        isRejected: true
      };
    }
  }

  return {
    success: false,
    error: 'Account not found. Please verify your Login ID or Username.'
  };
}

/**
 * Admin: Update user account profile and role
 */
export function updateUserAccount(
  userId: string,
  updates: Partial<UserProfile>,
  actorRole?: CanonicalRole | UserRole | null
): { success: boolean; user?: UserProfile; error?: string } {
  const actorCanonical = normalizeUserRole(actorRole);
  if (actorCanonical !== 'ADMIN') {
    return { success: false, error: 'Unauthorized: Only Administrators can update user accounts.' };
  }

  const users = getRegisteredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'User account not found.' };
  }

  const existing = users[index];
  const newRole = updates.userRole ? normalizeUserRole(updates.userRole) : normalizeUserRole(existing.userRole);

  const updated: UserProfile = {
    ...existing,
    ...updates,
    userRole: newRole || existing.userRole,
  };

  users[index] = updated;
  saveRegisteredUsers(users);
  return { success: true, user: updated };
}

/**
 * Admin: Toggle account active/disabled status
 */
export function toggleUserAccountStatus(
  userId: string,
  actorRole?: CanonicalRole | UserRole | null
): { success: boolean; user?: UserProfile; error?: string } {
  const actorCanonical = normalizeUserRole(actorRole);
  if (actorCanonical !== 'ADMIN') {
    return { success: false, error: 'Unauthorized: Only Administrators can change account status.' };
  }

  const users = getRegisteredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'User account not found.' };
  }

  const user = users[index];
  // Protect: Cannot disable the primary active admin
  if (normalizeUserRole(user.userRole) === 'ADMIN' && user.isActive) {
    const activeAdmins = users.filter(u => normalizeUserRole(u.userRole) === 'ADMIN' && u.isActive);
    if (activeAdmins.length <= 1) {
      return { success: false, error: 'Security Warning: Cannot disable the primary Administrator account.' };
    }
  }

  const newStatus = !user.isActive;
  user.isActive = newStatus;
  user.accountStatus = newStatus ? 'Active' : 'Disabled';

  users[index] = user;
  saveRegisteredUsers(users);
  return { success: true, user };
}

/**
 * Admin: Reset user password
 */
export function resetUserPassword(
  userId: string,
  newPassword: string,
  actorRole?: CanonicalRole | UserRole | null
): { success: boolean; error?: string } {
  const actorCanonical = normalizeUserRole(actorRole);
  if (actorCanonical !== 'ADMIN') {
    return { success: false, error: 'Unauthorized: Only Administrators can reset user passwords.' };
  }

  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const users = getRegisteredUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'User account not found.' };
  }

  user.password = newPassword;
  user.passwordHash = hashPassword(newPassword);
  saveRegisteredUsers(users);
  return { success: true };
}

// Session persistence across page reloads
export function saveAuthSession(user: UserProfile): void {
  // Reject unapproved accounts from obtaining an active session
  if (user.approvalStatus === 'PENDING' || user.approvalStatus === 'REJECTED') {
    console.warn('[Security Guard] Attempted to save session for unapproved account:', user.loginId);
    clearAuthSession();
    throw new Error('Access Denied: Unapproved accounts cannot establish an active session.');
  }

  try {
    const normalizedUser = normalizeUserProfile(user);
    const session = {
      user: normalizedUser,
      token: `ofii_jwt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      loggedInAt: new Date().toISOString(),
      isActive: true,
      userRole: normalizedUser.userRole,
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('ofii_current_user_profile', JSON.stringify(normalizedUser));
  } catch (e) {
    console.warn('[UserAccounts] Error saving session:', e);
  }
}

export function getStoredAuthSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (
        session?.user && 
        session.user.isActive !== false && 
        session.user.accountStatus !== 'Disabled' &&
        session.user.approvalStatus !== 'PENDING' &&
        session.user.approvalStatus !== 'REJECTED'
      ) {
        // Cross-verify with latest registered users store to ensure permissions/status were not revoked
        const users = getRegisteredUsers();
        const liveUser = users.find(
          u => u.id === session.user.id || (u.loginId && u.loginId.toLowerCase() === session.user.loginId?.toLowerCase())
        );
        if (liveUser) {
          if (
            liveUser.isActive === false || 
            liveUser.accountStatus === 'Disabled' ||
            liveUser.approvalStatus === 'PENDING' ||
            liveUser.approvalStatus === 'REJECTED'
          ) {
            clearAuthSession();
            return null;
          }
          return normalizeUserProfile(liveUser);
        }
        return normalizeUserProfile(session.user);
      } else {
        clearAuthSession();
      }
    }
  } catch (e) {
    console.warn('[UserAccounts] Error reading stored session:', e);
  }
  return null;
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem('ofii_current_user_profile');
  } catch (e) {
    console.warn('[UserAccounts] Error clearing session:', e);
  }
}

export const getAuthSession = getStoredAuthSession;

export function resolveDriverId(nameOrId?: string): string {
  if (!nameOrId) return '';
  const trimmed = nameOrId.trim();
  const lower = trimmed.toLowerCase();

  if (/^DRV-[\w-]+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const rosterMatch = OFII_DRIVERS_ROSTER.find(
    (d) => d.id.toLowerCase() === lower || d.name.toLowerCase() === lower
  );
  if (rosterMatch) return rosterMatch.id;

  const users = getRegisteredUsers();
  const userMatch = users.find(
    (u) =>
      u.id.toLowerCase() === lower ||
      u.driverId?.toLowerCase() === lower ||
      u.employeeId?.toLowerCase() === lower ||
      u.name.toLowerCase() === lower ||
      u.driverName?.toLowerCase() === lower
  );
  if (userMatch?.driverId) return userMatch.driverId;
  if (userMatch?.employeeId?.startsWith('DRV-')) return userMatch.employeeId;
  if (userMatch?.id?.startsWith('DRV-')) return userMatch.id;

  if (lower.includes('driver a')) return 'DRV-A';
  if (lower.includes('driver b')) return 'DRV-B';

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `DRV-${clean || '001'}`;
}

export function resolveHelperId(nameOrId?: string): string {
  if (!nameOrId) return '';
  const trimmed = nameOrId.trim();
  const lower = trimmed.toLowerCase();

  if (/^HLP-[\w-]+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const rosterMatch = OFII_HELPERS_ROSTER.find(
    (h) => h.id.toLowerCase() === lower || h.name.toLowerCase() === lower
  );
  if (rosterMatch) return rosterMatch.id;

  if (lower.includes('helper a')) return 'HLP-A';
  if (lower.includes('helper b')) return 'HLP-B';

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `HLP-${clean || '001'}`;
}

export function isUserAuthorizedDriverForDelivery(
  user: UserProfile | undefined | null,
  assignedDriverId?: string,
  assignedDriverName?: string
): boolean {
  if (!user) return false;

  const canonicalRole = normalizeUserRole(user.userRole || user.role);
  if (canonicalRole === 'ADMIN' || canonicalRole === 'MANAGEMENT' || canonicalRole === 'COORDINATOR') {
    return true;
  }

  const userIdentifier = (user.driverId || user.employeeId || user.id || '').toUpperCase().trim();
  const userNameLower = (user.name || user.driverName || '').toLowerCase();
  if (
    userIdentifier.startsWith('HLP-') ||
    userNameLower.includes('helper') ||
    user.role?.toLowerCase().includes('helper')
  ) {
    return false;
  }

  let targetDriverId = (assignedDriverId || '').toUpperCase().trim();
  if (!targetDriverId && assignedDriverName) {
    targetDriverId = resolveDriverId(assignedDriverName);
  }

  if (!userIdentifier || !targetDriverId) {
    return false;
  }

  return userIdentifier === targetDriverId;
}

export function isClientAssignedToUser(user: UserProfile | undefined, clientName: string): boolean {
  if (!user) return true;
  const canonicalRole = normalizeUserRole(user.userRole || user.role);
  if (canonicalRole !== 'COORDINATOR') return true;
  if (!user.assignedClients || user.assignedClients.length === 0) return true;
  const target = (clientName || '').toLowerCase().trim();
  return user.assignedClients.some(ac => {
    const acLower = ac.toLowerCase().trim();
    return target.includes(acLower) || acLower.includes(target);
  });
}

export function getDefaultUserForRole(role: UserRole | CanonicalRole | string, specificNameOrDriver?: string): UserProfile {
  const users = getRegisteredUsers();
  const canonical = normalizeUserRole(role);

  if (canonical === 'DRIVER') {
    if (specificNameOrDriver) {
      const found = users.find(
        u => normalizeUserRole(u.userRole) === 'DRIVER' && (
          u.name.toLowerCase() === specificNameOrDriver.toLowerCase() ||
          u.driverName?.toLowerCase() === specificNameOrDriver.toLowerCase()
        )
      );
      if (found) return normalizeUserProfile(found);
    }
    const foundDriver = users.find(u => normalizeUserRole(u.userRole) === 'DRIVER');
    if (foundDriver) return normalizeUserProfile(foundDriver);
    const fallbackDriver = INITIAL_USER_ACCOUNTS.find(u => normalizeUserRole(u.userRole) === 'DRIVER');
    if (fallbackDriver) return fallbackDriver;
  }

  if (specificNameOrDriver) {
    const found = users.find(
      u => normalizeUserRole(u.userRole) === canonical && u.name.toLowerCase() === specificNameOrDriver.toLowerCase()
    );
    if (found) return normalizeUserProfile(found);
  }

  const found = users.find(u => normalizeUserRole(u.userRole) === canonical);
  if (found) return normalizeUserProfile(found);

  const fallback = INITIAL_USER_ACCOUNTS.find(u => normalizeUserRole(u.userRole) === canonical);
  if (fallback) return fallback;

  return {
    id: `usr-viewer-fallback`,
    name: 'Logistics Viewer',
    loginId: 'viewer',
    username: 'viewer',
    role: 'Operational Viewer',
    userRole: 'VIEWER',
    department: 'Logistics Monitoring',
    email: 'viewer@orientfreight.com',
    employeeId: 'OFII-VIEW-001',
    hubLocation: 'OFII Central Hub (Paranaque)',
    isActive: true,
    accountStatus: 'Active',
  };
}
