import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Brain, AlertTriangle, RotateCcw, Loader2, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { getRiskSummary, predictAllBatches } from "@/lib/api";

const STAT_CONFIG = [
    {
        key: "highRisk",
        label: "High Risk",
        icon: ShieldAlert,
        bg: "bg-red-500/10",
        text: "text-red-500",
        border: "border-red-200",
        bar: "bg-red-500",
    },
    {
        key: "warning",
        label: "Warning",
        icon: AlertTriangle,
        bg: "bg-orange-500/10",
        text: "text-orange-500",
        border: "border-orange-200",
        bar: "bg-orange-400",
    },
    {
        key: "lowRisk",
        label: "Low Risk",
        icon: CheckCircle2,
        bg: "bg-emerald-500/10",
        text: "text-emerald-600",
        border: "border-emerald-200",
        bar: "bg-emerald-500",
    },
];

function formatRelativeTime(isoString) {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function formatInterval(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value <= 0) return "the schedule";
    const mins = Math.max(1, Math.round(value / 60000));
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round((mins / 60) * 10) / 10;
    return `${hrs}h`;
}

export default function RiskSummaryWidget() {
    const [summary, setSummary]     = useState(null);
    const [loading, setLoading]     = useState(true);
    const [scanning, setScanning]   = useState(false);
    const [error, setError]         = useState("");
    const [scanDone, setScanDone]   = useState(false);

    const loadSummary = useCallback(async () => {
        setError("");
        try {
            const data = await getRiskSummary();
            setSummary(data);
        } catch (err) {
            setError(err.message || "Could not load risk summary.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSummary(); }, [loadSummary]);

    const handleRescan = async () => {
        setScanning(true);
        setScanDone(false);
        setError("");
        try {
            await predictAllBatches();
            await loadSummary();
            setScanDone(true);
            setTimeout(() => setScanDone(false), 3000);
        } catch {
            setError("Scan failed — make sure the ML server is running.");
        } finally {
            setScanning(false);
        }
    };

    const total = summary
        ? (summary.highRisk ?? 0) + (summary.warning ?? 0) + (summary.lowRisk ?? 0)
        : 0;
    const autoScanText = summary?.autoScanEnabled
        ? `Auto every ${formatInterval(summary.autoScanIntervalMs)}`
        : "Auto scan off";

    return (
        <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="card-premium p-0 overflow-hidden border-none shadow-premium"
        >
            {/* Header */}
            <div className="p-6 border-b border-[#0F172A]/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center">
                        <Brain size={20} className="text-[#7C3AED]" />
                    </div>
                    <div>
                        <h3 className="font-black text-[#0F172A] text-base leading-tight">
                            AI Expiry Risk Overview
                        </h3>
                        <p className="text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-widest mt-0.5">
                            Last scan:{" "}
                            {loading ? "--" :
                             summary?.lastRunAt
                                ? formatRelativeTime(summary.lastRunAt)
                                : "Never - waiting for auto scan"}
                            {!loading ? <span className="ml-2 text-[#007A5E]">{autoScanText}</span> : null}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleRescan}
                    disabled={scanning}
                    title="Run AI scan on all batches now"
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                        ${scanDone
                            ? "bg-emerald-500 text-white"
                            : scanning
                            ? "bg-[#7C3AED]/10 text-[#7C3AED]/60 cursor-not-allowed"
                            : "bg-[#7C3AED]/10 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"}`}
                >
                    {scanning ? (
                        <><Loader2 size={13} className="animate-spin" /> Scanning...</>
                    ) : scanDone ? (
                        <><CheckCircle2 size={13} /> Done</>
                    ) : (
                        <><RotateCcw size={13} /> Run Now</>
                    )}
                </button>
            </div>

            {/* Body */}
            <div className="p-6">
                <AnimatePresence mode="wait">
                    {error && (
                        <Motion.div
                            key="err"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-4"
                        >
                            <AlertTriangle size={13} /> {error}
                        </Motion.div>
                    )}
                </AnimatePresence>

                {loading ? (
                    <div className="flex items-center justify-center py-8 gap-3 text-[#0F172A]/30">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Loading…</span>
                    </div>
                ) : summary && total === 0 && !summary.unscanned ? (
                    /* No batches at all */
                    <p className="text-center text-sm font-bold text-[#0F172A]/40 py-6">
                        No active stock batches found.
                    </p>
                ) : summary?.lastRunAt == null ? (
                    /* Has batches but never scanned */
                    <div className="text-center py-6 space-y-2">
                        <Brain size={28} className="mx-auto text-[#7C3AED]/30" />
                        <p className="text-sm font-black text-[#0F172A]/50">No predictions yet</p>
                        <p className="text-xs font-bold text-[#0F172A]/30">
                            The backend runs this automatically. Use <span className="text-[#7C3AED]">Run Now</span> to refresh immediately.
                        </p>
                    </div>
                ) : (
                    /* Stats grid */
                    <div className="grid grid-cols-3 gap-4">
                        {STAT_CONFIG.map(({ key, label, icon: IconComponent, bg, text, border, bar }) => {
                            const count = summary?.[key] ?? 0;
                            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                            const iconSize = IconComponent ? 16 : 16;
                            return (
                                <Motion.div
                                    key={key}
                                    initial={{ opacity: 0, scale: 0.92 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className={`rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-2`}
                                >
                                    <div className="flex items-center justify-between">
                                        <IconComponent size={iconSize} className={text} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${text}`}>
                                            {label}
                                        </span>
                                    </div>
                                    <p className={`text-3xl font-black ${text}`}>{count}</p>
                                    {/* Mini bar */}
                                    <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                        <Motion.div
                                            className={`h-full rounded-full ${bar}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.7, ease: "easeOut" }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-[#0F172A]/40">{pct}% of scanned</p>
                                </Motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Unscanned note */}
                {!loading && summary?.unscanned > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-widest">
                        <Clock size={11} />
                        {summary.unscanned} batch{summary.unscanned !== 1 ? "es" : ""} not yet scanned - waiting for auto scan, or click Run Now
                    </div>
                )}
            </div>
        </Motion.div>
    );
}
