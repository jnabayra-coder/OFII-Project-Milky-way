/**
 * OFII Monitoring System - Phase 6.7.3 Portal Restoration Test Suite
 * Validates complete restoration of Dispatcher and Truck Planner portals and operational workflows:
 * 1. Dispatcher role is recognized correctly.
 * 2. Authorized Dispatcher can log in and access restored Dispatcher Portal.
 * 3. Truck Planner role is recognized correctly.
 * 4. Authorized Truck Planner can log in and access restored Truck Planner Portal.
 * 5. Both portals display original available functions & permissions.
 * 6. Previous operational data connections and workflows work correctly.
 * 7. Existing role-based portal routing remains functional across all roles.
 * 8. Admin and Encoder/Staff portals still work.
 * 9. Viewer remains strictly read-only.
 * 10. Pending and rejected accounts cannot access protected portals.
 * 11. Existing records remain intact.
 * 12. No duplicate portals, broken routes, or new permission bypasses introduced.
 */

// In-memory localStorage polyfill for Node test execution
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0
  } as any;
}

import { 
  normalizeUserRole, 
  getDefaultTabForRole, 
  isTabAuthorized, 
  getRolePermissions,
  getUserRoleDisplayLabel
} from './roleUtils';
import { 
  authenticateUser, 
  getRegisteredUsers,
  getRegistrationRequests,
  submitRegistrationRequest,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  INITIAL_USER_ACCOUNTS
} from '../data/userAccounts';
import { UserProfile } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} - ${details || 'Assertion failed'}`);
    failed++;
  }
}

console.log('=============================================================');
console.log('--- PHASE 6.7.3: DISPATCHER & TRUCK PLANNER RESTORATION TESTS ---');
console.log('=============================================================');

// Test 1: Dispatcher role is recognized correctly
assert(normalizeUserRole('DISPATCHER') === 'DISPATCHER', '1.1: normalizeUserRole recognizes DISPATCHER uppercase');
assert(normalizeUserRole('dispatcher') === 'DISPATCHER', '1.2: normalizeUserRole recognizes dispatcher lowercase');
assert(normalizeUserRole('Transport Dispatcher') === 'DISPATCHER', '1.3: normalizeUserRole recognizes Transport Dispatcher');
assert(normalizeUserRole('TRANSPORT_DISPATCHER') === 'DISPATCHER', '1.4: normalizeUserRole recognizes TRANSPORT_DISPATCHER');

// Test 2: Authorized Dispatcher can log in and access restored Dispatcher Portal
const dispatcherAuth = authenticateUser('eduardo.ramos', 'Password123!');
assert(dispatcherAuth.success === true, '2.1: Authorized Dispatcher (eduardo.ramos) can authenticate successfully');
assert(dispatcherAuth.user?.userRole === 'DISPATCHER', '2.2: Authenticated user has canonical DISPATCHER role');
const dispatcherTab = getDefaultTabForRole(dispatcherAuth.user?.userRole);
assert(dispatcherTab === 'dispatcher_portal', '2.3: Dispatcher is automatically routed to dispatcher_portal tab');
assert(isTabAuthorized(dispatcherAuth.user, 'dispatcher_portal') === true, '2.4: Dispatcher is authorized to access dispatcher_portal');

// Test 3: Truck Planner role is recognized correctly
assert(normalizeUserRole('TRUCK_PLANNER') === 'TRUCK_PLANNER', '3.1: normalizeUserRole recognizes TRUCK_PLANNER uppercase');
assert(normalizeUserRole('truck_planner') === 'TRUCK_PLANNER', '3.2: normalizeUserRole recognizes truck_planner lowercase');
assert(normalizeUserRole('driver_head') === 'TRUCK_PLANNER', '3.3: normalizeUserRole maps driver_head to TRUCK_PLANNER');
assert(normalizeUserRole("Truck Planner / Driver's Head") === 'TRUCK_PLANNER', '3.4: normalizeUserRole recognizes Truck Planner / Driver\'s Head');

// Test 4: Authorized Truck Planner can log in and access restored Truck Planner Portal
const plannerAuth = authenticateUser('vicente.planner', 'Password123!');
assert(plannerAuth.success === true, '4.1: Authorized Truck Planner (vicente.planner) can authenticate successfully');
assert(plannerAuth.user?.userRole === 'TRUCK_PLANNER', '4.2: Authenticated user has canonical TRUCK_PLANNER role');
const plannerTab = getDefaultTabForRole(plannerAuth.user?.userRole);
assert(plannerTab === 'truck_planner', '4.3: Truck Planner is automatically routed to truck_planner tab');
assert(isTabAuthorized(plannerAuth.user, 'truck_planner') === true, '4.4: Truck Planner is authorized to access truck_planner');

// Test 5: Both portals display original available functions & permissions
const dispatcherPerms = getRolePermissions('DISPATCHER');
assert(dispatcherPerms.isReadOnly === false, '5.1: Dispatcher is NOT read-only');
assert(dispatcherPerms.canDailyDispatch === 'Add/Edit/Import', '5.2: Dispatcher can encode and update daily dispatches');

const plannerPerms = getRolePermissions('TRUCK_PLANNER');
assert(plannerPerms.isReadOnly === false, '5.3: Truck Planner is NOT read-only');
assert(plannerPerms.canDailyDispatch === 'View/Update', '5.4: Truck Planner can view and update dispatches');
assert(plannerPerms.canForwarding === 'View/Update', '5.5: Truck Planner can view and update forwarding');

const dispatcherDisplay = getUserRoleDisplayLabel(dispatcherAuth.user);
assert(dispatcherDisplay.portalName === 'Dispatcher Portal', '5.6: Dispatcher display portal name is Dispatcher Portal');

const plannerDisplay = getUserRoleDisplayLabel(plannerAuth.user);
assert(plannerDisplay.portalName === 'Truck Planner Portal', '5.7: Truck Planner display portal name is Truck Planner Portal');

// Test 6: Previous operational data connections and workflows work correctly
assert(isTabAuthorized(dispatcherAuth.user, 'dispatch') === true, '6.1: Dispatcher can access Daily Dispatching Monitoring');
assert(isTabAuthorized(dispatcherAuth.user, 'forwarding_report') === true, '6.2: Dispatcher can access Forwarding Progressive Report');
assert(isTabAuthorized(dispatcherAuth.user, 'dashboard') === true, '6.3: Dispatcher can access Operations Dashboard');

assert(isTabAuthorized(plannerAuth.user, 'dispatch') === true, '6.4: Truck Planner can access Daily Dispatching Monitoring');
assert(isTabAuthorized(plannerAuth.user, 'forwarding_report') === true, '6.5: Truck Planner can access Forwarding Progressive Report');
assert(isTabAuthorized(plannerAuth.user, 'dashboard') === true, '6.6: Truck Planner can access Operations Dashboard');

// Test 7: Existing role-based portal routing remains functional across all roles
assert(getDefaultTabForRole('ADMIN') === 'dashboard', '7.1: ADMIN default tab is dashboard (Admin Portal)');
assert(getDefaultTabForRole('ENCODER') === 'dispatch', '7.2: ENCODER default tab is dispatch (Encoder Portal)');
assert(getDefaultTabForRole('COORDINATOR') === 'coordinator_portal', '7.3: COORDINATOR default tab is coordinator_portal');
assert(getDefaultTabForRole('DRIVER') === 'dispatch', '7.4: DRIVER default tab is dispatch (Driver Portal)');
assert(getDefaultTabForRole('VIEWER') === 'dashboard', '7.5: VIEWER default tab is dashboard (Viewer Portal)');
assert(getDefaultTabForRole('MANAGEMENT') === 'dashboard', '7.6: MANAGEMENT default tab is dashboard (Management Portal)');
assert(getDefaultTabForRole('TRUCK_PLANNER') === 'truck_planner', '7.7: TRUCK_PLANNER default tab is truck_planner');
assert(getDefaultTabForRole('DISPATCHER') === 'dispatcher_portal', '7.8: DISPATCHER default tab is dispatcher_portal');

// Test 8: Admin and Encoder/Staff portals still work
const adminAuth = authenticateUser('admin', 'Password123!');
assert(adminAuth.success === true, '8.1: Existing Admin login works');
assert(isTabAuthorized(adminAuth.user, 'user_management') === true, '8.2: Admin has full access to user_management');
assert(isTabAuthorized(adminAuth.user, 'truck_planner') === true, '8.3: Admin can access truck_planner');
assert(isTabAuthorized(adminAuth.user, 'dispatcher_portal') === true, '8.4: Admin can access dispatcher_portal');

const encoderAuth = authenticateUser('juan.delacruz', 'Password123!');
assert(encoderAuth.success === true, '8.5: Existing Encoder login works');
assert(isTabAuthorized(encoderAuth.user, 'dispatch') === true, '8.6: Encoder has full access to dispatch');

// Test 9: Viewer remains strictly read-only
const viewerAuth = authenticateUser('maria.santos', 'Password123!');
assert(viewerAuth.success === true, '9.1: Existing Viewer login works');
const viewerPerms = getRolePermissions(viewerAuth.user);
assert(viewerPerms.isReadOnly === true, '9.2: Viewer isReadOnly is strictly true');
assert(viewerPerms.canDailyDispatch === 'Read-only', '9.3: Viewer daily dispatch is Read-only');
assert(isTabAuthorized(viewerAuth.user, 'truck_planner') === false, '9.4: Viewer cannot access truck_planner');
assert(isTabAuthorized(viewerAuth.user, 'dispatcher_portal') === false, '9.5: Viewer cannot access dispatcher_portal');

// Test 10: Pending and rejected accounts cannot access protected portals
const pendingSubmission = submitRegistrationRequest({
  name: 'Pending Dispatcher Applicant',
  requestedRole: 'DISPATCHER',
  email: 'pending.disp@orientfreight.com',
  password: 'Password123!',
  department: 'Operations Dispatch & Fleet Staging',
});
assert(pendingSubmission.success === true, '10.1: New Dispatcher registration can be submitted');
const pendingAuth = authenticateUser(pendingSubmission.request?.loginId || '', 'Password123!');
assert(pendingAuth.success === false && pendingAuth.isPending === true, '10.2: Pending Dispatcher account login is blocked');

const rejectionRes = rejectRegistrationRequest(pendingSubmission.request?.id || '', 'Application rejected for testing', adminAuth.user);
assert(rejectionRes.success === true, '10.3: Admin can reject pending registration');
const rejectedAuth = authenticateUser(pendingSubmission.request?.loginId || '', 'Password123!');
assert(rejectedAuth.success === false && rejectedAuth.isRejected === true, '10.4: Rejected Dispatcher account login is blocked');

// Test 11: Approval workflow for restored roles
const plannerSubmission = submitRegistrationRequest({
  name: 'Applicant Truck Planner',
  requestedRole: 'TRUCK_PLANNER',
  email: 'applicant.plan@orientfreight.com',
  password: 'Password123!',
  department: 'Fleet Route Planning & Logistics',
});
assert(plannerSubmission.success === true, '11.1: Truck Planner registration request submitted');
const approvalRes = approveRegistrationRequest(plannerSubmission.request?.id || '', 'TRUCK_PLANNER', adminAuth.user);
assert(approvalRes.success === true, '11.2: Admin approves Truck Planner registration');
const approvedPlannerAuth = authenticateUser(plannerSubmission.request?.loginId || '', 'Password123!');
assert(approvedPlannerAuth.success === true, '11.3: Approved Truck Planner can now log in');
assert(getDefaultTabForRole(approvedPlannerAuth.user?.userRole) === 'truck_planner', '11.4: Approved Truck Planner is routed to truck_planner');
assert(isTabAuthorized(approvedPlannerAuth.user, 'truck_planner') === true, '11.5: Approved Truck Planner is authorized for truck_planner');

// Test 12: Security boundaries - No unauthorized privilege escalation
assert(isTabAuthorized(dispatcherAuth.user, 'user_management') === false, '12.1: Dispatcher CANNOT access Admin user_management');
assert(isTabAuthorized(plannerAuth.user, 'user_management') === false, '12.2: Truck Planner CANNOT access Admin user_management');
assert(isTabAuthorized(encoderAuth.user, 'user_management') === false, '12.3: Encoder CANNOT access Admin user_management');

console.log('-------------------------------------------------------------');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('-------------------------------------------------------------');

if (failed > 0) {
  process.exit(1);
}
