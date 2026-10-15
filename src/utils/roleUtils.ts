import { CanonicalRole, NavigationTab, UserProfile, UserRole } from '../types';

/**
 * Normalizes any role representation into one of the 6 canonical system roles:
 * - ADMIN
 * - ENCODER
 * - COORDINATOR
 * - DRIVER
 * - VIEWER
 * - MANAGEMENT
 * 
 * Returns `null` if the role is missing, unknown, or not recognized.
 * Fail closed: NEVER default an unknown role to ADMIN.
 */
/**
 * Normalizes any role representation into one of the 8 canonical system roles:
 * - ADMIN
 * - ENCODER
 * - COORDINATOR
 * - DRIVER
 * - VIEWER
 * - MANAGEMENT
 * - TRUCK_PLANNER
 * - DISPATCHER
 * 
 * Returns `null` if the role is missing, unknown, or not recognized.
 * Fail closed: NEVER default an unknown role to ADMIN.
 */
export function normalizeUserRole(roleInput?: UserProfile | UserRole | string | null): CanonicalRole | null {
  if (!roleInput) return null;

  // 1. If roleInput is an object (UserProfile, session user, account record, registration request)
  if (typeof roleInput === 'object' && roleInput !== null) {
    const profile = roleInput as any;

    // Check if wrapped in session object ({ user: { ... } })
    const innerUser = profile.user && typeof profile.user === 'object' ? profile.user : null;

    // Direct check: if profile.role is specialized non-viewer role (e.g. 'COORDINATOR / LOGISTICS'),
    // prioritize it over generic 'VIEWER' userRole fallback
    const directRoleCanonical = profile.role ? resolveCanonicalRoleFromString(profile.role) : null;
    const directUserRoleCanonical = profile.userRole ? resolveCanonicalRoleFromString(profile.userRole) : null;

    if (directRoleCanonical && directRoleCanonical !== 'VIEWER' && directUserRoleCanonical === 'VIEWER') {
      return directRoleCanonical;
    }

    // Check candidate properties in priority order: userRole, canonicalRole, role, requestedRole, approvedRole
    const candidates = [
      profile.userRole,
      profile.canonicalRole,
      profile.role,
      profile.requestedRole,
      profile.approvedRole,
      innerUser?.userRole,
      innerUser?.canonicalRole,
      innerUser?.role,
      innerUser?.requestedRole,
      innerUser?.approvedRole,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    for (const cand of candidates) {
      const canonical = resolveCanonicalRoleFromString(cand);
      if (canonical) return canonical;
    }

    return null;
  }

  // 2. If roleInput is a string
  if (typeof roleInput !== 'string') return null;
  return resolveCanonicalRoleFromString(roleInput);
}

/**
 * Resolves a cleaned role identifier string into one of the 8 canonical system roles.
 * Provides explicit, centralized role mapping for all authorized system roles.
 */
export function resolveCanonicalRoleFromString(raw: string): CanonicalRole | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Normalize delimiters (spaces, slashes, dashes, dots) into single underscores
  const cleaned = trimmed.toUpperCase().replace(/[\s\-/.]+/g, '_');

  // 1. ADMIN (Highest level of access)
  if (
    cleaned === 'ADMIN' ||
    cleaned === 'ADMINISTRATOR' ||
    cleaned === 'SYSTEM_ADMIN' ||
    cleaned === 'HEAD_STAFF' ||
    cleaned === 'OFFICE_HEAD' ||
    cleaned === 'DIRECTOR_OF_OPERATIONS' ||
    cleaned.startsWith('ADMIN')
  ) {
    return 'ADMIN';
  }

  // 2. ENCODER (Operational data entry and maintenance)
  if (
    cleaned === 'ENCODER' ||
    cleaned === 'DATA_ENCODER' ||
    cleaned === 'OPERATIONS_ENCODER' ||
    cleaned.includes('ENCODER')
  ) {
    return 'ENCODER';
  }

  // 3. COORDINATOR / LOGISTICS (Assigned accounts coordination, delivery batches & consignment monitoring)
  // Explicitly covers:
  // - 'COORDINATOR'
  // - 'COORDINATOR_LOGISTICS' (from 'COORDINATOR / LOGISTICS' or 'COORDINATOR - LOGISTICS')
  // - 'LOGISTICS_COORDINATOR'
  // - 'ACCOUNT_COORDINATOR'
  // - 'KEY_ACCOUNTS_COORDINATOR'
  // - 'SENIOR_KEY_ACCOUNTS_COORDINATOR'
  // - 'CLIENT_LOGISTICS_COORDINATOR'
  // - 'LOGISTICS'
  // - 'CLIENT_LOGISTICS'
  // - 'LOGISTICS_COORDINATION'
  // - 'LOGISTICS_OFFICER'
  // Strictly excludes unrelated roles (Viewer, Driver, Admin, Encoder, Truck Planner, Dispatcher, Management)
  if (
    cleaned === 'COORDINATOR' ||
    cleaned === 'ACCOUNT_COORDINATOR' ||
    cleaned === 'LOGISTICS_COORDINATOR' ||
    cleaned === 'COORDINATOR_LOGISTICS' ||
    cleaned.replace(/_+/g, '_') === 'COORDINATOR_LOGISTICS' ||
    cleaned.replace(/_+/g, '_') === 'LOGISTICS_COORDINATOR' ||
    cleaned === 'LOGISTICS' ||
    cleaned === 'CLIENT_LOGISTICS' ||
    cleaned === 'LOGISTICS_COORDINATION' ||
    cleaned === 'LOGISTICS_OFFICER' ||
    cleaned.includes('COORDINATOR')
  ) {
    return 'COORDINATOR';
  }

  // 4. DRIVER (Simple mobile-friendly driver portal)
  if (
    !cleaned.includes('HEAD') &&
    !cleaned.includes('PLANNER') &&
    (
      cleaned === 'DRIVER' ||
      cleaned === 'DRIVER_HELPER' ||
      cleaned === 'HELPER' ||
      cleaned.includes('DRIVER')
    )
  ) {
    return 'DRIVER';
  }

  // 5. VIEWER (Read-only access)
  if (
    cleaned === 'VIEWER' ||
    cleaned === 'READ_ONLY' ||
    cleaned === 'READONLY' ||
    cleaned === 'AUDITOR' ||
    cleaned === 'GUEST' ||
    cleaned.includes('VIEWER')
  ) {
    return 'VIEWER';
  }

  // 6. MANAGEMENT / SUPERVISOR (Executive monitoring & decision making)
  if (
    cleaned === 'MANAGEMENT' ||
    cleaned === 'SUPERVISOR' ||
    cleaned === 'MANAGEMENT_SUPERVISOR' ||
    cleaned === 'OPS_SUPERVISOR' ||
    cleaned === 'EXECUTIVE' ||
    cleaned.includes('MANAGEMENT') ||
    cleaned.includes('SUPERVISOR')
  ) {
    return 'MANAGEMENT';
  }

  // 7. TRUCK_PLANNER (Truck planning, vehicle assignment, route dispatch)
  if (
    cleaned === 'TRUCK_PLANNER' ||
    cleaned === 'TRUCKPLANNER' ||
    cleaned === 'DRIVER_HEAD' ||
    cleaned === 'DRIVERS_HEAD' ||
    cleaned.includes('TRUCK_PLANNER') ||
    cleaned.includes('TRUCKPLANNER') ||
    cleaned.includes('DRIVER_HEAD') ||
    cleaned.includes('DRIVERS_HEAD') ||
    cleaned.includes('PLANNER')
  ) {
    return 'TRUCK_PLANNER';
  }

  // 8. DISPATCHER (Transport dispatch, loading milestone timestamps, gate releases)
  if (
    cleaned === 'DISPATCHER' ||
    cleaned === 'TRANSPORT_DISPATCHER' ||
    cleaned.includes('DISPATCHER')
  ) {
    return 'DISPATCHER';
  }

  return null;
}

/**
 * Verifies whether a given user profile, role string, or role identifier represents an authorized Coordinator.
 * Strictly checks the canonical role normalization, preventing unauthorized access while supporting
 * all valid Coordinator role representations (e.g. 'COORDINATOR', 'coordinator', 'Senior Key Accounts Coordinator',
 * 'COORDINATOR / LOGISTICS', 'COORDINATOR_LOGISTICS', 'LOGISTICS_COORDINATOR').
 * Unrelated roles (Viewer, Encoder, Driver, Management, Dispatcher, Truck Planner, Guest) return false.
 */
export function isCoordinatorRole(roleInput?: UserProfile | UserRole | string | null): boolean {
  if (!roleInput) return false;
  return normalizeUserRole(roleInput) === 'COORDINATOR';
}

/**
 * Returns the default portal/tab for each authenticated canonical role:
 * - ADMIN                -> 'dashboard' (Admin Portal)
 * - ENCODER              -> 'dispatch' (Encoder Portal)
 * - COORDINATOR          -> 'coordinator_portal' (Coordinator Portal)
 * - DRIVER               -> 'dispatch' (Driver Delivery Portal)
 * - VIEWER               -> 'dashboard' (Viewer Portal)
 * - MANAGEMENT           -> 'dashboard' (Management / Supervisor Portal)
 * - TRUCK_PLANNER        -> 'truck_planner' (Truck Planner Portal)
 * - DISPATCHER           -> 'dispatcher_portal' (Dispatcher Portal)
 */
export function getDefaultTabForRole(roleInput?: UserProfile | UserRole | string | null): NavigationTab {
  const canonical = normalizeUserRole(roleInput);
  switch (canonical) {
    case 'ADMIN':
      return 'dashboard';
    case 'ENCODER':
      return 'dispatch';
    case 'COORDINATOR':
      return 'coordinator_portal';
    case 'DRIVER':
      return 'dispatch';
    case 'VIEWER':
      return 'dashboard';
    case 'MANAGEMENT':
      return 'dashboard';
    case 'TRUCK_PLANNER':
      return 'truck_planner';
    case 'DISPATCHER':
      return 'dispatcher_portal';
    default:
      return 'dashboard';
  }
}

/**
 * Strict role-based access control (RBAC) authorization check.
 * Strictly verifies whether a given role is authorized to view the requested tab.
 */
export function isTabAuthorized(roleInput?: UserProfile | UserRole | string | null, tab?: NavigationTab): boolean {
  if (!roleInput || !tab) return false;
  const canonical = normalizeUserRole(roleInput);
  if (!canonical) return false; // Fail closed if role is unconfigured

  switch (canonical) {
    case 'ADMIN':
      // Admin: Full access to all modules, including User Management and Settings
      return [
        'dashboard',
        'clients',
        'dispatch',
        'forwarding_report',
        'pod_returning',
        'reports',
        'client_management',
        'trash',
        'settings',
        'data_audit',
        'user_management',
        'coordinator_portal',
        'truck_planner',
        'dispatcher_portal'
      ].includes(tab);

    case 'ENCODER':
      // Encoder: Operational data entry, dispatching, forwarding, client directory, POD returning
      return [
        'dashboard',
        'dispatch',
        'forwarding_report',
        'pod_returning',
        'client_management',
        'trash',
        'settings',
        'data_audit',
      ].includes(tab);

    case 'COORDINATOR':
      // Coordinator: Assigned account coordination, shipments, dispatches, forwarding overview
      return [
        'dashboard',
        'coordinator_portal',
        'clients',
        'forwarding_report',
        'dispatch',
        'settings',
        'data_audit',
      ].includes(tab);

    case 'DRIVER':
      // Driver: Mobile Delivery View (has isolated full-screen portal)
      return ['dispatch'].includes(tab);

    case 'VIEWER':
      // Viewer: Read-only access to monitoring screens
      return [
        'dashboard',
        'dispatch',
        'forwarding_report',
        'clients',
        'reports',
        'data_audit',
      ].includes(tab);

    case 'MANAGEMENT':
      // Management: High-level monitoring, performance metrics, reports, executive views
      return [
        'dashboard',
        'dispatch',
        'forwarding_report',
        'clients',
        'reports',
        'data_audit',
        'settings',
      ].includes(tab);

    case 'TRUCK_PLANNER':
      // Truck Planner: Truck planning, truck runs, corridor clusters, dispatch monitoring, dashboard
      return [
        'truck_planner',
        'driver_head_portal',
        'dashboard',
        'dispatch',
        'forwarding_report',
        'settings',
        'data_audit',
      ].includes(tab);

    case 'DISPATCHER':
      // Dispatcher: Dispatcher Portal, daily dispatching monitoring, forwarding report, dashboard
      return [
        'dispatcher_portal',
        'dispatch',
        'dashboard',
        'forwarding_report',
        'settings',
        'data_audit',
      ].includes(tab);

    default:
      return false;
  }
}

export interface RolePermissions {
  canViewDashboard: 'Full' | 'View' | 'Limited';
  canManageClients: 'Full' | 'Operational' | 'View' | 'No';
  canDailyDispatch: 'Full' | 'Add/Edit/Import' | 'View/Update' | 'Assigned only' | 'Read-only';
  canForwarding: 'Full' | 'Add/Edit/Import' | 'View/Update' | 'Assigned only' | 'Read-only';
  canImportExcel: boolean;
  canExportExcel: boolean;
  canManageUsers: boolean;
  canAssignRoles: boolean;
  canDeleteRecords: 'Full' | 'SoftDeleteOnly' | 'No';
  canEditSettings: boolean;
  isReadOnly: boolean;
}

/**
 * Returns centralized permission configuration for the given user profile/role.
 */
export function getRolePermissions(roleInput?: UserProfile | UserRole | string | null): RolePermissions {
  const canonical = normalizeUserRole(roleInput);
  switch (canonical) {
    case 'ADMIN':
      return {
        canViewDashboard: 'Full',
        canManageClients: 'Full',
        canDailyDispatch: 'Full',
        canForwarding: 'Full',
        canImportExcel: true,
        canExportExcel: true,
        canManageUsers: true,
        canAssignRoles: true,
        canDeleteRecords: 'Full',
        canEditSettings: true,
        isReadOnly: false,
      };

    case 'ENCODER':
      return {
        canViewDashboard: 'View',
        canManageClients: 'Operational',
        canDailyDispatch: 'Add/Edit/Import',
        canForwarding: 'Add/Edit/Import',
        canImportExcel: true,
        canExportExcel: true,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'SoftDeleteOnly',
        canEditSettings: false,
        isReadOnly: false,
      };

    case 'COORDINATOR':
      return {
        canViewDashboard: 'View',
        canManageClients: 'View',
        canDailyDispatch: 'View/Update',
        canForwarding: 'View/Update',
        canImportExcel: false,
        canExportExcel: true,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'No',
        canEditSettings: false,
        isReadOnly: false,
      };

    case 'DRIVER':
      return {
        canViewDashboard: 'Limited',
        canManageClients: 'No',
        canDailyDispatch: 'Assigned only',
        canForwarding: 'Assigned only',
        canImportExcel: false,
        canExportExcel: false,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'No',
        canEditSettings: false,
        isReadOnly: false,
      };

    case 'VIEWER':
      return {
        canViewDashboard: 'View',
        canManageClients: 'View',
        canDailyDispatch: 'Read-only',
        canForwarding: 'Read-only',
        canImportExcel: false,
        canExportExcel: false,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'No',
        canEditSettings: false,
        isReadOnly: true,
      };

    case 'MANAGEMENT':
      return {
        canViewDashboard: 'Full',
        canManageClients: 'View',
        canDailyDispatch: 'Read-only',
        canForwarding: 'Read-only',
        canImportExcel: false,
        canExportExcel: true,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'No',
        canEditSettings: false,
        isReadOnly: false,
      };

    case 'TRUCK_PLANNER':
      return {
        canViewDashboard: 'Full',
        canManageClients: 'View',
        canDailyDispatch: 'View/Update',
        canForwarding: 'View/Update',
        canImportExcel: false,
        canExportExcel: true,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'SoftDeleteOnly',
        canEditSettings: false,
        isReadOnly: false,
      };

    case 'DISPATCHER':
      return {
        canViewDashboard: 'Full',
        canManageClients: 'View',
        canDailyDispatch: 'Add/Edit/Import',
        canForwarding: 'View/Update',
        canImportExcel: false,
        canExportExcel: true,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'SoftDeleteOnly',
        canEditSettings: false,
        isReadOnly: false,
      };

    default:
      return {
        canViewDashboard: 'Limited',
        canManageClients: 'No',
        canDailyDispatch: 'Read-only',
        canForwarding: 'Read-only',
        canImportExcel: false,
        canExportExcel: false,
        canManageUsers: false,
        canAssignRoles: false,
        canDeleteRecords: 'No',
        canEditSettings: false,
        isReadOnly: true,
      };
  }
}

/**
 * Returns formatted role and department labels for header badges and profile cards.
 */
export function getUserRoleDisplayLabel(user?: UserProfile | null): {
  canonicalRole: CanonicalRole | null;
  roleLabel: string;
  deptLabel: string;
  fullBadge: string;
  portalName: string;
} {
  if (!user) {
    return {
      canonicalRole: null,
      roleLabel: 'GUEST',
      deptLabel: 'OFFICE',
      fullBadge: 'GUEST / OFFICE',
      portalName: 'Public Portal',
    };
  }

  const canonicalRole = normalizeUserRole(user);

  let roleLabel = 'OFFICE';
  let deptLabel = 'OPERATIONS';
  let portalName = 'OFII Portal';

  switch (canonicalRole) {
    case 'ADMIN':
      roleLabel = 'ADMIN';
      deptLabel = 'EXECUTIVE';
      portalName = 'Admin Portal';
      break;

    case 'ENCODER':
      roleLabel = 'ENCODER';
      deptLabel = 'OPERATIONS';
      portalName = 'Encoder Portal';
      break;

    case 'COORDINATOR':
      roleLabel = 'COORDINATOR';
      deptLabel = 'LOGISTICS';
      portalName = 'Coordinator Portal';
      break;

    case 'DRIVER':
      roleLabel = 'DRIVER';
      deptLabel = 'FLEET';
      portalName = 'Driver Portal';
      break;

    case 'VIEWER':
      roleLabel = 'VIEWER';
      deptLabel = 'AUDIT';
      portalName = 'Viewer Portal (Read-Only)';
      break;

    case 'MANAGEMENT':
      roleLabel = 'MANAGEMENT';
      deptLabel = 'SUPERVISORY';
      portalName = 'Management / Supervisor Portal';
      break;

    case 'TRUCK_PLANNER':
      roleLabel = 'TRUCK PLANNER';
      deptLabel = 'FLEET PLANNING';
      portalName = 'Truck Planner Portal';
      break;

    case 'DISPATCHER':
      roleLabel = 'DISPATCHER';
      deptLabel = 'OPERATIONS DISPATCH';
      portalName = 'Dispatcher Portal';
      break;

    default:
      roleLabel = (user.role || 'USER').toUpperCase();
      deptLabel = 'OPERATIONS';
      portalName = 'General Portal';
  }

  return {
    canonicalRole,
    roleLabel,
    deptLabel,
    fullBadge: `${roleLabel} / ${deptLabel}`,
    portalName,
  };
}
