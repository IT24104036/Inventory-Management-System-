export const getAdminPageTitle = (pathname) => {
  if (pathname === "/admin/users") return "User Control";
  if (pathname === "/admin/products") return "Product Management";
  if (pathname === "/admin/inventory") return "Inventory Tracking";
  if (pathname === "/admin/sales") return "Sales Management";
  if (pathname === "/admin/alerts") return "Discounts & Alerts";
  if (pathname === "/admin/reports") return "Reports Analytics";
  if (pathname === "/admin/settings") return "System Config";
  return "Admin Dashboard";
};
