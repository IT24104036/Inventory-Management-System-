import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingDown, TrendingUp, Package, AlertTriangle, ShieldAlert,
  BarChart3, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ErrorBanner from "@/components/common/ErrorBanner";
import EmptyState from "@/components/common/EmptyState";
import {
  getReportsSummary, getExpiredLossReport, getNearExpiryReport,
  getMonthlyLossReport, getProductMovementReport, getSalesVsExpiryReport, getValidationSummary, getValidationTrend,
} from "@/lib/api";
import { runWithState } from "@/lib/asyncState";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MOVEMENT_CONFIG = {
  Fast:     { badge: "bg-[#007A5E]/10 text-[#007A5E]" },
  Moderate: { badge: "bg-blue-100 text-blue-600"        },
  Slow:     { badge: "bg-orange-100 text-orange-600"    },
};

const pct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`;
const trendLabel = (monthKey) => {
  if (!monthKey) return "Unknown";
  const [year, month] = String(monthKey).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString("en-LK", { month: "short", year: "numeric" });
};

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={13} className="ml-1 text-[#0F172A]/30 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={13} className="ml-1 text-[#007A5E] inline" />
    : <ChevronDown size={13} className="ml-1 text-[#007A5E] inline" />;
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#0F172A]/10 rounded-2xl shadow-lg p-4 text-sm">
      <p className="font-black text-[#0F172A] mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.name.toLowerCase().includes("qty") || p.name.toLowerCase().includes("sold")
            ? p.value
            : fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ReportsModule = ({ canView = true, canManage = false }) => {
  const hasAccess = canView || canManage;

  // Data states
  const [summary,         setSummary]         = useState(null);
  const [expiredLoss,     setExpiredLoss]     = useState(null);
  const [nearExpiry,      setNearExpiry]      = useState(null);
  const [monthlyLoss,     setMonthlyLoss]     = useState([]);
  const [productMovement, setProductMovement] = useState([]);
  const [salesVsExpiry,   setSalesVsExpiry]   = useState([]);
  const [validation,      setValidation]      = useState(null);
  const [validationTrend, setValidationTrend] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [globalError,     setGlobalError]     = useState("");

  // Table tab
  const [tableTab, setTableTab] = useState("near-expiry");

  // Sort state for near-expiry table
  const [sortCol, setSortCol] = useState("daysLeft");
  const [sortDir, setSortDir] = useState("asc");

  // ── Fetch all ──────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    await runWithState({
      setLoading,
      setError: setGlobalError,
      task: async () => {
        const [s, el, ne, ml, pm, sve, vs, vt] = await Promise.all([
          getReportsSummary(),
          getExpiredLossReport(),
          getNearExpiryReport(),
          getMonthlyLossReport(),
          getProductMovementReport(),
          getSalesVsExpiryReport(),
          getValidationSummary(),
          getValidationTrend(),
        ]);
        setSummary(s);
        setExpiredLoss(el);
        setNearExpiry(ne);
        setMonthlyLoss(ml);
        setProductMovement(pm);
        setSalesVsExpiry(sve);
        setValidation(vs);
        setValidationTrend(vt);
      },
      getErrorMessage: (err) => {
        console.error(err);
        return "Could not connect to the backend. Please check your connection.";
      },
    });
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Sort near-expiry ───────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortedNearExpiry = [...(nearExpiry?.items || [])].sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (va == null) va = 0; if (vb == null) vb = 0;
    if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
    return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const sortedExpiredLoss = [...(expiredLoss?.items || [])].sort((a, b) =>
    (b.estimatedLoss || 0) - (a.estimatedLoss || 0)
  );
  const scoredValidationTrend = validationTrend.filter((row) => Number(row?.evaluatedBatchCount ?? 0) > 0);
  const hasOnlyUnresolvedTrend = validationTrend.length > 0 && scoredValidationTrend.length === 0;

  if (!hasAccess) {
    return (
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
            <p className="text-sm font-bold text-[#0F172A]/50 mb-4">You don't have access to Reports &amp; Analytics.</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#fca5a5]/40 to-[#fee2e2]/40 border border-[#ef4444]/20 backdrop-blur-sm shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#991b1b]">Contact your administrator</span>
            </div>
            <div className="mt-8 flex gap-2">
              {[24,40,28,16,36].map((w, i) => (
                <div key={i} className="h-0.5 rounded-full bg-gradient-to-r from-[#ef4444]/20 to-[#ef4444]/5" style={{ width: w }} />
              ))}
            </div>
          </div>
        </Motion.div>
      </div>
    );
  }

  // ── JSX ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 rounded-full border-4 border-[#007A5E]/20 border-t-[#007A5E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Error Banner ── */}
      <ErrorBanner error={globalError} onRetry={fetchAll} />

      {/* ── Summary Stats ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg text-[#0F172A]/60 uppercase tracking-widest text-sm">Overview</h2>
        <Button onClick={fetchAll} variant="outline"
          className="rounded-2xl font-black text-xs uppercase tracking-widest border-[#0F172A]/10 gap-2 h-9">
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue",     value: fmt(summary?.totalRevenue),      sub: "Active sales",           color: "text-[#007A5E]",  bg: "bg-[#007A5E]/10",  Icon: TrendingUp    },
          { label: "Expired On Shelf",  value: fmt(summary?.expiredOnShelfLoss ?? summary?.totalExpiredLoss),  sub: `${summary?.expiredOnShelfCount ?? summary?.expiredCount ?? 0} batches still need action`, color: "text-red-500",    bg: "bg-red-100",        Icon: TrendingDown  },
          { label: "Waste Logged",      value: fmt(summary?.currentMonthWasteLoss), sub: `${summary?.currentMonthWasteUnits ?? 0} units logged this month`, color: "text-[#7C3AED]",  bg: "bg-[#7C3AED]/10",  Icon: Package       },
          { label: "Near-Expiry Items", value: summary?.nearExpiryCount ?? 0,   sub: "Expiring within 7 days", color: "text-orange-500", bg: "bg-orange-100",     Icon: AlertTriangle },
        ].map((s, i) => (
          <Motion.div key={s.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card-premium p-6">
            <div className={`w-10 h-10 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
              <s.Icon size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">{s.label}</p>
            <h3 className={`text-2xl font-black mb-1 ${s.color}`}>{s.value}</h3>
            <p className="text-[10px] font-bold text-[#007A5E]">{s.sub}</p>
          </Motion.div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
        <CardHeader className="p-6 border-b border-[#0F172A]/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <div>
              <CardTitle className="font-black text-base">ML Live Validation</CardTitle>
              <CardDescription className="font-bold text-xs">
                Compares saved predictions against resolved real batch outcomes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!validation || validation.evaluatedBatchCount === 0 ? (
            <EmptyState
              className="py-10"
              title="Not enough resolved predicted batches yet."
              description="Once more batches are fully resolved, this section will show live ML quality."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Evaluated Batches", value: validation.evaluatedBatchCount, sub: `${validation.unresolvedBatchCount ?? 0} unresolved skipped`, color: "text-blue-600", bg: "bg-blue-100" },
                  { label: "Precision", value: pct(validation.precision), sub: "How many alerts were correct", color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
                  { label: "Recall", value: pct(validation.recall), sub: "How many real waste cases were caught", color: "text-orange-500", bg: "bg-orange-100" },
                  { label: "F1 Score", value: pct(validation.f1Score), sub: "Balanced live model quality", color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.5rem] border border-[#0F172A]/5 bg-[#F8FAFC] p-5">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>
                      <ShieldCheck size={18} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">{item.label}</p>
                    <h3 className={`mt-1 text-2xl font-black ${item.color}`}>{item.value}</h3>
                    <p className="mt-1 text-[11px] font-bold text-[#0F172A]/55">{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.5rem] border border-[#0F172A]/5 bg-[#F8FAFC] p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-[#0F172A]">Interpretation</h3>
                      <p className="text-xs font-bold text-[#0F172A]/50 mt-1">
                        Threshold: {validation.threshold}
                      </p>
                    </div>
                    <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-blue-100 text-blue-700">
                      Live Data
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-[#0F172A]/75 leading-6">
                    {validation.interpretation}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 border border-[#0F172A]/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Brier Score</p>
                      <p className="mt-1 text-lg font-black text-[#0F172A]">{validation.brierScore ?? 0}</p>
                      <p className="text-[11px] font-bold text-[#0F172A]/50">Lower is better</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-[#0F172A]/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Avg Prob. Wasted</p>
                      <p className="mt-1 text-lg font-black text-red-500">{pct(validation.averageProbabilityForActuallyWasted)}</p>
                      <p className="text-[11px] font-bold text-[#0F172A]/50">Should be higher</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-[#0F172A]/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Avg Prob. Safe</p>
                      <p className="mt-1 text-lg font-black text-[#007A5E]">{pct(validation.averageProbabilityForActuallySafe)}</p>
                      <p className="text-[11px] font-bold text-[#0F172A]/50">Should be lower</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[#0F172A]/5 bg-[#F8FAFC] p-5">
                  <h3 className="font-black text-[#0F172A] mb-4">Confusion Matrix</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "True Positive", value: validation.confusionMatrix?.truePositive ?? 0, tone: "bg-[#007A5E]/10 text-[#007A5E]" },
                      { label: "False Positive", value: validation.confusionMatrix?.falsePositive ?? 0, tone: "bg-orange-100 text-orange-600" },
                      { label: "False Negative", value: validation.confusionMatrix?.falseNegative ?? 0, tone: "bg-red-100 text-red-600" },
                      { label: "True Negative", value: validation.confusionMatrix?.trueNegative ?? 0, tone: "bg-blue-100 text-blue-600" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-2xl p-4 ${item.tone}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</p>
                        <p className="mt-2 text-2xl font-black">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-2">
                    {(validation.notes || []).map((note, index) => (
                      <p key={index} className="text-[11px] font-bold text-[#0F172A]/55">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#0F172A]/5 bg-[#F8FAFC] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#007A5E]" />
                  <h3 className="font-black text-[#0F172A]">Sample Validated Batches</h3>
                </div>
                {(validation.sampleRows || []).length === 0 ? (
                  <EmptyState className="py-10" title="No sample rows available yet." />
                ) : (
                  <Table>
                    <TableHeader className="bg-[#0F172A]/[0.02]">
                      <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                        {["Batch", "Predicted Probability", "Predicted", "Actual", "Wasted Units"].map((header) => (
                          <TableHead key={header} className="font-black uppercase text-[10px] tracking-widest px-4">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validation.sampleRows.map((row) => (
                        <TableRow key={row.batchId} className="border-[#0F172A]/5 hover:bg-primary/[0.03]">
                          <TableCell className="px-4 font-black text-[#0F172A] text-sm">
                            {row.batchNumber || `#${row.batchId}`}
                          </TableCell>
                          <TableCell className="px-4 font-black text-[#0F172A] text-sm">
                            {pct(row.predictedProbability)}
                          </TableCell>
                          <TableCell className="px-4 font-bold text-[#0F172A]/65 text-sm">
                            {row.predictedLabel}
                          </TableCell>
                          <TableCell className="px-4">
                            <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${
                              row.actualOutcome === "Wasted"
                                ? "bg-red-100 text-red-600"
                                : "bg-[#007A5E]/10 text-[#007A5E]"
                            }`}>
                              {row.actualOutcome}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 font-black text-[#0F172A] text-sm">
                            {row.wastedUnits}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-[#0F172A]/5 bg-[#F8FAFC] p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-[#0F172A]">Monthly Live Trend</h3>
                    <p className="text-xs font-bold text-[#0F172A]/50 mt-1">
                      Tracks whether live model quality is holding up month by month
                    </p>
                  </div>
                  <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-[#7C3AED]/10 text-[#7C3AED]">
                    ML Trend
                  </Badge>
                </div>

                {scoredValidationTrend.length === 0 ? (
                  <EmptyState
                    className="py-10"
                    title="Not enough scored live months yet."
                    description={
                      hasOnlyUnresolvedTrend
                        ? "Predictions are being stored, but none of the saved months have resolved batch outcomes to score yet."
                        : "As the system stores more batch predictions over time, monthly live ML trend will appear here."
                    }
                  />
                ) : (
                  <div className="space-y-5">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={scoredValidationTrend.map((item) => ({ ...item, label: trendLabel(item.month) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0F172A08" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }} />
                        <YAxis
                          tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }}
                          tickFormatter={(value) => `${Math.round((value || 0) * 100)}%`}
                          domain={[0, 1]}
                        />
                        <Tooltip
                          formatter={(value, name) => [pct(value), name]}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                        <Line type="monotone" dataKey="precision" name="Precision" stroke="#007A5E" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="recall" name="Recall" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="f1Score" name="F1 Score" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>

                    <Table>
                      <TableHeader className="bg-[#0F172A]/[0.02]">
                        <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                          {["Month", "Evaluated", "Precision", "Recall", "F1", "TP / FP / TN / FN"].map((header) => (
                            <TableHead key={header} className="font-black uppercase text-[10px] tracking-widest px-4">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scoredValidationTrend.map((row) => (
                          <TableRow key={row.month} className="border-[#0F172A]/5 hover:bg-primary/[0.03]">
                            <TableCell className="px-4 font-black text-[#0F172A] text-sm">
                              {trendLabel(row.month)}
                            </TableCell>
                            <TableCell className="px-4 font-black text-[#0F172A] text-sm">
                              {row.evaluatedBatchCount ?? 0}
                            </TableCell>
                            <TableCell className="px-4 font-black text-[#007A5E] text-sm">
                              {pct(row.precision)}
                            </TableCell>
                            <TableCell className="px-4 font-black text-orange-500 text-sm">
                              {pct(row.recall)}
                            </TableCell>
                            <TableCell className="px-4 font-black text-[#7C3AED] text-sm">
                              {pct(row.f1Score)}
                            </TableCell>
                            <TableCell className="px-4 font-bold text-[#0F172A]/65 text-sm">
                              {(row.truePositive ?? 0)} / {(row.falsePositive ?? 0)} / {(row.trueNegative ?? 0)} / {(row.falseNegative ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Monthly Loss Chart */}
        <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
          <CardHeader className="p-6 border-b border-[#0F172A]/5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center">
                <TrendingDown size={18} />
              </div>
              <div>
                <CardTitle className="font-black text-base">Monthly Waste Loss</CardTitle>
                <CardDescription className="font-bold text-xs">Last 6 months — logged write-off cost</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {monthlyLoss.every(m => m.loss === 0) ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <TrendingDown size={28} className="text-[#0F172A]/20 mb-2" />
                <p className="font-bold text-[#0F172A]/40 text-sm">No waste logged yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyLoss} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0F172A08" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }}
                    tickFormatter={v => `Rs.${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="loss" name="Waste Loss" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales vs Expiry Chart */}
        <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
          <CardHeader className="p-6 border-b border-[#0F172A]/5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-[#007A5E]/10 text-[#007A5E] flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <div>
                <CardTitle className="font-black text-base">Sales vs. Waste Loss</CardTitle>
                <CardDescription className="font-bold text-xs">Revenue earned vs. logged waste cost — last 6 months</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {salesVsExpiry.every(m => m.revenue === 0 && m.loss === 0) ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <BarChart3 size={28} className="text-[#0F172A]/20 mb-2" />
                <p className="font-bold text-[#0F172A]/40 text-sm">No sales or loss data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesVsExpiry} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0F172A08" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }}
                    tickFormatter={v => `Rs.${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="revenue" name="Sales Revenue" fill="#007A5E" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="loss"    name="Waste Loss"    fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Movement Chart */}
      <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
        <CardHeader className="p-6 border-b border-[#0F172A]/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center">
              <Package size={18} />
            </div>
            <div>
              <CardTitle className="font-black text-base">Product Movement</CardTitle>
              <CardDescription className="font-bold text-xs">Units sold per product — fast vs. slow moving</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {productMovement.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Package size={28} className="text-[#0F172A]/20 mb-2" />
              <p className="font-bold text-[#0F172A]/40 text-sm">No sales data yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productMovement.slice(0, 10)} layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F172A08" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }} />
                <YAxis type="category" dataKey="productName" width={130}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#0F172A80" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalSold" name="Units Sold" fill="#7C3AED" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Tables ── */}
      <div className="flex gap-2 border-b border-[#0F172A]/10">
        {[
          { key: "near-expiry",  label: "Near-Expiry List",    count: nearExpiry?.count    },
          { key: "expired-loss", label: "Expired On Shelf",    count: expiredLoss?.itemCount },
          { key: "movement",     label: "Product Movement",    count: productMovement.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTableTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-all ${
              tableTab === t.key
                ? "border-[#007A5E] text-[#007A5E]"
                : "border-transparent text-[#0F172A]/40 hover:text-[#0F172A]"
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 h-5 min-w-[20px] px-1 rounded-full bg-[#007A5E]/10 text-[#007A5E] text-[10px] font-black flex items-center justify-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Near-Expiry Table */}
      {tableTab === "near-expiry" && (
        <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
          <CardHeader className="p-6 border-b border-[#0F172A]/5">
            <CardTitle className="font-black text-base">Near-Expiry Product List</CardTitle>
            <CardDescription className="font-bold text-xs">
              {nearExpiry?.count ?? 0} batch{nearExpiry?.count !== 1 ? "es" : ""} expiring within 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {sortedNearExpiry.length === 0 ? (
              <EmptyState
                className="py-16"
                title="No near-expiry items found."
              />
            ) : (
              <Table>
                <TableHeader className="bg-[#0F172A]/[0.02]">
                  <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                    {[
                      { col: "productName", label: "Product"  },
                      { col: "category",    label: "Category" },
                      { col: "supplier",    label: "Supplier" },
                      { col: "quantity",    label: "Qty"      },
                      { col: "expiryDate",  label: "Expiry"   },
                      { col: "daysLeft",    label: "Days Left"},
                      { col: "riskLevel",   label: "Risk"     },
                    ].map(({ col, label }) => (
                      <TableHead key={col}
                        className="font-black uppercase text-[10px] tracking-widest px-6 cursor-pointer select-none"
                        onClick={() => handleSort(col)}>
                        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedNearExpiry.map((item, i) => (
                    <Motion.tr key={`ne-${i}`}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors">
                      <TableCell className="px-6 font-black text-[#0F172A] text-sm">{item.productName}</TableCell>
                      <TableCell className="px-6">
                        <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-[#7C3AED]/10 text-[#7C3AED]">
                          {item.category || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 font-bold text-[#0F172A]/60 text-sm">{item.supplier || "—"}</TableCell>
                      <TableCell className="px-6 font-black text-[#0F172A] text-sm">{item.quantity}</TableCell>
                      <TableCell className="px-6 font-bold text-sm text-[#0F172A]">{item.expiryDate}</TableCell>
                      <TableCell className="px-6">
                        <span className={`font-black text-sm ${item.daysLeft <= 3 ? "text-red-500" : item.daysLeft <= 5 ? "text-orange-500" : "text-yellow-600"}`}>
                          {item.daysLeft === 0 ? "Today" : `${item.daysLeft}d`}
                        </span>
                      </TableCell>
                      <TableCell className="px-6">
                        <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${
                          item.riskLevel === "Critical" ? "bg-red-100 text-red-600"
                          : item.riskLevel === "High"    ? "bg-orange-100 text-orange-600"
                          : "bg-yellow-100 text-yellow-600"}`}>
                          {item.riskLevel}
                        </Badge>
                      </TableCell>
                    </Motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expired Loss Table */}
      {tableTab === "expired-loss" && (
        <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
          <CardHeader className="p-6 border-b border-[#0F172A]/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-black text-base">Expired Stock Still On Shelf</CardTitle>
                <CardDescription className="font-bold text-xs">
                  {expiredLoss?.itemCount ?? 0} expired batch{expiredLoss?.itemCount !== 1 ? "es" : ""} still in stock —
                  shelf exposure: <span className="text-red-500">{fmt(expiredLoss?.totalLoss)}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sortedExpiredLoss.length === 0 ? (
              <EmptyState
                className="py-16"
                title="No expired items found."
              />
            ) : (
              <Table>
                <TableHeader className="bg-[#0F172A]/[0.02]">
                  <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                    {["Product", "Category", "Batch #", "Qty", "Cost Price", "Expiry Date", "Est. Loss"].map(h => (
                      <TableHead key={h} className="font-black uppercase text-[10px] tracking-widest px-6">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpiredLoss.map((item, i) => (
                    <Motion.tr key={`el-${i}`}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className="border-[#0F172A]/5 bg-red-50/30 hover:brightness-95 transition-colors">
                      <TableCell className="px-6 font-black text-[#0F172A] text-sm">{item.productName}</TableCell>
                      <TableCell className="px-6">
                        <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-red-100 text-red-500">
                          {item.category || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 font-bold text-[#0F172A]/60 text-xs">{item.batchNumber || `#${item.batchId}`}</TableCell>
                      <TableCell className="px-6 font-black text-[#0F172A] text-sm">{item.quantity}</TableCell>
                      <TableCell className="px-6 font-bold text-sm text-[#0F172A]/70">{fmt(item.costPrice)}</TableCell>
                      <TableCell className="px-6 font-bold text-sm text-red-500">{item.expiryDate}</TableCell>
                      <TableCell className="px-6 font-black text-red-600 text-sm">{fmt(item.estimatedLoss)}</TableCell>
                    </Motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Movement Table */}
      {tableTab === "movement" && (
        <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
          <CardHeader className="p-6 border-b border-[#0F172A]/5">
            <CardTitle className="font-black text-base">Product Movement Detail</CardTitle>
            <CardDescription className="font-bold text-xs">All products ranked by units sold</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {productMovement.length === 0 ? (
              <EmptyState
                className="py-16"
                title="No sales data yet."
              />
            ) : (
              <Table>
                <TableHeader className="bg-[#0F172A]/[0.02]">
                  <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                    {["Rank", "Product", "Category", "Units Sold", "Revenue", "Movement"].map(h => (
                      <TableHead key={h} className="font-black uppercase text-[10px] tracking-widest px-6">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productMovement.map((item, i) => {
                    const mCfg = MOVEMENT_CONFIG[item.movement] || MOVEMENT_CONFIG.Moderate;
                    return (
                      <Motion.tr key={`pm-${item.productId}`}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors">
                        <TableCell className="px-6 font-black text-[#0F172A]/40 text-sm">#{i + 1}</TableCell>
                        <TableCell className="px-6 font-black text-[#0F172A] text-sm">{item.productName}</TableCell>
                        <TableCell className="px-6">
                          <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-[#007A5E]/10 text-[#007A5E]">
                            {item.category || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 font-black text-[#0F172A] text-sm">{item.totalSold}</TableCell>
                        <TableCell className="px-6 font-black text-[#007A5E] text-sm">{fmt(item.revenue)}</TableCell>
                        <TableCell className="px-6">
                          <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${mCfg.badge}`}>
                            {item.movement}
                          </Badge>
                        </TableCell>
                      </Motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsModule;
