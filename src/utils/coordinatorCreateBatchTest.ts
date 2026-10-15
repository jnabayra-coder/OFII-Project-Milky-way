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
  normalizeUserProfile 
} from '../data/userAccounts';
import { getClientAssignedCoordinator } from './dataSync';
import { DeliveryBatch, DeliveryBatchStatus, UserProfile, ClientSummary } from '../types';

console.log('================================================================');
console.log('TEST SUITE: COORDINATOR CREATE PROJECT / DELIVERY BATCH PERMISSIONS');
console.log('================================================================\n');

// Mock localStorage for Node test environment
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

const mockClients: ClientSummary[] = [
  {
    id: 'CLI-001',
    name: 'Philippine Charity Sweepstakes Office',
    code: 'PCSO',
    assignedCoordinator: 'Alodia Manalansan',
    primaryContact: 'Director of Procurement',
    email: 'pcso.logistics@pcso.gov.ph',
    phone: '+63 2 8851 2000',
    isDeactivated: false,
  },
  {
    id: 'CLI-002',
    name: 'Intelligent Skin Care Inc.',
    code: 'ISCI',
    assignedCoordinator: 'Rojaylene Baldesancho',
    primaryContact: 'Supply Chain Operations',
    email: 'operations@belo.com.ph',
    phone: '+63 2 8817 9999',
    isDeactivated: false,
  },
  {
    id: 'CLI-003',
    name: 'Golden Archers Development Corporation',
    code: 'GADC',
    assignedCoordinator: 'Justine Ryan Paular',
    primaryContact: 'Logistics Division Head',
    email: 'logistics@gadc.com.ph',
    phone: '+63 2 8888 6236',
    isDeactivated: false,
  }
];

// Helper simulating DataContext / backend authorization check
function verifyCreateBatchAuthorization(
  currentUserProfile: UserProfile | null,
  sessionUser: UserProfile | null = getStoredAuthSession()
): { authorized: boolean; effectiveUser: UserProfile | null; error?: string } {
  const effectiveUser = (sessionUser && sessionUser.isActive !== false) ? sessionUser : currentUserProfile;

  const isCoord = isCoordinatorRole(effectiveUser) || isCoordinatorRole(currentUserProfile);
  const isAdmin = normalizeUserRole(effectiveUser) === 'ADMIN' || normalizeUserRole(currentUserProfile) === 'ADMIN';

  const isApproved = (
    (!effectiveUser?.approvalStatus || effectiveUser.approvalStatus === 'APPROVED') &&
    (!currentUserProfile?.approvalStatus || currentUserProfile.approvalStatus === 'APPROVED')
  );

  const authorized = (isCoord || isAdmin) && isApproved;
  if (!authorized) {
    return {
      authorized: false,
      effectiveUser,
      error: 'Access Denied: Only a Coordinator is authorized to create a New Project / Delivery Name.'
    };
  }

  return { authorized: true, effectiveUser };
}

// Helper simulating createDeliveryBatch
function simulateCreateDeliveryBatch(
  batchData: {
    name: string;
    client: string;
    clientId?: string;
    coordinator?: string;
    createdDate?: string;
    status?: DeliveryBatchStatus;
    notes?: string;
  },
  currentUserProfile: UserProfile | null
): DeliveryBatch {
  const auth = verifyCreateBatchAuthorization(currentUserProfile);
  if (!auth.authorized) {
    throw new Error(auth.error);
  }

  if (!batchData.name || !batchData.name.trim()) {
    throw new Error('Delivery Name / Project Name is required.');
  }
  if (!batchData.client || !batchData.client.trim()) {
    throw new Error('Client Name is required.');
  }

  const nextId = `BATCH-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();
  const createdDate = batchData.createdDate || nowIso.split('T')[0];

  const newBatch: DeliveryBatch = {
    id: nextId,
    name: batchData.name.trim(),
    client: batchData.client.trim(),
    clientId: batchData.clientId,
    coordinator: batchData.coordinator?.trim() || auth.effectiveUser?.name || 'Alodia Manalansan',
    createdDate,
    status: batchData.status || 'Active',
    notes: batchData.notes?.trim() || '',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return newBatch;
}

// -----------------------------------------------------------------------------
// TEST 1: The authorized Coordinator / Logistics account can create project batch
// -----------------------------------------------------------------------------
console.log('--- TEST 1: COORDINATOR / LOGISTICS ACCOUNT CREATION PERMISSION ---');

// 1.1 Dedicated usr-coord-03 (role: 'COORDINATOR / LOGISTICS')
const rojaylene = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'coordinator.logistics')!;
assert(rojaylene, '1.1: coordinator.logistics exists');
assert.strictEqual(rojaylene.role, 'COORDINATOR / LOGISTICS', '1.1: Stored role is "COORDINATOR / LOGISTICS"');
saveAuthSession(rojaylene);

const authCheck1 = verifyCreateBatchAuthorization(rojaylene);
assert.strictEqual(authCheck1.authorized, true, '1.1: coordinator.logistics is authorized to create batch');

const createdBatch1 = simulateCreateDeliveryBatch(
  {
    name: 'ISCI Q3 NATIONWIDE ROLLOUT 2026',
    client: 'Intelligent Skin Care Inc.',
    clientId: 'CLI-002',
    notes: 'Urgent beauty clinic supplies dispatch',
  },
  rojaylene
);

assert(createdBatch1.id.startsWith('BATCH-'), '1.1: Batch ID generated');
assert.strictEqual(createdBatch1.name, 'ISCI Q3 NATIONWIDE ROLLOUT 2026', '1.1: Batch name matches');
assert.strictEqual(createdBatch1.client, 'Intelligent Skin Care Inc.', '1.1: Client name matches');
assert.strictEqual(createdBatch1.coordinator, 'Rojaylene Baldesancho', '1.1: Auto-mapped coordinator is Rojaylene');
assert.strictEqual(createdBatch1.status, 'Active', '1.1: Default status is Active');
console.log('  ✓ 1.1: coordinator.logistics successfully created project batch.');

// 1.2 Account with only role='COORDINATOR / LOGISTICS' (no userRole property)
const coordOnlyRoleProp: UserProfile = {
  id: 'usr-coord-legacy',
  name: 'Maria Elena Logistics',
  loginId: 'maria.logistics',
  username: 'maria.logistics',
  role: 'COORDINATOR / LOGISTICS',
  department: 'Client Logistics Coordination',
  email: 'maria.elena@orientfreight.com',
  employeeId: 'OFII-CRD-3099',
  hubLocation: 'OFII Central Hub, Paranaque',
  isActive: true,
  approvalStatus: 'APPROVED',
};
saveAuthSession(coordOnlyRoleProp);

const authCheck2 = verifyCreateBatchAuthorization(coordOnlyRoleProp);
assert.strictEqual(authCheck2.authorized, true, '1.2: Account with only role="COORDINATOR / LOGISTICS" is authorized');

const createdBatch2 = simulateCreateDeliveryBatch(
  {
    name: 'PCSO LOTTO PAPER ROLLOUT BATCH B',
    client: 'Philippine Charity Sweepstakes Office',
    clientId: 'CLI-001',
    notes: 'Lottery thermal roll replenishment',
  },
  coordOnlyRoleProp
);
assert.strictEqual(createdBatch2.name, 'PCSO LOTTO PAPER ROLLOUT BATCH B');
assert.strictEqual(createdBatch2.coordinator, 'Maria Elena Logistics');
console.log('  ✓ 1.2: Account with only role="COORDINATOR / LOGISTICS" creates project batch seamlessly.');

// 1.3 Alodia Manalansan (Senior Key Accounts Coordinator)
const alodia = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'alodia.manalansan')!;
saveAuthSession(alodia);
const createdBatch3 = simulateCreateDeliveryBatch(
  {
    name: 'GADC AUGUST 2026 BATCH A',
    client: 'Golden Archers Development Corporation',
    clientId: 'CLI-003',
  },
  alodia
);
assert.strictEqual(createdBatch3.name, 'GADC AUGUST 2026 BATCH A');
assert.strictEqual(createdBatch3.coordinator, 'Alodia Manalansan');
console.log('  ✓ 1.3: Senior Key Accounts Coordinator creates batch seamlessly.');

// -----------------------------------------------------------------------------
// TEST 2: Active session fallback when context state lags or is initialized to default
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: ACTIVE SESSION FALLBACK ---');
saveAuthSession(rojaylene);

// Suppose React state currentUserProfile was still DEFAULT_ENCODER_USER during initial mount tick
const encoderUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'juan.delacruz')!;
const authWithLaggingContext = verifyCreateBatchAuthorization(encoderUser);
assert.strictEqual(authWithLaggingContext.authorized, true, '2.1: Active session authorizes Coordinator even if context lags');
const batchFromSession = simulateCreateDeliveryBatch(
  {
    name: 'SESSION FALLBACK BATCH 2026',
    client: 'Intelligent Skin Care Inc.',
  },
  encoderUser // lagging context
);
assert.strictEqual(batchFromSession.coordinator, 'Rojaylene Baldesancho', '2.2: Coordinator is mapped from session');
console.log('  ✓ 2.1 - 2.2: Context state synchronization / session fallback works flawlessly.');

// -----------------------------------------------------------------------------
// TEST 3: Page refresh and Re-login persistence
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: REFRESH AND RE-LOGIN PERSISTENCE ---');
// Refresh: read session from localStorage
const stored = getStoredAuthSession();
assert(stored !== null, '3.1: Stored session retrieved');
assert.strictEqual(isCoordinatorRole(stored), true, '3.1: Stored session is Coordinator');
const refreshAuth = verifyCreateBatchAuthorization(stored);
assert.strictEqual(refreshAuth.authorized, true, '3.1: Refresh preserves authorization');

// Logout
clearAuthSession();
assert.strictEqual(getStoredAuthSession(), null, '3.2: Logged out');

// Login again as coordinator.logistics
const loginRes = authenticateUser('coordinator.logistics', 'Password123!');
assert.strictEqual(loginRes.success, true, '3.3: Re-login successful');
saveAuthSession(loginRes.user!);
const reLoginAuth = verifyCreateBatchAuthorization(loginRes.user!);
assert.strictEqual(reLoginAuth.authorized, true, '3.3: Re-login preserves authorization');
console.log('  ✓ 3.1 - 3.3: Page refresh and re-login never cause false permission denials.');

// -----------------------------------------------------------------------------
// TEST 4: Viewer and unrelated roles remain strictly unauthorized
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: VIEWER AND UNRELATED ROLES STRICTLY DENIED ---');

// 4.1 Viewer
const viewerUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'maria.santos')!;
saveAuthSession(viewerUser);
const viewerAuth = verifyCreateBatchAuthorization(viewerUser);
assert.strictEqual(viewerAuth.authorized, false, '4.1: Viewer denied');
assert.strictEqual(viewerAuth.error, 'Access Denied: Only a Coordinator is authorized to create a New Project / Delivery Name.');

let viewerThrew = false;
try {
  simulateCreateDeliveryBatch({ name: 'TEST', client: 'ISCI' }, viewerUser);
} catch (e: any) {
  viewerThrew = true;
  assert.strictEqual(e.message, 'Access Denied: Only a Coordinator is authorized to create a New Project / Delivery Name.');
}
assert.strictEqual(viewerThrew, true, '4.1: simulateCreateDeliveryBatch threw for Viewer');
console.log('  ✓ 4.1: Viewer strictly denied with expected error message.');

// 4.2 Encoder
saveAuthSession(encoderUser);
const encoderAuth = verifyCreateBatchAuthorization(encoderUser);
assert.strictEqual(encoderAuth.authorized, false, '4.2: Encoder denied');

// 4.3 Driver
const driverUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'danilo.hernandez')!;
saveAuthSession(driverUser);
const driverAuth = verifyCreateBatchAuthorization(driverUser);
assert.strictEqual(driverAuth.authorized, false, '4.3: Driver denied');

// 4.4 Truck Planner
const plannerUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'vicente.planner')!;
saveAuthSession(plannerUser);
const plannerAuth = verifyCreateBatchAuthorization(plannerUser);
assert.strictEqual(plannerAuth.authorized, false, '4.4: Truck Planner denied');

// 4.5 Dispatcher
const dispatcherUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'eduardo.ramos')!;
saveAuthSession(dispatcherUser);
const dispatcherAuth = verifyCreateBatchAuthorization(dispatcherUser);
assert.strictEqual(dispatcherAuth.authorized, false, '4.5: Dispatcher denied');

console.log('  ✓ 4.2 - 4.5: Encoder, Driver, Truck Planner, and Dispatcher strictly denied.');

// -----------------------------------------------------------------------------
// TEST 5: Pending and Rejected accounts cannot create batches
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: PENDING AND REJECTED ACCOUNTS BLOCKED ---');
const pendingCoord: UserProfile = {
  id: 'usr-coord-pending',
  name: 'Pending Coordinator',
  role: 'COORDINATOR / LOGISTICS',
  userRole: 'COORDINATOR',
  approvalStatus: 'PENDING',
  department: 'Client Logistics Coordination',
  email: 'pending@ofii.com',
  employeeId: 'OFII-CRD-9001',
  hubLocation: 'Paranaque',
  isActive: true,
};
const pendingAuth = verifyCreateBatchAuthorization(pendingCoord, null);
assert.strictEqual(pendingAuth.authorized, false, '5.1: Pending account is not authorized');

const rejectedCoord: UserProfile = {
  id: 'usr-coord-rejected',
  name: 'Rejected Coordinator',
  role: 'COORDINATOR / LOGISTICS',
  userRole: 'COORDINATOR',
  approvalStatus: 'REJECTED',
  department: 'Client Logistics Coordination',
  email: 'rejected@ofii.com',
  employeeId: 'OFII-CRD-9002',
  hubLocation: 'Paranaque',
  isActive: true,
};
const rejectedAuth = verifyCreateBatchAuthorization(rejectedCoord, null);
assert.strictEqual(rejectedAuth.authorized, false, '5.2: Rejected account is not authorized');
console.log('  ✓ 5.1 - 5.2: Pending and Rejected accounts strictly prevented from creating batches.');

// -----------------------------------------------------------------------------
// TEST 6: Admin oversight preserved
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: ADMIN SYSTEM OVERSIGHT PRESERVED ---');
const adminUser = INITIAL_USER_ACCOUNTS.find(u => u.loginId === 'admin')!;
saveAuthSession(adminUser);
const adminAuth = verifyCreateBatchAuthorization(adminUser);
assert.strictEqual(adminAuth.authorized, true, '6.1: Admin has oversight to create batches');
const adminBatch = simulateCreateDeliveryBatch(
  {
    name: 'ADMIN SPECIAL DISPATCH BATCH',
    client: 'Philippine Charity Sweepstakes Office',
  },
  adminUser
);
assert.strictEqual(adminBatch.name, 'ADMIN SPECIAL DISPATCH BATCH');
console.log('  ✓ 6.1: Admin system oversight preserved.');

// -----------------------------------------------------------------------------
// TEST 7: Client assigned coordinator auto-mapping
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: CLIENT AUTO-MAPPING VERIFICATION ---');
const mappedPcso = getClientAssignedCoordinator(mockClients, 'Philippine Charity Sweepstakes Office', 'Default Person');
assert.strictEqual(mappedPcso, 'Alodia Manalansan', '7.1: PCSO maps to Alodia Manalansan');

const mappedIsci = getClientAssignedCoordinator(mockClients, 'Intelligent Skin Care Inc.', 'Default Person');
assert.strictEqual(mappedIsci, 'Rojaylene Baldesancho', '7.2: ISCI maps to Rojaylene Baldesancho');

const mappedGadc = getClientAssignedCoordinator(mockClients, 'Golden Archers Development Corporation', 'Default Person');
assert.strictEqual(mappedGadc, 'Justine Ryan Paular', '7.3: GADC maps to Justine Ryan Paular');
console.log('  ✓ 7.1 - 7.3: Auto-mapped coordinator resolution functions accurately.');

console.log('\n================================================================');
console.log('ALL COORDINATOR CREATE BATCH PERMISSION TESTS PASSED! ✓');
console.log('================================================================');
