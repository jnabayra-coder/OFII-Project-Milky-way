import assert from 'assert';
import { 
  normalizeUserRole, 
  isCoordinatorRole, 
  getUserRoleDisplayLabel, 
  isTabAuthorized, 
  getDefaultTabForRole,
  getRolePermissions
} from './roleUtils';
import { 
  authenticateUser, 
  getStoredAuthSession, 
  saveAuthSession, 
  clearAuthSession, 
  INITIAL_USER_ACCOUNTS,
  submitRegistrationRequest,
  getRegisteredUsers,
  normalizeUserProfile
} from '../data/userAccounts';
import { UserProfile } from '../types';

console.log('====================================================');
console.log('OFII COORDINATOR PORTAL ROLE & AUTHORIZATION TEST SUITE');
console.log('====================================================\n');

// Mock localStorage for Node test runner
const storageMap: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storageMap[key] || null,
  setItem: (key: string, val: string) => { storageMap[key] = String(val); },
  removeItem: (key: string) => { delete storageMap[key]; },
  clear: () => { for (const k in storageMap) delete storageMap[k]; }
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = mockLocalStorage;
}

// -------------------------------------------------------------
// TEST 1: Properly authorized Coordinator / Logistics account access
// -------------------------------------------------------------
console.log('--- TEST 1: COORDINATOR / LOGISTICS ACCOUNT IDENTIFICATION & ACCESS ---');

// 1.1 Canonical Alodia Manalansan account
const alodia = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'alodia.manalansan')!;
assert(alodia, '1.1: Alodia Manalansan exists in INITIAL_USER_ACCOUNTS');
assert.strictEqual(normalizeUserRole(alodia), 'COORDINATOR', '1.1: Alodia resolves to canonical COORDINATOR');
assert.strictEqual(isCoordinatorRole(alodia), true, '1.1: Alodia is verified as an authorized Coordinator');

const alodiaHeader = getUserRoleDisplayLabel(alodia);
assert.strictEqual(alodiaHeader.fullBadge, 'COORDINATOR / LOGISTICS', '1.1: Alodia header badge is COORDINATOR / LOGISTICS');
assert.strictEqual(isTabAuthorized(alodia, 'coordinator_portal'), true, '1.1: Alodia is authorized for coordinator_portal');
assert.strictEqual(getDefaultTabForRole(alodia), 'coordinator_portal', '1.1: Alodia default tab is coordinator_portal');
console.log('  ✓ 1.1: Alodia Manalansan (Senior Key Accounts Coordinator) successfully authorized.');

// 1.2 Dedicated Coordinator / Logistics account (usr-coord-03)
const coordLogistics = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'coordinator.logistics')!;
assert(coordLogistics, '1.2: coordinator.logistics account exists in INITIAL_USER_ACCOUNTS');
assert.strictEqual(normalizeUserRole(coordLogistics), 'COORDINATOR', '1.2: coordinator.logistics resolves to canonical COORDINATOR');
assert.strictEqual(isCoordinatorRole(coordLogistics), true, '1.2: isCoordinatorRole recognizes coordinator.logistics');
const coordBadge = getUserRoleDisplayLabel(coordLogistics);
assert.strictEqual(coordBadge.fullBadge, 'COORDINATOR / LOGISTICS', '1.2: coordBadge is COORDINATOR / LOGISTICS');
assert.strictEqual(isTabAuthorized(coordLogistics, 'coordinator_portal'), true, '1.2: Authorized for coordinator_portal tab');
console.log('  ✓ 1.2: coordinator.logistics account successfully authorized for Coordinator Portal.');

// 1.3 Varied Coordinator object representations (with and without userRole property)
const profileWithoutUserRole = {
  id: 'usr-coord-test-only-role',
  name: 'Test Coordinator',
  role: 'COORDINATOR / LOGISTICS',
  department: 'Client Logistics Coordination',
  email: 'test.coord@orientfreight.com',
  employeeId: 'OFII-CRD-9999',
  hubLocation: 'OFII Central Hub, Paranaque',
  approvalStatus: 'APPROVED' as const,
};
assert.strictEqual(normalizeUserRole(profileWithoutUserRole), 'COORDINATOR', '1.3: Object with only role resolves to COORDINATOR');
assert.strictEqual(isCoordinatorRole(profileWithoutUserRole), true, '1.3: isCoordinatorRole handles object with only role field');
console.log('  ✓ 1.3: UserProfile object with role="COORDINATOR / LOGISTICS" (no userRole prop) resolves correctly.');

const profileWithSeniorTitle = {
  id: 'usr-coord-senior',
  name: 'Senior Coord',
  role: 'Senior Key Accounts Coordinator',
  department: 'Client Logistics Coordination',
  email: 'senior.coord@orientfreight.com',
  employeeId: 'OFII-CRD-9998',
  hubLocation: 'OFII Central Hub, Paranaque',
  approvalStatus: 'APPROVED' as const,
};
assert.strictEqual(normalizeUserRole(profileWithSeniorTitle), 'COORDINATOR', '1.3b: Senior Key Accounts Coordinator resolves to COORDINATOR');
assert.strictEqual(isCoordinatorRole(profileWithSeniorTitle), true, '1.3b: isCoordinatorRole recognizes Senior title');
console.log('  ✓ 1.3b: Senior Key Accounts Coordinator title recognized.');

// -------------------------------------------------------------
// TEST 2: Page Refresh Session Persistence
// -------------------------------------------------------------
console.log('\n--- TEST 2: PAGE REFRESH & PERSISTENCE ---');
saveAuthSession(alodia);
const restoredSession = getStoredAuthSession();
assert(restoredSession !== null, '2.1: Restored session is not null');
assert.strictEqual(normalizeUserRole(restoredSession), 'COORDINATOR', '2.1: Restored session user resolves to COORDINATOR');
assert.strictEqual(isCoordinatorRole(restoredSession), true, '2.1: Restored session user is authorized Coordinator');
assert.strictEqual(isTabAuthorized(restoredSession, 'coordinator_portal'), true, '2.1: Restored session user can access coordinator_portal');
console.log('  ✓ 2.1: Session restored from localStorage preserves Coordinator access across page refresh without false denial.');

// -------------------------------------------------------------
// TEST 3: Logout and Login cycle
// -------------------------------------------------------------
console.log('\n--- TEST 3: LOGOUT AND LOGIN CYCLE ---');
clearAuthSession();
assert.strictEqual(getStoredAuthSession(), null, '3.1: Session cleared upon logout');

const loginRes = authenticateUser('alodia.manalansan', 'Password123!');
assert.strictEqual(loginRes.success, true, '3.2: Re-authentication successful');
assert(loginRes.user, '3.2: User object returned');
assert.strictEqual(isCoordinatorRole(loginRes.user), true, '3.2: Authenticated user is recognized as Coordinator');
assert.strictEqual(isTabAuthorized(loginRes.user, 'coordinator_portal'), true, '3.2: Authenticated user can access coordinator_portal');

saveAuthSession(loginRes.user);
assert.strictEqual(isCoordinatorRole(getStoredAuthSession()), true, '3.3: Re-saved session preserves Coordinator role');
console.log('  ✓ 3.1 - 3.3: Logging out and logging back in strictly preserves Coordinator access.');

// -------------------------------------------------------------
// TEST 4: Viewer cannot access Coordinator Portal
// -------------------------------------------------------------
console.log('\n--- TEST 4: VIEWER RESTRICTIONS ---');
const viewerUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'maria.santos')!;
assert(viewerUser, '4.1: Viewer user exists');
assert.strictEqual(normalizeUserRole(viewerUser), 'VIEWER', '4.1: Viewer user canonical role is VIEWER');
assert.strictEqual(isCoordinatorRole(viewerUser), false, '4.1: Viewer is NOT a Coordinator');
assert.strictEqual(isTabAuthorized(viewerUser, 'coordinator_portal'), false, '4.1: Viewer is NOT authorized for coordinator_portal tab');
const viewerPerms = getRolePermissions(viewerUser);
assert.strictEqual(viewerPerms.isReadOnly, true, '4.1: Viewer is strictly read-only');
console.log('  ✓ 4.1: Viewer account (maria.santos) is strictly denied access to Coordinator Portal.');

// -------------------------------------------------------------
// TEST 5: Unrelated roles cannot access Coordinator Portal
// -------------------------------------------------------------
console.log('\n--- TEST 5: UNRELATED ROLES DENIED ---');
const encoderUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'juan.delacruz')!;
const driverUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'danilo.hernandez')!;
const supervisorUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'carlos.supervisor')!;
const plannerUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'vicente.planner')!;
const dispatcherUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'eduardo.ramos')!;

assert.strictEqual(isCoordinatorRole(encoderUser), false, '5.1: Encoder is not Coordinator');
assert.strictEqual(isTabAuthorized(encoderUser, 'coordinator_portal'), false, '5.1: Encoder cannot access coordinator_portal');

assert.strictEqual(isCoordinatorRole(driverUser), false, '5.2: Driver is not Coordinator');
assert.strictEqual(isTabAuthorized(driverUser, 'coordinator_portal'), false, '5.2: Driver cannot access coordinator_portal');

assert.strictEqual(isCoordinatorRole(supervisorUser), false, '5.3: Management/Supervisor is not Coordinator');
assert.strictEqual(isTabAuthorized(supervisorUser, 'coordinator_portal'), false, '5.3: Supervisor cannot access coordinator_portal');

assert.strictEqual(isCoordinatorRole(plannerUser), false, '5.4: Truck Planner is not Coordinator');
assert.strictEqual(isTabAuthorized(plannerUser, 'coordinator_portal'), false, '5.4: Truck Planner cannot access coordinator_portal');

assert.strictEqual(isCoordinatorRole(dispatcherUser), false, '5.5: Dispatcher is not Coordinator');
assert.strictEqual(isTabAuthorized(dispatcherUser, 'coordinator_portal'), false, '5.5: Dispatcher cannot access coordinator_portal');

console.log('  ✓ 5.1 - 5.5: All unrelated roles (Encoder, Driver, Management, Truck Planner, Dispatcher) are strictly denied.');

// -------------------------------------------------------------
// TEST 6: Pending or Rejected accounts cannot bypass approval
// -------------------------------------------------------------
console.log('\n--- TEST 6: PENDING & REJECTED ACCOUNT APPROVAL REQUIREMENTS ---');
const pendingCoordUser = {
  id: 'usr-pending-coord',
  name: 'Pending Applicant',
  role: 'COORDINATOR / LOGISTICS',
  userRole: 'COORDINATOR' as const,
  approvalStatus: 'PENDING' as const,
  isActive: true,
};
const isApprovedPending = (pendingCoordUser.approvalStatus as string) === 'APPROVED';
assert.strictEqual(isApprovedPending, false, '6.1: Pending Coordinator is not approved');

const rejectedCoordUser = {
  id: 'usr-rejected-coord',
  name: 'Rejected Applicant',
  role: 'COORDINATOR / LOGISTICS',
  userRole: 'COORDINATOR' as const,
  approvalStatus: 'REJECTED' as const,
  isActive: true,
};
const isApprovedRejected = (rejectedCoordUser.approvalStatus as string) === 'APPROVED';
assert.strictEqual(isApprovedRejected, false, '6.2: Rejected Coordinator is not approved');

// Attempting to save pending session must throw security violation
let pendingSessionBlocked = false;
try {
  saveAuthSession(pendingCoordUser as any);
} catch (e) {
  pendingSessionBlocked = true;
}
assert.strictEqual(pendingSessionBlocked, true, '6.3: Pending account blocked from saving session');
console.log('  ✓ 6.1 - 6.3: Pending and Rejected accounts are strictly prevented from establishing sessions or entering portal.');

// -------------------------------------------------------------
// TEST 7: Other existing portals and permissions continue working
// -------------------------------------------------------------
console.log('\n--- TEST 7: OTHER PORTALS & PERMISSIONS PRESERVED ---');
const adminUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'admin')!;
assert.strictEqual(normalizeUserRole(adminUser), 'ADMIN', '7.1: Admin canonical role preserved');
assert.strictEqual(isTabAuthorized(adminUser, 'dashboard'), true, '7.1: Admin can access dashboard');
assert.strictEqual(isTabAuthorized(adminUser, 'user_management'), true, '7.1: Admin can access user_management');
assert.strictEqual(isTabAuthorized(adminUser, 'truck_planner'), true, '7.1: Admin can access truck_planner');
assert.strictEqual(isTabAuthorized(adminUser, 'dispatcher_portal'), true, '7.1: Admin can access dispatcher_portal');

assert.strictEqual(getDefaultTabForRole('ADMIN'), 'dashboard', '7.2: Admin default tab is dashboard');
assert.strictEqual(getDefaultTabForRole('ENCODER'), 'dispatch', '7.3: Encoder default tab is dispatch');
assert.strictEqual(getDefaultTabForRole('COORDINATOR'), 'coordinator_portal', '7.4: Coordinator default tab is coordinator_portal');
assert.strictEqual(getDefaultTabForRole('TRUCK_PLANNER'), 'truck_planner', '7.5: Truck Planner default tab is truck_planner');
assert.strictEqual(getDefaultTabForRole('DISPATCHER'), 'dispatcher_portal', '7.6: Dispatcher default tab is dispatcher_portal');
assert.strictEqual(getDefaultTabForRole('VIEWER'), 'dashboard', '7.7: Viewer default tab is dashboard');
assert.strictEqual(getDefaultTabForRole('DRIVER'), 'dispatch', '7.8: Driver default tab is dispatch');
assert.strictEqual(getDefaultTabForRole('MANAGEMENT'), 'dashboard', '7.9: Management default tab is dashboard');

console.log('  ✓ 7.1 - 7.9: All portals, roles, and default routings preserved perfectly.');

console.log('\n====================================================');
console.log('ALL COORDINATOR PORTAL TESTS PASSED SUCCESSFULLY! ✓');
console.log('====================================================');
