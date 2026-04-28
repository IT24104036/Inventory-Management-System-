import { useCallback, useState, useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, AlertTriangle, Package,
  ChevronUp, ChevronDown, ChevronsUpDown, ShieldAlert, Clock, CheckCircle2, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, createBatch, updateBatch, deleteBatch, getProducts, getStockAuditHistory } from "@/lib/api";
import { runWithState } from "@/lib/asyncState";
import ErrorBanner from "@/components/common/ErrorBanner";
import EmptyState from "@/components/common/EmptyState";

// ── Expiry status helpers ───────────────────────────────────────────────────

const getBatchStatus = (quantity, expiryDateStr) => {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return "sold_out";
  if (!expiryDateStr) return "fresh";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "expiring";
  return "fresh";
};

const getDaysLabel = (expiryDateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return "Today";
  return `in ${diffDays}d`;
};

const STATUS_CONFIG = {
  sold_out: {
    label: "Sold Out",
    badgeClass: "bg-slate-100 text-slate-600",
    rowClass: "bg-slate-50/40",
    icon: Package,
    iconClass: "text-slate-500",
  },
  expired: {
    label: "Expired",
    badgeClass: "bg-red-100 text-red-600",
    rowClass: "bg-red-50/40",
    icon: ShieldAlert,
    iconClass: "text-red-500",
  },
  expiring: {
    label: "Expiring Soon",
    badgeClass: "bg-orange-100 text-orange-600",
    rowClass: "bg-orange-50/30",
    icon: Clock,
    iconClass: "text-orange-500",
  },
  fresh: {
    label: "Fresh",
    badgeClass: "bg-[#007A5E]/10 text-[#007A5E]",
    rowClass: "",
    icon: CheckCircle2,
    iconClass: "text-[#007A5E]",
  },
};

// ── Sort icon ──────────────────────────────────────────────────────────────
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={13} className="ml-1 text-[#0F172A]/30 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={13} className="ml-1 text-[#007A5E] inline" />
    : <ChevronDown size={13} className="ml-1 text-[#007A5E] inline" />;
};

// ── Empty form ─────────────────────────────────────────────────────────────
const emptyForm = {
  productId: "",
  batchNumber: "",
  quantity: "",
  expiryDate: "",
  addedDate: new Date().toISOString().split("T")[0],
};

// ── Main Component ──────────────────────────────────────────────────────────
const InventoryTracking = ({ canView = true, canAddStock = true }) => {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];

  const hasAccess = canView || canAddStock;
  const canViewAudit = canAddStock;

  // --- Data ---
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [activeTab, setActiveTab] = useState("batches");
  const [stockAuditEntries, setStockAuditEntries] = useState([]);
  const [stockAuditLoading, setStockAuditLoading] = useState(false);
  const [stockAuditError, setStockAuditError] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  // --- Search / Filter / Sort ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortCol, setSortCol] = useState("expiryDate");
  const [sortDir, setSortDir] = useState("asc");

  // --- Create ---
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // --- Edit ---
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // --- Delete ---
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch on mount ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    await runWithState({
      setLoading,
      setError: setGlobalError,
      task: async () => {
        const [batchData, productData] = await Promise.all([getBatches(), getProducts()]);
        setBatches(batchData);
        setProducts(productData);
      },
      getErrorMessage: (err) => {
        console.error(err);
        return "Could not connect to the backend. Please check your connection.";
      },
    });
  }, []);

  const fetchStockAuditData = useCallback(async () => {
    if (!canViewAudit) return;
    await runWithState({
      setLoading: setStockAuditLoading,
      setError: setStockAuditError,
      task: async () => {
        const auditData = await getStockAuditHistory();
        setStockAuditEntries(Array.isArray(auditData) ? auditData : []);
      },
      getErrorMessage: (err) => err?.message || "Could not load the stock audit history.",
    });
  }, [canViewAudit]);

  useEffect(() => {
    fetchData();
    if (canViewAudit) {
      fetchStockAuditData();
    }
  }, [canViewAudit, fetchData, fetchStockAuditData]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = (data) => {
    if (!data.productId) return "Please select a product.";
    const qty = parseInt(data.quantity);
    if (isNaN(qty) || qty <= 0) return "Quantity must be a positive integer.";
    if (!data.expiryDate) return "Expiry date is required.";
    if (!data.addedDate) return "Added date is required.";
    if (data.addedDate > today) return "Added date cannot be in the future.";
    return null;
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    const err = validateForm(formData);
    if (err) { setFormError(err); return; }
    setIsCreating(true);
    try {
      const payload = {
        productId: parseInt(formData.productId),
        quantity: parseInt(formData.quantity),
        expiryDate: formData.expiryDate,
        batchNumber: formData.batchNumber.trim() || null,
        addedDate: formData.addedDate,
      };
      const created = await createBatch(payload);
      setBatches((prev) => [created, ...prev]);
      if (canViewAudit) await fetchStockAuditData();
      setCreateOpen(false);
      setFormData(emptyForm);
      toast({ title: "Stock Added", description: `Batch "${created.batchNumber}" added successfully.` });
    } catch (err) {
      setFormError(err.message || "Failed to add batch.");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (batch) => {
    setEditData({
      id: batch.id,
      batchNumber: batch.batchNumber || "",
      quantity: batch.quantity?.toString() ?? "",
      expiryDate: batch.expiryDate || "",
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    const qty = parseInt(editData.quantity);
    if (isNaN(qty) || qty < 0) { setEditError("Quantity must be a non-negative integer."); return; }
    if (!editData.expiryDate) { setEditError("Expiry date is required."); return; }
    setIsEditing(true);
    try {
      const updated = await updateBatch(editData.id, {
        quantity: qty,
        expiryDate: editData.expiryDate,
      });
      setBatches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (canViewAudit) await fetchStockAuditData();
      setEditOpen(false);
      toast({ title: "Batch Updated", description: `Batch "${updated.batchNumber || updated.id}" has been updated.` });
    } catch (err) {
      setEditError(err.message || "Failed to update batch.");
    } finally {
      setIsEditing(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBatch(deleteTarget.id);
      setBatches((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      if (canViewAudit) await fetchStockAuditData();
      toast({ title: "Batch Removed", description: `Batch "${deleteTarget.batchNumber || deleteTarget.id}" has been deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to delete batch.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const enriched = batches.map((b) => ({
    ...b,
    productName: b.product?.name ?? "Unknown",
    productCategory: b.product?.category ?? "",
    status: getBatchStatus(b.quantity, b.expiryDate),
  }));

  const soldOutCount = enriched.filter((b) => b.status === "sold_out").length;
  const expiredCount = enriched.filter((b) => b.status === "expired").length;
  const expiringCount = enriched.filter((b) => b.status === "expiring").length;
  const freshCount = enriched.filter((b) => b.status === "fresh").length;

  const filtered = enriched
    .filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        b.productName.toLowerCase().includes(q) ||
        (b.batchNumber || "").toLowerCase().includes(q) ||
        (b.productCategory || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let va, vb;
      if (sortCol === "quantity") {
        va = a.quantity ?? 0;
        vb = b.quantity ?? 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortCol === "expiryDate" || sortCol === "addedDate") {
        va = new Date(a[sortCol] || 0).getTime();
        vb = new Date(b[sortCol] || 0).getTime();
        return sortDir === "asc" ? va - vb : vb - va;
      }
      va = String(a[sortCol] ?? "");
      vb = String(b[sortCol] ?? "");
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const filteredAuditEntries = stockAuditEntries.filter((entry) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return [
      entry.productName,
      entry.productCode,
      entry.batchNumber,
      entry.actionType,
      entry.reason,
      entry.actor,
      entry.referenceType,
      entry.referenceId,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const formatAuditTime = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeltaTone = (delta) => {
    if (delta > 0) return "text-[#007A5E] bg-[#007A5E]/10";
    if (delta < 0) return "text-red-600 bg-red-100";
    return "text-[#0F172A]/60 bg-[#0F172A]/5";
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const FormRow = ({ label, id, children, required }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );

  const inputCls = "w-full h-10 px-3 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 [color-scheme:light]";

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
            <p className="text-sm font-bold text-[#0F172A]/50 mb-4">You don't have access to Inventory Tracking.</p>
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
  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full max-w-xl rounded-3xl bg-white/80 p-1 shadow-sm ${canViewAudit ? "grid-cols-2" : "grid-cols-1"}`}>
          <TabsTrigger value="batches" className="rounded-[1.25rem] font-black">Stock Batches</TabsTrigger>
          {canViewAudit && <TabsTrigger value="audit" className="rounded-[1.25rem] font-black">Stock Audit</TabsTrigger>}
        </TabsList>
        <TabsContent value="batches" className="space-y-8">

      {/* ── Summary Stats ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Batches", value: batches.length, sub: "All stock records", color: "text-[#007A5E]", bg: "bg-[#007A5E]/10", Icon: Package },
          { label: "Fresh", value: freshCount, sub: "More than 7 days left", color: "text-[#007A5E]", bg: "bg-[#007A5E]/10", Icon: CheckCircle2 },
          { label: "Expiring Soon", value: expiringCount, sub: "Within 7 days", color: "text-orange-500", bg: "bg-orange-100", Icon: Clock },
          { label: "Expired", value: expiredCount, sub: "Expired with stock", color: "text-red-500", bg: "bg-red-100", Icon: ShieldAlert },
          { label: "Sold Out", value: soldOutCount, sub: "Zero quantity left", color: "text-slate-500", bg: "bg-slate-100", Icon: Package },
        ].map((s, i) => (
          <Motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card-premium p-6"
          >
            <div className={`w-10 h-10 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
              <s.Icon size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">{s.label}</p>
            <h3 className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</h3>
            <p className="text-[10px] font-bold text-[#007A5E]">{s.sub}</p>
          </Motion.div>
        ))}
      </div>

      {/* ── Main Table Card ── */}
      <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
        <CardHeader className="p-8 border-b border-[#0F172A]/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-black text-xl">Stock Batches</CardTitle>
              <CardDescription className="font-bold">
                {filtered.length} batch{filtered.length !== 1 ? "es" : ""} found
              </CardDescription>
            </div>
            {canAddStock && (
              <Button
                onClick={() => { setFormData({ ...emptyForm, addedDate: today }); setFormError(""); setCreateOpen(true); }}
                className="rounded-2xl bg-[#007A5E] py-5 px-6 text-white font-black text-sm hover:scale-105 transition-all shadow-lg shadow-[#007A5E]/20"
              >
                <Plus size={16} className="mr-2" /> Add Stock Batch
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F172A]/30" />
              <input
                type="text"
                placeholder="Search by product, batch number or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 h-11 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] placeholder:text-[#0F172A]/30 focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 px-4 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 min-w-[180px]"
            >
              <option value="all">All Statuses</option>
              <option value="fresh">Fresh</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="sold_out">Sold Out</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Error Banner */}
          <ErrorBanner
            error={globalError}
            onRetry={fetchData}
            className="mx-8 mt-6"
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-4 border-[#007A5E]/20 border-t-[#007A5E] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No batches found"
              description={
                search || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Click \"Add Stock Batch\" to log your first batch."
              }
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#0F172A]/[0.02]">
                <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                  {[
                    { col: "id", label: "Batch #" },
                    { col: "productName", label: "Product" },
                    { col: "productCategory", label: "Category" },
                    { col: "quantity", label: "Qty" },
                    { col: "addedDate", label: "Added" },
                    { col: "expiryDate", label: "Expiry" },
                    { col: "status", label: "Status" },
                  ].map(({ col, label }) => (
                    <TableHead
                      key={col}
                      className="font-black uppercase text-[10px] tracking-widest px-6 cursor-pointer select-none"
                      onClick={() => handleSort(col)}
                    >
                      {label}
                      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                    </TableHead>
                  ))}
                  {canAddStock && (
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filtered.map((batch, i) => {
                    const cfg = STATUS_CONFIG[batch.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <Motion.tr
                        key={batch.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.025 }}
                        className={`border-[#0F172A]/5 transition-colors hover:brightness-95 ${cfg.rowClass}`}
                      >
                        {/* Batch # */}
                        <TableCell className="px-6">
                          <p className="font-black text-[#0F172A] text-xs">{batch.batchNumber || `#${batch.id}`}</p>
                        </TableCell>
                        {/* Product */}
                        <TableCell className="px-6">
                          <p className="font-black text-[#0F172A] text-sm">{batch.productName}</p>
                        </TableCell>
                        {/* Category */}
                        <TableCell className="px-6">
                          <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-[#7C3AED]/10 text-[#7C3AED]">
                            {batch.productCategory || "—"}
                          </Badge>
                        </TableCell>
                        {/* Qty */}
                        <TableCell className="px-6 font-black text-[#0F172A] text-sm">
                          {batch.quantity ?? "—"}
                        </TableCell>
                        {/* Added date */}
                        <TableCell className="px-6 font-bold text-[#0F172A]/60 text-sm">
                          {batch.addedDate || "—"}
                        </TableCell>
                        {/* Expiry */}
                        <TableCell className="px-6">
                          <div>
                            <p className="font-bold text-sm text-[#0F172A]">{batch.expiryDate || "—"}</p>
                            {batch.expiryDate && (
                              <p className={`text-[10px] font-black ${cfg.iconClass}`}>
                                {getDaysLabel(batch.expiryDate)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        {/* Status */}
                        <TableCell className="px-6">
                          <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none flex items-center gap-1 w-fit ${cfg.badgeClass}`}>
                            <StatusIcon size={10} />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        {/* Actions */}
                        {canAddStock && (
                          <TableCell className="px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(batch)}
                                className="h-8 w-8 p-0 rounded-xl hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] transition-colors"
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(batch)}
                                className="h-8 w-8 p-0 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </Motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Add Batch Dialog ── */}
        </TabsContent>

        {canViewAudit && (
          <TabsContent value="audit">
            <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
              <CardHeader className="p-8 border-b border-[#0F172A]/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-black text-xl">Stock Audit</CardTitle>
                    <CardDescription className="font-bold">
                      Trace stock movement from sales, waste, and batch updates.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchStockAuditData}
                    className="rounded-2xl font-black border-[#0F172A]/10"
                  >
                    Reload Audit
                  </Button>
                </div>

                <div className="relative mt-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F172A]/30" />
                  <input
                    type="text"
                    placeholder="Search by product, batch, action, actor or reference..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-11 pr-4 h-11 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] placeholder:text-[#0F172A]/30 focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <ErrorBanner
                  error={stockAuditError}
                  onRetry={fetchStockAuditData}
                  className="mx-8 mt-6"
                />

                {stockAuditLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 rounded-full border-4 border-[#007A5E]/20 border-t-[#007A5E] animate-spin" />
                  </div>
                ) : filteredAuditEntries.length === 0 ? (
                  <EmptyState
                    title="No stock audit records yet"
                    description={
                      auditSearch
                        ? "Try a different search term."
                        : "Once stock changes happen, they will appear here."
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader className="bg-[#0F172A]/[0.02]">
                      <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                        {["When", "Product", "Batch", "Action", "Change", "After", "Reason", "Reference", "Actor"].map((label) => (
                          <TableHead key={label} className="font-black uppercase text-[10px] tracking-widest px-6">
                            {label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditEntries.map((entry) => (
                        <TableRow key={entry.id} className="border-[#0F172A]/5">
                          <TableCell className="px-6 align-top text-sm font-bold text-[#0F172A]/70">
                            {formatAuditTime(entry.recordedAt)}
                          </TableCell>
                          <TableCell className="px-6 align-top">
                            <div>
                              <p className="font-black text-sm text-[#0F172A]">{entry.productName || "Unknown"}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">
                                {entry.productCode || "No code"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 align-top font-black text-[#0F172A] text-sm">
                            {entry.batchNumber || `#${entry.batchId}`}
                          </TableCell>
                          <TableCell className="px-6 align-top">
                            <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-[#0F172A]/5 text-[#0F172A]">
                              {entry.actionType || "UNKNOWN"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 align-top">
                            <Badge className={`rounded-lg px-2 text-[10px] font-black border-none ${getDeltaTone(entry.quantityDelta)}`}>
                              {entry.quantityDelta > 0 ? `+${entry.quantityDelta}` : entry.quantityDelta}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 align-top font-black text-[#0F172A] text-sm">
                            {entry.resultingQuantity}
                          </TableCell>
                          <TableCell className="px-6 align-top text-sm font-bold text-[#0F172A]/70 max-w-[220px]">
                            {entry.reason || "—"}
                          </TableCell>
                          <TableCell className="px-6 align-top">
                            <div className="text-sm font-bold text-[#0F172A]/70">
                              <p>{entry.referenceType || "—"}</p>
                              {entry.referenceId && (
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/35">
                                  {entry.referenceId}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 align-top font-bold text-sm text-[#0F172A]/70">
                            {entry.actor || "system"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-[#0F172A]/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-[#0F172A]">Add Stock Batch</DialogTitle>
            <DialogDescription className="font-bold text-[#0F172A]/50">
              Log a new stock batch with expiry information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {/* Product */}
            <FormRow label="Product" id="create-product" required>
              <select
                id="create-product"
                value={formData.productId}
                onChange={(e) => setFormData((p) => ({ ...p, productId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormRow>

            {/* Batch number */}
            <FormRow label="Batch Number" id="create-batch-num">
              <Input
                id="create-batch-num"
                value={formData.batchNumber}
                onChange={(e) => setFormData((p) => ({ ...p, batchNumber: e.target.value }))}
                placeholder="Auto-generated if left blank"
                className="rounded-2xl border-[#0F172A]/10 focus:ring-[#007A5E]/20 font-bold"
              />
            </FormRow>

            {/* Quantity */}
            <FormRow label="Quantity" id="create-qty" required>
              <Input
                id="create-qty"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="e.g. 50"
                className="rounded-2xl border-[#0F172A]/10 focus:ring-[#007A5E]/20 font-bold"
              />
            </FormRow>

            <div className="grid grid-cols-2 gap-4">
              {/* Expiry date */}
              <FormRow label="Expiry Date" id="create-expiry" required>
                <input
                  id="create-expiry"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value }))}
                  className={inputCls}
                />
              </FormRow>
              {/* Added date */}
              <FormRow label="Added Date" id="create-added" required>
                <input
                  id="create-added"
                  type="date"
                  max={today}
                  value={formData.addedDate}
                  onChange={(e) => setFormData((p) => ({ ...p, addedDate: e.target.value }))}
                  className={inputCls}
                />
              </FormRow>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-2xl px-4 py-3 text-sm font-bold border border-red-100">
                <AlertTriangle size={15} /> {formError}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-2xl font-black">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="rounded-2xl bg-[#007A5E] text-white font-black px-6 hover:bg-[#005f47] transition-all"
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving…
                  </span>
                ) : "Add Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Batch Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-[#0F172A]/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-[#0F172A]">Update Stock Batch</DialogTitle>
            <DialogDescription className="font-bold text-[#0F172A]/50">
              Adjust quantity or expiry date for batch{" "}
              <span className="text-[#0F172A]">"{editData?.batchNumber || editData?.id}"</span>.
            </DialogDescription>
          </DialogHeader>
          {editData && (
            <form onSubmit={handleEdit} className="space-y-4 mt-2">
              <FormRow label="Quantity" id="edit-qty" required>
                <Input
                  id="edit-qty"
                  type="number"
                  min="0"
                  value={editData.quantity}
                  onChange={(e) => setEditData((p) => ({ ...p, quantity: e.target.value }))}
                  className="rounded-2xl border-[#0F172A]/10 focus:ring-[#007A5E]/20 font-bold"
                />
              </FormRow>
              <FormRow label="Expiry Date" id="edit-expiry" required>
                <input
                  id="edit-expiry"
                  type="date"
                  value={editData.expiryDate}
                  onChange={(e) => setEditData((p) => ({ ...p, expiryDate: e.target.value }))}
                  className={inputCls}
                />
              </FormRow>

              {editError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-2xl px-4 py-3 text-sm font-bold border border-red-100">
                  <AlertTriangle size={15} /> {editError}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="rounded-2xl font-black">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isEditing}
                  className="rounded-2xl bg-[#7C3AED] text-white font-black px-6 hover:bg-[#6d28d9] transition-all"
                >
                  {isEditing ? (
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Saving…
                    </span>
                  ) : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-[#0F172A]/10 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <DialogTitle className="font-black text-lg text-[#0F172A]">Remove Batch</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-[#0F172A]/60 leading-relaxed">
              Are you sure you want to remove batch{" "}
              <span className="text-[#0F172A] font-black">
                "{deleteTarget?.batchNumber || `#${deleteTarget?.id}`}"
              </span>{" "}
              ({deleteTarget?.productName})? This will permanently remove{" "}
              <span className="font-black text-[#0F172A]">{deleteTarget?.quantity} unit(s)</span> from stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="rounded-2xl font-black">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-2xl bg-red-500 text-white font-black px-6 hover:bg-red-600 transition-all"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Removing…
                </span>
              ) : "Remove Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryTracking;
