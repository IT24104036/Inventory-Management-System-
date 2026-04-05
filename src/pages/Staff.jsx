import { Suspense, lazy, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { LayoutDashboard, Menu, ShoppingCart, ChevronRight, Sparkles } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import { Button } from "@/components/ui/button";
import { getSessionUser, hasActiveSession } from "@/lib/session";

const LogoutButton = lazy(() => import("@/components/LogoutButton"));
const SalesModule = lazy(() => import("@/components/sales/SalesContainer"));

const PageFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="flex items-center gap-3 text-white/60">
      <div className="w-5 h-5 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-widest">Loading...</span>
    </div>
  </div>
);

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();
  const sessionUser = getSessionUser() || {};
  const displayName = sessionUser.name || sessionUser.username || "Staff";
  const displayRole = sessionUser.roleName || sessionUser.role || "Staff";
  const navItems = [
    { label: "Staff Desk", href: "/staff", icon: LayoutDashboard },
    { label: "Sales Recording", href: "/staff/sales", icon: ShoppingCart },
  ];

  return (
    <>
      <AnimatePresence>
        {open && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-[#141C1A] text-white transition-transform duration-300 shadow-2xl lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:sticky`}
      >
        <div className="flex flex-col h-full border-r border-white/5">
          <div className="p-8 flex items-center gap-3">
            <div className="h-10 w-10 glass p-1.5 rounded-xl border-white/10 bg-white/5">
              <InvigoLogo size={28} />
            </div>
            <span className="font-brand text-3xl text-white">
              Invigo<span className="text-[#007A5E]">.</span>
            </span>
          </div>

          <div className="px-4 mb-4">
            <div className="glass p-4 rounded-3xl border-white/5 bg-white/5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007A5E] to-[#7C3AED] flex items-center justify-center font-black text-white shadow-lg shadow-[#007A5E]/20">
                {String(displayName).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black leading-none mb-1 text-white">{displayName}</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                  {displayRole}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 py-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                    isActive
                      ? "bg-white/10 text-white font-black border border-white/5"
                      : "text-white/40 hover:text-white hover:bg-white/5 font-bold"
                  }`}
                >
                  <item.icon size={20} className={isActive ? "text-[#007A5E]" : "group-hover:text-white"} />
                  <span className="text-sm">{item.label}</span>
                  {isActive && <Motion.div layoutId="staff-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#007A5E]" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-6 border-t border-white/5">
            <Suspense
              fallback={(
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white/50 font-black uppercase tracking-widest text-[10px]"
                  aria-busy="true"
                >
                  Loading...
                </button>
              )}
            >
              <LogoutButton className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white/30 hover:text-white hover:bg-red-500/10 transition-all font-black uppercase tracking-widest text-[10px]" />
            </Suspense>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ setSidebarOpen, title }) => (
  <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-8 bg-[#141C1A]/90 backdrop-blur-xl border-b border-white/5">
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
        <Menu size={24} />
      </Button>
      <h1 className="font-brand text-3xl tracking-tight text-white">{title}</h1>
    </div>
  </header>
);

const StaffDashboardHome = () => {
  const sessionUser = getSessionUser() || {};
  const displayName = sessionUser.name || sessionUser.username || "Staff";

  return (
    <div className="space-y-8">
      <div className="card-premium p-10 bg-gradient-to-br from-[#8D6E63]/20 to-[#D7CCC8]/30 border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
        <div className="relative z-10">
          <p className="text-[#007A5E] text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={16} /> Staff Workspace
          </p>
          <h2 className="mt-3 text-4xl font-alice-bold tracking-tight text-[#4E342E]">
            Welcome back, {displayName}
          </h2>
          <p className="mt-3 max-w-2xl text-[#4E342E]/65 font-bold">
            This branch includes the staff sales experience for POS recording and bill management alongside the shared landing and admin pages.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/staff/sales"
              className="inline-flex items-center gap-3 rounded-2xl bg-[#007A5E] px-6 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-[#006B52]"
            >
              Open Staff Sales
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-premium p-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#4E342E]/40 mb-2">Included</p>
          <h3 className="text-2xl font-black text-[#4E342E]">Sales Recording</h3>
          <p className="mt-2 text-sm font-bold text-[#4E342E]/60">
            POS entry, bill history, draft finalization, and sale management are available in this scoped branch.
          </p>
        </div>
        <div className="card-premium p-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#4E342E]/40 mb-2">Branch Scope</p>
          <h3 className="text-2xl font-black text-[#4E342E]">Focused Staff Flow</h3>
          <p className="mt-2 text-sm font-bold text-[#4E342E]/60">
            This version keeps staff navigation intentionally small so the branch stays centered on the requested sales module.
          </p>
        </div>
      </div>
    </div>
  );
};

const Staff = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!hasActiveSession()) {
    return <Navigate to="/login" replace />;
  }

  const getPageTitle = () => {
    if (location.pathname === "/staff/sales") return "Sales Recording";
    return "Staff Desk";
  };

  return (
    <div className="flex min-h-screen tracking-tight text-[#4E342E]">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <div className="relative min-h-screen bg-background">
          <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
            <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vh] bg-[#007A5E]/10 rounded-full blur-[120px] animate-blob" />
            <div
              className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vh] bg-[#7C3AED]/10 rounded-full blur-[120px] animate-blob"
              style={{ animationDelay: "2s" }}
            />
            <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vh] bg-[#9D1967]/5 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
          </div>

          <div className="flex flex-col min-h-screen relative z-10 animate-fade-in">
            <Header setSidebarOpen={setSidebarOpen} title={getPageTitle()} />
            <main className="flex-1 p-8 lg:p-12">
              <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                  <Motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Suspense fallback={<PageFallback />}>
                      {location.pathname === "/staff/sales" ? (
                        <SalesModule role="Staff" canEdit={false} canManageSales={false} />
                      ) : (
                        <StaffDashboardHome />
                      )}
                    </Suspense>
                  </Motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staff;
