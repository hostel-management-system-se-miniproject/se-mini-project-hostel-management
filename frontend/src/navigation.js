export const VALID_ROLES = ['student', 'admin'];

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', roles: ['student', 'admin'], icon: 'dashboard' },
  { label: 'Complaints', path: '/complaints', roles: ['student', 'admin'], icon: 'complaints' },
  { label: 'Leave', path: '/leave', roles: ['student', 'admin'], icon: 'leave' },
  { label: 'Rooms', path: '/rooms', roles: ['admin'], icon: 'rooms' },
  { label: 'Allocations', path: '/allocations', roles: ['admin'], icon: 'allocations' },
  { label: 'Fees', path: '/fees', roles: ['admin'], icon: 'fees' },
  { label: 'Visitors', path: '/visitors', roles: ['admin'], icon: 'visitors' },
  { label: 'Reports', path: '/reports', roles: ['admin'], icon: 'reports' },
];

export function filterMenuItemsByRole(items, role) {
  if (!role) {
    return items;
  }

  return items.filter((item) => item.roles.includes(role));
}

export function formatRoleName(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getDefaultPathForRole(role) {
  return filterMenuItemsByRole(NAV_ITEMS, role)[0]?.path ?? '/dashboard';
}
