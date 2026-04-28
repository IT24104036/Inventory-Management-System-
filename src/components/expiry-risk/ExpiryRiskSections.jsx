import { AnimatePresence, motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    Brain,
    CalendarRange,
    CheckCircle2,
    Database,
    Download,
    History,
    Keyboard,
    Loader2,
    PackageOpen,
    RotateCcw,
    Trash2,
    TrendingDown,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    CATEGORIES,
    RISK_CONFIG,
    WASTE_REASONS,
    daysFromToday,
    formatCurrency,
    isExpired,
    wasteReasonLabel,
} from "./expiryRiskUtils";

const Field = ({ label, hint, id, value, onChange, min, max, step = "0.01" }) => (
    <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
            {label}
        </Label>
        {hint ? <p className="text-[10px] text-[#0F172A]/40 font-bold -mt-1">{hint}</p> : null}
        <Input
            id={id}
            type="number"
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            className="h-10 rounded-xl border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:ring-2 focus:ring-[#7C3AED]/20"
            placeholder="0"
        />
    </div>
);

const TILE_TONES = {
    slate: "border-[#0F172A]/10 bg-white text-[#0F172A]",
    violet: "border-[#7C3AED]/20 bg-[#7C3AED]/10 text-[#6D28D9]",
    red: "border-red-200 bg-red-50 text-red-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const RISK_BADGE_CLASS = {
    "High Risk": "bg-red-100 text-red-700",
    Warning: "bg-orange-100 text-orange-700",
    "Low Risk": "bg-emerald-100 text-emerald-700",
};

const RiskPill = ({ label }) => {
    if (!label) {
        return (
            <span className="text-[10px] font-bold text-[#0F172A]/30 uppercase tracking-wider">
                Not scanned
            </span>
        );
    }

    return (
        <Badge
            className={`border-none font-black text-[10px] uppercase tracking-wider rounded-lg px-2 py-0.5 ${
                RISK_BADGE_CLASS[label] || RISK_BADGE_CLASS["Low Risk"]
            }`}
        >
            {label}
        </Badge>
    );
};

const StatTile = ({ label, value, hint, tone = "slate", compact = false }) => (
    <div className={`rounded-2xl border shadow-sm ${compact ? "p-3.5" : "p-4"} ${TILE_TONES[tone] || TILE_TONES.slate}`}>
        <p className={`font-black uppercase tracking-[0.22em] opacity-60 ${compact ? "text-[9px]" : "text-[10px]"}`}>{label}</p>
        <p className={`font-black tracking-tight ${compact ? "mt-1.5 text-xl" : "mt-2 text-2xl"}`}>{value}</p>
        {hint ? <p className={`font-bold opacity-70 ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs"}`}>{hint}</p> : null}
    </div>
);

const SectionCard = ({ title, description, children }) => (
    <div className="rounded-[26px] border border-[#0F172A]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0F172A]/45">{title}</p>
            {description ? <p className="mt-2 text-sm font-bold leading-relaxed text-[#0F172A]/55">{description}</p> : null}
        </div>
        {children}
    </div>
);

export function ExpiryRiskHeader({ stats }) {
    return (
        <div className="relative overflow-hidden rounded-[30px] border border-[#0F172A]/10 bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.16),_transparent_38%),linear-gradient(135deg,_#ffffff,_#f8fafc)] p-6 shadow-premium sm:p-8">
            <div className="absolute inset-y-0 right-0 hidden w-40 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.05),_transparent_65%)] lg:block" />
            <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)] xl:items-end">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#7C3AED]/20 bg-white/80 px-3 py-1.5">
                        <Brain size={16} className="text-[#7C3AED]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">Random Forest Live</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-[#0F172A] sm:text-[2.1rem]">
                            AI Expiry Risk Prediction
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-[#0F172A]/55 sm:text-[15px]">
                            Review live batches, simulate edge cases, and translate the trained `.pkl` output into
                            risk, sell-through probability, and the next action for staff.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#0F172A]/10 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0F172A]/55">
                            Model + business rules
                        </span>
                        <span className="rounded-full border border-[#0F172A]/10 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0F172A]/55">
                            7-day watch window
                        </span>
                        <span className="rounded-full border border-[#0F172A]/10 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0F172A]/55">
                            Sell-through shown
                        </span>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <StatTile
                        label="Active Batches"
                        value={stats?.activeBatches ?? 0}
                        hint="Current batches loaded into the screen"
                    />
                    <StatTile
                        label="Flagged"
                        value={stats?.flaggedBatches ?? 0}
                        hint="High Risk or Warning labels"
                        tone="violet"
                    />
                    <StatTile
                        label="Expired Stock"
                        value={stats?.expiredWithStock ?? 0}
                        hint="Needs waste logging or shelf removal"
                        tone="red"
                    />
                    <StatTile
                        label="Scanned"
                        value={stats?.scannedBatches ?? 0}
                        hint="Batches already evaluated by the model"
                        tone="emerald"
                    />
                </div>
            </div>
        </div>
    );
}

export function ExpiryRiskTabList({ embedded = false }) {
    return (
        <TabsList className={`grid h-auto w-full grid-cols-1 gap-2 border border-[#0F172A]/10 bg-white/85 shadow-sm sm:grid-cols-3 xl:w-fit ${
            embedded ? "mb-4 rounded-[22px] p-1.5" : "mb-6 rounded-[26px] p-2"
        }`}>
            <TabsTrigger
                value="automated"
                className={`font-bold justify-start sm:justify-center data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all ${
                    embedded ? "rounded-xl px-3 py-2.5 text-xs" : "rounded-2xl px-4 py-3"
                }`}
            >
                <div className="flex items-center gap-2">
                    <Database size={16} /> System Data (Recommended)
                </div>
            </TabsTrigger>
            <TabsTrigger
                value="manual"
                className={`font-bold justify-start sm:justify-center data-[state=active]:bg-[#0F172A] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all ${
                    embedded ? "rounded-xl px-3 py-2.5 text-xs" : "rounded-2xl px-4 py-3"
                }`}
            >
                <div className="flex items-center gap-2">
                    <Keyboard size={16} /> Simple Simulator
                </div>
            </TabsTrigger>
            <TabsTrigger
                value="waste_history"
                className={`font-bold justify-start sm:justify-center data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all ${
                    embedded ? "rounded-xl px-3 py-2.5 text-xs" : "rounded-2xl px-4 py-3"
                }`}
            >
                <div className="flex items-center gap-2">
                    <History size={16} /> Waste History
                </div>
            </TabsTrigger>
        </TabsList>
    );
}

function BatchRow({
    batch,
    loggedBatchIds,
    runningAll,
    loadingBatchId,
    onRecordWaste,
    onPredictBatch,
    onViewBatchResult,
}) {
    const expired = isExpired(batch.expiryDate);
    const daysAgo = expired ? daysFromToday(batch.expiryDate) : 0;
    const hasSavedPrediction = batch.lastRiskProbability != null || batch.lastRiskLabel;

    return (
        <tr
            id={`expiry-batch-row-${batch.id}`}
            className={`transition-colors border-b border-[#0F172A]/5 ${
                expired && batch.quantity > 0 ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-[#0F172A]/[0.01]"
            }`}
        >
            <td className="px-6 py-4">
                <div className="font-black">{batch.product?.name}</div>
                <div className="text-xs text-[#0F172A]/50 font-bold">{batch.product?.category}</div>
            </td>
            <td className="px-6 py-4 font-bold text-[#0F172A]/70">
                <div className="flex flex-wrap items-center gap-1.5">
                    <PackageOpen size={14} className="text-[#0F172A]/40" />
                    <span>{batch.batchNumber || `Batch #${batch.id}`}</span>
                    {loggedBatchIds.has(batch.id) ? (
                        <Badge className="border-none bg-slate-200 text-slate-700 font-black text-[9px] uppercase tracking-wider px-1.5 py-0">
                            Waste logged
                        </Badge>
                    ) : null}
                </div>
            </td>
            <td className="px-6 py-4 font-bold">
                {expired ? (
                    <div className="flex flex-col gap-1">
                        <Badge className="border-none bg-red-100 text-red-700 font-black text-[10px] uppercase tracking-wider rounded-lg w-fit">
                            Expired
                        </Badge>
                        <span className="text-[10px] font-bold text-red-400">
                            {batch.expiryDate} - {daysAgo}d ago
                        </span>
                    </div>
                ) : (
                    <Badge variant="outline" className="font-bold border-[#0F172A]/10 text-[#0F172A]/70">
                        {batch.expiryDate}
                    </Badge>
                )}
            </td>
            <td className="px-6 py-4">
                <span className="bg-[#0F172A]/5 px-2.5 py-1 rounded-lg font-black text-[#0F172A]">
                    {batch.quantity} units
                </span>
            </td>
            <td className="px-6 py-4">
                <RiskPill label={batch.lastRiskLabel} />
            </td>
            <td className="px-6 py-4">
                {batch.impactScore != null ? (
                    <div className="flex flex-col">
                        <span className="font-black text-sm text-[#0F172A]">
                            Rs. {formatCurrency(batch.impactScore)}
                        </span>
                        <span className="text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-wider">
                            Risk-weighted
                        </span>
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-[#0F172A]/30 uppercase tracking-wider">
                        Scan first
                    </span>
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {hasSavedPrediction ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onViewBatchResult(batch)}
                            className="h-9 rounded-xl border-[#0F172A]/10 bg-white text-[#0F172A]/70 hover:bg-[#0F172A]/5 font-black text-[10px] uppercase tracking-wider"
                        >
                            View
                        </Button>
                    ) : null}
                    {expired ? (
                        batch.quantity > 0 ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onRecordWaste(batch)}
                                disabled={runningAll}
                                className="h-9 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50 font-black text-[10px] uppercase tracking-wider"
                            >
                                Record waste
                            </Button>
                        ) : (
                            <span className="text-[10px] font-black text-[#0F172A]/35 uppercase tracking-wider">
                                Batch closed
                            </span>
                        )
                    ) : batch.quantity === 0 ? (
                        <span className="text-xs font-black text-[#0F172A]/30 uppercase tracking-wider">No Stock</span>
                    ) : (
                        <Button
                            onClick={() => onPredictBatch(batch.id)}
                            disabled={loadingBatchId === batch.id || runningAll}
                            size="sm"
                            className="h-9 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xs uppercase tracking-wider shadow-glow-amethyst transition-all"
                        >
                            {loadingBatchId === batch.id ? <Loader2 size={14} className="animate-spin" /> : "Refresh AI"}
                        </Button>
                    )}
                </div>
            </td>
        </tr>
    );
}

function BatchMobileCard({
    batch,
    loggedBatchIds,
    runningAll,
    loadingBatchId,
    onRecordWaste,
    onPredictBatch,
    onViewBatchResult,
}) {
    const expired = isExpired(batch.expiryDate);
    const daysAgo = expired ? daysFromToday(batch.expiryDate) : 0;
    const isBusy = loadingBatchId === batch.id;
    const hasSavedPrediction = batch.lastRiskProbability != null || batch.lastRiskLabel;

    return (
        <div
            id={`expiry-batch-row-${batch.id}`}
            className={`rounded-[24px] border p-4 shadow-sm ${
                expired && batch.quantity > 0
                    ? "border-red-200 bg-red-50/60"
                    : "border-[#0F172A]/10 bg-white"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-base font-black text-[#0F172A]">{batch.product?.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-[#0F172A]/50">
                        <span>{batch.product?.category || "Uncategorized"}</span>
                        <span className="h-1 w-1 rounded-full bg-[#0F172A]/20" />
                        <span>{batch.batchNumber || `Batch #${batch.id}`}</span>
                        {loggedBatchIds.has(batch.id) ? (
                            <Badge className="border-none bg-slate-200 text-slate-700 font-black text-[9px] uppercase tracking-wider px-1.5 py-0">
                                Waste logged
                            </Badge>
                        ) : null}
                    </div>
                </div>
                <RiskPill label={batch.lastRiskLabel} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#0F172A]/[0.03] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F172A]/45">Expiry</p>
                    {expired ? (
                        <>
                            <p className="mt-1 text-sm font-black text-red-600">Expired</p>
                            <p className="text-xs font-bold text-red-400">{batch.expiryDate} - {daysAgo}d ago</p>
                        </>
                    ) : (
                        <>
                            <p className="mt-1 text-sm font-black text-[#0F172A]">{batch.expiryDate}</p>
                            <p className="text-xs font-bold text-[#0F172A]/45">Still inside shelf window</p>
                        </>
                    )}
                </div>
                <div className="rounded-2xl bg-[#0F172A]/[0.03] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F172A]/45">Current Stock</p>
                    <p className="mt-1 text-sm font-black text-[#0F172A]">{batch.quantity} units</p>
                    <p className="text-xs font-bold text-[#0F172A]/45">
                        {batch.impactScore != null ? `Impact Rs. ${formatCurrency(batch.impactScore)}` : "Run a scan for impact"}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
                {hasSavedPrediction ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onViewBatchResult(batch)}
                        className="h-10 rounded-xl border-[#0F172A]/10 bg-white px-4 text-[11px] font-black uppercase tracking-wider text-[#0F172A]/70 hover:bg-[#0F172A]/5"
                    >
                        View
                    </Button>
                ) : null}
                {expired ? (
                    batch.quantity > 0 ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onRecordWaste(batch)}
                            disabled={runningAll}
                            className="h-10 rounded-xl border-red-200 bg-white px-4 text-[11px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50"
                        >
                            Record waste
                        </Button>
                    ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#0F172A]/35">
                            Batch closed
                        </span>
                    )
                ) : batch.quantity === 0 ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0F172A]/35">No stock</span>
                ) : (
                    <Button
                        onClick={() => onPredictBatch(batch.id)}
                        disabled={isBusy || runningAll}
                        size="sm"
                        className="h-10 rounded-xl bg-[#7C3AED] px-4 text-[11px] font-black uppercase tracking-wider text-white shadow-glow-amethyst hover:bg-[#6D28D9]"
                    >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : "Refresh AI"}
                    </Button>
                )}
            </div>
        </div>
    );
}

export function AutomatedRiskTab({
    batches,
    deepLinkCoach,
    expiredWithStock,
    fetchingBatches,
    loadingBatchId,
    loggedBatchIds,
    runAllDone,
    runningAll,
    embedded = false,
    summary,
    onDismissCoach,
    onPredictBatch,
    onRecordWaste,
    onRefresh,
    onRunAll,
    onViewHistory,
    onViewBatchResult,
}) {
    return (
        <TabsContent value="automated" className="m-0 space-y-6 outline-none">
            {expiredWithStock > 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 px-5 py-4 rounded-2xl bg-red-50 border border-red-200"
                >
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                        <Trash2 size={16} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-red-700 text-sm">
                            {expiredWithStock} expired {expiredWithStock === 1 ? "batch has" : "batches have"} remaining stock
                        </p>
                        <p className="text-xs font-bold text-red-500 mt-0.5">
                            These items should be physically removed and logged. Use the <span className="underline">Record waste</span> button on each row.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onViewHistory}
                        className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider text-red-600 hover:text-red-800 transition-colors"
                    >
                        View history -
                    </button>
                </motion.div>
            ) : null}

            {deepLinkCoach ? (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-[#7C3AED]/10 border border-[#7C3AED]/25"
                >
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-[#7C3AED]/20">
                        <Brain size={16} className="text-[#7C3AED]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-[#0F172A] text-sm">From Loss Prevention</p>
                        <p className="text-xs font-bold text-[#0F172A]/70 mt-1 leading-relaxed">{deepLinkCoach}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onDismissCoach}
                        className="flex-shrink-0 p-1 rounded-lg text-[#0F172A]/40 hover:text-[#0F172A] hover:bg-white/80 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            ) : null}

            <div className={`grid gap-4 ${embedded ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
                <StatTile
                    label="Live Inventory"
                    value={summary?.activeBatches ?? 0}
                    hint="Batches available to scan"
                    compact={embedded}
                />
                <StatTile
                    label="Model Flagged"
                    value={summary?.flaggedBatches ?? 0}
                    hint="High Risk or Warning rows"
                    tone="violet"
                    compact={embedded}
                />
                <StatTile
                    label="Expired Stock"
                    value={expiredWithStock ?? 0}
                    hint="Needs write-off attention"
                    tone="red"
                    compact={embedded}
                />
                <StatTile
                    label="Already Scanned"
                    value={summary?.scannedBatches ?? 0}
                    hint="Saved predictions"
                    tone="emerald"
                    compact={embedded}
                />
            </div>

            <Card className="card-premium border-none shadow-premium">
                <CardHeader className={`border-b border-[#0F172A]/5 ${embedded ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <CardTitle className="font-black text-lg">Inventory Batches</CardTitle>
                            <CardDescription className="mt-1 font-bold">
                                Predictions auto-refresh when this dashboard opens and every 5 minutes while you stay here.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                onClick={onRunAll}
                                disabled={runningAll || fetchingBatches}
                                size="sm"
                                className={`h-10 rounded-2xl px-4 text-xs font-black uppercase tracking-wider transition-all ${
                                    runAllDone
                                        ? "bg-emerald-500 text-white"
                                        : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-glow-amethyst"
                                }`}
                            >
                                {runningAll ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin mr-1" /> Running All...
                                    </>
                                ) : runAllDone ? (
                                    <>
                                        <CheckCircle2 size={13} className="mr-1" /> Done!
                                    </>
                                ) : (
                                    <>
                                        <Brain size={13} className="mr-1" /> Run AI Now
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={onRefresh}
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-2xl border-[#0F172A]/10 px-4 text-xs font-bold"
                                disabled={fetchingBatches}
                            >
                                {fetchingBatches ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className={`border-b border-[#0F172A]/5 bg-[#F8FAFC] ${embedded ? "px-5 py-3" : "px-6 py-4"}`}>
                        <p className="text-xs font-bold leading-relaxed text-[#0F172A]/55">
                            View opens the latest saved AI result. Refresh AI re-runs one batch. Run AI Now updates the full watchlist immediately.
                        </p>
                    </div>
                    <div className="grid gap-4 p-4 lg:hidden">
                        {fetchingBatches && batches.length === 0 ? (
                            <div className="rounded-[24px] border border-[#0F172A]/10 p-10 text-center text-[#0F172A]/40">
                                <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
                                <p className="text-sm font-bold">Loading batches...</p>
                            </div>
                        ) : batches.length > 0 ? (
                            batches.map((batch) => (
                                <BatchMobileCard
                                    key={batch.id}
                                    batch={batch}
                                    loggedBatchIds={loggedBatchIds}
                                    runningAll={runningAll}
                                    loadingBatchId={loadingBatchId}
                                    onRecordWaste={onRecordWaste}
                                    onPredictBatch={onPredictBatch}
                                    onViewBatchResult={onViewBatchResult}
                                />
                            ))
                        ) : (
                            <div className="rounded-[24px] border border-dashed border-[#0F172A]/15 p-10 text-center">
                                <p className="text-sm font-black text-[#0F172A]/45">No active batches found.</p>
                            </div>
                        )}
                    </div>
                    <div className="hidden overflow-x-auto lg:block">
                        {fetchingBatches && batches.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-[#0F172A]/40">
                                <Loader2 size={24} className="animate-spin mb-2" />
                                <p className="text-sm font-bold">Loading batches...</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#0F172A]/[0.02] border-b border-[#0F172A]/5 text-xs uppercase tracking-widest text-[#0F172A]/60 font-black">
                                    <tr>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">Batch Details</th>
                                        <th className="px-6 py-4">Expiry Date</th>
                                        <th className="px-6 py-4">Current Stock</th>
                                        <th className="px-6 py-4">Last Risk</th>
                                        <th className="px-6 py-4">Impact</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#0F172A]/5 font-medium text-[#0F172A]">
                                    {batches.map((batch) => (
                                        <BatchRow
                                            key={batch.id}
                                            batch={batch}
                                            loggedBatchIds={loggedBatchIds}
                                            runningAll={runningAll}
                                            loadingBatchId={loadingBatchId}
                                            onRecordWaste={onRecordWaste}
                                            onPredictBatch={onPredictBatch}
                                            onViewBatchResult={onViewBatchResult}
                                        />
                                    ))}
                                    {batches.length === 0 && !fetchingBatches ? (
                                        <tr>
                                            <td colSpan="7" className="text-center p-8 text-[#0F172A]/40 font-bold">
                                                No active batches found.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
}

export function ManualRiskTab({ embedded = false, form, loading, onFieldChange, onFieldValueChange, onPreset, onReset, onSubmit }) {
    return (
        <TabsContent value="manual" className="m-0 space-y-6 outline-none">
            <Card className="card-premium border-none shadow-premium">
                <CardHeader className={`border-b border-[#0F172A]/5 ${embedded ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <CardTitle className="font-black text-lg">Simple Risk Simulator</CardTitle>
                            <CardDescription className="mt-1 font-bold">
                                Fill only the values an admin already knows. The system builds the ML features in the background.
                            </CardDescription>
                        </div>
                        {!embedded ? (
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-[#0F172A]/10 bg-[#F8FAFC] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0F172A]/55">
                                    Good for demos
                                </span>
                                <span className="rounded-full border border-[#0F172A]/10 bg-[#F8FAFC] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0F172A]/55">
                                    Uses saved model
                                </span>
                            </div>
                        ) : null}
                    </div>
                </CardHeader>
                <CardContent className={embedded ? "p-5 sm:p-6" : "p-5 sm:p-8"}>
                    <div className="mb-6">
                        <div className="rounded-[26px] border border-[#0F172A]/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.02),_rgba(0,122,94,0.08))] p-5 sm:p-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0F172A]/45">Use It Like This</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {[
                                    { step: "1", title: "Enter stock", text: "Current units left in the batch." },
                                    { step: "2", title: "Enter sales pace", text: "Average units sold per day." },
                                    { step: "3", title: "Get result", text: "Risk, sell-through chance, and action." },
                                ].map((item) => (
                                    <div key={item.step} className="rounded-2xl border border-white/70 bg-white/75 p-4">
                                        <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#007A5E] text-xs font-black text-white">
                                            {item.step}
                                        </div>
                                        <p className="text-sm font-black text-[#0F172A]">{item.title}</p>
                                        <p className="mt-1 text-xs font-bold leading-relaxed text-[#0F172A]/55">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <SectionCard
                            title="Only 5 Inputs Needed"
                            description="Use this when you do not want to pick a live batch. For real inventory, the Inventory Batches tab can calculate these automatically."
                        >
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">Product Type</Label>
                                    <Select value={form.category} onValueChange={(value) => onFieldValueChange("category", value)}>
                                        <SelectTrigger className="h-10 rounded-xl border-[#0F172A]/10 font-bold text-sm">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((category) => (
                                                <SelectItem key={category} value={category} className="font-bold">
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Field
                                    id="days_until_expiry"
                                    label="Days Left"
                                    hint="How many days until expiry"
                                    value={form.days_until_expiry}
                                    onChange={onFieldChange("days_until_expiry")}
                                    min="0"
                                    step="1"
                                />
                                <Field
                                    id="remaining_quantity"
                                    label="Current Stock"
                                    hint="Units still available now"
                                    value={form.remaining_quantity}
                                    onChange={onFieldChange("remaining_quantity")}
                                    min="0"
                                    step="1"
                                />
                                <Field
                                    id="units_sold"
                                    label="Sold So Far"
                                    hint="Optional, but improves sell-through calculation"
                                    value={form.units_sold}
                                    onChange={onFieldChange("units_sold")}
                                    min="0"
                                    step="1"
                                />
                                <Field
                                    id="daily_demand"
                                    label="Avg Sales Per Day"
                                    hint="Example: 12 means 12 units/day"
                                    value={form.daily_demand}
                                    onChange={onFieldChange("daily_demand")}
                                    min="0"
                                />
                            </div>
                        </SectionCard>

                        <div className="rounded-[24px] border border-[#007A5E]/15 bg-[#007A5E]/5 p-5">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#007A5E]">What happens after you click predict?</p>
                                    <p className="mt-2 text-sm font-bold leading-relaxed text-[#0F172A]/60">
                                        The system calculates hidden ML features like initial quantity, sell-through rate, stock pressure, velocity score, and expiry pressure, then sends them to the saved Random Forest model.
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-[#0F172A]/55 shadow-sm">
                                    Result = expiry risk + sell-through %
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-12 flex-1 rounded-2xl bg-[#0F172A] text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-[#0F172A]/80"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin mr-2" /> Predicting...
                                    </>
                                ) : (
                                    <>
                                        <Brain size={16} className="mr-2" /> Get Prediction
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                onClick={onReset}
                                variant="outline"
                                className="h-12 rounded-2xl border-[#0F172A]/10 px-5 font-black text-sm text-[#0F172A]/60 hover:bg-[#0F172A]/5"
                            >
                                <RotateCcw size={15} />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </TabsContent>
    );
}

export function InlineError({ error }) {
    return (
        <AnimatePresence>
            {error ? (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold p-4 rounded-2xl"
                >
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export function RiskResultPanel({ embedded = false, loading, mode, result }) {
    const cfg = result ? (RISK_CONFIG[result.risk_label] || RISK_CONFIG["Low Risk"]) : null;
    const RiskIcon = cfg?.icon;
    const pct = result ? Math.round(result.expiry_risk_probability * 100) : 0;
    const discountPct = result?.suggested_discount_pct != null
        ? Number(result.suggested_discount_pct)
        : null;
    const sellThroughPct = result?.sell_through_before_expiry_probability != null
        ? Math.round(result.sell_through_before_expiry_probability * 100)
        : null;
    const modelRiskPct = result?.model_expiry_risk_probability != null
        ? Math.round(result.model_expiry_risk_probability * 100)
        : null;
    const salesPaceSellThroughPct = result?.sales_pace_sell_through_probability != null
        ? Math.round(result.sales_pace_sell_through_probability * 100)
        : null;
    const salesPaceCoveragePct = result?.sales_pace_coverage_ratio != null
        ? Math.round(result.sales_pace_coverage_ratio * 100)
        : null;
    const source = result?.prediction_source || null;
    const sourceLabel = source === "AIML_RANDOM_FOREST"
        ? "Random Forest (.pkl)"
        : source === "SAVED_BATCH_RESULT"
            ? "Saved AI result"
        : source === "FALLBACK_RULE"
            ? "Spring fallback rule"
            : source;
    const isFallback = typeof source === "string" && source.includes("FALLBACK");
    const metricGridClass = embedded
        ? "grid-cols-2"
        : result?.impact_score != null
            ? (sellThroughPct != null ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")
            : (sellThroughPct != null ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2");
    const actionGridClass = embedded ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
    const outcomeSummary = result
        ? (result.predicted_label === 1
            ? "Likely to expire before the batch fully sells out."
            : "Likely to sell through before expiry.")
        : "";
    const engineeredFeatures = result?.engineered_features && typeof result.engineered_features === "object"
        ? result.engineered_features
        : null;
    const featureRows = engineeredFeatures ? [
        { key: "sell_through_rate", label: "Sell-through rate", type: "percent" },
        { key: "remaining_quantity", label: "Remaining qty" },
        { key: "daily_demand", label: "Daily demand" },
        { key: "stock_pressure_ratio", label: "Stock pressure" },
        { key: "expiry_pressure_index", label: "Expiry pressure" },
        { key: "spoilage_sensitivity", label: "Spoilage sensitivity", type: "percent" },
    ].filter((item) => engineeredFeatures[item.key] != null) : [];
    const formatFeature = (value, type) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return "--";
        if (type === "percent") return `${Math.round(number * 100)}%`;
        if (Math.abs(number) >= 100) return number.toFixed(0);
        return number.toFixed(2);
    };

    return (
        <div className={`min-w-0 space-y-5 ${embedded ? "" : "2xl:sticky 2xl:top-8"} ${mode === "waste_history" ? "hidden" : ""}`}>
            <AnimatePresence mode="wait">
                {!result && !loading ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`card-premium min-h-[340px] border-none shadow-premium ${embedded ? "p-6" : "p-8"}`}
                    >
                        <div className={`mb-6 flex items-center justify-center rounded-2xl bg-[#7C3AED]/10 ${embedded ? "h-14 w-14" : "h-16 w-16"}`}>
                            <Activity size={28} className="text-[#7C3AED]" />
                        </div>
                        <p className="text-center text-sm font-black text-[#0F172A]/60">Result Panel</p>
                        <p className="mt-1 text-center text-sm font-bold leading-relaxed text-[#0F172A]/40">
                            {embedded
                                ? "Pick a live batch or use the 5-input simulator to see the AI decision here."
                                : "Pick a live batch or use the 5-input simulator. The model output, sell-through probability, and recommended action will appear here."}
                        </p>
                        <div className={`mt-6 grid gap-3 ${embedded ? "sm:grid-cols-1" : ""}`}>
                            <div className="rounded-2xl border border-[#0F172A]/10 bg-[#F8FAFC] p-4 text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F172A]/45">1. Choose Input</p>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-[#0F172A]/55">
                                    Pick a live batch from the watchlist or enter the 5 simple simulator values.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[#0F172A]/10 bg-[#F8FAFC] p-4 text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F172A]/45">2. Run Prediction</p>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-[#0F172A]/55">
                                    The screen calls the FastAPI service and loads the saved Random Forest model.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[#0F172A]/10 bg-[#F8FAFC] p-4 text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F172A]/45">3. Review Action</p>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-[#0F172A]/55">
                                    Compare expiry risk, sell-through probability, and the suggested business action.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`card-premium flex min-h-[340px] flex-col items-center justify-center border-none shadow-premium ${embedded ? "p-6" : "p-10"}`}
                    >
                        <Loader2 size={36} className="text-[#7C3AED] animate-spin mb-4" />
                        <p className="font-black text-[#0F172A]/50 text-sm uppercase tracking-widest">Analysing with ML Model...</p>
                    </motion.div>
                ) : null}
                {result && cfg ? (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    >
                        <Card className={`overflow-hidden border-2 shadow-xl ${cfg.border} ${cfg.glow}`}>
                            <CardContent className={`space-y-5 ${embedded ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
                                <div className="rounded-[26px] border border-[#0F172A]/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.02),_rgba(124,58,237,0.08))] p-5">
                                    <div className="flex items-start gap-3">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cfg.color}`}>
                                            <RiskIcon size={22} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0F172A]/40">Model Decision</p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <h3 className="text-xl font-black text-[#0F172A]">{result.risk_label}</h3>
                                                <Badge className={`border-none px-3 py-1 text-xs font-black rounded-xl ${cfg.color}`}>
                                                    Label {result.predicted_label}
                                                </Badge>
                                            </div>
                                            <p className="mt-2 text-sm font-bold leading-relaxed text-[#0F172A]/55">
                                                {outcomeSummary}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {!embedded ? (
                                    <div className="flex items-center gap-3">
                                        <div className={`h-12 w-12 rounded-2xl ${cfg.color} flex items-center justify-center`}>
                                            <RiskIcon size={22} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">Final Expiry Risk</p>
                                            <h3 className="text-xl font-black text-[#0F172A]">{pct}%</h3>
                                        </div>
                                    </div>
                                ) : null}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">Final Expiry Risk</span>
                                        <span className="text-sm font-black text-[#0F172A]">{pct}%</span>
                                    </div>
                                    <div className="h-3 bg-[#0F172A]/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${cfg.bar}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                                {sellThroughPct != null ? (
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Final Sell-Through Before Expiry</span>
                                            <span className="text-sm font-black text-emerald-700">{sellThroughPct}%</span>
                                        </div>
                                        <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-emerald-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${sellThroughPct}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                                {salesPaceSellThroughPct != null ? (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700/70">Sales Pace Check</p>
                                                <p className="mt-1 text-sm font-bold leading-relaxed text-[#0F172A]/60">
                                                    {result.sales_pace_message || "Compares daily sales speed against days left before expiry."}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Pace Sell-Through</p>
                                                <p className="text-xl font-black text-blue-700">{salesPaceSellThroughPct}%</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-xl bg-white p-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Days Needed</p>
                                                <p className="mt-1 font-black text-[#0F172A]">
                                                    {result.estimated_days_to_sell != null ? `${Number(result.estimated_days_to_sell).toFixed(1)}d` : "No sales pace"}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Stock Can Clear</p>
                                                <p className="mt-1 font-black text-[#0F172A]">{salesPaceCoveragePct}%</p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Raw .pkl Risk</p>
                                                <p className="mt-1 font-black text-[#0F172A]">{modelRiskPct != null ? `${modelRiskPct}%` : "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                <div className={`grid gap-3 ${actionGridClass}`}>
                                    <div className="rounded-2xl bg-[#0F172A]/[0.03] p-5">
                                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">Suggested Action</p>
                                        <p className="text-sm font-black text-[#0F172A]">{result.suggested_action}</p>
                                        {discountPct != null ? (
                                            <div className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#007A5E] shadow-sm">
                                                {discountPct > 0 ? `${discountPct}% discount suggestion` : "No discount suggestion"}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="rounded-2xl border border-[#0F172A]/10 bg-white p-5">
                                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">What This Means</p>
                                        <p className="text-sm font-bold leading-relaxed text-[#0F172A]/60">
                                            {sellThroughPct != null
                                                ? `${sellThroughPct}% chance to sell through before expiry and ${pct}% chance to expire with stock still remaining.`
                                                : `${pct}% chance to expire before the batch fully sells out.`}
                                        </p>
                                    </div>
                                </div>
                                <div className={`grid gap-3 ${metricGridClass}`}>
                                    <div className="bg-[#0F172A]/[0.02] rounded-xl p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">Final Probability</p>
                                        <p className="font-black text-[#0F172A] text-lg">{result.expiry_risk_probability.toFixed(4)}</p>
                                    </div>
                                    {result.model_expiry_risk_probability != null ? (
                                        <div className="bg-[#0F172A]/[0.02] rounded-xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">Raw .pkl Risk</p>
                                            <p className="font-black text-[#0F172A] text-lg">{result.model_expiry_risk_probability.toFixed(4)}</p>
                                        </div>
                                    ) : null}
                                    {result.sell_through_before_expiry_probability != null ? (
                                        <div className="bg-[#0F172A]/[0.02] rounded-xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">Sell-Through Prob.</p>
                                            <p className="font-black text-[#0F172A] text-lg">{result.sell_through_before_expiry_probability.toFixed(4)}</p>
                                        </div>
                                    ) : null}
                                    <div className="bg-[#0F172A]/[0.02] rounded-xl p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">Predicted Label</p>
                                        <p className="font-black text-[#0F172A] text-lg">{result.predicted_label === 1 ? "At Risk (1)" : "Safe (0)"}</p>
                                    </div>
                                    {result.impact_score != null ? (
                                        <div className="bg-[#0F172A]/[0.02] rounded-xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">Impact Score</p>
                                            <p className="font-black text-[#0F172A] text-lg">Rs. {formatCurrency(result.impact_score)}</p>
                                        </div>
                                    ) : null}
                                </div>
                                {featureRows.length > 0 ? (
                                    <div className="rounded-2xl border border-[#0F172A]/10 bg-white p-5">
                                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">Engineered Features Built by System</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {featureRows.map((item) => (
                                                <div key={item.key} className="rounded-xl bg-[#0F172A]/[0.02] p-3">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#0F172A]/35">{item.label}</p>
                                                    <p className="mt-1 text-sm font-black text-[#0F172A]">
                                                        {formatFeature(engineeredFeatures[item.key], item.type)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {sourceLabel || result.decision_threshold != null ? (
                                    <div className={`rounded-2xl border p-4 space-y-2 ${isFallback ? "border-orange-200 bg-orange-50/80" : "border-[#0F172A]/10 bg-white"}`}>
                                        {sourceLabel ? (
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">Prediction Source</p>
                                                <p className="text-xs font-black text-[#0F172A]">{sourceLabel}</p>
                                            </div>
                                        ) : null}
                                        {result.decision_threshold != null ? (
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">Decision Threshold</p>
                                                <p className="text-xs font-black text-[#0F172A]">{Number(result.decision_threshold).toFixed(2)}</p>
                                            </div>
                                        ) : null}
                                        {isFallback ? (
                                            <p className="text-xs font-bold text-orange-700">
                                                Python model not reachable, so this result came from the backend fallback rule instead of the trained `.pkl` model.
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

export function WasteHistorySection({
    filters,
    history,
    loading,
    error,
    products,
    totalWasteCost,
    totalWasteUnits,
    onApplyFilters,
    onChangeFilter,
    onClearFilters,
    onExportCsv,
}) {
    const hasFilters = Boolean(
        filters.whFrom || filters.whTo || filters.whProductId || filters.whCategory || filters.whBatchId || filters.whReason
    );

    return (
        <Card className="card-premium border-none shadow-premium">
            <CardHeader className="p-8 border-b border-[#0F172A]/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="font-black text-lg flex items-center gap-2">
                            <Trash2 size={18} className="text-red-500" /> Waste History
                        </CardTitle>
                        <CardDescription className="font-bold">All recorded waste write-offs with cost impact.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <CalendarRange size={14} className="text-[#0F172A]/40" />
                            <span className="text-xs font-bold text-[#0F172A]/50">From</span>
                            <Input
                                type="date"
                                value={filters.whFrom}
                                onChange={(event) => onChangeFilter("whFrom", event.target.value)}
                                className="h-8 rounded-lg border-[#0F172A]/10 text-xs font-bold w-36"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#0F172A]/50">To</span>
                            <Input
                                type="date"
                                value={filters.whTo}
                                onChange={(event) => onChangeFilter("whTo", event.target.value)}
                                className="h-8 rounded-lg border-[#0F172A]/10 text-xs font-bold w-36"
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={onApplyFilters}
                            disabled={loading}
                            className="h-8 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xs"
                        >
                            {loading ? <Loader2 size={13} className="animate-spin" /> : "Apply filters"}
                        </Button>
                        {hasFilters ? (
                            <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={onClearFilters}
                                className="h-8 rounded-lg border-[#0F172A]/10 font-bold text-xs"
                            >
                                Clear all
                            </Button>
                        ) : null}
                        <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={onApplyFilters}
                            disabled={loading}
                            className="h-8 rounded-lg border-[#0F172A]/10 font-bold text-xs"
                        >
                            {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={onExportCsv}
                            disabled={loading || history.length === 0}
                            className="h-8 rounded-lg border-[#007A5E]/30 text-[#007A5E] font-black text-xs gap-1"
                        >
                            <Download size={13} /> CSV
                        </Button>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#0F172A]/5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/50">Product</Label>
                        <Select value={filters.whProductId || "all"} onValueChange={(value) => onChangeFilter("whProductId", value === "all" ? "" : value)}>
                            <SelectTrigger className="h-9 rounded-lg border-[#0F172A]/10 text-xs font-bold">
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold">Any product</SelectItem>
                                {products.map((product) => (
                                    <SelectItem key={product.id} value={String(product.id)} className="font-bold">
                                        {product.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/50">Category</Label>
                        <Select value={filters.whCategory || "all"} onValueChange={(value) => onChangeFilter("whCategory", value === "all" ? "" : value)}>
                            <SelectTrigger className="h-9 rounded-lg border-[#0F172A]/10 text-xs font-bold">
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold">Any category</SelectItem>
                                {CATEGORIES.map((category) => (
                                    <SelectItem key={category} value={category} className="font-bold">
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/50">Batch ID</Label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 12"
                            value={filters.whBatchId}
                            onChange={(event) => onChangeFilter("whBatchId", event.target.value.replace(/\D/g, ""))}
                            className="h-9 rounded-lg border-[#0F172A]/10 text-xs font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/50">Reason</Label>
                        <Select value={filters.whReason || "all"} onValueChange={(value) => onChangeFilter("whReason", value === "all" ? "" : value)}>
                            <SelectTrigger className="h-9 rounded-lg border-[#0F172A]/10 text-xs font-bold">
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold">Any reason</SelectItem>
                                {WASTE_REASONS.map((reason) => (
                                    <SelectItem key={reason.value} value={reason.value} className="font-bold">
                                        {reason.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {history.length > 0 ? (
                    <div className="flex gap-4 mt-4 flex-wrap">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100">
                            <TrendingDown size={14} className="text-red-500" />
                            <span className="text-xs font-black text-red-700">
                                {history.length} {history.length === 1 ? "record" : "records"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100">
                            <Trash2 size={14} className="text-red-500" />
                            <span className="text-xs font-black text-red-700">{totalWasteUnits} units wasted</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-xs font-black text-red-700">
                                Rs. {formatCurrency(totalWasteCost)} total loss
                            </span>
                        </div>
                    </div>
                ) : null}
            </CardHeader>

            <CardContent className="p-0">
                {error ? (
                    <div className="p-6">
                        <p className="text-sm font-bold text-red-600">{error}</p>
                    </div>
                ) : null}
                {loading && history.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-[#0F172A]/40">
                        <Loader2 size={24} className="animate-spin mb-2" />
                        <p className="text-sm font-bold">Loading waste history...</p>
                    </div>
                ) : !loading && history.length === 0 && !error ? (
                    <div className="p-12 flex flex-col items-center justify-center text-[#0F172A]/30">
                        <CheckCircle2 size={32} className="mb-3 text-emerald-400" />
                        <p className="font-black text-sm">No waste records found</p>
                        <p className="text-xs font-bold mt-1">
                            {hasFilters ? "Try adjusting filters or date range." : "No waste has been logged yet."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#0F172A]/[0.02] border-b border-[#0F172A]/5 text-xs uppercase tracking-widest text-[#0F172A]/60 font-black">
                                <tr>
                                    <th className="px-6 py-4">Date recorded</th>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4">Batch</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4">Expiry date</th>
                                    <th className="px-6 py-4">Units wasted</th>
                                    <th className="px-6 py-4">Cost loss</th>
                                    <th className="px-6 py-4">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#0F172A]/5 font-medium text-[#0F172A]">
                                {history.map((row) => (
                                    <tr key={row.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-[#0F172A]/60 whitespace-nowrap">
                                            {new Date(row.recordedAt).toLocaleDateString("en-LK", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black">{row.productName}</div>
                                            <div className="text-xs text-[#0F172A]/50 font-bold">{row.productCategory}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#0F172A]/70">
                                            <div className="flex items-center gap-1.5">
                                                <PackageOpen size={13} className="text-[#0F172A]/40" />
                                                {row.batchNumber}
                                            </div>
                                            <div className="text-[10px] font-bold text-[#0F172A]/35 mt-0.5">ID {row.batchId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="text-[10px] font-black border-[#0F172A]/15">
                                                {wasteReasonLabel(row.reasonCode)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className="border-none bg-red-100 text-red-700 font-black text-[10px] uppercase tracking-wider rounded-lg">
                                                {row.expiryDate}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-lg font-black text-sm border border-red-100">
                                                {row.quantityWasted} units
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-black text-red-600">Rs. {formatCurrency(row.costLoss)}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-[#0F172A]/50 max-w-[180px]">
                                            {row.notes || <span className="text-[#0F172A]/25 italic">No notes</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function WasteRecordDialog({
    open,
    wasteBatch,
    wasteError,
    wasteNotes,
    wasteQtyStr,
    wasteReason,
    wasteSaving,
    onClose,
    onNotesChange,
    onQtyChange,
    onReasonChange,
    onSubmit,
}) {
    return (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
            <DialogContent className="sm:max-w-md rounded-2xl border-[#0F172A]/10">
                <DialogHeader>
                    <DialogTitle className="font-black text-[#0F172A]">Record waste</DialogTitle>
                    <DialogDescription asChild>
                        <div className="font-bold text-[#0F172A]/50 text-sm text-left space-y-1 pt-1">
                            {wasteBatch ? (
                                <>
                                    <p>
                                        <span className="text-[#0F172A]">{wasteBatch.product?.name}</span>
                                        {" - "}
                                        {wasteBatch.batchNumber || `Batch #${wasteBatch.id}`}
                                    </p>
                                    <p className="text-xs">
                                        Expiry {wasteBatch.expiryDate} - {wasteBatch.quantity} units on hand (max you can log now).
                                    </p>
                                </>
                            ) : null}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="waste-qty" className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
                            Units to write off
                        </Label>
                        <Input
                            id="waste-qty"
                            type="number"
                            min={1}
                            max={wasteBatch?.quantity ?? 1}
                            step={1}
                            value={wasteQtyStr}
                            onChange={(event) => onQtyChange(event.target.value)}
                            className="h-10 rounded-xl border-[#0F172A]/10"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">Reason</Label>
                        <Select value={wasteReason} onValueChange={onReasonChange}>
                            <SelectTrigger className="h-10 rounded-xl border-[#0F172A]/10 font-bold text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {WASTE_REASONS.map((reason) => (
                                    <SelectItem key={reason.value} value={reason.value} className="font-bold">
                                        {reason.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="waste-notes" className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
                            Notes (optional)
                        </Label>
                        <Textarea
                            id="waste-notes"
                            value={wasteNotes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder="e.g. Damaged, removed from shelf"
                            maxLength={500}
                            className="rounded-xl border-[#0F172A]/10 min-h-[88px] resize-y text-sm font-medium"
                        />
                    </div>
                    {wasteError ? <p className="text-sm font-bold text-red-600">{wasteError}</p> : null}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" className="rounded-xl font-bold" onClick={onClose} disabled={wasteSaving}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={wasteSaving}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider"
                        >
                            {wasteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log waste"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
