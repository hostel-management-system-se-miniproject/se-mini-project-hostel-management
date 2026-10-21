export const VALID_ROLES = ['student', 'admin'];

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', roles: ['student', 'admin'], icon: '▣' },
  { label: 'Complaints', path: '/complaints', roles: ['student', 'admin'], icon: '⚑' },
  { label: 'Leave', path: '/leave', roles: ['student', 'admin'], icon: '✈' },
  { label: 'Rooms', path: '/rooms', roles: ['admin'], icon: '⌂' },
  { label: 'Allocations', path: '/allocations', roles: ['admin'], icon: '+' },
  { label: 'Fees', path: '/fees', roles: ['admin'], icon: '₹' },
  { label: 'Visitors', path: '/visitors', roles: ['admin'], icon: '◎' },
  { label: 'Reports', path: '/reports', roles: ['admin'], icon: '▤' },
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
