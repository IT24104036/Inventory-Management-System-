import { getSessionUser } from "@/lib/session";

const MANAGER_ROLE_NAMES = new Set([
  "manager",
  "assistant manager",
  "warehouse manager",
  "system administrator",
]);

const normalize = (value) => String(value || "").trim().toLowerCase();

const normalizeSessionUser = (sessionUser) =>
  sessionUser && typeof sessionUser === "object" ? sessionUser : {};

export const hasDiscountReviewAuthority = (sessionUser = getSessionUser()) => {
  const user = normalizeSessionUser(sessionUser);
  const roleName = normalize(user.roleName || user.role);
  const perms = user.permissions && typeof user.permissions === "object" ? user.permissions : {};
  return MANAGER_ROLE_NAMES.has(roleName) || !!(perms.editDiscounts || perms.salesManagement);
};

export const canRecordWaste = () => true;
