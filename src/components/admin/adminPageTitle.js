export const getAdminPageTitle = (pathname) => {
  if (pathname === "/admin/users") return "User Control";
  if (pathname === "/admin/sales") return "Sales Management";
  return "Admin Dashboard";
};
