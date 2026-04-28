import { Suspense, lazy, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { LayoutDashboard, Menu, Package, CheckSquare, ShoppingCart, Bell, BarChart3, UserCircle, ChevronRight, Zap, ShieldCheck, Settings, Sparkles, CheckCircle2, Clock } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import { Button } from "@/components/ui/button";
import { getExpiryActionAlerts } from "@/lib/api";
import { hasDiscountReviewAuthority } from "@/lib/access";
import { getSessionUser, hasActiveSession } from "@/lib/session";
import { getSalesHistory } from "@/lib/salesApi";
import { localTodayYMD } from "@/lib/dateUtils";

/** Units sold today used as a transparent shift pace goal for the Efficiency tile */
const SHIFT_UNIT_GOAL = 40;
const LogoutButton = lazy(() => import("@/components/LogoutButton"));
const SalesModule = lazy(() => import("@/components/sales/SalesContainer"));
const StaffProfile = lazy(() => import("@/components/StaffProfile"));
const InventoryTracking = lazy(() => import("@/components/InventoryTracking"));
const DiscountsAlertsModule = lazy(() => import("@/components/discounts-alerts/DiscountsAlertsContainer"));
const ReportsModule = lazy(() => import("@/components/ReportsModule"));
const ProductManagement = lazy(() => import("@/components/ProductManagement"));

const PageFallback = () => (
    <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-white/60">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Loading…</span>
        </div>
    </div>
);
const Sidebar = ({ open, setOpen }) => {
    const location = useLocation();

    // Read user info stored at login
    const sessionUser = getSessionUser() || {};
    const displayName = sessionUser.name || sessionUser.username || "Staff";
    const displayRole = sessionUser.roleName || sessionUser.role || "Staff";
    const allNavItems = [
        { label: "Staff Desk",          href: "/staff",                  icon: LayoutDashboard },
        { label: "Product Management",  href: "/staff/products",         icon: Package         },
        { label: "Inventory Tracking",  href: "/staff/inventory",        icon: CheckSquare     },
        { label: "Sales Recording",     href: "/staff/sales",            icon: ShoppingCart    },
        { label: "Discounts & Alerts",  href: "/staff/alerts",           icon: Bell            },
        { label: "Reports & Analytics", href: "/staff/reports",          icon: BarChart3       },
        { label: "My Profile",          href: "/staff/profile",          icon: UserCircle      },
    ];

    // All modules always visible — tick = full CRUD, no tick = read-only
    const navItems = allNavItems;

    return (<>
            <AnimatePresence>
                {open && (<Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"/>)}
            </AnimatePresence>

            <aside className={`fixed top-0 left-0 z-50 h-screen w-72 bg-[#141C1A] text-white transition-transform duration-300 shadow-2xl lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} lg:sticky`}>
                <div className="flex flex-col h-full border-r border-white/5">
                    <div className="p-8 flex items-center gap-3">
                        <div className="h-10 w-10 glass p-1.5 rounded-xl border-white/10 bg-white/5">
                            <InvigoLogo size={28}/>
                        </div>
                        <span className="font-brand text-3xl text-white">Invigo<span className="text-[#007A5E]">.</span></span>
                    </div>

                    <div className="px-4 mb-4">
                        <div className="glass p-4 rounded-3xl border-white/5 bg-white/5 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007A5E] to-[#7C3AED] flex items-center justify-center font-black text-white shadow-lg shadow-[#007A5E]/20">
                                {String(displayName).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-black leading-none mb-1 text-white">{displayName}</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">{displayRole}</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-2 py-4">
                        {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (<Link key={item.href} to={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${isActive
                    ? "bg-white/10 text-white font-black border border-white/5"
                    : "text-white/40 hover:text-white hover:bg-white/5 font-bold"}`}>
                                    <item.icon size={20} className={isActive ? "text-[#007A5E]" : "group-hover:text-white"}/>
                                    <span className="text-sm">{item.label}</span>
                                    {isActive && <Motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#007A5E]"/>}
                                </Link>);
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
                                    Loading…
                                </button>
                            )}
                        >
                            <LogoutButton className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white/30 hover:text-white hover:bg-red-500/10 transition-all font-black uppercase tracking-widest text-[10px]"/>
                        </Suspense>
                    </div>
                </div>
            </aside>
        </>);
};
const Header = ({ setSidebarOpen, title }) => (<header className="sticky top-0 z-30 flex h-20 items-center justify-between px-8 bg-[#141C1A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
                <Menu size={24}/>
            </Button>
            <h1 className="font-brand text-3xl tracking-tight text-white">{title}</h1>
        </div>
    </header>);
const StaffDashboardHome = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const sessionUser = getSessionUser() || {};
    const sessionActive = hasActiveSession();
    const canManageDiscounts = hasDiscountReviewAuthority(sessionUser);
    const perms = sessionUser.permissions && typeof sessionUser.permissions === "object" ? sessionUser.permissions : {};
    const canReadSalesActivity = !!(perms.salesRecording || perms.editVoidSales || perms.salesManagement);
    /** Active sale lines you recorded today (local calendar day) */
    const [salesToday, setSalesToday] = useState({ lines: 0, units: 0 });

    useEffect(() => {
        if (!sessionActive) return undefined;

        let cancelled = false;
        const username = (() => {
            try {
                return JSON.parse(localStorage.getItem("invigo_user") || "{}").username || "";
            } catch {
                return "";
            }
        })();
        const today = localTodayYMD();

        (async () => {
            setLoading(true);
            try {
                const [alertData, salesList] = await Promise.all([
                    getExpiryActionAlerts(),
                    canReadSalesActivity ? getSalesHistory().catch(() => []) : Promise.resolve([]),
                ]);
                if (cancelled) return;
                const items = Array.isArray(alertData?.items) ? alertData.items : [];
                setAlerts(items);

                const sales = Array.isArray(salesList) ? salesList : [];
                const todaysMine = sales.filter((s) => {
                    if (!s || s.recordedBy !== username) return false;
                    const d = typeof s.saleDate === "string" ? s.saleDate.slice(0, 10) : s.saleDate;
                    if (d !== today) return false;
                    const st = s.status != null ? String(s.status).toUpperCase() : "ACTIVE";
                    if (st === "VOID" || st === "VOIDED" || st === "DRAFT") return false;
                    return true;
                });
                const units = todaysMine.reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
                setSalesToday({ lines: todaysMine.length, units });
            } catch {
                if (!cancelled) {
                    setAlerts([]);
                    setSalesToday({ lines: 0, units: 0 });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [canReadSalesActivity, sessionActive]);

    if (!sessionActive) {
        return <Navigate to="/login" replace />;
    }

    const sortedByPriority = [...alerts].sort((a, b) => {
        const priorityDiff = (a.priority ?? 99) - (b.priority ?? 99);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.impactScore ?? -1) - (a.impactScore ?? -1);
    });
    const urgentAlerts = sortedByPriority.filter((alert) => ["High Risk", "Expired"].includes(alert.riskLevel));
    const prioritySource = urgentAlerts.length > 0 ? urgentAlerts : sortedByPriority;
    const priorityRows = prioritySource.slice(0, 3);

    const openActions = alerts.filter(
        (a) => a.actionType === "LOG_WASTE" || a.actionType === "PENDING_REVIEW"
    ).length;

    const efficiencyPct =
        !canReadSalesActivity || salesToday.units <= 0
            ? null
            : Math.min(100, Math.round((salesToday.units / SHIFT_UNIT_GOAL) * 100));
    const efficiencySub =
        !canReadSalesActivity
            ? "Sales activity is hidden for your current role"
            : salesToday.units <= 0
            ? "Log sales to measure shift pace"
            : salesToday.units >= SHIFT_UNIT_GOAL
              ? `Goal: ${SHIFT_UNIT_GOAL} units · you are on pace`
              : `${SHIFT_UNIT_GOAL - salesToday.units} units to ${SHIFT_UNIT_GOAL} goal`;

    const liveStats = [
        {
            label: "Tasks Done",
            value: loading ? "…" : String(salesToday.lines),
            sub: !canReadSalesActivity ? `${openActions} open action(s) in your queue` : loading
                ? "Loading your sales…"
                : `${salesToday.units} units sold today · ${openActions} open action(s)`,
            icon: CheckCircle2,
            color: "text-[#007A5E]",
            bg: "bg-[#007A5E]/10",
        },
        {
            label: "High Risk Items",
            value: loading ? "…" : String(urgentAlerts.length),
            sub: loading ? "…" : urgentAlerts.length ? "Expired or High Risk — review first" : "No urgent risk flags",
            icon: Clock,
            color: "text-[#9D1967]",
            bg: "bg-[#9D1967]/10",
        },
        {
            label: "Efficiency",
            value: loading ? "…" : efficiencyPct == null ? "—" : `${efficiencyPct}%`,
            sub: loading ? "…" : efficiencySub,
            icon: Zap,
            color: "text-[#7C3AED]",
            bg: "bg-[#7C3AED]/10",
        },
    ];

    const priorityLabel = (alert) => {
        const batchLabel = alert.batchNumber || `#${alert.batchId}`;
        if (alert.actionType === "LOG_WASTE") {
            return `Log waste for Batch ${batchLabel} (${alert.productName})`;
        }
        if (alert.actionType === "DISCOUNT_ACTIVE") {
            return `Prioritize selling Batch ${batchLabel} (${alert.productName}) with active discount`;
        }
        if (alert.actionType === "PENDING_REVIEW") {
            if (canManageDiscounts) {
                return `Review discount for Batch ${batchLabel} (${alert.productName})`;
            }
            if (alert.reviewRequested) {
                return `Manager review requested for Batch ${batchLabel} (${alert.productName})`;
            }
            return `Request manager review for Batch ${batchLabel} (${alert.productName})`;
        }
        return `Monitor Batch ${batchLabel} (${alert.productName}) closely`;
    };

    return (<div className="space-y-8">
        <div className="grid sm:grid-cols-3 gap-6">
            {liveStats.map((stat, i) => (<Motion.div key={stat.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="card-premium bg-[#F9F5EC] p-8 rounded-[2rem] border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] hover:shadow-[0_8px_30px_rgb(78,52,46,0.08)] transition-all">
                    <div className={`h-14 w-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
                        <stat.icon size={28}/>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#4E342E]/40 mb-1">{stat.label}</p>
                    <h3 className="text-4xl font-black text-[#4E342E] tabular-nums">{stat.value}</h3>
                    <p className="text-xs font-bold text-[#4E342E]/50 mt-2 leading-snug">{stat.sub}</p>
                </Motion.div>))}
        </div>

        <div className="card-premium p-10 bg-gradient-to-br from-[#8D6E63]/20 to-[#D7CCC8]/30 border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"/>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-alice-bold tracking-tight mb-2 text-[#4E342E]">Shift Priorities</h2>
                        <p className="text-[#007A5E] text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={16}/> From your live expiry alert queue
                        </p>
                        <p className="text-[11px] font-bold text-[#4E342E]/45 mt-2 normal-case tracking-normal max-w-xl">
                            Ordered by backend priority (waste &amp; high risk first). Same data as Discounts &amp; Alerts → Expiry Alerts.
                        </p>
                    </div>
                    <div className="p-4 bg-[#F9F5EC]/50 rounded-2xl backdrop-blur-sm border border-[#F9F5EC] text-[#8D6E63] shadow-sm">
                        <ShieldCheck size={48}/>
                    </div>
                </div>
                <div className="grid gap-4">
                    {(priorityRows.length > 0 ? priorityRows : []).map((alert) => (
                        <Link
                            key={`${alert.batchId}-${alert.riskLevel}`}
                            to={`/staff/alerts?tab=alerts&batch=${alert.batchId}`}
                            className="bg-[#F9F5EC]/60 backdrop-blur-md border border-white/50 p-5 rounded-3xl flex items-center gap-4 hover:bg-[#F9F5EC] transition-all cursor-pointer group shadow-sm hover:shadow-md"
                        >
                            <div className="h-8 w-8 rounded-full border-2 border-[#007A5E]/20 text-[#007A5E] flex items-center justify-center group-hover:bg-[#007A5E] group-hover:border-[#007A5E] group-hover:text-white transition-all">
                                <CheckCircle2 size={16}/>
                            </div>
                            <span className="font-black text-sm tracking-tight text-[#4E342E] flex-1 text-left">{priorityLabel(alert)}</span>
                            <ChevronRight size={20} className="ml-auto text-[#4E342E]/30 group-hover:text-[#007A5E] shrink-0"/>
                        </Link>
                    ))}
                    {priorityRows.length === 0 && !loading && (
                        <div className="bg-[#F9F5EC]/60 backdrop-blur-md border border-white/50 p-5 rounded-3xl text-sm font-bold text-[#4E342E]/55">
                            No urgent expiry actions right now.
                        </div>
                    )}
                    {priorityRows.length === 0 && loading && (
                        <div className="bg-[#F9F5EC]/60 backdrop-blur-md border border-white/50 p-5 rounded-3xl text-sm font-bold text-[#4E342E]/40">
                            Loading priorities…
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>);
};
const Staff = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const sessionActive = hasActiveSession();

    // Read permissions from localStorage (set at login)
    const sessionUser = getSessionUser() || {};
    const perms = sessionUser.permissions && typeof sessionUser.permissions === "object" ? sessionUser.permissions : {};
    const canManageDiscounts = hasDiscountReviewAuthority(sessionUser);

    if (!sessionActive) {
        return <Navigate to="/login" replace />;
    }

    const getPageTitle = () => {
        if (location.pathname === "/staff/products")         return "Product Management";
        if (location.pathname === "/staff/inventory")       return "Inventory Tracking";
        if (location.pathname === "/staff/sales")           return "Sales Recording";
        if (location.pathname === "/staff/alerts")          return "Discounts & Alerts";
        if (location.pathname === "/staff/reports")         return "Reports & Analytics";
        if (location.pathname === "/staff/profile")         return "My Profile";
        return "Staff Desk";
    };

    // Access guard — returns null if allowed, or a JSX block if denied
    const accessDenied = (permKey) => !perms[permKey] ? (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Motion.div initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-md">
                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#fca5a5]/30 to-[#fee2e2]/10 blur-2xl scale-110 pointer-events-none" />
                <div className="relative rounded-[2rem] border border-white/60 bg-white/35 backdrop-blur-2xl shadow-[0_8px_48px_rgba(239,68,68,0.1),0_2px_8px_rgba(239,68,68,0.05)] p-12 flex flex-col items-center text-center overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                    <div className="relative mb-8">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#fca5a5]/40 to-[#ef4444]/20 blur-xl scale-150" />
                        <div className="relative h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-[#fff1f2] to-[#ffe4e6] border border-white/70 flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.15)]">
                            <ShieldCheck size={36} className="text-[#ef4444]" strokeWidth={1.5} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-[#1a1208] tracking-tight mb-3">Access Restricted</h2>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#fca5a5]/40 to-[#fee2e2]/40 border border-[#ef4444]/20 backdrop-blur-sm shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#991b1b]">Missing Permissions</span>
                    </div>
                    <div className="mt-8 flex gap-2">
                        {[24,40,28,16,36].map((w, i) => (
                            <div key={i} className="h-0.5 rounded-full bg-gradient-to-r from-[#ef4444]/20 to-[#ef4444]/5" style={{ width: w }} />
                        ))}
                    </div>
                </div>
            </Motion.div>
        </div>
    ) : null;

    const content = (<div className="relative min-h-screen bg-background">
            {/* ── Global Landing Page Theme Background Layer ── */}
            <div className="fixed inset-0 z-0 pointer-events-none text-red-0 opacity-60">
              <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vh] bg-[#007A5E]/10 rounded-full blur-[120px] animate-blob"/>
              <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vh] bg-[#7C3AED]/10 rounded-full blur-[120px] animate-blob" style={{ animationDelay: "2s" }}/>
              <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vh] bg-[#9D1967]/5 rounded-full blur-[100px] animate-pulse"/>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"/>
            </div>

            {/* ── Seamless floating grocery icon SVG pattern ── */}
            <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 1, opacity: 0.6 }}>
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <g id="st-apple">
                    <ellipse cx="12" cy="15" rx="7" ry="8" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M12 7 Q14 3 17 4" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
                    <path d="M12 7 Q10 5 8 6" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
                  </g>
                  <g id="st-milk">
                    <rect x="6" y="9" width="12" height="14" rx="1.5" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2"/>
                    <path d="M7 9 L10 4 L14 4 L17 9 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15 Q12 13 15 15" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="1" strokeLinecap="round"/>
                  </g>
                  <g id="st-bread">
                    <path d="M4 16 Q4 9 12 9 Q20 9 20 16 L20 20 L4 20 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M7 20 L7 16" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                    <path d="M12 20 L12 15" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                    <path d="M17 20 L17 16" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                  </g>
                  <g id="st-yogurt">
                    <path d="M8 8 L7 20 L17 20 L16 8 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M7 11 L17 11" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9"/>
                    <ellipse cx="12" cy="8" rx="4" ry="1.5" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1"/>
                  </g>
                  <g id="st-barcode">
                    <rect x="4" y="6" width="16" height="14" rx="1" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1"/>
                    <line x1="7" y1="9" x2="7" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="1.2"/>
                    <line x1="9" y1="9" x2="9" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="0.7"/>
                    <line x1="11" y1="9" x2="11" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="1.4"/>
                    <line x1="13" y1="9" x2="13" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="0.8"/>
                    <line x1="15" y1="9" x2="15" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="1.2"/>
                    <line x1="17" y1="9" x2="17" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="0.7"/>
                  </g>
                  <g id="st-cart">
                    <path d="M6 8 L9 16 L18 16 L21 8 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 5 L6 5 L6 8" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="10" cy="19" r="1.5" fill="rgba(255,255,255,0.8)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1"/>
                    <circle cx="17" cy="19" r="1.5" fill="rgba(255,255,255,0.8)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1"/>
                  </g>
                  <g id="st-clip">
                    <rect x="5" y="5" width="14" height="18" rx="1.5" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2"/>
                    <path d="M9 5 L9 3 Q12 2 15 3 L15 5" fill="rgba(255,255,255,0.8)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="8" y1="10" x2="16" y2="10" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9"/>
                    <line x1="8" y1="13" x2="16" y2="13" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9"/>
                    <line x1="8" y1="16" x2="13" y2="16" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9"/>
                  </g>
                  <pattern id="st-tile" x="0" y="0" width="340" height="340" patternUnits="userSpaceOnUse" patternTransform="translate(0, 0)">
                    <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 -340" dur="40s" repeatCount="indefinite" />
                    <g transform="translate(20,18) rotate(-15 12 12) scale(1.15)" filter="url(#st-gs)"><use href="#st-apple"/></g>
                    <g transform="translate(110,30) rotate(8 12 12) scale(1.05)" filter="url(#st-gs)"><use href="#st-milk"/></g>
                    <g transform="translate(200,10) rotate(-22 12 12) scale(1.2)" filter="url(#st-gs)"><use href="#st-bread"/></g>
                    <g transform="translate(285,40) rotate(12 12 12) scale(1)" filter="url(#st-gs)"><use href="#st-yogurt"/></g>
                    <g transform="translate(60,105) rotate(18 12 12) scale(1.1)" filter="url(#st-gs)"><use href="#st-barcode"/></g>
                    <g transform="translate(155,90) rotate(-10 12 12) scale(1.15)" filter="url(#st-gs)"><use href="#st-cart"/></g>
                    <g transform="translate(250,100) rotate(25 12 12) scale(1)" filter="url(#st-gs)"><use href="#st-clip"/></g>
                    <g transform="translate(320,80) rotate(-18 12 12) scale(1.1)" filter="url(#st-gs)"><use href="#st-apple"/></g>
                    <g transform="translate(10,185) rotate(10 12 12) scale(1.2)" filter="url(#st-gs)"><use href="#st-milk"/></g>
                    <g transform="translate(105,170) rotate(-28 12 12) scale(1.05)" filter="url(#st-gs)"><use href="#st-bread"/></g>
                    <g transform="translate(195,190) rotate(5 12 12) scale(1.1)" filter="url(#st-gs)"><use href="#st-yogurt"/></g>
                    <g transform="translate(280,165) rotate(-12 12 12) scale(1.15)" filter="url(#st-gs)"><use href="#st-barcode"/></g>
                    <g transform="translate(55,265) rotate(-20 12 12) scale(1)" filter="url(#st-gs)"><use href="#st-cart"/></g>
                    <g transform="translate(150,255) rotate(15 12 12) scale(1.2)" filter="url(#st-gs)"><use href="#st-clip"/></g>
                    <g transform="translate(240,270) rotate(-6 12 12) scale(1.05)" filter="url(#st-gs)"><use href="#st-apple"/></g>
                    <g transform="translate(315,250) rotate(22 12 12) scale(1.1)" filter="url(#st-gs)"><use href="#st-milk"/></g>
                  </pattern>
                  <filter id="st-gs" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="1"/>
                    <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.12"/>
                  </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#st-tile)"/>
              </svg>
            </div>

            <div className="flex flex-col min-h-screen relative z-10 animate-fade-in">
                <Header setSidebarOpen={setSidebarOpen} title={getPageTitle()}/>
                <main className="flex-1 p-8 lg:p-12">
                    <div className="max-w-7xl mx-auto">
                        <AnimatePresence mode="wait">
                            <Motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                                <Suspense fallback={<PageFallback />}>
                                    {location.pathname === "/staff" || location.pathname === "/staff/" ? (
                                        <StaffDashboardHome />
                                    ) : location.pathname === "/staff/products" ? (
                                        (!perms.productManagement && !perms.editProducts) 
                                            ? accessDenied("productManagement") 
                                            : <ProductManagement canView={!!perms.productManagement} canEdit={!!perms.editProducts} />
                                    ) : location.pathname === "/staff/inventory" ? (
                                        (!perms.inventoryTracking && !perms.addUpdateStock)
                                            ? accessDenied("inventoryTracking")
                                            : <InventoryTracking canView={!!perms.inventoryTracking} canAddStock={!!perms.addUpdateStock} />
                                    ) : location.pathname === "/staff/sales" ? (
                                        (!perms.salesRecording && !perms.editVoidSales && !perms.salesManagement)
                                            ? accessDenied("salesRecording")
                                            : <SalesModule role="Staff" canEdit={!!perms.editVoidSales} canManageSales={!!perms.salesManagement} />
                                    ) : location.pathname === "/staff/alerts" ? (
                                        <DiscountsAlertsModule
                                            role="Staff"
                                            canView={true}
                                            canManage={canManageDiscounts}
                                        />
                                    ) : location.pathname === "/staff/reports" ? (
                                        (!perms.reportAnalytics && !perms.editReports)
                                            ? accessDenied("reportAnalytics")
                                            : <ReportsModule canView={!!perms.reportAnalytics} canManage={!!perms.editReports} />
                                    ) : location.pathname === "/staff/profile" ? (
                                        <StaffProfile />
                                    ) : (
                                        <div className="flex items-center justify-center min-h-[60vh]">
                                            <Motion.div initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-md">
                                                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#f7c69a]/40 to-[#fde8cc]/20 blur-2xl scale-110 pointer-events-none" />
                                                <div className="relative rounded-[2rem] border border-white/60 bg-white/35 backdrop-blur-2xl shadow-[0_8px_48px_rgba(200,121,65,0.14),0_2px_8px_rgba(200,121,65,0.08)] p-12 flex flex-col items-center text-center overflow-hidden">
                                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                                                    <div className="relative mb-8"><div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#f7c69a]/50 to-[#e8a55a]/30 blur-xl scale-150" /><div className="relative h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-[#fdf3e7] to-[#f5e0c8] border border-white/70 flex items-center justify-center shadow-[0_4px_20px_rgba(200,121,65,0.2)]"><Settings size={36} className="text-[#c87941]" strokeWidth={1.5} /></div></div>
                                                    <h2 className="text-2xl font-black text-[#1a1208] tracking-tight mb-3">Section Modules</h2>
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#f7c69a]/60 to-[#fde8cc]/60 border border-[#c87941]/20 backdrop-blur-sm shadow-sm"><div className="w-1.5 h-1.5 rounded-full bg-[#c87941] animate-pulse" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a5a2e]">Expansion Module Coming Soon</span></div>
                                                    <div className="mt-8 flex gap-2">{[24,40,28,16,36].map((w, i) => (<div key={i} className="h-0.5 rounded-full bg-gradient-to-r from-[#c87941]/20 to-[#c87941]/5" style={{ width: w }} />))}</div>
                                                </div>
                                            </Motion.div>
                                        </div>
                                    )}
                                </Suspense>
                            </Motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>);
    return (<div className="flex min-h-screen tracking-tight text-[#4E342E]">
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}/>
            <div className="flex-1 w-full max-w-full overflow-hidden">{content}</div>
        </div>);
};
export default Staff;
