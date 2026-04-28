import { AnimatePresence, motion as Motion } from "framer-motion";
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Clock,
    Edit2,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Tag,
    Trash2,
    Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    formatImpactScore,
    getDaysLeftColor,
    getDaysLeftLabel,
    RISK_CONFIG,
    STATUS_CONFIG,
} from "./discountAlertsUtils";

function SortIcon({ col, sortCol, sortDir }) {
    if (sortCol !== col) {
        return <ChevronsUpDown size={13} className="ml-1 inline text-[#0F172A]/30" />;
    }

    return sortDir === "asc"
        ? <ChevronUp size={13} className="ml-1 inline text-[#007A5E]" />
        : <ChevronDown size={13} className="ml-1 inline text-[#007A5E]" />;
}

function toPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const percent = number <= 1 ? number * 100 : number;
    return Math.max(0, Math.min(100, Math.round(percent)));
}

export function AlertsAccessRestricted() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Motion.div
                initial={{ opacity: 0, scale: 0.93, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-md"
            >
                <div className="pointer-events-none absolute inset-0 scale-110 rounded-[2.5rem] bg-gradient-to-br from-[#fca5a5]/30 to-[#fee2e2]/10 blur-2xl" />
                <div className="relative flex flex-col items-center overflow-hidden rounded-[2rem] border border-white/60 bg-white/35 p-12 text-center shadow-[0_8px_48px_rgba(239,68,68,0.1),0_2px_8px_rgba(239,68,68,0.05)] backdrop-blur-2xl">
                    <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                    <div className="relative mb-8">
                        <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-br from-[#fca5a5]/40 to-[#ef4444]/20 blur-xl" />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-white/70 bg-gradient-to-br from-[#fff1f2] to-[#ffe4e6] shadow-[0_4px_20px_rgba(239,68,68,0.15)]">
                            <ShieldCheck size={36} className="text-[#ef4444]" strokeWidth={1.5} />
                        </div>
                    </div>
                    <h2 className="mb-3 text-2xl font-black tracking-tight text-[#1a1208]">Access Restricted</h2>
                    <p className="mb-4 text-sm font-bold text-[#0F172A]/50">You do not have access to Discounts and Alerts.</p>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#ef4444]/20 bg-gradient-to-r from-[#fca5a5]/40 to-[#fee2e2]/40 px-4 py-2 shadow-sm backdrop-blur-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#991b1b]">Contact your administrator</span>
                    </div>
                    <div className="mt-8 flex gap-2">
                        {[24, 40, 28, 16, 36].map((width, index) => (
                            <div
                                key={index}
                                className="h-0.5 rounded-full bg-gradient-to-r from-[#ef4444]/20 to-[#ef4444]/5"
                                style={{ width }}
                            />
                        ))}
                    </div>
                </div>
            </Motion.div>
        </div>
    );
}

export function AlertsStatsRow({ alertsCount, criticalAlerts, activeDiscounts, pendingDiscounts }) {
    const stats = [
        { label: "Active Alerts", value: alertsCount, sub: "Operational batch alerts", color: "text-[#9D1967]", bg: "bg-[#9D1967]/10", Icon: Bell },
        { label: "Critical Alerts", value: criticalAlerts, sub: "High risk or expired", color: "text-red-500", bg: "bg-red-100", Icon: ShieldAlert },
        { label: "Active Discounts", value: activeDiscounts, sub: "Currently live", color: "text-[#007A5E]", bg: "bg-[#007A5E]/10", Icon: Tag },
        { label: "Pending Review", value: pendingDiscounts, sub: "Awaiting admin action", color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10", Icon: Clock },
    ];

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
                <Motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="card-premium p-6"
                >
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                        <stat.Icon size={20} />
                    </div>
                    <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#0F172A]/40">{stat.label}</p>
                    <h3 className={`mb-1 text-3xl font-black ${stat.color}`}>{stat.value}</h3>
                    <p className="text-[10px] font-bold text-[#007A5E]">{stat.sub}</p>
                </Motion.div>
            ))}
        </div>
    );
}

export function AlertsErrorBanner({ error, onRetry }) {
    return (
        <AnimatePresence>
            {error ? (
                <Motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4"
                >
                    <div className="flex items-center gap-3 text-sm font-bold text-red-600">
                        <AlertTriangle size={18} /> {error}
                    </div>
                    <Button size="sm" variant="outline" className="border-red-200 bg-white text-red-700" onClick={onRetry}>
                        Retry
                    </Button>
                </Motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export function AlertsTabSelector({ tab, alertsCount, pendingDiscounts, onChange }) {
    const tabs = [
        { key: "alerts", label: "Expiry Alerts", icon: Bell },
        { key: "discounts", label: "Discount Suggestions", icon: Tag },
    ];

    return (
        <div className="flex gap-2 border-b border-[#0F172A]/10 pb-0">
            {tabs.map((item) => (
                <button
                    key={item.key}
                    onClick={() => onChange(item.key)}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-black transition-all ${
                        tab === item.key
                            ? "border-[#007A5E] text-[#007A5E]"
                            : "border-transparent text-[#0F172A]/40 hover:text-[#0F172A]"
                    }`}
                >
                    <item.icon size={15} /> {item.label}
                    {item.key === "alerts" && alertsCount > 0 ? (
                        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#9D1967]/10 px-1 text-[10px] font-black text-[#9D1967]">
                            {alertsCount}
                        </span>
                    ) : null}
                    {item.key === "discounts" && pendingDiscounts > 0 ? (
                        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#7C3AED]/10 px-1 text-[10px] font-black text-[#7C3AED]">
                            {pendingDiscounts}
                        </span>
                    ) : null}
                </button>
            ))}
        </div>
    );
}

export function AlertsLoadingState() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007A5E]/20 border-t-[#007A5E]" />
        </div>
    );
}

export function AlertsTableSection({
    alerts,
    autoRunText,
    canManageDiscounts,
    isRefreshing,
    requestingDiscountId,
    onFocusDiscount,
    onRefresh,
    onRequestReview,
    onRecordWaste,
    onViewAlert,
}) {
    return (
        <Card className="card-premium overflow-hidden border-none p-0 shadow-premium">
            <CardHeader className="border-b border-[#0F172A]/5 p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <CardTitle className="text-xl font-black">Expiry Alerts</CardTitle>
                        <CardDescription className="space-y-1 font-bold">
                            <span className="block">
                                {alerts.length} batch action item{alerts.length !== 1 ? "s" : ""} from the latest AI expiry-risk predictions
                            </span>
                            <span className="block text-[11px] normal-case text-[#0F172A]/45">
                                Staff use this as the action queue. Admin/manager users approve discounts; POS applies approved FEFO discounts automatically.
                            </span>
                        </CardDescription>
                    </div>
                    {canManageDiscounts ? (
                        <Button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            variant="outline"
                            className="gap-2 rounded-2xl border-[#0F172A]/10 font-black text-xs uppercase tracking-widest"
                        >
                            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? "Running AI..." : "Run AI Refresh"}
                        </Button>
                    ) : (
                        <div className="rounded-2xl border border-[#007A5E]/15 bg-[#007A5E]/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#007A5E]">
                            Auto AI queue
                            <p className="mt-1 max-w-xs text-[10px] font-bold normal-case tracking-normal text-[#0F172A]/45">
                                {autoRunText || "Updated by the scheduled backend AI scan."}
                            </p>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#007A5E]/10">
                            <CheckCircle2 size={28} className="text-[#007A5E]" />
                        </div>
                        <p className="text-lg font-black text-[#0F172A]">No alerts right now</p>
                        <p className="mt-1 text-sm font-bold text-[#0F172A]/40">All stock batches are currently low risk in the latest AI scan.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-[#0F172A]/[0.02]">
                            <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                                {["Product", "Category", "Batch #", "Qty", "Expiry Date", "Days Left", "Risk", "Action"].map((header) => (
                                    <TableHead key={header} className="px-6 text-[10px] font-black uppercase tracking-widest">
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {alerts.map((alert, index) => {
                                    const config = RISK_CONFIG[alert.riskLevel] || RISK_CONFIG["Near Expiry"];
                                    const RiskIcon = config.icon;
                                    const canReviewDiscount =
                                        canManageDiscounts &&
                                        alert.discountId &&
                                        (alert.discountStatus === "PENDING" || alert.discountStatus === "ACTIVE");
                                    const canViewDiscount =
                                        alert.discountId &&
                                        (alert.discountStatus === "PENDING" || alert.discountStatus === "ACTIVE");
                                    const canRequestReview =
                                        alert.actionType === "PENDING_REVIEW" &&
                                        alert.discountId &&
                                        alert.discountStatus === "PENDING";
                                    const batchLabel = alert.batchNumber || `Batch #${alert.batchId}`;
                                    const reviewLabel = alert.discountStatus === "ACTIVE" ? "View discount" : "Review discount";
                                    const riskPercent = toPercent(alert.riskProbability);
                                    const sellThroughPercent = riskPercent != null ? Math.max(0, 100 - riskPercent) : null;

                                    return (
                                        <Motion.tr
                                            id={`expiry-alert-row-${alert.batchId}`}
                                            key={`${alert.batchId}-${index}`}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="border-[#0F172A]/5 transition-colors hover:bg-primary/[0.03]"
                                        >
                                            <TableCell className="px-6 text-sm font-black text-[#0F172A]">{alert.productName}</TableCell>
                                            <TableCell className="px-6">
                                                <Badge className="rounded-lg border-none bg-[#7C3AED]/10 px-2 text-[10px] font-black uppercase tracking-widest text-[#7C3AED]">
                                                    {alert.category || "--"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 text-xs font-bold text-[#0F172A]/60">
                                                {alert.batchNumber || `#${alert.batchId}`}
                                            </TableCell>
                                            <TableCell className="px-6 text-sm font-black text-[#0F172A]">{alert.quantity}</TableCell>
                                            <TableCell className="px-6 text-sm font-bold text-[#0F172A]">{alert.expiryDate}</TableCell>
                                            <TableCell className="px-6">
                                                <span className={`text-sm font-black ${config.iconCls}`}>{getDaysLeftLabel(alert.daysLeft)}</span>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <div className="space-y-1">
                                                    <Badge className={`flex w-fit items-center gap-1 rounded-lg border-none px-2 text-[10px] font-black uppercase tracking-widest ${config.badge}`}>
                                                        <RiskIcon size={10} /> {alert.riskLevel}
                                                    </Badge>
                                                    {riskPercent != null ? (
                                                        <p className="text-[10px] font-bold text-[#0F172A]/45">
                                                            AI risk {riskPercent}% · sell-through {sellThroughPercent}%
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-[#0F172A]/35">
                                                            Awaiting AI probability
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <div className="flex flex-col items-start gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onViewAlert(alert)}
                                                        className="h-8 rounded-xl border-[#0F172A]/10 bg-white font-black text-[10px] uppercase tracking-widest text-[#0F172A] hover:bg-[#0F172A]/5"
                                                    >
                                                        View AI
                                                    </Button>
                                                    {alert.actionType === "LOG_WASTE" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-xl border-red-200 bg-white font-black text-[10px] uppercase tracking-widest text-red-600 hover:bg-red-50"
                                                            onClick={() => onRecordWaste(alert)}
                                                        >
                                                            Log waste
                                                        </Button>
                                                    ) : canReviewDiscount ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => onFocusDiscount(alert.discountId)}
                                                            className="h-8 rounded-xl border-[#7C3AED]/20 bg-white font-black text-[10px] uppercase tracking-widest text-[#7C3AED] hover:bg-[#7C3AED]/10"
                                                        >
                                                            {reviewLabel}
                                                        </Button>
                                                    ) : !canManageDiscounts && canViewDiscount && alert.discountStatus === "ACTIVE" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => onFocusDiscount(alert.discountId)}
                                                            className="h-8 rounded-xl border-[#007A5E]/20 bg-white font-black text-[10px] uppercase tracking-widest text-[#007A5E] hover:bg-[#007A5E]/10"
                                                        >
                                                            View discount
                                                        </Button>
                                                    ) : alert.actionType === "PENDING_REVIEW" && alert.reviewRequested ? (
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]/55">Review requested</span>
                                                    ) : canRequestReview ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => onRequestReview(alert)}
                                                            disabled={requestingDiscountId === alert.discountId}
                                                            className="h-8 rounded-xl border-[#0F172A]/10 bg-white font-black text-[10px] uppercase tracking-widest text-[#0F172A] hover:bg-[#0F172A]/5 disabled:opacity-60"
                                                            title={`Request a manager-capable user to review ${batchLabel}`}
                                                        >
                                                            {requestingDiscountId === alert.discountId ? "Requesting..." : "Request review"}
                                                        </Button>
                                                    ) : alert.actionType === "PENDING_REVIEW" && alert.discountStatus === "REJECTED" ? (
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-red-500">Suggestion rejected</span>
                                                    ) : canManageDiscounts && alert.actionType === "PENDING_REVIEW" && alert.discountStatus === "INACTIVE" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={onRefresh}
                                                            disabled={isRefreshing}
                                                            className="h-8 rounded-xl border-[#007A5E]/20 bg-white font-black text-[10px] uppercase tracking-widest text-[#007A5E] hover:bg-[#007A5E]/10 disabled:opacity-60"
                                                        >
                                                            {isRefreshing ? "Running AI..." : "Run AI refresh"}
                                                        </Button>
                                                    ) : canManageDiscounts && alert.actionType === "PENDING_REVIEW" && !alert.discountId ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={onRefresh}
                                                            disabled={isRefreshing}
                                                            className="h-8 rounded-xl border-[#007A5E]/20 bg-white font-black text-[10px] uppercase tracking-widest text-[#007A5E] hover:bg-[#007A5E]/10 disabled:opacity-60"
                                                        >
                                                            {isRefreshing ? "Running AI..." : "Run AI refresh"}
                                                        </Button>
                                                    ) : !canManageDiscounts && alert.actionType === "PENDING_REVIEW" ? (
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]/55">Waiting for manager</span>
                                                    ) : alert.actionType === "PENDING_REVIEW" ? (
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]/55">Suggestion pending</span>
                                                    ) : alert.actionType === "DISCOUNT_ACTIVE" ? (
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-[#007A5E]">Discount active</span>
                                                    ) : (
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]/55">Monitor batch</span>
                                                    )}
                                                    {alert.actionType === "PENDING_REVIEW" && alert.reviewRequested ? (
                                                        <span className="text-[10px] font-bold text-[#0F172A]/45">
                                                            Requested by {alert.reviewRequestedBy || "staff"}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </Motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

function getAlertActionText(alert, canManageDiscounts) {
    if (!alert) return "";
    const rate = alert.finalRate ?? alert.suggestedRate;
    const rateText = rate != null ? `${rate}%` : "the approved";

    if (alert.actionType === "LOG_WASTE") {
        return "Expired stock remains in inventory. Staff should log the remaining quantity as waste.";
    }
    if (alert.actionType === "DISCOUNT_ACTIVE") {
        return `Approved discount is live. Staff should sell this FEFO batch first; POS will apply ${rateText} discount automatically.`;
    }
    if (alert.reviewRequested) {
        return "Manager review is already requested. Staff can continue monitoring while admin approves or rejects the discount.";
    }
    if (canManageDiscounts && alert.discountId) {
        return "Review the AI suggestion, then accept, override, or reject the discount.";
    }
    if (alert.discountId) {
        return "Staff should request manager review. Admin/manager decides whether the AI discount becomes active.";
    }
    return "No live discount action exists yet. Keep monitoring until the next AI scan updates the queue.";
}

export function AlertDetailDialog({
    alert,
    canManageDiscounts,
    requestingDiscountId,
    onClose,
    onFocusDiscount,
    onRecordWaste,
    onRequestReview,
}) {
    const riskPercent = toPercent(alert?.riskProbability);
    const sellThroughPercent = riskPercent != null ? Math.max(0, 100 - riskPercent) : null;
    const status = STATUS_CONFIG[alert?.discountStatus] || null;
    const canOpenDiscount = !!alert?.discountId && ["PENDING", "ACTIVE"].includes(alert.discountStatus);
    const canRequestReview =
        !canManageDiscounts &&
        alert?.actionType === "PENDING_REVIEW" &&
        alert?.discountId &&
        alert?.discountStatus === "PENDING" &&
        !alert?.reviewRequested;
    const isRequesting = alert?.discountId && requestingDiscountId === alert.discountId;
    const rate = alert?.finalRate ?? alert?.suggestedRate;

    return (
        <Dialog open={!!alert} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-lg rounded-3xl border-[#0F172A]/10 bg-white p-0 shadow-2xl">
                <DialogHeader className="border-b border-[#0F172A]/5 p-6">
                    <DialogTitle className="text-xl font-black text-[#0F172A]">AI Expiry Action</DialogTitle>
                    <DialogDescription className="font-bold text-[#0F172A]/55">
                        Staff-safe view of the saved ML prediction and the business action for this batch.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 p-6">
                    <div className="rounded-3xl border border-[#0F172A]/5 bg-[#0F172A]/[0.02] p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-lg font-black text-[#0F172A]">{alert?.productName || "Selected batch"}</p>
                                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#0F172A]/40">
                                    {alert?.category || "General"} / {alert?.batchNumber || (alert ? `Batch #${alert.batchId}` : "Batch")}
                                </p>
                            </div>
                            <Badge className="rounded-xl border-none bg-[#7C3AED]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#7C3AED]">
                                {alert?.riskLevel || "AI scanned"}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Expiry Risk</p>
                            <p className="mt-2 text-3xl font-black text-red-600">{riskPercent != null ? `${riskPercent}%` : "--"}</p>
                        </div>
                        <div className="rounded-2xl border border-[#007A5E]/10 bg-[#007A5E]/5 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#007A5E]">Sell-through Before Expiry</p>
                            <p className="mt-2 text-3xl font-black text-[#007A5E]">{sellThroughPercent != null ? `${sellThroughPercent}%` : "--"}</p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-[#0F172A]/5 bg-white p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Days Left</p>
                            <p className="mt-2 text-lg font-black text-[#0F172A]">{getDaysLeftLabel(alert?.daysLeft)}</p>
                        </div>
                        <div className="rounded-2xl border border-[#0F172A]/5 bg-white p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Quantity</p>
                            <p className="mt-2 text-lg font-black text-[#0F172A]">{alert?.quantity ?? "--"}</p>
                        </div>
                        <div className="rounded-2xl border border-[#0F172A]/5 bg-white p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">Risk Value</p>
                            <p className="mt-2 text-lg font-black text-[#0F172A]">Rs {formatImpactScore(alert?.impactScore)}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#0F172A]/5 bg-[#F9F5EC] p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">What staff should do</p>
                        <p className="mt-2 text-sm font-black leading-relaxed text-[#0F172A]">
                            {getAlertActionText(alert, canManageDiscounts)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#0F172A]/50">
                        {rate != null ? <Badge className="rounded-lg border-none bg-[#9D1967]/10 px-2 text-[10px] font-black uppercase tracking-widest text-[#9D1967]">{rate}% suggested</Badge> : null}
                        {status ? <Badge className={`rounded-lg border-none px-2 text-[10px] font-black uppercase tracking-widest ${status.badge}`}>{status.label}</Badge> : null}
                        {alert?.reviewRequested ? <span>Review requested by {alert.reviewRequestedBy || "staff"}</span> : null}
                    </div>
                </div>

                <DialogFooter className="gap-2 border-t border-[#0F172A]/5 px-6 py-4">
                    <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl font-black">
                        Close
                    </Button>
                    {alert?.actionType === "LOG_WASTE" ? (
                        <Button type="button" onClick={() => onRecordWaste(alert)} className="rounded-2xl bg-red-500 px-5 font-black text-white hover:bg-red-600">
                            Log waste
                        </Button>
                    ) : null}
                    {canRequestReview ? (
                        <Button
                            type="button"
                            disabled={isRequesting}
                            onClick={() => onRequestReview(alert)}
                            className="rounded-2xl bg-[#007A5E] px-5 font-black text-white hover:bg-[#006B52]"
                        >
                            {isRequesting ? "Requesting..." : "Request manager review"}
                        </Button>
                    ) : null}
                    {canOpenDiscount ? (
                        <Button type="button" variant="outline" onClick={() => onFocusDiscount(alert.discountId)} className="rounded-2xl font-black">
                            {canManageDiscounts ? "Review discount" : "View discount"}
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function DiscountsTableSection({
    canManageDiscounts,
    filteredDiscounts,
    isGenerating,
    sortCol,
    sortDir,
    statusFilter,
    autoRunText,
    onAccept,
    onDelete,
    onGenerate,
    onOverride,
    onReject,
    onSort,
    onStatusFilterChange,
}) {
    return (
        <Card className="card-premium overflow-hidden border-none p-0 shadow-premium">
            <CardHeader className="border-b border-[#0F172A]/5 p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <CardTitle className="text-xl font-black">Discount Suggestions</CardTitle>
                        <CardDescription className="space-y-1 font-bold">
                            <span>
                                {filteredDiscounts.length} suggestion{filteredDiscounts.length !== 1 ? "s" : ""}
                                {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
                            </span>
                            <span className="block text-[11px] font-bold normal-case text-[#0F172A]/45">
                                Approved discounts go live only for the FEFO batch they belong to, so POS applies the markdown automatically when that batch is sold.
                            </span>
                            <span className="block text-[11px] font-bold normal-case text-[#007A5E]/70">
                                {autoRunText}
                            </span>
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={statusFilter}
                            onChange={(event) => onStatusFilterChange(event.target.value)}
                            className="h-10 rounded-2xl border border-[#0F172A]/10 bg-white px-3 text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20"
                        >
                            <option value="all">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                        {canManageDiscounts ? (
                            <Button
                                onClick={onGenerate}
                                disabled={isGenerating}
                                className="gap-2 rounded-2xl bg-[#007A5E] px-5 py-5 text-sm font-black text-white shadow-lg shadow-[#007A5E]/20 transition-all hover:scale-105"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Refreshing...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={15} /> Refresh Now
                                    </>
                                )}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {filteredDiscounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#007A5E]/10">
                            <Tag size={28} className="text-[#007A5E]" />
                        </div>
                        <p className="text-lg font-black text-[#0F172A]">No discount suggestions</p>
                        <p className="mt-1 text-sm font-bold text-[#0F172A]/40">
                            {canManageDiscounts ? "The backend will create suggestions automatically when a batch qualifies." : "No discount suggestions at this time."}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-[#0F172A]/[0.02]">
                            <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                                {[
                                    { col: "productName", label: "Product" },
                                    { col: "daysLeft", label: "Days Left" },
                                    { col: "batchQty", label: "Batch Qty" },
                                    { col: "suggestedRate", label: "Suggested %" },
                                    { col: "finalRate", label: "Final %" },
                                    { col: "status", label: "Status" },
                                ].map(({ col, label }) => (
                                    <TableHead
                                        key={col}
                                        className="cursor-pointer select-none px-6 text-[10px] font-black uppercase tracking-widest"
                                        onClick={() => onSort(col)}
                                    >
                                        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                                    </TableHead>
                                ))}
                                {canManageDiscounts ? (
                                    <TableHead className="px-6 text-right text-[10px] font-black uppercase tracking-widest">
                                        Actions
                                    </TableHead>
                                ) : null}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {filteredDiscounts.map((discount, index) => {
                                    const status = STATUS_CONFIG[discount.status] || STATUS_CONFIG.PENDING;
                                    const daysLeft = discount.daysLeft;
                                    const daysColor = getDaysLeftColor(daysLeft);

                                    return (
                                        <Motion.tr
                                            id={`discount-row-${discount.id}`}
                                            key={discount.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ delay: index * 0.025 }}
                                            className="border-[#0F172A]/5 transition-colors hover:bg-primary/[0.03]"
                                        >
                                            <TableCell className="px-6">
                                                <p className="text-sm font-black text-[#0F172A]">{discount.product?.name}</p>
                                                <p className="text-[10px] font-bold text-[#0F172A]/40">
                                                    {discount.batch?.batchNumber || `Batch #${discount.batch?.id}`}
                                                </p>
                                                {toPercent(discount.batch?.lastRiskProbability) != null ? (
                                                    <p className="text-[10px] font-bold text-[#007A5E]/70">
                                                        Latest AI: {discount.batch?.lastRiskLabel || "Scanned"} · {toPercent(discount.batch?.lastRiskProbability)}% risk
                                                    </p>
                                                ) : null}
                                                {discount.reviewRequestedAt ? (
                                                    <p className="text-[10px] font-bold text-[#7C3AED]">
                                                        Review requested by {discount.reviewRequestedBy || "staff"}
                                                    </p>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <span className={`text-sm font-black ${daysColor}`}>{getDaysLeftLabel(daysLeft)}</span>
                                            </TableCell>
                                            <TableCell className="px-6 text-sm font-black text-[#0F172A]">
                                                {discount.batch?.quantity ?? "--"}
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <span className="text-sm font-black text-[#9D1967]">{discount.suggestedRate}%</span>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <span className="text-sm font-black text-[#007A5E]">
                                                    {discount.finalRate != null ? `${discount.finalRate}%` : "--"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <Badge className={`rounded-lg border-none px-2 text-[10px] font-black uppercase tracking-widest ${status.badge}`}>
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            {canManageDiscounts ? (
                                                <TableCell className="px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {discount.status === "PENDING" ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => onAccept(discount)}
                                                                    className="h-7 rounded-xl bg-[#007A5E]/10 px-2 text-[10px] font-black uppercase tracking-widest text-[#007A5E] transition-all hover:bg-[#007A5E] hover:text-white"
                                                                >
                                                                    Accept
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => onOverride(discount)}
                                                                    className="h-7 rounded-xl bg-[#7C3AED]/10 px-2 text-[10px] font-black uppercase tracking-widest text-[#7C3AED] transition-all hover:bg-[#7C3AED] hover:text-white"
                                                                >
                                                                    Override
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => onReject(discount)}
                                                                    className="h-7 rounded-xl bg-red-50 px-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        ) : null}
                                                        {discount.status === "ACTIVE" ? (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => onOverride(discount)}
                                                                className="h-8 w-8 rounded-xl p-0 transition-colors hover:bg-[#7C3AED]/10 hover:text-[#7C3AED]"
                                                            >
                                                                <Edit2 size={13} />
                                                            </Button>
                                                        ) : null}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => onDelete(discount)}
                                                            className="h-8 w-8 rounded-xl p-0 transition-colors hover:bg-red-100 hover:text-red-600"
                                                        >
                                                            <Trash2 size={13} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            ) : null}
                                        </Motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export function OverrideDiscountDialog({
    error,
    isOpen,
    isSaving,
    overrideRate,
    target,
    onClose,
    onOverrideRateChange,
    onSubmit,
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm rounded-3xl border-[#0F172A]/10 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-[#0F172A]">Override Discount Rate</DialogTitle>
                    <DialogDescription className="font-bold text-[#0F172A]/50">
                        Set a custom discount rate for <span className="text-[#0F172A]">{target?.product?.name}</span>.
                        Suggested: <span className="font-black text-[#9D1967]">{target?.suggestedRate}%</span>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="mt-2 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="override-rate" className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
                            Final Discount Rate (%)<span className="ml-0.5 text-red-500">*</span>
                        </Label>
                        <Input
                            id="override-rate"
                            type="number"
                            min="1"
                            max="100"
                            step="0.5"
                            value={overrideRate}
                            onChange={(event) => onOverrideRateChange(event.target.value)}
                            className="rounded-2xl border-[#0F172A]/10 font-bold focus:ring-[#007A5E]/20"
                        />
                    </div>
                    {error ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                            <AlertTriangle size={15} /> {error}
                        </div>
                    ) : null}
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => onClose(false)} className="rounded-2xl font-black">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-2xl bg-[#7C3AED] px-6 font-black text-white transition-all hover:bg-[#6d28d9]"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Saving...
                                </span>
                            ) : "Apply Rate"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function WasteLogDialog({
    error,
    isOpen,
    notes,
    quantity,
    reason,
    saving,
    target,
    onClose,
    onNotesChange,
    onQuantityChange,
    onReasonChange,
    onSubmit,
}) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md rounded-3xl border-[#0F172A]/10 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-[#0F172A]">Log Waste</DialogTitle>
                    <DialogDescription className="font-bold text-[#0F172A]/55">
                        Record expired or unsellable stock for <span className="text-[#0F172A]">{target?.productName}</span>{" "}
                        {target?.batchNumber || (target ? `Batch #${target.batchId}` : "")}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="mt-2 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="waste-qty" className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
                            Quantity
                        </Label>
                        <Input
                            id="waste-qty"
                            type="number"
                            min="1"
                            max={target?.quantity ?? undefined}
                            value={quantity}
                            onChange={(event) => onQuantityChange(event.target.value)}
                            className="rounded-2xl border-[#0F172A]/10 font-bold focus:ring-[#007A5E]/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="waste-reason" className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
                            Reason
                        </Label>
                        <select
                            id="waste-reason"
                            value={reason}
                            onChange={(event) => onReasonChange(event.target.value)}
                            className="h-11 w-full rounded-2xl border border-[#0F172A]/10 bg-white px-3 text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20"
                        >
                            <option value="EXPIRED_DISPOSAL">Expired disposal</option>
                            <option value="SPOILAGE">Spoilage</option>
                            <option value="DAMAGE">Damage</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="waste-notes" className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
                            Notes
                        </Label>
                        <Input
                            id="waste-notes"
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder="Optional note"
                            className="rounded-2xl border-[#0F172A]/10 font-bold focus:ring-[#007A5E]/20"
                        />
                    </div>
                    {error ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                            <AlertTriangle size={15} /> {error}
                        </div>
                    ) : null}
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl font-black">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-red-500 px-6 font-black text-white transition-all hover:bg-red-600"
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Saving...
                                </span>
                            ) : "Record waste"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function DeleteSuggestionDialog({ isDeleting, target, onCancel, onConfirm }) {
    return (
        <Dialog open={!!target} onOpenChange={(open) => { if (!open) onCancel(); }}>
            <DialogContent className="sm:max-w-sm rounded-3xl border-[#0F172A]/10 shadow-2xl">
                <DialogHeader>
                    <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100">
                            <Trash2 size={18} className="text-red-600" />
                        </div>
                        <DialogTitle className="text-lg font-black text-[#0F172A]">Remove Suggestion</DialogTitle>
                    </div>
                    <DialogDescription className="leading-relaxed font-bold text-[#0F172A]/60">
                        Remove the discount suggestion for <span className="font-black text-[#0F172A]">"{target?.product?.name}"</span>?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2">
                    <Button variant="ghost" onClick={onCancel} className="rounded-2xl font-black">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={isDeleting} className="rounded-2xl bg-red-500 px-6 font-black text-white transition-all hover:bg-red-600">
                        {isDeleting ? (
                            <span className="flex items-center gap-2">
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Removing...
                            </span>
                        ) : "Remove"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
