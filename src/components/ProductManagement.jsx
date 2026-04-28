import { useState, useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, AlertTriangle, Package,
  ChevronUp, ChevronDown, ChevronsUpDown, X, ShieldCheck,
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
import { useToast } from "@/components/ui/use-toast";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/lib/api";
import { runWithState } from "@/lib/asyncState";
import ErrorBanner from "@/components/common/ErrorBanner";
import EmptyState from "@/components/common/EmptyState";

const CATEGORIES = [
  "Dairy", "Bakery", "Beverages", "Frozen Foods", "Snacks",
  "Produce", "Meat & Seafood", "Canned Goods", "Personal Care", "Household", "Other",
];

const emptyForm = {
  name: "",
  category: "",
  supplier: "",
  costPrice: "",
  sellingPrice: "",
};

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={13} className="ml-1 text-[#0F172A]/30 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={13} className="ml-1 text-[#007A5E] inline" />
    : <ChevronDown size={13} className="ml-1 text-[#007A5E] inline" />;
};

const FormField = ({ label, id, value, onChange, type = "text", placeholder, required }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={type === "number" ? "0" : undefined}
      step={type === "number" ? "0.01" : undefined}
      className="rounded-2xl border-[#0F172A]/10 focus:ring-[#007A5E]/20 font-bold text-[#0F172A]"
    />
  </div>
);

const CategorySelect = ({ value, onChange, id }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">
      Category<span className="text-red-500 ml-0.5">*</span>
    </Label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full h-10 px-3 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20"
    >
      <option value="">Select a category</option>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  </div>
);

const ProductManagement = ({ canView = true, canEdit = true }) => {
  const { toast } = useToast();

  const hasAccess = canView || canEdit;

  // --- Data ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  // --- Search / Filter / Sort ---
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortCol, setSortCol] = useState("name");
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

  // ── Fetch products on mount ──
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    await runWithState({
      setLoading,
      setError: setGlobalError,
      task: async () => {
        const data = await getProducts();
        setProducts(data);
      },
      getErrorMessage: (err) => {
        console.error(err);
        return "Could not connect to the backend to load products.";
      },
    });
  };

  // ── Validation ──
  const validateForm = (data) => {
    if (!data.name?.trim()) return "Product name is required.";
    if (data.name.trim().length < 2 || data.name.trim().length > 100)
      return "Product name must be between 2 and 100 characters.";
    if (!data.category) return "Category is required.";
    if (!data.supplier?.trim()) return "Supplier is required.";
    if (data.supplier.trim().length < 2 || data.supplier.trim().length > 100)
      return "Supplier name must be between 2 and 100 characters.";
    const cost = parseFloat(data.costPrice);
    const sell = parseFloat(data.sellingPrice);
    if (isNaN(cost) || cost < 0) return "Cost price must be a valid non-negative number.";
    if (isNaN(sell) || sell < 0) return "Selling price must be a valid non-negative number.";
    return null;
  };

  // ── Create ──
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    const err = validateForm(formData);
    if (err) { setFormError(err); return; }
    setIsCreating(true);
    try {
      const payload = {
        ...formData,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
      };
      const created = await createProduct(payload);
      setProducts((prev) => [created, ...prev]);
      setCreateOpen(false);
      setFormData(emptyForm);
      toast({ title: "Product Added", description: `"${created.name}" has been added successfully.` });
    } catch (err) {
      setFormError(err.message || "Failed to create product.");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit ──
  const openEdit = (product) => {
    setEditData({
      ...product,
      costPrice: product.costPrice?.toString() ?? "",
      sellingPrice: product.sellingPrice?.toString() ?? "",
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    const err = validateForm(editData);
    if (err) { setEditError(err); return; }
    setIsEditing(true);
    try {
      const payload = {
        ...editData,
        costPrice: parseFloat(editData.costPrice),
        sellingPrice: parseFloat(editData.sellingPrice),
      };
      const updated = await updateProduct(editData.id, payload);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditOpen(false);
      toast({ title: "Product Updated", description: `"${updated.name}" has been updated.` });
    } catch (err) {
      setEditError(err.message || "Failed to update product.");
    } finally {
      setIsEditing(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast({ title: "Product Removed", description: `"${deleteTarget.name}" has been deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to delete product.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Sort ──
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Filtered + Sorted products ──
  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.supplier || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      const matchCat = categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      let va = a[sortCol] ?? "";
      let vb = b[sortCol] ?? "";
      if (sortCol === "costPrice" || sortCol === "sellingPrice") {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

  const usedCategories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  // ── Summary stats ──
  const totalProducts = products.length;
  const avgMargin = products.length
    ? (
        products.reduce((sum, p) => {
          const cost = parseFloat(p.costPrice) || 0;
          const sell = parseFloat(p.sellingPrice) || 0;
          return sum + (cost > 0 ? ((sell - cost) / cost) * 100 : 0);
        }, 0) / products.length
      ).toFixed(1)
    : "0.0";

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
            <p className="text-sm font-bold text-[#0F172A]/50 mb-4">You don't have access to Product Management.</p>
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

  return (
    <div className="space-y-8">
      {/* ── Stats Row ── */}
      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { label: "Total Products", value: totalProducts, sub: "In master catalog", color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
          { label: "Categories", value: usedCategories.length, sub: "Active categories", color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
          ...(canEdit ? [{ label: "Avg. Margin", value: `${avgMargin}%`, sub: "Cost vs. selling price", color: "text-[#9D1967]", bg: "bg-[#9D1967]/10" }] : []),
        ].map((stat, i) => (
            <Motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card-premium p-6"
          >
            <div className={`w-10 h-10 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <Package size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-[#0F172A] mb-1">{stat.value}</h3>
            <p className="text-[10px] font-bold text-[#007A5E]">{stat.sub}</p>
          </Motion.div>
        ))}
      </div>

      {/* ── Main Table Card ── */}
      <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
        <CardHeader className="p-8 border-b border-[#0F172A]/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-black text-xl">Product Catalog</CardTitle>
              <CardDescription className="font-bold">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            {canEdit && (
              <Button
                onClick={() => { setFormData(emptyForm); setFormError(""); setCreateOpen(true); }}
                className="rounded-2xl bg-[#007A5E] py-5 px-6 text-white font-black text-sm hover:scale-105 transition-all shadow-lg shadow-[#007A5E]/20"
              >
                <Plus size={16} className="mr-2" /> Add Product
              </Button>
            )}
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F172A]/30" />
              <input
                type="text"
                placeholder="Search by name, supplier, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 h-11 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] placeholder:text-[#0F172A]/30 focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 px-4 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 min-w-[180px]"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Global error */}
          <ErrorBanner
            error={globalError}
            onRetry={fetchProducts}
            className="mx-8 mt-6"
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-4 border-[#007A5E]/20 border-t-[#007A5E] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description={
                search || categoryFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Click \"Add Product\" to get started."
              }
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#0F172A]/[0.02]">
                <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                  {[
                    { col: "id", label: "ID" },
                    { col: "name", label: "Product Name" },
                    { col: "category", label: "Category" },
                    { col: "supplier", label: "Supplier" },
                    ...(canEdit ? [{ col: "costPrice", label: "Cost Price" }] : []),
                    { col: "sellingPrice", label: "Selling Price" },
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
                  {canEdit && (
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filtered.map((product, i) => (
                    <Motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors"
                    >
                      <TableCell className="px-6 font-bold text-[#0F172A]/50 text-xs">
                        #{product.id}
                      </TableCell>
                      <TableCell className="px-6">
                        <p className="font-black text-[#0F172A] text-sm">{product.name}</p>
                      </TableCell>
                      <TableCell className="px-6">
                        <Badge className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none bg-[#007A5E]/10 text-[#007A5E]">
                          {product.category || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 font-bold text-sm text-[#0F172A]/70">
                        {product.supplier || "—"}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="px-6 font-black text-sm text-[#0F172A]">
                          Rs. {parseFloat(product.costPrice || 0).toFixed(2)}
                        </TableCell>
                      )}
                      <TableCell className="px-6 font-black text-sm text-[#007A5E]">
                        Rs. {parseFloat(product.sellingPrice || 0).toFixed(2)}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(product)}
                              className="h-8 w-8 p-0 rounded-xl hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] transition-colors"
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(product)}
                              className="h-8 w-8 p-0 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </Motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Add Product Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-[#0F172A]/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-[#0F172A]">Add New Product</DialogTitle>
            <DialogDescription className="font-bold text-[#0F172A]/50">
              Fill in the product details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <FormField
              label="Product Name" id="create-name" required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Fresh Milk 1L"
            />
            <CategorySelect
              id="create-category"
              value={formData.category}
              onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
            />
            <FormField
              label="Supplier" id="create-supplier" required
              value={formData.supplier}
              onChange={(e) => setFormData((p) => ({ ...p, supplier: e.target.value }))}
              placeholder="e.g. ABC Dairy Co."
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Cost Price (₱)" id="create-cost" type="number" required
                value={formData.costPrice}
                onChange={(e) => setFormData((p) => ({ ...p, costPrice: e.target.value }))}
                placeholder="0.00"
              />
              <FormField
                label="Selling Price (₱)" id="create-sell" type="number" required
                value={formData.sellingPrice}
                onChange={(e) => setFormData((p) => ({ ...p, sellingPrice: e.target.value }))}
                placeholder="0.00"
              />
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
                ) : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Product Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-[#0F172A]/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-[#0F172A]">Edit Product</DialogTitle>
            <DialogDescription className="font-bold text-[#0F172A]/50">
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          {editData && (
            <form onSubmit={handleEdit} className="space-y-4 mt-2">
              <FormField
                label="Product Name" id="edit-name" required
                value={editData.name}
                onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Fresh Milk 1L"
              />
              <CategorySelect
                id="edit-category"
                value={editData.category}
                onChange={(e) => setEditData((p) => ({ ...p, category: e.target.value }))}
              />
              <FormField
                label="Supplier" id="edit-supplier" required
                value={editData.supplier}
                onChange={(e) => setEditData((p) => ({ ...p, supplier: e.target.value }))}
                placeholder="e.g. ABC Dairy Co."
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Cost Price (₱)" id="edit-cost" type="number" required
                  value={editData.costPrice}
                  onChange={(e) => setEditData((p) => ({ ...p, costPrice: e.target.value }))}
                  placeholder="0.00"
                />
                <FormField
                  label="Selling Price (₱)" id="edit-sell" type="number" required
                  value={editData.sellingPrice}
                  onChange={(e) => setEditData((p) => ({ ...p, sellingPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
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
              <DialogTitle className="font-black text-lg text-[#0F172A]">Delete Product</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-[#0F172A]/60 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="text-[#0F172A] font-black">"{deleteTarget?.name}"</span>?
              This action cannot be undone and will remove it from inventory and sales records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="rounded-2xl font-black"
            >
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
                  Deleting…
                </span>
              ) : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
