import { useState, useEffect } from "react";
import { ArrowLeft, Search, TrendingUp, ShoppingBag, Receipt, Users, Clock, Edit2, X } from "lucide-react";
import { getSalesHistory } from "@/lib/salesApi";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtShort = (n) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(Math.round(n));

function last7Days() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
    });
}

function dayLabel(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDateTime(dt) {
    if (!dt) return "—";
    try {
        return new Date(dt).toLocaleString("en-PK", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch { return dt; }
}

function computeStats(username, sales) {
    const staffSales = sales.filter(s => s.recordedBy === username);
    const activeSales = staffSales.filter(s => s.status === "ACTIVE");

    const billMap = new Map();
    staffSales.forEach(s => {
        const key = s.saleGroupId ?? String(s.id);
        if (!billMap.has(key)) billMap.set(key, []);
        billMap.get(key).push(s);
    });

    const allBills = Array.from(billMap.values());
    const activeBills = allBills.filter(lines => lines.some(l => l.status === "ACTIVE"));
    const directVoidedBills = allBills.filter(lines =>
        lines.every(l => l.status === "VOID") &&
        lines.some(l => l.voidedBy && !(l.voidReason || "").startsWith("Bill replaced"))
    );

    const totalRevenue = activeSales.reduce((s, l) => s + (l.lineTotal ?? 0), 0);
    const totalItemsSold = activeSales.reduce((s, l) => s + (l.quantitySold ?? 0), 0);
    const avgBillValue = activeBills.length > 0 ? totalRevenue / activeBills.length : 0;

    const sortedActive = [...activeSales].sort((a, b) => b.id - a.id);
    const lastSaleDate = sortedActive[0]?.saleDate ?? null;

    const editsMade = sales.filter(s => s.lastEditedBy === username && s.recordedBy !== username).length;
    const selfEdits = sales.filter(s => s.lastEditedBy === username && s.recordedBy === username).length;

    const productMap = {};
    activeSales.forEach(s => {
        const name = s.productName || "Unknown";
        productMap[name] = (productMap[name] || 0) + s.quantitySold;
    });
    const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const days = last7Days();
    const dailyActivity = days.map(date => {
        const dayBills = activeBills.filter(lines => lines.some(l => l.saleDate === date));
        const dayRevenue = dayBills.reduce((s, lines) =>
            s + lines.filter(l => l.status === "ACTIVE").reduce((a, l) => a + (l.lineTotal ?? 0), 0), 0
        );
        return { date, billCount: dayBills.length, revenue: dayRevenue };
    });

    const recentBills = activeBills
        .sort((a, b) => {
            const dA = new Date(a.find(l => l.status === "ACTIVE")?.saleDate || 0);
            const dB = new Date(b.find(l => l.status === "ACTIVE")?.saleDate || 0);
            return dB - dA || (b[0]?.id ?? 0) - (a[0]?.id ?? 0);
        })
        .slice(0, 10)
        .map(lines => {
            const active = lines.filter(l => l.status === "ACTIVE");
            return {
                billId: lines[0]?.saleGroupId ?? String(lines[0]?.id),
                date: active[0]?.saleDate ?? "—",
                products: active.map(l => l.productName),
                total: active.reduce((s, l) => s + (l.lineTotal ?? 0), 0),
                qty: active.reduce((s, l) => s + (l.quantitySold ?? 0), 0),
                edited: !!active[0]?.lastEditedBy,
                editedBy: active[0]?.lastEditedBy,
                customerName: active[0]?.customerName,
            };
        });

    const voidRate = allBills.length > 0 ? (directVoidedBills.length / allBills.length) * 100 : 0;

    return { totalBills: activeBills.length, totalRevenue, totalItemsSold, avgBillValue,
        voidedBills: directVoidedBills.length, voidRate, lastSaleDate, editsMade, selfEdits,
        topProducts, dailyActivity, recentBills };
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function ActivityBar({ dailyActivity, accent = "#007A5E", height = 56 }) {
    const max = Math.max(...dailyActivity.map(d => d.billCount), 1);
    return (
        <div className="flex items-end gap-1.5" style={{ height: height + 16 }}>
            {dailyActivity.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t transition-all"
                        style={{
                            height: `${Math.max((d.billCount / max) * height, d.billCount > 0 ? 6 : 2)}px`,
                            background: d.billCount > 0 ? accent : "#e5e7eb",
                            opacity: d.billCount > 0 ? 1 : 0.35,
                        }}
                    />
                    <span className="text-[9px] font-bold text-gray-400">{dayLabel(d.date)}</span>
                </div>
            ))}
        </div>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: IconComponent, label, value, sub, color = "text-[#007A5E]", bg = "bg-[#007A5E]/10" }) {
    const iconSize = IconComponent ? 20 : 20;
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <IconComponent size={iconSize} className={color} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-2xl font-black text-[#0F172A] leading-tight">{value}</p>
                {sub && <p className="text-[11px] font-bold text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Bill detail modal ─────────────────────────────────────────────────────────

function BillDetailModal({ billId, allSales, onClose }) {
    const billLines = allSales.filter(s => (s.saleGroupId ?? String(s.id)) === billId);
    const activeLines = billLines.filter(s => s.status !== "VOID");
    const currentLines = activeLines.length > 0 ? activeLines : billLines;
    const billTotal = currentLines.reduce((s, l) => s + (l.lineTotal ?? 0), 0);

    // Edit history: voided lines caused by replacements
    const replacedVoids = billLines.filter(l =>
        l.status === "VOID" && (l.voidReason || "").startsWith("Bill replaced")
    );
    const editEventMap = new Map();
    replacedVoids.forEach(l => {
        const key = `${l.voidedBy}||${l.voidReason}||${(l.voidedAt || "").substring(0, 16)}`;
        if (!editEventMap.has(key)) editEventMap.set(key, []);
        editEventMap.get(key).push(l);
    });
    const editEvents = Array.from(editEventMap.entries())
        .map(([, evLines]) => ({
            editedBy: evLines[0].voidedBy,
            editedAt: evLines[0].voidedAt,
            reason: (evLines[0].voidReason || "").replace("Bill replaced - ", "").replace("Bill replaced", "").trim(),
            prevLines: evLines,
        }))
        .sort((a, b) => new Date(b.editedAt) - new Date(a.editedAt));

    const directVoidLine = billLines.find(l =>
        l.status === "VOID" && l.voidedBy && !(l.voidReason || "").startsWith("Bill replaced")
    );

    const rep = currentLines[0];

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="bg-white text-slate-900 p-0 max-w-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#007A5E] to-[#0F172A] p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Invigo FreshGuard</p>
                            <h2 className="text-2xl font-black tracking-tight">INVOICE</h2>
                            <p className="text-sm font-bold opacity-70 mt-1">{billId}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Date</p>
                            <p className="text-sm font-bold">{rep?.saleDate || "—"}</p>
                            {rep?.customerName && (
                                <div className="mt-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Customer</p>
                                    <p className="text-sm font-bold">{rep.customerName}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
                    {/* Current line items */}
                    <div className="rounded-2xl border border-gray-200/60 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow className="border-gray-200/60">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-4 py-3">Product</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-center">Qty</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-right">Unit Price</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-right px-4">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentLines.map(line => (
                                    <TableRow key={line.id} className="border-gray-200/40">
                                        <TableCell className="px-4 py-3">
                                            <p className="font-black text-sm text-[#0F172A]">{line.productName}</p>
                                            {line.discountRate > 0 && (
                                                <span className="text-[10px] font-black text-[#007A5E] bg-[#007A5E]/10 px-2 py-0.5 rounded-full">
                                                    -{line.discountRate}% OFF
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-sm py-3">{line.quantitySold}</TableCell>
                                        <TableCell className="text-right font-bold text-sm py-3">Rs {(line.unitPrice ?? 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-black text-sm py-3 px-4">Rs {(line.lineTotal ?? 0).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Grand total */}
                    <div className="flex items-center justify-between px-1 pt-1 border-t-2 border-[#007A5E]">
                        <span className="font-black text-base text-[#0F172A]">Grand Total</span>
                        <span className="font-black text-2xl text-[#007A5E]">Rs {fmt(billTotal)}</span>
                    </div>

                    {rep?.notes && (
                        <p className="text-[11px] font-bold text-gray-400">Notes: {rep.notes}</p>
                    )}

                    {/* Bill info */}
                    <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1.5 border border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Bill Info</p>
                        <div className="flex justify-between text-[11px] font-bold text-gray-600">
                            <span>Created by <span className="font-black text-[#007A5E]">{rep?.recordedBy || "—"}</span></span>
                            <span className="text-gray-400">{rep?.saleDate || "—"}</span>
                        </div>
                        {rep?.lastEditedBy && (
                            <div className="flex justify-between text-[11px] font-bold text-gray-600">
                                <span>Last edited by <span className="font-black text-[#7C3AED]">{rep.lastEditedBy}</span>
                                    {rep.editReason ? <span className="font-normal text-gray-400"> — {rep.editReason}</span> : ""}
                                </span>
                                <span className="text-gray-400">{formatDateTime(rep.editedAt)}</span>
                            </div>
                        )}
                        {directVoidLine && (
                            <div className="flex justify-between text-[11px] font-bold text-red-500">
                                <span>Voided by <span className="font-black">{directVoidLine.voidedBy}</span>
                                    {directVoidLine.voidReason ? ` — ${directVoidLine.voidReason}` : ""}
                                </span>
                                <span className="text-gray-400">{formatDateTime(directVoidLine.voidedAt)}</span>
                            </div>
                        )}
                    </div>

                    {/* Edit history */}
                    {editEvents.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Edit History</p>
                            {editEvents.map((event, i) => (
                                <div key={i} className="rounded-xl border border-gray-200/60 bg-white overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-[#7C3AED]/5 border-b border-[#7C3AED]/10">
                                        <span className="text-[11px] font-black text-[#7C3AED]">Edited by {event.editedBy}</span>
                                        <span className="text-[10px] text-gray-400">{formatDateTime(event.editedAt)}</span>
                                    </div>
                                    {event.reason && (
                                        <p className="px-4 py-1.5 text-[10px] font-bold text-gray-500 border-b border-gray-100">
                                            Reason: <span className="text-gray-700">{event.reason}</span>
                                        </p>
                                    )}
                                    <div className="px-4 py-2 space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Previous items</p>
                                        {event.prevLines.map(pl => (
                                            <div key={pl.id} className="flex justify-between text-[11px] font-bold text-gray-500">
                                                <span>{pl.productName} × {pl.quantitySold}</span>
                                                <span>Rs {(pl.lineTotal ?? 0).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-2">
                        <Button variant="ghost" onClick={onClose}
                            className="w-full py-5 rounded-2xl text-gray-400 hover:bg-black/5 font-black text-sm">
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Detail view for one staff member ─────────────────────────────────────────

function StaffDetail({ user, stats, allSales, onBack }) {
    const [viewBillId, setViewBillId] = useState(null);
    const maxBar = Math.max(...stats.topProducts.map(p => p[1]), 1);

    return (
        <div className="space-y-6">
            {/* Back + header */}
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={onBack}
                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-[#0F172A] transition-colors">
                    <ArrowLeft size={14} /> All Staff
                </button>
                <div className="h-4 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#0F172A]/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-black text-[#0F172A]">
                            {(user.name || user.username || "?").charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <span className="text-lg font-black text-[#0F172A]">{user.name || user.username}</span>
                        <span className="ml-2 text-[11px] font-bold text-gray-400">@{user.username}</span>
                    </div>
                </div>
                <Badge className="rounded-lg px-2 text-[10px] font-black uppercase bg-[#7C3AED]/10 text-[#7C3AED] border-none">
                    {user.roleName || user.role}
                </Badge>
                {stats.lastSaleDate && (
                    <span className="ml-auto text-[11px] font-bold text-gray-400 flex items-center gap-1">
                        <Clock size={11} /> Last active {stats.lastSaleDate}
                    </span>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Receipt} label="Bills Sold" value={stats.totalBills}
                    sub={`${stats.voidedBills} voided`}
                    color={stats.voidedBills === 0 ? "text-[#007A5E]" : "text-amber-500"}
                    bg={stats.voidedBills === 0 ? "bg-[#007A5E]/10" : "bg-amber-50"} />
                <StatCard icon={TrendingUp} label="Total Revenue" value={`Rs ${fmtShort(stats.totalRevenue)}`}
                    sub={`Rs ${fmt(stats.totalRevenue)}`}
                    color="text-[#007A5E]" bg="bg-[#007A5E]/10" />
                <StatCard icon={ShoppingBag} label="Items Sold" value={stats.totalItemsSold}
                    sub={`Avg bill Rs ${fmt(stats.avgBillValue)}`}
                    color="text-[#7C3AED]" bg="bg-[#7C3AED]/10" />
                <StatCard icon={Edit2} label="Void Rate" value={`${stats.voidRate.toFixed(1)}%`}
                    sub={`${stats.editsMade} cross-bill edits`}
                    color={stats.voidRate === 0 ? "text-[#007A5E]" : stats.voidRate < 10 ? "text-amber-500" : "text-red-500"}
                    bg={stats.voidRate === 0 ? "bg-[#007A5E]/10" : stats.voidRate < 10 ? "bg-amber-50" : "bg-red-50"} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 7-day activity */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Last 7 Days — Bills</p>
                    <ActivityBar dailyActivity={stats.dailyActivity} height={64} />
                    <div className="flex justify-between mt-1">
                        {stats.dailyActivity.map((d, i) => (
                            <div key={i} className="flex-1 text-center">
                                <p className="text-[10px] font-black text-[#0F172A]">{d.billCount > 0 ? d.billCount : ""}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top products */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Top Products by Qty</p>
                    {stats.topProducts.length === 0 ? (
                        <p className="text-sm font-bold text-gray-400">No sales data yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.topProducts.map(([name, qty], i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[11px] font-bold text-[#0F172A] mb-1">
                                        <span className="truncate pr-2">{name}</span>
                                        <span className="flex-shrink-0 font-black">{qty} units</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div className="h-full rounded-full bg-[#007A5E] transition-all"
                                            style={{ width: `${(qty / maxBar) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent bills */}
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Bills (last 10)</p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">Click any bill to view full details</p>
                </div>
                {stats.recentBills.length === 0 ? (
                    <p className="px-6 py-8 text-sm font-bold text-gray-400">No active bills found.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/60">
                            <tr>
                                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Bill</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Products</th>
                                <th className="text-center py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Qty</th>
                                <th className="text-right py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Total</th>
                                <th className="text-right px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentBills.map((bill, i) => (
                                <tr key={i}
                                    onClick={() => setViewBillId(bill.billId)}
                                    className="border-t border-gray-100 hover:bg-[#007A5E]/5 cursor-pointer transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-[12px] text-[#007A5E] underline underline-offset-2">{bill.billId}</p>
                                        {bill.edited && (
                                            <p className="text-[10px] font-bold text-[#7C3AED]">edited by {bill.editedBy}</p>
                                        )}
                                        {bill.customerName && (
                                            <p className="text-[10px] font-bold text-gray-400">{bill.customerName}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 max-w-[180px]">
                                        <p className="text-[11px] font-bold text-gray-600 truncate">{bill.products.join(", ")}</p>
                                    </td>
                                    <td className="text-center py-4 font-black text-sm text-[#0F172A]">{bill.qty}</td>
                                    <td className="text-right py-4 font-black text-sm text-[#007A5E]">Rs {fmt(bill.total)}</td>
                                    <td className="text-right px-6 py-4 font-bold text-[11px] text-gray-400">{bill.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Bill detail modal */}
            {viewBillId && (
                <BillDetailModal
                    billId={viewBillId}
                    allSales={allSales}
                    onClose={() => setViewBillId(null)}
                />
            )}
        </div>
    );
}

// ── Staff card (list view) ────────────────────────────────────────────────────

function StaffCard({ user, stats, onClick }) {
    const voidBadgeColor = stats.voidRate === 0
        ? "bg-[#007A5E]/10 text-[#007A5E]"
        : stats.voidRate < 10 ? "bg-amber-50 text-amber-600"
        : "bg-red-50 text-red-500";

    const roleBadgeColor = stats.totalRevenue === 0
        ? "bg-gray-100 text-gray-400"
        : stats.totalRevenue > 50000 ? "bg-[#007A5E]/10 text-[#007A5E]"
        : "bg-[#7C3AED]/10 text-[#7C3AED]";

    return (
        <button onClick={onClick}
            className="w-full text-left rounded-2xl border border-gray-200/60 bg-white p-6 hover:border-[#007A5E]/40 hover:shadow-lg transition-all group">

            {/* Identity */}
            <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#0F172A]/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-black text-[#0F172A]">
                            {(user.name || user.username || "?").charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <p className="font-black text-base text-[#0F172A] leading-tight">{user.name || user.username}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">@{user.username}</p>
                    </div>
                </div>
                <Badge className={`rounded-xl px-2.5 py-1 text-[10px] font-black border-none flex-shrink-0 ${roleBadgeColor}`}>
                    {user.roleName || user.role || "Staff"}
                </Badge>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Bills</p>
                    <p className="text-2xl font-black text-[#0F172A]">{stats.totalBills}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Revenue</p>
                    <p className="text-2xl font-black text-[#007A5E]">Rs {fmtShort(stats.totalRevenue)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Items</p>
                    <p className="text-2xl font-black text-[#0F172A]">{stats.totalItemsSold}</p>
                </div>
            </div>

            {/* Activity bar */}
            <div className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Last 7 Days</p>
                <ActivityBar dailyActivity={stats.dailyActivity} accent="#007A5E" height={40} />
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl ${voidBadgeColor}`}>
                    {stats.voidRate.toFixed(1)}% void
                </span>
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    {stats.lastSaleDate
                        ? <><Clock size={10} /> {stats.lastSaleDate}</>
                        : "No sales yet"
                    }
                </span>
                <span className="text-[11px] font-black text-gray-300 group-hover:text-[#007A5E] transition-colors">
                    View →
                </span>
            </div>
        </button>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffPerformanceTab({ users }) {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("revenue");
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        getSalesHistory()
            .then(data => setSales(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const staffUsers = users.filter(u =>
        !(u.roleName === "System Administrator" || (u.roleType === "ADMIN" && !u.roleName))
    );

    const allStats = Object.fromEntries(
        staffUsers.map(u => [u.username, computeStats(u.username, sales)])
    );

    const totals = staffUsers.reduce((acc, u) => {
        const s = allStats[u.username];
        acc.revenue += s.totalRevenue;
        acc.bills += s.totalBills;
        acc.items += s.totalItemsSold;
        return acc;
    }, { revenue: 0, bills: 0, items: 0 });

    const filteredStaff = staffUsers
        .filter(u =>
            !search ||
            (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
            u.username.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const sa = allStats[a.username], sb = allStats[b.username];
            if (sortBy === "revenue") return sb.totalRevenue - sa.totalRevenue;
            if (sortBy === "bills") return sb.totalBills - sa.totalBills;
            if (sortBy === "items") return sb.totalItemsSold - sa.totalItemsSold;
            return (a.name || a.username).localeCompare(b.name || b.username);
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-[#007A5E] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-bold text-gray-400">Loading performance data...</p>
                </div>
            </div>
        );
    }

    if (selectedUser) {
        const user = staffUsers.find(u => u.username === selectedUser);
        if (!user) { setSelectedUser(null); return null; }
        return (
            <StaffDetail
                user={user}
                stats={allStats[selectedUser]}
                allSales={sales}
                onBack={() => setSelectedUser(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Staff" value={staffUsers.length}
                    sub="tracked members" color="text-[#7C3AED]" bg="bg-[#7C3AED]/10" />
                <StatCard icon={TrendingUp} label="Combined Revenue" value={`Rs ${fmtShort(totals.revenue)}`}
                    sub={`Rs ${fmt(totals.revenue)}`} color="text-[#007A5E]" bg="bg-[#007A5E]/10" />
                <StatCard icon={Receipt} label="Total Bills" value={totals.bills}
                    sub="across all staff" color="text-[#007A5E]" bg="bg-[#007A5E]/10" />
                <StatCard icon={ShoppingBag} label="Total Items Sold" value={totals.items}
                    sub="active sales only" color="text-[#7C3AED]" bg="bg-[#7C3AED]/10" />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="pl-8 h-9 rounded-xl text-sm border-gray-200" />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    {[["revenue", "Revenue"], ["bills", "Bills"], ["items", "Items"], ["name", "Name"]].map(([val, label]) => (
                        <button key={val} onClick={() => setSortBy(val)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                                sortBy === val ? "bg-white text-[#0F172A] shadow-sm" : "text-gray-400 hover:text-[#0F172A]"
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Staff grid — 2 columns to give cards more room */}
            {filteredStaff.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-sm font-bold text-gray-400">No staff members found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredStaff.map(user => (
                        <StaffCard
                            key={user.id ?? user.username}
                            user={user}
                            stats={allStats[user.username]}
                            onClick={() => setSelectedUser(user.username)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
