/** True when the user is an admin or holds `permission` (or the blanket admin.access). */
export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.roles?.includes('admin')) return true;
  const perms = user.permissions || [];
  return perms.includes(permission) || perms.includes('admin.access');
}
