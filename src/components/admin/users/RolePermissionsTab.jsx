import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Plus, Search, Shield, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoles, createRole, updateRole, deleteRole } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
// Role Permissions Tab
// Groups with viewKey (basic/read access) + editKey (full management).
// singleKey = a single toggle (no view/edit split).
// adminOnly = only shown for ADMIN / SUB_ADMIN role types.
//
// Sales uses viewKey/editKey just like other modules:
//   View (editVoidSales)   -> can record + view own bills + edit/void own within 2h
//   Edit (salesManagement) -> full manager: all bills, any time, unvoid
const PERMISSION_GROUPS = [
    { label: "Product Management",  viewKey: "productManagement", editKey: "editProducts"    },
    { label: "Inventory Tracking",  viewKey: "inventoryTracking", editKey: "addUpdateStock"  },
    { label: "Sales",               viewKey: "editVoidSales",     editKey: "salesManagement" },
    { label: "Discounts & Alerts",  viewKey: "discountsAlerts",   editKey: "editDiscounts"   },
    { label: "Reports & Analytics", viewKey: "reportAnalytics",   editKey: "editReports"     },
    { label: "User Control",        singleKey: "userControl",     adminOnly: true            },
];

const RolePermissionsTab = ({ onRolesChanged }) => {
    const sessionUser = getSessionUser() || {};
    const isSubAdmin = (sessionUser.roleType || "").toUpperCase() === "SUB_ADMIN";

    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRole, setEditingRole] = useState(null);  // role being edited in side-panel
    const [editPerms, setEditPerms] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [roleSearch, setRoleSearch] = useState("");
    // Create dialog state
    const [createOpen, setCreateOpen] = useState(false);
    const [newRole, setNewRole] = useState({ roleName: "", description: "", roleType: "STAFF" });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const data = await getRoles();
                setRoles(data);
            } catch (e) {
                console.error("Failed to fetch roles", e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const openEdit = (role) => {
        setEditingRole(role);
        setSaveSuccess(false);
        setSaveError("");
        setEditPerms({
            productManagement: role.productManagement ?? false,
            editProducts:      role.editProducts      ?? false,
            inventoryTracking: role.inventoryTracking ?? false,
            addUpdateStock:    role.addUpdateStock     ?? false,
            salesManagement:   role.salesManagement   ?? false,
            editVoidSales:     role.editVoidSales      ?? false,
            discountsAlerts:   role.discountsAlerts   ?? false,
            editDiscounts:     role.editDiscounts      ?? false,
            reportAnalytics:   role.reportAnalytics   ?? false,
            editReports:       role.editReports        ?? false,
            userControl:       role.userControl       ?? false,
        });
    };

    const handleSavePerms = async () => {
        if (!editingRole) return;
        setSaving(true);
        setSaveError("");
        try {
            const updated = await updateRole(editingRole.id, {
                roleName: editingRole.roleName,
                roleType: editingRole.roleType || "STAFF",
                description: editingRole.description || "",
                ...editPerms,
            });

            // Merge: backend response first, then editPerms on top.
            // This is a workaround for backends that don't echo back all
            // permission fields correctly (e.g. returning editVoidSales: null
            // even though it was saved as true). editPerms is what we sent,
            // so it is the ground truth for what the server should have saved.
            const merged = { ...updated, ...editPerms };

            setRoles(prev => prev.map(r => r.id === merged.id ? merged : r));
            setEditingRole(merged);

            // Re-sync UI checkboxes from merged state
            setEditPerms({
                productManagement: merged.productManagement ?? false,
                editProducts:      merged.editProducts      ?? false,
                inventoryTracking: merged.inventoryTracking ?? false,
                addUpdateStock:    merged.addUpdateStock     ?? false,
                salesManagement:   merged.salesManagement   ?? false,
                editVoidSales:     merged.editVoidSales      ?? false,
                discountsAlerts:   merged.discountsAlerts    ?? false,
                editDiscounts:     merged.editDiscounts      ?? false,
                reportAnalytics:   merged.reportAnalytics    ?? false,
                editReports:       merged.editReports        ?? false,
                userControl:       merged.userControl        ?? false,
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (e) {
            console.error("Failed to save permissions", e);
            setSaveError(e.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError("");
        if (!newRole.roleName.trim()) { setCreateError("Role name is required."); return; }
        setCreating(true);
        try {
            const created = await createRole(newRole);
            setRoles(prev => [...prev, created]);
            onRolesChanged?.();
            setCreateOpen(false);
            setNewRole({ roleName: "", description: "", roleType: "STAFF" });
        } catch (e) {
            setCreateError(e.message || "Failed to create role");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id, name) => {
        setDeleteError("");
        // Check if any users are assigned before even calling the API
        const role = roles.find(r => r.id === id);
        if (role && role.usersAssigned > 0) {
            setDeleteError(
                `Cannot delete "${name}" - ${role.usersAssigned} ${role.usersAssigned === 1 ? "user is" : "users are"} currently assigned to this role. Reassign them first.`
            );
            return;
        }
        if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
        try {
            await deleteRole(id);
            setRoles(prev => prev.filter(r => r.id !== id));
            onRolesChanged?.();
            if (editingRole?.id === id) setEditingRole(null);
        } catch (e) {
            setDeleteError(e.message || `Failed to delete "${name}".`);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return "-";
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="flex gap-6 items-start">
            {/* ── Left: Roles Table ── */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-[#0F172A]">All Roles</h2>
                        {isSubAdmin && (
                            <p className="text-xs font-bold text-[#0F172A]/40 mt-1 uppercase tracking-widest">View Only — Role management restricted to System Administrator</p>
                        )}
                    </div>
                    {!isSubAdmin && (
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="rounded-2xl bg-[#7C3AED] py-5 px-5 text-white font-black text-sm shadow-glow-amethyst hover:scale-105 transition-all"
                        >
                            <Plus size={16} className="mr-2" /> Create New Role
                        </Button>
                    )}
                </div>
                {deleteError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold p-4 rounded-2xl mb-4 flex items-start gap-3">
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                        <span className="flex-1">{deleteError}</span>
                        <button onClick={() => setDeleteError("")} className="text-red-400 hover:text-red-600 flex-shrink-0">
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F172A]/30" />
                    <input
                        type="text"
                        placeholder="Search roles..."
                        value={roleSearch}
                        onChange={e => setRoleSearch(e.target.value)}
                        className="w-full pl-11 pr-4 h-11 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] placeholder:text-[#0F172A]/30 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                    />
                </div>

                <Card className="card-premium p-0 border-none shadow-premium overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-[#0F172A]/[0.02]">
                                <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                                    <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Role Name</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Description</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Users Assigned</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Last Modified</TableHead>
                                    <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="w-8 h-8 mx-auto border-4 border-[#007A5E] border-t-transparent rounded-full animate-spin" />
                                            <p className="mt-4 text-[#0F172A]/40 font-bold uppercase tracking-widest text-[10px]">Loading roles...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : roles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <Shield size={32} className="mx-auto text-[#0F172A]/20 mb-3" />
                                            <p className="text-[#0F172A]/40 font-bold text-sm">No roles found.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : roles
                                    .filter(r => !roleSearch || r.roleName.toLowerCase().includes(roleSearch.toLowerCase()))
                                    .slice()
                                    .sort((a, b) => {
                                        const order = { ADMIN: 0, SUB_ADMIN: 1, STAFF: 2 };
                                        const aOrder = order[(a.roleType || "STAFF").toUpperCase()] ?? 2;
                                        const bOrder = order[(b.roleType || "STAFF").toUpperCase()] ?? 2;
                                        return aOrder !== bOrder ? aOrder - bOrder : a.roleName.localeCompare(b.roleName);
                                    })
                                    .map((role) => (
                                    <TableRow
                                        key={role.id}
                                        className={`border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors cursor-pointer ${
                                            editingRole?.id === role.id ? "bg-[#7C3AED]/5" : ""
                                        }`}
                                    >
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                                                    <Shield size={16} className="text-[#7C3AED]" />
                                                </div>
                                                <span className="font-black text-[#0F172A] text-sm">{role.roleName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-sm text-[#0F172A]/60">{role.description}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-[#007A5E]/10 text-[#007A5E] border-none font-black text-xs rounded-lg">
                                                {role.usersAssigned} {role.usersAssigned === 1 ? "user" : "users"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-sm text-[#0F172A]/50">{formatDate(role.lastModified)}</TableCell>
                                        <TableCell className="text-right px-6">
                                            {isSubAdmin ? (
                                                <span className="text-[10px] font-bold text-[#0F172A]/30 uppercase tracking-widest">View Only</span>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    {role.roleName !== "System Administrator" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openEdit(role)}
                                                            className="rounded-xl border-[#0F172A]/10 text-[#0F172A] font-black text-xs hover:bg-[#7C3AED]/10 hover:border-[#7C3AED]/30 hover:text-[#7C3AED]"
                                                        >
                                                            Edit
                                                        </Button>
                                                    )}
                                                    {role.roleName !== "System Administrator" && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(role.id, role.roleName)}
                                                            className="text-[#0F172A]/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* ── Right: Permissions Side-Panel ── */}
            {editingRole && (() => {
                const isSystemAdmin = editingRole.roleName === "System Administrator";
                const roleTypeUpper = (editingRole?.roleType || "").toUpperCase();
                const allKeys = PERMISSION_GROUPS.flatMap(g =>
                    g.singleKey ? [g.singleKey] : [g.viewKey, g.editKey]
                );
                const hasUnsavedChanges = allKeys.some(key => {
                    if (key === "userControl" && roleTypeUpper !== "ADMIN" && roleTypeUpper !== "SUB_ADMIN") return false;
                    return (editPerms[key] ?? false) !== (editingRole[key] ?? false);
                });
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        className="w-72 shrink-0"
                    >
                        <Card className="card-premium border-none shadow-premium bg-white/80 backdrop-blur-xl">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">
                                            {isSystemAdmin ? "Role Permissions" : "Edit Role Permissions"}
                                        </p>
                                        <h3 className="font-black text-[#0F172A] text-base leading-tight">{editingRole.roleName}</h3>
                                        <p className="text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-widest mt-0.5">{editingRole.roleType}</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingRole(null)}
                                        className="text-[#0F172A]/30 hover:text-[#0F172A] transition-colors mt-0.5"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {isSystemAdmin ? (
                                    /* ── Locked: System Administrator ── */
                                    <>
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2">
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Fixed — Full Access (Owner)</p>
                                        </div>
                                        <div className="space-y-2">
                                            {PERMISSION_GROUPS.map(({ label, singleKey, viewKey, editKey, adminOnly }) => {
                                                if (adminOnly && roleTypeUpper !== "ADMIN" && roleTypeUpper !== "SUB_ADMIN") return null;
                                                if (singleKey) {
                                                    return (
                                                        <div key={singleKey} className="flex items-center gap-3">
                                                            <div className="h-5 w-5 rounded flex items-center justify-center border-2 bg-[#007A5E] border-[#007A5E] flex-shrink-0">
                                                                <svg viewBox="0 0 12 10" className="w-3 h-3" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                            </div>
                                                            <span className="text-sm font-bold text-[#0F172A]">{label}</span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={viewKey} className="space-y-1">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40">{label}</p>
                                                        <div className="flex gap-4 pl-1">
                                                            {[{ k: viewKey, lbl: "View" }, { k: editKey, lbl: "Edit" }].map(({ k, lbl }) => (
                                                                <div key={k} className="flex items-center gap-1.5">
                                                                    <div className="h-4 w-4 rounded flex items-center justify-center border-2 bg-[#007A5E] border-[#007A5E] flex-shrink-0">
                                                                        <svg viewBox="0 0 12 10" className="w-2.5 h-2.5" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-[#0F172A]">{lbl}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    /* ── Editable permissions ── */
                                    <>
                                        {saveError && (
                                            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 flex items-center gap-2">
                                                <AlertTriangle size={12} /> {saveError}
                                            </div>
                                        )}
                                        {hasUnsavedChanges && !saveSuccess && (
                                            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl mb-4">
                                                Unsaved changes
                                            </div>
                                        )}
                                        <div className="space-y-3 mb-6">
                                            {PERMISSION_GROUPS.map(({ label, singleKey, viewKey, editKey, adminOnly }) => {
                                                if (adminOnly && roleTypeUpper !== "ADMIN" && roleTypeUpper !== "SUB_ADMIN") return null;

                                                // ── Single-toggle rows (Sales Management, Edit/Void Sales, User Control) ──
                                                if (singleKey) {
                                                    const checked = editPerms[singleKey] ?? false;
                                                    const changed = checked !== (editingRole[singleKey] ?? false);
                                                    return (
                                                        <button
                                                            key={singleKey}
                                                            type="button"
                                                            onClick={() => setEditPerms(prev => ({ ...prev, [singleKey]: !prev[singleKey] }))}
                                                            className="flex items-center gap-3 w-full text-left group"
                                                        >
                                                            <div className={`h-5 w-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${checked ? "bg-[#007A5E] border-[#007A5E]" : "border-[#0F172A]/20 group-hover:border-[#007A5E]/50"}`}>
                                                                {checked && <svg viewBox="0 0 12 10" className="w-3 h-3" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                            </div>
                                                            <span className={`text-sm font-bold transition-colors flex-1 ${checked ? "text-[#0F172A]" : "text-[#0F172A]/50"}`}>{label}</span>
                                                            {changed && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Changed" />}
                                                        </button>
                                                    );
                                                }

                                                // ── View + Edit rows ──
                                                const viewChecked = editPerms[viewKey] ?? false;
                                                const editChecked = editPerms[editKey] ?? false;
                                                const viewChanged = viewChecked !== (editingRole[viewKey] ?? false);
                                                const editChanged = editChecked !== (editingRole[editKey] ?? false);
                                                const anyChanged = viewChanged || editChanged;

                                                const toggleView = () => setEditPerms(prev => {
                                                    const next = !prev[viewKey];
                                                    // Unchecking view also unchecks edit
                                                    return { ...prev, [viewKey]: next, [editKey]: next ? prev[editKey] : false };
                                                });
                                                const toggleEdit = () => setEditPerms(prev => {
                                                    const next = !prev[editKey];
                                                    // Checking edit also checks view
                                                    return { ...prev, [editKey]: next, [viewKey]: next ? true : prev[viewKey] };
                                                });

                                                return (
                                                    <div key={viewKey} className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-[11px] font-black uppercase tracking-widest ${(viewChecked || editChecked) ? "text-[#0F172A]/70" : "text-[#0F172A]/30"}`}>{label}</span>
                                                            {anyChanged && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Changed" />}
                                                        </div>
                                                        <div className="flex gap-3 pl-1">
                                                            {[{ key: viewKey, checked: viewChecked, label: "View", toggle: toggleView }, { key: editKey, checked: editChecked, label: "Edit", toggle: toggleEdit }].map(({ key, checked, label: btnLabel, toggle }) => (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={toggle}
                                                                    className="flex items-center gap-1.5 group"
                                                                >
                                                                    <div className={`h-4 w-4 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${checked ? "bg-[#007A5E] border-[#007A5E]" : "border-[#0F172A]/20 group-hover:border-[#007A5E]/50"}`}>
                                                                        {checked && <svg viewBox="0 0 12 10" className="w-2.5 h-2.5" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                                    </div>
                                                                    <span className={`text-xs font-bold transition-colors ${checked ? "text-[#0F172A]" : "text-[#0F172A]/40"}`}>{btnLabel}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <Button
                                            onClick={handleSavePerms}
                                            disabled={saving || !hasUnsavedChanges}
                                            className={`w-full rounded-xl py-6 font-black text-sm transition-all ${
                                                saveSuccess
                                                    ? "bg-[#007A5E] text-white"
                                                    : hasUnsavedChanges
                                                        ? "bg-[#007A5E] hover:bg-[#006B52] text-white"
                                                        : "bg-[#0F172A]/10 text-[#0F172A]/40 cursor-not-allowed"
                                            }`}
                                        >
                                            {saving ? "Saving..." : saveSuccess ? "✓ Saved!" : "Save Changes"}
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })()}

            {/* ── Create New Role Dialog ── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="glass-dark border-white/10 p-0 max-w-md text-white overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#7C3AED]/15 rounded-full blur-[60px]" />
                        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#007A5E]/15 rounded-full blur-[50px]" />
                    </div>
                    <div className="relative p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tight">Create New Role</DialogTitle>
                            <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-white/50">Define a custom role for your team</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-5">
                            {createError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                                    <AlertTriangle size={14} />{createError}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Role Name</Label>
                                <Input
                                    className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20"
                                    placeholder="e.g. Night Supervisor"
                                    value={newRole.roleName}
                                    onChange={e => setNewRole(p => ({ ...p, roleName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Role Type</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {["STAFF", "SUB_ADMIN"].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewRole(p => ({ ...p, roleType: type }))}
                                            className={`h-12 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border-2 ${
                                                newRole.roleType === type
                                                    ? type === "SUB_ADMIN"
                                                        ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg"
                                                        : "bg-[#007A5E] border-[#007A5E] text-white shadow-lg"
                                                    : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/80"
                                            }`}
                                        >
                                            {type === "STAFF" ? "👷 Staff" : "🛡️ Sub Admin"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Description</Label>
                                <Input
                                    className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20"
                                    placeholder="Brief description of responsibilities"
                                    value={newRole.description}
                                    onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button
                                    disabled={creating}
                                    type="submit"
                                    className="w-full py-7 rounded-[2rem] bg-[#7C3AED] text-white font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-amethyst border-none disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create Role"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RolePermissionsTab;

