import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getUsers, getBatches, getWasteLoggedBatchIds, getWasteWeeklySummary } from "@/lib/api";
import RiskSummaryWidget from "@/components/RiskSummaryWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminStats,
  dashFormatExpiry,
  dashIsUrgentBatch,
  dashLossPreventionAction,
  dashRiskPercent,
  dashRiskPresentation,
} from "@/components/admin/adminDashboardUtils";

const ExpiryRiskModule = lazy(() => import("@/components/expiry-risk/ExpiryRiskContainer"));

const formatCurrency = (amount) =>
  `Rs. ${Number(amount ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const AdminDashboardHome = () => {
  const [lockedUsers, setLockedUsers] = useState([]);
  const [dashBatches, setDashBatches] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [loggedWasteBatchIds, setLoggedWasteBatchIds] = useState(() => new Set());
  const [wasteSummary, setWasteSummary] = useState(null);
  const [wasteSummaryLoading, setWasteSummaryLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then((data) => {
        setLockedUsers(data.filter((user) => user.accountLocked && user.role?.toUpperCase() !== "ADMIN"));
      })
      .catch((err) => {
        console.error("Failed to load users", err);
      });
  }, []);

  useEffect(() => {
    setDashLoading(true);
    Promise.all([getBatches().catch(() => []), getWasteLoggedBatchIds().catch(() => [])])
      .then(([batches, wasteIds]) => {
        setDashBatches(Array.isArray(batches) ? batches : []);
        setLoggedWasteBatchIds(new Set(Array.isArray(wasteIds) ? wasteIds : []));
      })
      .catch((err) => {
        console.error("Failed to load batches for dashboard", err);
        setDashBatches([]);
      })
      .finally(() => setDashLoading(false));
  }, []);

  useEffect(() => {
    setWasteSummaryLoading(true);
    getWasteWeeklySummary()
      .then((data) => setWasteSummary(data))
      .catch(() => setWasteSummary(null))
      .finally(() => setWasteSummaryLoading(false));
  }, []);

  const totalUnits = dashBatches
    .filter((batch) => batch.quantity > 0)
    .reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);

  const urgentBatches = dashBatches
    .filter(dashIsUrgentBatch)
    .sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""))
    .slice(0, 15);
  const scrollToRiskWorkspace = () => {
    const section = document.getElementById("dashboard-ai-expiry-risk");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const dynamicStats = adminStats.map((stat) => {
    if (stat.label === "Total Stock") {
      return {
        ...stat,
        value: dashLoading ? "..." : totalUnits.toLocaleString(),
        sub: "Units across in-stock batches",
      };
    }

    if (stat.label === "Active Alerts") {
      const alertCount = dashLoading ? null : dashBatches.filter(dashIsUrgentBatch).length;
      return {
        ...stat,
        value: dashLoading ? "..." : String(alertCount ?? 0),
        sub: dashLoading ? "Loading..." : alertCount === 0 ? "No urgent batches" : "See Loss Prevention below",
      };
    }

    if (stat.label === "Waste (week)") {
      const cost = wasteSummary?.currentWeekCost;
      const pct = wasteSummary?.percentChangeVsPrevious;
      return {
        ...stat,
        value: wasteSummaryLoading ? "..." : formatCurrency(cost),
        sub: wasteSummaryLoading
          ? "Loading..."
          : pct == null || Number.isNaN(pct)
            ? "Logged waste cost (last 7 days)"
            : `${pct >= 0 ? "+" : ""}${pct}% vs previous 7 days - ${wasteSummary?.currentWeekUnits ?? 0} units`,
      };
    }

    if (stat.label === "Waste Prevented") {
      const preventedPercent = Number(wasteSummary?.preventedPercentVsPrevious ?? 0);
      const savedCost = Number(wasteSummary?.costSavedVsPrevious ?? 0);
      const extraCost = Number(wasteSummary?.extraCostVsPrevious ?? 0);
      const preventedUnits = Number(wasteSummary?.preventedUnitsVsPrevious ?? 0);
      const extraUnits = Number(wasteSummary?.extraUnitsVsPrevious ?? 0);
      const trend = wasteSummary?.preventionTrend;

      let sub = "Waste reduction vs previous 7 days";
      if (wasteSummaryLoading) {
        sub = "Loading...";
      } else if (trend === "NO_DATA") {
        sub = "No waste logged in last 14 days";
      } else if (trend === "NO_BASELINE") {
        sub = "Need a previous 7-day baseline";
      } else if (trend === "IMPROVED") {
        sub = `${formatCurrency(savedCost)} less waste - ${preventedUnits} fewer units`;
      } else if (trend === "WORSE") {
        sub = `${formatCurrency(extraCost)} more waste - ${extraUnits} extra units`;
      } else if (trend === "FLAT") {
        sub = "Same waste cost as previous 7 days";
      }

      return {
        ...stat,
        value: wasteSummaryLoading ? "..." : `${Math.round(preventedPercent)}%`,
        sub,
      };
    }

    return stat;
  });

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {lockedUsers.length > 0 && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              <span>
                Security Alert: {lockedUsers.length} account(s) have been locked due to multiple failed login attempts.
                Check User Control to unlock.
              </span>
            </div>
            <Link
              to="/admin/users"
              className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-black hover:bg-red-600 transition-colors"
            >
              Review Now
            </Link>
          </Motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat, index) => (
          <Motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-premium p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              {stat.cornerIcon ? (
                <stat.cornerIcon size={16} className="text-[#007A5E]/30" aria-hidden />
              ) : (
                <span className="inline-block w-4 h-4 shrink-0" aria-hidden />
              )}
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-[#0F172A] mb-1">{stat.value}</h3>
            <p className="text-[10px] font-bold text-[#007A5E]">{stat.sub}</p>
          </Motion.div>
        ))}
      </div>

      <div className="grid gap-8">
        <RiskSummaryWidget />

        <div className="space-y-6">
          <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
            <CardHeader className="p-8 border-b border-[#0F172A]/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-black text-xl">Loss Prevention Monitor</CardTitle>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-[#007A5E] font-black text-xs uppercase tracking-widest p-0 h-auto"
                onClick={scrollToRiskWorkspace}
              >
                Open AI Expiry Risk below
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {dashLoading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-[#0F172A]/40">
                  <Loader2 className="animate-spin" size={22} />
                  <span className="text-xs font-black uppercase tracking-widest">Loading batches...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-[#0F172A]/[0.02]">
                    <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Product</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Expiry</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Risk</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Risk %</TableHead>
                      <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {urgentBatches.map((batch) => {
                      const riskPresentation = dashRiskPresentation(batch);
                      const riskPercent = dashRiskPercent(batch);
                      const action = dashLossPreventionAction(batch);
                      const code = batch.product?.code || `ID ${batch.product?.id ?? "-"}`;

                      return (
                        <TableRow
                          key={batch.id}
                          className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors"
                        >
                          <TableCell className="px-8">
                            <div className="flex items-center gap-3">
                              <div className="h-1 w-8 rounded-full bg-[#0F172A]/10 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-black text-[#0F172A] text-sm truncate">
                                  {batch.product?.name ?? "Product"}
                                </p>
                                <p className="text-[10px] font-bold text-black/40 uppercase truncate">
                                  {batch.batchNumber || `Batch #${batch.id}`} - {code}
                                </p>
                                {loggedWasteBatchIds.has(batch.id) && (
                                  <p className="text-[9px] font-black text-[#007A5E] uppercase tracking-wider mt-0.5">
                                    Waste logged
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-sm whitespace-nowrap">
                            {dashFormatExpiry(batch.expiryDate)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${riskPresentation.badge}`}
                            >
                              {riskPresentation.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[110px]">
                            {riskPercent == null ? (
                              <span className="text-[10px] font-bold text-[#0F172A]/35 uppercase tracking-wider">
                                Scan needed
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="w-10 text-sm font-black text-[#0F172A]">{riskPercent}%</span>
                                <div className="h-1.5 w-16 rounded-full bg-[#0F172A]/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      riskPercent >= 75
                                        ? "bg-red-500"
                                        : riskPercent >= 45
                                          ? "bg-orange-400"
                                          : "bg-[#007A5E]"
                                    }`}
                                    style={{ width: `${riskPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-8">
                            <Button
                              size="sm"
                              className="rounded-xl glass border-[#0F172A]/5 text-[#0F172A] hover:bg-[#007A5E] hover:text-white transition-all text-xs font-black"
                              asChild
                            >
                              <Link to={action.to} title={action.title}>
                                {action.label}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {urgentBatches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-sm font-bold text-[#0F172A]/40">
                          No urgent batches - nothing expired or currently flagged High / Warning by the model.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <section id="dashboard-ai-expiry-risk" className="space-y-4 scroll-mt-28">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0F172A]/45">
                Embedded Workspace
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0F172A]">
                AI Expiry Risk
              </h2>
              <p className="mt-1 text-sm font-bold text-[#0F172A]/55">
                Live expiry-risk decisions now run directly inside the admin dashboard.
              </p>
            </div>

            <Suspense
              fallback={(
                <div className="card-premium flex items-center justify-center gap-3 py-16 text-[#0F172A]/40">
                  <Loader2 className="animate-spin" size={22} />
                  <span className="text-xs font-black uppercase tracking-widest">Loading AI risk workspace...</span>
                </div>
              )}
            >
              <ExpiryRiskModule embedded />
            </Suspense>
          </section>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboardHome;

