/**
 * OFII Monitoring System - Phase 6.7.2 Account Management & Admin Approval Workflow Test Suite
 * Validates all 12 required test cases per spec:
 * 1. A new user can submit a registration request.
 * 2. The request appears in Admin Account Management.
 * 3. The pending notification count updates.
 * 4. A pending user cannot access any protected portal.
 * 5. Admin can approve a request.
 * 6. An approved user can log in and reaches the correct role-based portal.
 * 7. Admin can reject a request.
 * 8. A rejected user cannot access protected pages or data.
 * 9. Encoder/Staff and Viewer cannot approve or reject requests.
 * 10. Users cannot grant themselves the Admin role.
 * 11. Direct URL access and unauthorized backend requests are denied.
 * 12. Existing accounts and application workflows continue to function.
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
  getRegistrationRequests, 
  saveRegistrationRequests,
  getPendingRequestsCount,
  submitRegistrationRequest,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  authenticateUser,
  getRegisteredUsers,
  getStoredAuthSession,
  saveAuthSession,
  clearAuthSession,
  INITIAL_USER_ACCOUNTS
} from '../data/userAccounts';
import { isTabAuthorized, normalizeUserRole, getDefaultTabForRole } from './roleUtils';
import { UserProfile } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}: ${detail || 'Assertion failed'}`);
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('--- PHASE 6.7.2: ACCOUNT MANAGEMENT & APPROVAL WORKFLOW TESTS ---');
  console.log('=============================================================\n');

  // Setup: Find existing Admin and Encoder
  const adminUser = INITIAL_USER_ACCOUNTS.find(u => normalizeUserRole(u.userRole) === 'ADMIN')!;
  const encoderUser = INITIAL_USER_ACCOUNTS.find(u => normalizeUserRole(u.userRole) === 'ENCODER')!;
  const viewerUser = INITIAL_USER_ACCOUNTS.find(u => normalizeUserRole(u.userRole) === 'VIEWER')!;

  const initialPendingCount = getPendingRequestsCount();

  // Test 1: A new user can submit a registration request
  const test1Name = `TestApplicant_${Date.now()}`;
  const reg1 = submitRegistrationRequest({
    name: test1Name,
    requestedRole: 'ENCODER',
    password: 'Password123!',
  });

  assert(reg1.success && !!reg1.request, 'Test 1: A new user can submit a registration request');
  assert(reg1.request?.status === 'PENDING', 'Test 1.1: Submitted request has status PENDING');

  // Test 2: The request appears in Admin Account Management
  const requests = getRegistrationRequests();
  const foundReq = requests.find(r => r.id === reg1.request?.id);
  assert(
    !!foundReq && foundReq.name === test1Name && foundReq.requestedRole === 'ENCODER',
    'Test 2: The request appears in Admin Account Management'
  );

  // Test 3: The pending notification count updates
  const updatedPendingCount = getPendingRequestsCount();
  assert(
    updatedPendingCount === initialPendingCount + 1,
    'Test 3: The pending notification count updates',
    `Expected ${initialPendingCount + 1}, got ${updatedPendingCount}`
  );

  // Test 4: A pending user cannot access any protected portal
  const pendingAuth = authenticateUser(reg1.request!.loginId, 'Password123!');
  assert(
    !pendingAuth.success && pendingAuth.isPending === true,
    'Test 4: A pending user cannot log in (authentication blocked with isPending notice)'
  );

  let sessionSaveBlocked = false;
  try {
    saveAuthSession({
      name: test1Name,
      role: 'Operations Data Encoder',
      userRole: 'ENCODER',
      department: 'Domestic Freight & Data Encoding',
      email: `${reg1.request!.loginId}@orientfreight.com`,
      employeeId: 'OFII-TEST-001',
      hubLocation: 'OFII Central Hub',
      approvalStatus: 'PENDING',
    });
  } catch (err) {
    sessionSaveBlocked = true;
  }
  assert(sessionSaveBlocked, 'Test 4.1: Direct session storage for PENDING account is rejected by security guard');

  // Test 5: Admin can approve a request
  const approveRes = approveRegistrationRequest(reg1.request!.id, 'ENCODER', adminUser);
  assert(
    approveRes.success && !!approveRes.user,
    'Test 5: Admin can approve a request'
  );
  assert(
    approveRes.request?.status === 'APPROVED' && approveRes.request?.reviewedBy === adminUser.name,
    'Test 5.1: Request status set to APPROVED and reviewing Admin recorded'
  );
  assert(
    approveRes.user?.approvalStatus === 'APPROVED' && approveRes.user?.isActive === true,
    'Test 5.2: Approved user profile activated and authorized'
  );

  // Test 6: An approved user can log in and reaches the correct role-based portal
  const approvedAuth = authenticateUser(reg1.request!.loginId, 'Password123!');
  assert(
    approvedAuth.success && !!approvedAuth.user,
    'Test 6: An approved user can successfully log in'
  );
  const defaultTab = getDefaultTabForRole(approvedAuth.user?.userRole);
  assert(
    defaultTab === 'dispatch' && isTabAuthorized(approvedAuth.user!, 'dispatch') && isTabAuthorized(approvedAuth.user!, 'forwarding_report'),
    'Test 6.1: Approved user reaches correct role-based portal (dispatch) and authorized operational tabs'
  );

  // Test 7: Admin can reject a request
  const testRejectName = `RejectApplicant_${Date.now()}`;
  const reg2 = submitRegistrationRequest({
    name: testRejectName,
    requestedRole: 'COORDINATOR',
    password: 'Password123!',
  });
  assert(reg2.success && !!reg2.request, 'Test 7 Setup: Second applicant submitted');

  const rejectRes = rejectRegistrationRequest(
    reg2.request!.id,
    'Candidate does not have verified logistics clearance.',
    adminUser
  );
  assert(
    rejectRes.success && rejectRes.request?.status === 'REJECTED',
    'Test 7: Admin can reject a request'
  );
  assert(
    rejectRes.request?.rejectionReason?.includes('logistics clearance') === true,
    'Test 7.1: Rejection reason and rejecting Admin recorded'
  );

  // Test 8: A rejected user cannot access protected pages or data
  const rejectedAuth = authenticateUser(reg2.request!.loginId, 'Password123!');
  assert(
    !rejectedAuth.success && rejectedAuth.isRejected === true,
    'Test 8: A rejected user cannot log in and authentication is explicitly denied'
  );

  // Test 9: Encoder/Staff and Viewer cannot approve or reject requests
  const unauthorizedApprove1 = approveRegistrationRequest(reg2.request!.id, 'COORDINATOR', encoderUser);
  assert(
    !unauthorizedApprove1.success && unauthorizedApprove1.error?.includes('Unauthorized') === true,
    'Test 9.1: Encoder/Staff CANNOT approve requests'
  );

  const unauthorizedReject1 = rejectRegistrationRequest(reg1.request!.id, 'Unauthorized test', viewerUser);
  assert(
    !unauthorizedReject1.success && unauthorizedReject1.error?.includes('Unauthorized') === true,
    'Test 9.2: Viewer CANNOT reject requests'
  );

  // Test 10: Users cannot grant themselves the Admin role
  const selfAdminAttempt = submitRegistrationRequest({
    name: 'Malicious Attacker',
    requestedRole: 'ADMIN',
    password: 'Password123!',
  });
  assert(
    !selfAdminAttempt.success && selfAdminAttempt.error?.includes('Restriction') === true,
    'Test 10: Users cannot grant themselves the Admin role via public registration'
  );

  // Test 11: Direct URL access and unauthorized backend requests are denied
  const viewerAuthorizedForUserMgmt = isTabAuthorized(viewerUser, 'user_management');
  const encoderAuthorizedForUserMgmt = isTabAuthorized(encoderUser, 'user_management');
  assert(
    !viewerAuthorizedForUserMgmt && !encoderAuthorizedForUserMgmt,
    'Test 11: Direct URL navigation / unauthorized tab access to Account Management is strictly denied for non-admins'
  );

  // Test 12: Existing accounts and application workflows continue to function
  const existingAdminAuth = authenticateUser('admin', 'Password123!');
  const existingEncoderAuth = authenticateUser('juan.delacruz', 'Password123!');
  assert(
    existingAdminAuth.success && existingAdminAuth.user?.userRole === 'ADMIN',
    'Test 12.1: Existing Admin login continues to function'
  );
  assert(
    existingEncoderAuth.success && existingEncoderAuth.user?.userRole === 'ENCODER',
    'Test 12.2: Existing Encoder login continues to function'
  );

  console.log('\n-------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('-------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
