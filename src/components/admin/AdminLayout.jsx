import { Suspense, lazy } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "User Control", href: "/admin/users", icon: Users },
];

const LogoutButton = lazy(() => import("@/components/LogoutButton"));

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();

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
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-[#0F172A] text-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:sticky`}
      >
        <div className="flex flex-col h-full border-r border-white/5">
          <div className="p-8 flex items-center gap-3">
            <div className="h-10 w-10 glass p-1.5 rounded-xl border-white/20">
              <InvigoLogo size={28} />
            </div>
            <span className="font-brand text-3xl">
              Invigo<span className="text-[#007A5E]">.</span>
            </span>
          </div>

          <div className="px-4 mb-4">
            <div className="glass p-4 rounded-3xl border-white/10 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007A5E] to-[#7C3AED] flex items-center justify-center font-black text-white">
                AD
              </div>
              <div className="text-[#0F172A]">
                <p className="text-sm font-black leading-none mb-1">Owner View</p>
                <p className="text-[10px] font-bold text-[#0F172A]/50 uppercase tracking-widest leading-none">
                  Status: Active
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                    isActive
                      ? "bg-white/10 text-white font-bold border border-white/10"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon size={20} className={isActive ? "text-[#007A5E]" : "group-hover:text-white"} />
                  <span className="text-sm">{item.label}</span>
                  {isActive && <Motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#007A5E]" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-6 border-t border-white/5 mt-auto">
            <Suspense
              fallback={(
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500/70 font-black uppercase tracking-widest text-xs"
                  aria-busy="true"
                >
                  Loading…
                </button>
              )}
            >
              <LogoutButton className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all" />
            </Suspense>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ setSidebarOpen, title }) => (
  <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-8 bg-[#0F172A] border-b border-white/5 shadow-sm">
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-white hover:bg-white/10"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={24} />
      </Button>
      <h1 className="font-display text-2xl font-black text-white tracking-tight">{title}</h1>
    </div>
  </header>
);

const AdminLayout = ({ title, sidebarOpen, setSidebarOpen, children }) => (
  <div className="flex min-h-screen bg-background text-foreground tracking-tight">
    <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
    <div className="flex-1 w-full max-w-full">
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
          <Header setSidebarOpen={setSidebarOpen} title={title} />
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  </div>
);

export default AdminLayout;

