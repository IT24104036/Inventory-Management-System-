import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { getLoginHistory, unlockUser } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const SecurityActivityTab = ({ users, setUsers }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historySearch, setHistorySearch] = useState("");
    const [historyStatus, setHistoryStatus] = useState("all");

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getLoginHistory();
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch login history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filteredHistory = history.filter(h => {
        const q = historySearch.toLowerCase();
        const matchSearch = !q || (h.name || "").toLowerCase().includes(q) || (h.username || "").toLowerCase().includes(q);
        const matchStatus = historyStatus === "all" || h.status === historyStatus;
        return matchSearch && matchStatus;
    });
    const recentChanges = filteredHistory.slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F172A]/30" />
                    <input
                        type="text"
                        placeholder="Search by name or username..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        className="w-full pl-11 pr-4 h-11 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] placeholder:text-[#0F172A]/30 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                    />
                </div>
                <select
                    value={historyStatus}
                    onChange={e => setHistoryStatus(e.target.value)}
                    className="h-11 px-4 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 min-w-[160px]"
                >
                    <option value="all">All Statuses</option>
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                    <option value="Failed (Locked)">Failed (Locked)</option>
                    <option value="Failed (Role Mismatch)">Role Mismatch</option>
                </select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="card-premium p-6 border-none shadow-premium bg-white/60 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-[#0F172A]">Recent Changes</h3>
                        <Badge className="bg-[#0F172A]/5 text-[#0F172A]/60 hover:bg-[#0F172A]/10 border-none font-bold text-xs rounded-lg">Policy</Badge>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-black uppercase text-[#0F172A]/40 tracking-widest mb-2 px-2">
                            <span>Name</span>
                            <span>Time</span>
                            <span>Status</span>
                        </div>

                        <div className="space-y-4 relative">
                            {recentChanges.length > 1 && (
                                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#7C3AED]/20 rounded-full" />
                            )}

                            {loading ? (
                                <p className="text-sm text-[#0F172A]/40 text-center py-4">Loading...</p>
                            ) : recentChanges.length === 0 ? (
                                <p className="text-sm text-[#0F172A]/40 text-center py-4">No recent changes</p>
                            ) : recentChanges.map((log) => (
                                <div key={log.id} className="relative pl-8 pr-2 flex items-center justify-between">
                                    <div className={`absolute left-0 w-[22px] h-[22px] rounded-full ring-4 ring-white flex items-center justify-center ${log.status === 'Failed' ? 'bg-red-500' : 'bg-[#7C3AED]'}`} />
                                    <div className={`font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${log.status === 'Failed' ? 'bg-red-500/10 text-red-600' : 'bg-[#7C3AED]/10 text-[#7C3AED]'}`}>
                                        {log.name || log.username}
                                    </div>
                                    <div className="font-bold text-xs text-[#0F172A]/80">
                                        {new Date(log.loginTime).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </div>
                                    <div>
                                        <Badge className={`rounded-full px-2 py-0.5 font-black text-[10px] uppercase border-none ${log.status === 'Success' ? 'bg-[#007A5E] text-white' : 'bg-red-500 text-white'}`}>
                                            {log.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="card-premium p-6 border-none shadow-premium bg-white/60 backdrop-blur-xl flex flex-col justify-between h-full">
                    <div>
                        <h3 className="text-lg font-black text-[#0F172A] mb-6">Failed Login Attempts & Locks</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                            {users && users.filter(u => u.failedLoginAttempts > 0 && u.role?.toUpperCase() !== "ADMIN").length > 0 ? (
                                users.filter(u => u.failedLoginAttempts > 0 && u.role?.toUpperCase() !== "ADMIN").map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0F172A]/[0.02] border border-[#0F172A]/5">
                                        <div>
                                            <p className="font-black text-sm text-[#0F172A]">{u.name}</p>
                                            <p className="text-[10px] font-bold text-[#0F172A]/50 uppercase tracking-widest">
                                                Failed Attempts: <span className="text-red-500">{u.failedLoginAttempts}</span>
                                            </p>
                                        </div>
                                        {u.accountLocked ? (
                                            <Button 
                                                size="sm" 
                                                onClick={async () => {
                                                    try {
                                                        const updated = await unlockUser(u.id);
                                                        setUsers(prev => prev.map(user => user.id === updated.id ? updated : user));
                                                    } catch {
                                                        alert("Failed to unlock user");
                                                    }
                                                }}
                                                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-black uppercase tracking-widest rounded-lg h-7 px-3 flex-shrink-0"
                                            >
                                                Unlock
                                            </Button>
                                        ) : (
                                            <Badge className="bg-orange-100 text-orange-600 border-none text-[10px] font-black uppercase tracking-widest flex-shrink-0">Warning</Badge>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-sm font-bold text-[#0F172A]/40 mb-1">No failed attempts</p>
                                    <p className="text-[10px] font-bold text-[#0F172A]/30 uppercase tracking-widest">All accounts secure</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="card-premium p-6 border-none shadow-premium bg-white/60 backdrop-blur-xl">
                <h3 className="text-xl font-black text-[#0F172A] mb-6">Login History</h3>
                <div className="overflow-hidden rounded-2xl bg-[#0F172A]/[0.02]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-none hover:bg-transparent">
                                <TableHead className="font-black text-xs text-[#0F172A]/50 pt-4 pb-2 px-6 uppercase tracking-widest">User</TableHead>
                                <TableHead className="font-black text-xs text-[#0F172A]/50 pt-4 pb-2 uppercase tracking-widest">Date & Time</TableHead>
                                <TableHead className="font-black text-xs text-[#0F172A]/50 pt-4 pb-2 text-center px-6 uppercase tracking-widest">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : filteredHistory.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-8 font-bold text-sm text-[#0F172A]/40">No matching records</TableCell></TableRow>
                            ) : filteredHistory.map((log) => (
                                <TableRow key={log.id} className="border-none hover:bg-white/50 transition-colors">
                                    <TableCell className="px-6 py-4 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-[#0F172A]/10 flex items-center justify-center font-black text-xs text-[#0F172A]/50">
                                            {log.name ? log.name.charAt(0) : '?'}
                                        </div>
                                        <span className="font-bold text-sm">{log.name || 'Unknown'}</span>
                                    </TableCell>
                                    <TableCell className="py-4 font-bold text-sm text-[#0F172A]/70">
                                        {log.username} <span className="text-xs opacity-50 block">{new Date(log.loginTime).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-center">
                                        <Badge className={`rounded-full px-3 py-1 font-black text-[10px] uppercase border-none ${log.status === 'Success' ? 'bg-[#007A5E] text-white' : 'bg-red-500 text-white'}`}>
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default SecurityActivityTab;

