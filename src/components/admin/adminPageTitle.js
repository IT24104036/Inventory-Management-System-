export const getAdminPageTitle = (pathname) => {
  if (pathname === "/admin/users") return "User Control";
  return "Admin Dashboard";
};
