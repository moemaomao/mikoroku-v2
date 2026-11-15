const ADMIN_PANEL_EMAILS = new Set(["mikorokuscan@gmail.com", "moemaomao@gmail.com"]);

export const AUTH_USER_CHANGE_EVENT = "mikoroku:header-auth-changed";

export function hasAdminPanelAccess(
  user: { email?: string | null } | null | undefined,
): boolean {
  const email = user?.email?.trim().toLowerCase();
  return Boolean(email && ADMIN_PANEL_EMAILS.has(email));
}
