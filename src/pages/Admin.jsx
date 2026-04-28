import { Suspense, lazy, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminSectionPlaceholder from "@/components/admin/adminLayoutUtils";
import { getAdminPageTitle } from "@/components/admin/adminPageTitle";

const SalesModule = lazy(() => import("@/components/sales/SalesContainer"));
const ProductManagement = lazy(() => import("@/components/ProductManagement"));
const InventoryTracking = lazy(() => import("@/components/InventoryTracking"));
const DiscountsAlertsModule = lazy(() => import("@/components/discounts-alerts/DiscountsAlertsContainer"));
const ReportsModule = lazy(() => import("@/components/ReportsModule"));
const AdminDashboardHome = lazy(() => import("@/components/admin/AdminDashboardHome"));
const AdminUserControl = lazy(() => import("@/components/admin/users/AdminUserControl"));

const PageFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="flex items-center gap-3 text-[#0F172A]/60">
      <div className="w-6 h-6 border-2 border-[#007A5E] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-black uppercase tracking-widest">Loading…</span>
    </div>
  </div>
);

const Admin = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const location = useLocation();

  return (
    <AdminLayout
      title={getAdminPageTitle(location.pathname)}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      <AnimatePresence mode="wait">
        <Motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Suspense fallback={<PageFallback />}>
            {location.pathname === "/admin/users" ? (
              <AdminUserControl users={users} setUsers={setUsers} />
            ) : location.pathname === "/admin/products" ? (
              <ProductManagement />
            ) : location.pathname === "/admin/inventory" ? (
              <InventoryTracking />
            ) : location.pathname === "/admin/sales" ? (
              <SalesModule role="Admin" />
            ) : location.pathname === "/admin/alerts" ? (
              <DiscountsAlertsModule role="Admin" />
            ) : location.pathname === "/admin/reports" ? (
              <ReportsModule />
            ) : location.pathname === "/admin/expiry-risk" ? (
              <Navigate to={`/admin${location.search || ""}${location.hash || ""}`} replace />
            ) : location.pathname === "/admin" || location.pathname === "/admin/" ? (
              <AdminDashboardHome />
            ) : (
              <AdminSectionPlaceholder />
            )}
          </Suspense>
        </Motion.div>
      </AnimatePresence>
    </AdminLayout>
  );
};

export default Admin;
