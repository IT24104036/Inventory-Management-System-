import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronsUpDown, ChevronUp, Edit2, Eye, EyeOff, Search, Trash2, Users } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUsers, createUser, updateUser, deleteUser, getRoles } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
const StaffGovernanceTab = ({ users, setUsers, openCreateSignal, rolesRefreshToken }) => {
    // Global View State
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [globalError, setGlobalError] = useState("");
    // All available roles (for the dropdown)
    const [availableRoles, setAvailableRoles] = useState([]);
    // Create State
    const [createOpen, setCreateOpen] = useState(false);
    const [formData, setFormData] = useState({ username: "", password: "", name: "", doj: "", role: "STAFF", roleName: "", email: "" });
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [createEmailTouched, setCreateEmailTouched] = useState(false);
    // Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [editPassword, setEditPassword] = useState("");
    const [editError, setEditError] = useState("");
    const [editEmailTouched, setEditEmailTouched] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const sessionUser = getSessionUser() || {};
    const pwdScore = (pwd) => {
        if (!pwd) return 0;
        return [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)].filter(Boolean).length;
    };
    const isSystemAdmin = (user) => user.roleName === "System Administrator";
    const today = new Date().toISOString().split('T')[0];
    const [staffSearch, setStaffSearch] = useState("");
    const [staffRoleFilter, setStaffRoleFilter] = useState("all");
    const [dojFrom, setDojFrom] = useState("");
    const [dojTo, setDojTo] = useState("");
    const [dojError, setDojError] = useState("");
    const [sortCol, setSortCol] = useState("name");
    const [sortDir, setSortDir] = useState("asc");
    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortCol(col); setSortDir("asc"); }
    };
    // Load Initial Users + Available Roles
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            setGlobalError("");
            try {
                const data = await getUsers();
                const normalizedData = data.map(user => ({
                    ...user,
                    role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : "Staff"
                }));
                setUsers(normalizedData);
            }
            catch (err) {
                console.error("Failed to load users:", err);
                setGlobalError("Could not connect to the backend to load users.");
            }
            finally {
                setLoadingUsers(false);
            }
        };
        const fetchRoles = async () => {
            try {
                const rolesData = await getRoles();
                setAvailableRoles(rolesData);
            } catch (err) {
                console.error("Failed to load roles", err);
            }
        };
        if (users.length === 0) {
            fetchUsers();
        }
        fetchRoles();
    }, [rolesRefreshToken, setUsers, users.length]);

    useEffect(() => {
        if (openCreateSignal > 0) {
            setCreateOpen(true);
            setError("");
            setFormData({ username: "", password: "", name: "", doj: "", role: "STAFF", roleName: "", email: "" });
            setCreateEmailTouched(false);
        }
    }, [openCreateSignal]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError("");
        if (!formData.username || !formData.name || !formData.doj || !formData.email) {
            setError("Please fill in username, full name, work email, and joining date.");
            return;
        }
        if (formData.name.trim().length < 2 || formData.name.trim().length > 50) {
            setError("Full name must be between 2 and 50 characters.");
            return;
        }
        if (formData.password && (formData.password.length < 8 || formData.password.length > 30)) {
            setError("Temporary password must be between 8 and 30 characters, or leave it blank.");
            return;
        }
        if (formData.doj > today) {
            setError("Joining date cannot be a future date.");
            return;
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setCreateEmailTouched(true);
            setError("Please enter a valid email address.");
            return;
        }
        setIsCreating(true);
        try {
            const matchedRole = availableRoles.find(r => r.roleName === formData.roleName);
            const roleType = matchedRole?.roleType?.toUpperCase() || "";
            const routeRole = (roleType === "ADMIN" || roleType === "SUB_ADMIN") ? "ADMIN" : "STAFF";
            const payload = {
                ...formData,
                role: routeRole,
                roleName: formData.roleName,
            };
            const newUser = await createUser(payload);
            if (newUser.role) {
                newUser.role = newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1).toLowerCase();
            }
            setUsers((prev) => [...prev, newUser]);
            setCreateOpen(false);
            setFormData({ username: "", password: "", name: "", doj: "", role: "STAFF", roleName: "", email: "" });
            setCreateEmailTouched(false);
        }
        catch (err) {
            setError(err.message || "Failed to create user");
        }
        finally {
            setIsCreating(false);
        }
    };
    const openEdit = (user) => {
        setEditData({ ...user });
        setEditPassword("");
        setEditError("");
        setEditEmailTouched(false);
        setEditOpen(true);
    };
    const handleEdit = async (e) => {
        e.preventDefault();
        if (!editData)
            return;
        const editingSelf = editData.id === sessionUser.id;
        if (!editingSelf) {
            if (!editData.username || !editData.name || !editData.doj) {
                setEditError("Please fill in all required fields.");
                return;
            }
            if (editData.name.trim().length < 2 || editData.name.trim().length > 50) {
                setEditError("Full name must be between 2 and 50 characters.");
                return;
            }
            if (editData.doj > today) {
                setEditError("Joining date cannot be a future date.");
                return;
            }
        }
        if (editData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email)) {
            setEditEmailTouched(true);
            setEditError("Please enter a valid email address.");
            return;
        }
        if (editPassword && (editPassword.length < 8 || editPassword.length > 30)) {
            setEditError("Password must be between 8 and 30 characters.");
            return;
        }
        if (editingSelf && !editPassword) {
            setEditError("Please enter a new password.");
            return;
        }
        setIsEditing(true);
        try {
            const payload = { ...editData };
            if (editPassword)
                payload.password = editPassword;
            const matchedRole = availableRoles.find(r => r.roleName === editData.roleName);
            const roleType = matchedRole?.roleType?.toUpperCase() || "";
            payload.role = (roleType === "ADMIN" || roleType === "SUB_ADMIN") ? "ADMIN" : "STAFF";
            const updatedUser = await updateUser(editData.id, payload);
            // Fix casing for local state
            if (updatedUser.role) {
                updatedUser.role = updatedUser.role.charAt(0).toUpperCase() + updatedUser.role.slice(1).toLowerCase();
            }
            setUsers((prev) => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            setEditOpen(false);
        }
        catch (err) {
            setEditError(err.message || "Failed to update user");
        }
        finally {
            setIsEditing(false);
        }
    };
    const handleRevoke = async (id, name) => {
        if (confirm(`Are you sure you want to revoke network access for ${name}? This cannot be undone.`)) {
            try {
                await deleteUser(id);
                setUsers((prev) => prev.filter(u => u.id !== id));
            }
            catch (err) {
                alert("Failed to revoke access: " + err.message);
            }
        }
    };
    return (<div className="space-y-6">

      {globalError && (<div className="bg-red-50 p-4 rounded-2xl flex items-center justify-between border border-red-100">
          <div className="flex items-center gap-3 text-red-600 font-bold text-sm">
            <AlertTriangle size={18}/>
            {globalError}
          </div>
          <Button size="sm" variant="outline" className="border-red-200 text-red-700 bg-white" onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>)}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F172A]/30" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={staffSearch}
              onChange={e => setStaffSearch(e.target.value)}
              className="w-full pl-11 pr-4 h-11 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] placeholder:text-[#0F172A]/30 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            />
          </div>
          <select
            value={staffRoleFilter}
            onChange={e => setStaffRoleFilter(e.target.value)}
            className="h-11 px-4 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 min-w-[160px]"
          >
            <option value="all">All Roles</option>
            {availableRoles.filter(r => r.roleName !== "System Administrator").map(r => <option key={r.id} value={r.roleName}>{r.roleName}</option>)}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]/40 whitespace-nowrap">DOJ From</span>
            <input
              type="date"
              max={dojTo || today}
              value={dojFrom}
              onChange={e => {
                const val = e.target.value;
                if (dojTo && val > dojTo) {
                  setDojError("Start date cannot be after end date.");
                } else {
                  setDojError("");
                }
                setDojFrom(val);
              }}
              className="flex-1 h-11 px-4 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 [color-scheme:light]"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]/40 whitespace-nowrap">DOJ To</span>
            <input
              type="date"
              min={dojFrom || undefined}
              max={today}
              value={dojTo}
              onChange={e => {
                const val = e.target.value;
                if (dojFrom && val < dojFrom) {
                  setDojError("End date cannot be before start date.");
                } else {
                  setDojError("");
                }
                setDojTo(val);
              }}
              className="flex-1 h-11 px-4 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 [color-scheme:light]"
            />
          </div>
          {(dojFrom || dojTo) && (
            <button
              onClick={() => { setDojFrom(""); setDojTo(""); setDojError(""); }}
              className="h-11 px-4 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A]/50 hover:text-red-500 hover:border-red-200 transition-colors whitespace-nowrap"
            >
              Clear Dates
            </button>
          )}
        </div>
        {dojError && <p className="text-xs font-bold text-red-500 ml-1">{dojError}</p>}
      </div>

      <Card className="card-premium p-0 border-none shadow-premium overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#0F172A]/[0.02]">
              <TableRow className="border-[#0F172A]/5">
                {[
                  { col: "name", label: "Identity", cls: "px-8" },
                  { col: "role", label: "Role", cls: "" },
                  { col: "doj",  label: "Entry Date", cls: "" },
                ].map(({ col, label, cls }) => (
                  <TableHead key={col} className={`${cls} font-black uppercase text-[10px] tracking-widest cursor-pointer select-none`} onClick={() => handleSort(col)}>
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {sortCol === col
                        ? sortDir === "asc" ? <ChevronUp size={12} className="text-[#7C3AED]" /> : <ChevronDown size={12} className="text-[#7C3AED]" />
                        : <ChevronsUpDown size={12} className="opacity-30" />}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Network Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (<TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="w-8 h-8 mx-auto border-4 border-[#007A5E] border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-[#0F172A]/40 font-bold uppercase tracking-widest text-[10px]">Syncing with Mainframe...</p>
                  </TableCell>
                </TableRow>) : users.length === 0 && !globalError ? (<TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Users size={32} className="mx-auto text-[#0F172A]/20 mb-3"/>
                    <p className="text-[#0F172A]/40 font-bold text-sm">No personnel records found.</p>
                  </TableCell>
                </TableRow>) : (users.filter(u => {
                const q = staffSearch.toLowerCase();
                const matchSearch = !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                const matchRole = staffRoleFilter === "all" || (u.roleName || u.role) === staffRoleFilter;
                const userDoj = u.doj ? u.doj.slice(0, 10) : "";
                const matchFrom = !dojFrom || (!dojError && userDoj >= dojFrom);
                const matchTo = !dojTo || (!dojError && userDoj <= dojTo);
                return matchSearch && matchRole && matchFrom && matchTo;
              }).sort((a, b) => {
                let aVal, bVal;
                if (sortCol === "name") { aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); }
                else if (sortCol === "role") { aVal = (a.roleName || a.role).toLowerCase(); bVal = (b.roleName || b.role).toLowerCase(); }
                else if (sortCol === "doj") { aVal = a.doj || ""; bVal = b.doj || ""; }
                if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
                return 0;
              }).map((user) => (<TableRow key={user.id} className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors">
                    <TableCell className="px-8 flex items-center gap-4 py-6">
                      <div className="h-12 w-12 rounded-2xl bg-[#0F172A]/5 flex items-center justify-center font-black text-[#0F172A]/40">
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-black text-[#0F172A]">{user.name}</p>
                        <p className="text-[11px] font-black text-[#007A5E] bg-[#007A5E]/8 rounded-lg px-2 py-0.5 inline-block mt-0.5">@{user.username}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${user.role === "Admin" ? "bg-purple-100 text-purple-600" : "bg-emerald-100 text-emerald-600"}`}>
                        {user.roleName || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-sm text-[#0F172A]/60">
                      {new Date(user.doj).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit: allowed only for self (password change) or non-admin users */}
                        {(!isSystemAdmin(user) || user.id === sessionUser.id) && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title={user.id === sessionUser.id ? "Change your password" : "Edit staff member"} className="text-[#0F172A]/40 hover:text-[#007A5E] hover:bg-[#007A5E]/10 rounded-xl transition-all">
                            <Edit2 size={16}/>
                          </Button>
                        )}
                        {/* Delete: not allowed for any admin account */}
                        {!isSystemAdmin(user) && (
                          <Button variant="ghost" size="icon" onClick={() => handleRevoke(user.id, user.name)} className="text-[#0F172A]/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                            <Trash2 size={16}/>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>)))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateEmailTouched(false); }}>
        <DialogContent className="bg-[#2C2C2E] border border-white/10 rounded-2xl p-0 max-w-xl text-white overflow-hidden shadow-none">
          <div className="relative p-10">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-black tracking-tight">Onboard Staff Member</DialogTitle>
              <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-white/50">Create access and let the user set a password securely</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-6">
            {error && (<div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14}/>
                {error}
              </div>)}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Username</Label>
                </div>
                <Input className="rounded-2xl bg-white/5 h-12 border-white/10 focus:bg-white/10 text-white transition-none placeholder:text-white/20" placeholder="e.g. jdoe" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}/>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Temporary Password <span className="normal-case opacity-60">(optional)</span></Label>
                  <span className={`text-[10px] font-bold tabular-nums ${formData.password.length > 30 ? "text-red-400" : formData.password.length >= 8 ? "text-emerald-400" : "text-white/30"}`}>{formData.password.length}/30</span>
                </div>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} maxLength={30} className="rounded-2xl bg-white/5 h-12 border-white/10 focus:bg-white/10 text-white transition-none pr-10 placeholder:text-white/20" placeholder="Leave blank to force secure password setup" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {formData.password.length > 0 && formData.password.length < 8 && <p className="text-[10px] text-red-400 font-bold ml-1">Min 8 characters required if you set a temporary password</p>}
                {formData.password.length >= 8 && (() => {
                  const score = pwdScore(formData.password);
                  const barColor = ["","bg-red-500/70","bg-yellow-400/70","bg-blue-400/70","bg-emerald-400"][score];
                  const labelColor = ["","text-red-400","text-yellow-400","text-blue-400","text-emerald-400"][score];
                  const label = ["","Weak","Fair","Good","Strong"][score];
                  return (
                    <div className="space-y-1.5 mt-1">
                      <div className="flex gap-1">
                        {[...Array(4)].map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < score ? barColor : "bg-white/10"}`}/>)}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>{label}</p>
                      <div className="space-y-0.5 pt-0.5">
                        {[
                          { label: "At least 8 characters", met: formData.password.length >= 8 },
                          { label: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
                          { label: "One number (0-9)", met: /[0-9]/.test(formData.password) },
                          { label: "One special character", met: /[^A-Za-z0-9]/.test(formData.password) },
                        ].map(({ label, met }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <CheckCircle2 size={10} className={`flex-shrink-0 transition-colors ${met ? "text-emerald-400" : "text-white/20"}`}/>
                            <span className={`text-[10px] font-bold transition-colors ${met ? "text-emerald-400" : "text-white/30"}`}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1 mb-0">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Full Name</Label>
                <span className={`text-[10px] font-bold ${formData.name.length > 50 ? "text-red-400" : formData.name.length >= 2 ? "text-emerald-400" : "text-white/30"}`}>{formData.name.length}/50</span>
              </div>
              <Input maxLength={50} className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}/>
              {formData.name.length > 0 && formData.name.trim().length < 2 && <p className="text-[10px] text-red-400 font-bold ml-1">Min 2 characters required</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Work Email Address <span className="normal-case opacity-60">(required for secure onboarding)</span></Label>
              <Input type="email" className={`rounded-2xl bg-white/5 h-12 focus:bg-white/10 text-white transition-none placeholder:text-white/20 ${createEmailTouched && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? "border-red-500/60" : formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? "border-emerald-500/60" : "border-white/10"}`} placeholder="staff@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onBlur={() => setCreateEmailTouched(true)}/>
              {createEmailTouched && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && <p className="text-[10px] text-red-400 font-bold ml-1">Invalid email address</p>}
              {formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && <p className="text-[10px] text-emerald-400 font-bold ml-1">Valid email address</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Joining Date</Label>
              <Input type="date" max={today} className="rounded-2xl bg-white/5 h-12 border-white/10 text-white [color-scheme:dark]" value={formData.doj} onChange={e => setFormData({ ...formData, doj: e.target.value })}/>
              {formData.doj && formData.doj > today && <p className="text-[10px] text-red-400 font-bold ml-1">Joining date cannot be a future date</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">System Permissions / Role</Label>
              <Select
                value={formData.roleName}
                onValueChange={(v) => setFormData({ ...formData, roleName: v })}
              >
                <SelectTrigger className="rounded-2xl bg-white/5 h-12 border-white/10 font-bold text-white">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-[#0F172A] text-white border-white/10 max-h-60 overflow-y-auto">
                  {availableRoles.filter(r => r.roleName !== "System Administrator").length === 0 ? (
                    <SelectItem value="__none__" disabled>No roles found - add in Role Permissions tab</SelectItem>
                  ) : availableRoles.filter(r => r.roleName !== "System Administrator").map(r => (
                    <SelectItem key={r.id} value={r.roleName}>{r.roleName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-6">
              <Button disabled={isCreating} type="submit" className="w-full py-8 rounded-[2rem] bg-[#007A5E] text-white font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl border-none disabled:opacity-50">
                {isCreating ? "Configuring Access..." : "Activate Professional Account"}
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#2C2C2E] border border-white/10 rounded-2xl p-0 max-w-xl text-white overflow-hidden shadow-none">
          <div className="relative p-10">
          {editData?.id === sessionUser.id ? (
            /* -- Self-edit: password only -- */
            <>
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-black tracking-tight">Change Your Password</DialogTitle>
                <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-white/50">Update your admin account password</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-6">
                {editError && (<div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={14}/>
                    {editError}
                  </div>)}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">New Password</Label>
                    {editPassword.length > 0 && <span className={`text-[10px] font-bold tabular-nums ${editPassword.length > 30 ? "text-red-400" : editPassword.length >= 8 ? "text-emerald-400" : "text-white/30"}`}>{editPassword.length}/30</span>}
                  </div>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} maxLength={30} className="rounded-2xl bg-white/5 h-12 border-white/10 focus:bg-white/10 text-white transition-none pr-10 placeholder:text-white/20" placeholder="Min. 8 characters" value={editPassword} onChange={e => setEditPassword(e.target.value)}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1">
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {editPassword.length > 0 && editPassword.length < 8 && <p className="text-[10px] text-red-400 font-bold ml-1">Min 8 characters required</p>}
                  {editPassword.length >= 8 && (() => {
                    const score = pwdScore(editPassword);
                    const barColor = ["","bg-red-500/70","bg-yellow-400/70","bg-blue-400/70","bg-emerald-400"][score];
                    const labelColor = ["","text-red-400","text-yellow-400","text-blue-400","text-emerald-400"][score];
                    const label = ["","Weak","Fair","Good","Strong"][score];
                    return (
                      <div className="space-y-1.5 mt-1">
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < score ? barColor : "bg-white/10"}`}/>)}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>{label}</p>
                        <div className="space-y-0.5 pt-0.5">
                          {[
                            { label: "At least 8 characters", met: editPassword.length >= 8 },
                            { label: "One uppercase letter", met: /[A-Z]/.test(editPassword) },
                            { label: "One number (0-9)", met: /[0-9]/.test(editPassword) },
                            { label: "One special character", met: /[^A-Za-z0-9]/.test(editPassword) },
                          ].map(({ label, met }) => (
                            <div key={label} className="flex items-center gap-1.5">
                              <CheckCircle2 size={10} className={`flex-shrink-0 transition-colors ${met ? "text-emerald-400" : "text-white/20"}`}/>
                              <span className={`text-[10px] font-bold transition-colors ${met ? "text-emerald-400" : "text-white/30"}`}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <DialogFooter className="pt-6">
                  <Button disabled={isEditing} type="button" variant="ghost" onClick={() => setEditOpen(false)} className="py-8 rounded-[2rem] text-white hover:bg-white/5 font-black text-lg transition-all border-none px-8">
                    Cancel
                  </Button>
                  <Button disabled={isEditing || editPassword.length < 8} type="submit" className="flex-1 py-8 rounded-[2rem] bg-[#7C3AED] text-white font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-amethyst border-none disabled:opacity-50">
                    {isEditing ? "Saving..." : "Update Password"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            /* -- Staff edit: full form -- */
            <>
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-black tracking-tight">Edit Staff Member</DialogTitle>
                <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-white/50">Update system credentials and permissions</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-6">
                {editError && (<div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={14}/>
                    {editError}
                  </div>)}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Full Name</Label>
                      <span className={`text-[10px] font-bold ${(editData?.name?.length || 0) > 50 ? "text-red-400" : (editData?.name?.length || 0) >= 2 ? "text-emerald-400" : "text-white/30"}`}>{editData?.name?.length || 0}/50</span>
                    </div>
                    <Input maxLength={50} className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20" value={editData?.name || ""} onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : null)}/>
                    {editData?.name?.length > 0 && editData?.name?.trim().length < 2 && <p className="text-[10px] text-red-400 font-bold ml-1">Min 2 characters required</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Username</Label>
                    <Input className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20" value={editData?.username || ""} onChange={e => setEditData(prev => prev ? { ...prev, username: e.target.value } : null)}/>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Email Address <span className="normal-case opacity-60">(for password recovery)</span></Label>
                  <Input type="email" className={`rounded-2xl bg-white/5 h-12 focus:bg-white/10 text-white transition-none placeholder:text-white/20 ${editEmailTouched && editData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email) ? "border-red-500/60" : editData?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email) ? "border-emerald-500/60" : "border-white/10"}`} placeholder="staff@example.com" value={editData?.email || ""} onChange={e => setEditData(prev => prev ? { ...prev, email: e.target.value } : null)} onBlur={() => setEditEmailTouched(true)}/>
                  {editEmailTouched && editData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email) && <p className="text-[10px] text-red-400 font-bold ml-1">Invalid email address</p>}
                  {editData?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email) && <p className="text-[10px] text-emerald-400 font-bold ml-1">Valid email address</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">New Password <span className="normal-case opacity-60">(leave blank to keep current)</span></Label>
                    {editPassword.length > 0 && <span className={`text-[10px] font-bold tabular-nums ${editPassword.length > 30 ? "text-red-400" : editPassword.length >= 8 ? "text-emerald-400" : "text-white/30"}`}>{editPassword.length}/30</span>}
                  </div>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} maxLength={30} className="rounded-2xl bg-white/5 h-12 border-white/10 focus:bg-white/10 text-white transition-none pr-10 placeholder:text-white/20" placeholder="Leave blank to keep current" value={editPassword} onChange={e => setEditPassword(e.target.value)}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1">
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {editPassword.length > 0 && editPassword.length < 8 && <p className="text-[10px] text-red-400 font-bold ml-1">Min 8 characters required</p>}
                  {editPassword.length >= 8 && (() => {
                    const score = pwdScore(editPassword);
                    const barColor = ["","bg-red-500/70","bg-yellow-400/70","bg-blue-400/70","bg-emerald-400"][score];
                    const labelColor = ["","text-red-400","text-yellow-400","text-blue-400","text-emerald-400"][score];
                    const label = ["","Weak","Fair","Good","Strong"][score];
                    return (
                      <div className="space-y-1.5 mt-1">
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < score ? barColor : "bg-white/10"}`}/>)}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>{label}</p>
                        <div className="space-y-0.5 pt-0.5">
                          {[
                            { label: "At least 8 characters", met: editPassword.length >= 8 },
                            { label: "One uppercase letter", met: /[A-Z]/.test(editPassword) },
                            { label: "One number (0-9)", met: /[0-9]/.test(editPassword) },
                            { label: "One special character", met: /[^A-Za-z0-9]/.test(editPassword) },
                          ].map(({ label, met }) => (
                            <div key={label} className="flex items-center gap-1.5">
                              <CheckCircle2 size={10} className={`flex-shrink-0 transition-colors ${met ? "text-emerald-400" : "text-white/20"}`}/>
                              <span className={`text-[10px] font-bold transition-colors ${met ? "text-emerald-400" : "text-white/30"}`}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Joining Date</Label>
                    <Input type="date" max={today} className="rounded-2xl bg-white/5 h-12 border-white/10 text-white [color-scheme:dark]" value={editData?.doj || ""} onChange={e => setEditData(prev => prev ? { ...prev, doj: e.target.value } : null)}/>
                    {editData?.doj && editData?.doj > today && <p className="text-[10px] text-red-400 font-bold ml-1">Joining date cannot be a future date</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">System Permissions / Role</Label>
                    <Select
                      value={editData?.roleName || ""}
                      onValueChange={(v) => setEditData(prev => prev ? { ...prev, roleName: v } : null)}
                    >
                      <SelectTrigger className="rounded-2xl bg-white/5 h-12 border-white/10 font-bold text-white">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl bg-[#0F172A] text-white border-white/10 max-h-60 overflow-y-auto">
                        {availableRoles.filter(r => r.roleName !== "System Administrator").length === 0 ? (
                          <SelectItem value="__none__" disabled>No roles found</SelectItem>
                        ) : availableRoles.filter(r => r.roleName !== "System Administrator").map(r => (
                          <SelectItem key={r.id} value={r.roleName}>{r.roleName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="pt-6">
                  <Button disabled={isEditing} type="button" variant="ghost" onClick={() => setEditOpen(false)} className="py-8 rounded-[2rem] text-white hover:bg-white/5 font-black text-lg transition-all border-none px-8">
                    Cancel
                  </Button>
                  <Button disabled={isEditing} type="submit" className="flex-1 py-8 rounded-[2rem] bg-[#7C3AED] text-white font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-amethyst border-none disabled:opacity-50">
                    {isEditing ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>);
};
export default StaffGovernanceTab;



