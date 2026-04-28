import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { AlertTriangle, Eye, EyeOff, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getStaffProfile, updateStaffProfile } from "@/lib/api";
import { getSessionUser, saveSession } from "@/lib/session";

const StaffProfile = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const session = getSessionUser();

    // Profile state
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState("");

    // Name edit state
    const [editName, setEditName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameSuccess, setNameSuccess] = useState(false);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    useEffect(() => {
        if (!session?.id) {
            navigate("/login", { replace: true });
            return;
        }
        const fetchProfile = async () => {
            try {
                const data = await getStaffProfile(session.id);
                const normalized = {
                    ...data,
                    displayRole: data.roleName || (data.role
                        ? data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()
                        : "Staff"),
                };
                setProfile(normalized);
                setEditName(normalized.name);
            } catch {
                setProfileError("Could not load profile. Is the backend running?");
            } finally {
                setLoadingProfile(false);
            }
        };
        fetchProfile();
    }, [navigate, session?.id]);

    const handleSaveName = async (e) => {
        e.preventDefault();
        if (!profile || !editName.trim()) return;
        if (editName.trim() === profile.name) {
            toast({ title: "No changes", description: "Display name is already up-to-date." });
            return;
        }
        setIsSavingName(true);
        setNameSuccess(false);
        try {
            const updated = await updateStaffProfile(profile.id, { name: editName.trim() });
            const normalized = {
                ...updated,
                displayRole: updated.roleName || (updated.role
                    ? updated.role.charAt(0).toUpperCase() + updated.role.slice(1).toLowerCase()
                    : "Staff"),
            };
            setProfile(normalized);
            const sess = getSessionUser();
            if (sess) {
                saveSession({ user: { ...sess, name: normalized.name } });
            }
            setNameSuccess(true);
            toast({ title: "Profile updated!", description: "Your display name has been saved." });
            setTimeout(() => setNameSuccess(false), 3000);
        } catch (err) {
            toast({ title: "Failed to save", description: err.message, variant: "destructive" });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!profile) return;
        setPasswordError("");
        setPasswordSuccess(false);
        
        if (!currentPassword) {
            setPasswordError("Please enter your current password.");
            return;
        }
        if (!newPassword) {
            setPasswordError("Please enter a new password.");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordError("New password must be different from your current password.");
            return;
        }

        setIsSavingPassword(true);
        try {
            await updateStaffProfile(profile.id, {
                currentPassword,
                newPassword,
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordSuccess(true);
            toast({ title: "Password changed!", description: "Your new password is now active." });
            setTimeout(() => setPasswordSuccess(false), 4000);
        } catch (err) {
            setPasswordError(err.message || "Failed to change password.");
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-4 border-[#007A5E] border-t-transparent rounded-full animate-spin"/>
                <p className="font-black uppercase tracking-widest text-[10px]">Loading your profile…</p>
            </div>
        );
    }

    if (profileError || !profile) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={40} className="text-red-400"/>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-black">Profile Unavailable</h2>
                    <p className="font-bold text-sm mt-1 opacity-50">{profileError || "Unknown error"}</p>
                </div>
                <Button onClick={() => window.location.reload()} className="rounded-2xl bg-[#007A5E] text-white font-black flex items-center gap-2">
                    <RefreshCw size={16}/> Retry Connection
                </Button>
            </div>
        );
    }

    const newPwdScore = newPassword ? [
        newPassword.length >= 8,
        /[A-Z]/.test(newPassword),
        /[0-9]/.test(newPassword),
        /[^A-Za-z0-9]/.test(newPassword),
    ].filter(Boolean).length : 0;
    const newPwdStrengthLabel = ["", "Too Weak", "Fair", "Good", "Strong"][newPwdScore];
    const newPwdStrengthColor = ["", "text-red-400", "text-yellow-500", "text-blue-500", "text-[#007A5E]"][newPwdScore];
    const newPwdBarColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-[#007A5E]"][newPwdScore];

    const initials = profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const joinedDate = new Date(profile.doj).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="relative min-h-screen bg-background">
          {/* ── Global Landing Page Theme Background Layer ── */}
          <div className="fixed inset-0 z-0 pointer-events-none text-red-0 opacity-60">
            <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vh] bg-[#007A5E]/10 rounded-full blur-[120px] animate-blob"/>
            <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vh] bg-[#7C3AED]/10 rounded-full blur-[120px] animate-blob" style={{ animationDelay: "2s" }}/>
            <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vh] bg-[#9D1967]/5 rounded-full blur-[100px] animate-pulse"/>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"/>
          </div>

          {/* ── Seamless floating grocery icon SVG pattern ── */}
          <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 1, opacity: 0.6 }}>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <g id="sp-apple">
                  <ellipse cx="12" cy="15" rx="7" ry="8" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M12 7 Q14 3 17 4" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
                  <path d="M12 7 Q10 5 8 6" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
                </g>
                <g id="sp-milk">
                  <rect x="6" y="9" width="12" height="14" rx="1.5" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2"/>
                  <path d="M7 9 L10 4 L14 4 L17 9 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 15 Q12 13 15 15" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="1" strokeLinecap="round"/>
                </g>
                <g id="sp-bread">
                  <path d="M4 16 Q4 9 12 9 Q20 9 20 16 L20 20 L4 20 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M7 20 L7 16" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                  <path d="M12 20 L12 15" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                  <path d="M17 20 L17 16" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9" strokeLinecap="round"/>
                </g>
                <g id="sp-yogurt">
                  <path d="M8 8 L7 20 L17 20 L16 8 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M7 11 L17 11" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="0.9"/>
                  <ellipse cx="12" cy="8" rx="4" ry="1.5" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1"/>
                </g>
                <g id="sp-barcode">
                  <rect x="4" y="6" width="16" height="14" rx="1" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1"/>
                  <line x1="7" y1="9" x2="7" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="1.2"/>
                  <line x1="9" y1="9" x2="9" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="0.7"/>
                  <line x1="11" y1="9" x2="11" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="1.4"/>
                  <line x1="13" y1="9" x2="13" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="0.8"/>
                  <line x1="15" y1="9" x2="15" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="1.2"/>
                  <line x1="17" y1="9" x2="17" y2="17" stroke="rgba(15,23,42,0.8)" strokeWidth="0.7"/>
                </g>
                <g id="sp-cart">
                  <path d="M6 8 L9 16 L18 16 L21 8 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 5 L6 5 L6 8" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="10" cy="19" r="1.5" fill="rgba(255,255,255,0.8)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1"/>
                  <circle cx="17" cy="19" r="1.5" fill="rgba(255,255,255,0.8)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1"/>
                </g>
                <g id="sp-clip">
                  <rect x="5" y="5" width="14" height="18" rx="1.5" fill="rgba(255,255,255,0.6)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.2"/>
                  <path d="M9 5 L9 3 Q12 2 15 3 L15 5" fill="rgba(255,255,255,0.8)" stroke="rgba(15,23,42,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
                  <line x1="8" y1="10" x2="16" y2="10" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9"/>
                  <line x1="8" y1="13" x2="16" y2="13" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9"/>
                  <line x1="8" y1="16" x2="13" y2="16" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9"/>
                </g>
                <pattern id="sp-tile" x="0" y="0" width="340" height="340" patternUnits="userSpaceOnUse" patternTransform="translate(0, 0)">
                  <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 -340" dur="40s" repeatCount="indefinite" />
                  <g transform="translate(20,18) rotate(-15 12 12) scale(1.15)" filter="url(#sp-gs)"><use href="#sp-apple"/></g>
                  <g transform="translate(110,30) rotate(8 12 12) scale(1.05)" filter="url(#sp-gs)"><use href="#sp-milk"/></g>
                  <g transform="translate(200,10) rotate(-22 12 12) scale(1.2)" filter="url(#sp-gs)"><use href="#sp-bread"/></g>
                  <g transform="translate(285,40) rotate(12 12 12) scale(1)" filter="url(#sp-gs)"><use href="#sp-yogurt"/></g>
                  <g transform="translate(60,105) rotate(18 12 12) scale(1.1)" filter="url(#sp-gs)"><use href="#sp-barcode"/></g>
                  <g transform="translate(155,90) rotate(-10 12 12) scale(1.15)" filter="url(#sp-gs)"><use href="#sp-cart"/></g>
                  <g transform="translate(250,100) rotate(25 12 12) scale(1)" filter="url(#sp-gs)"><use href="#sp-clip"/></g>
                  <g transform="translate(320,80) rotate(-18 12 12) scale(1.1)" filter="url(#sp-gs)"><use href="#sp-apple"/></g>
                  <g transform="translate(10,185) rotate(10 12 12) scale(1.2)" filter="url(#sp-gs)"><use href="#sp-milk"/></g>
                  <g transform="translate(105,170) rotate(-28 12 12) scale(1.05)" filter="url(#sp-gs)"><use href="#sp-bread"/></g>
                  <g transform="translate(195,190) rotate(5 12 12) scale(1.1)" filter="url(#sp-gs)"><use href="#sp-yogurt"/></g>
                  <g transform="translate(280,165) rotate(-12 12 12) scale(1.15)" filter="url(#sp-gs)"><use href="#sp-barcode"/></g>
                  <g transform="translate(55,265) rotate(-20 12 12) scale(1)" filter="url(#sp-gs)"><use href="#sp-cart"/></g>
                  <g transform="translate(150,255) rotate(15 12 12) scale(1.2)" filter="url(#sp-gs)"><use href="#sp-clip"/></g>
                  <g transform="translate(240,270) rotate(-6 12 12) scale(1.05)" filter="url(#sp-gs)"><use href="#sp-apple"/></g>
                  <g transform="translate(315,250) rotate(22 12 12) scale(1.1)" filter="url(#sp-gs)"><use href="#sp-milk"/></g>
                </pattern>
                <filter id="sp-gs" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="1"/>
                  <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.12"/>
                </filter>
              </defs>
              <rect width="100%" height="100%" fill="url(#sp-tile)"/>
            </svg>
          </div>

          {/* ── Page content on top ── */}
          <div className="relative" style={{ zIndex: 2 }}>
        <div className="max-w-[1000px] mx-auto pb-16 pt-6 px-4 sm:px-0 relative">

            <div className="relative bg-[#f9f8f6]/80 backdrop-blur-xl rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white/60 overflow-hidden">
                {/* ── Decorative background INSIDE the card ── */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    {/* Gradient mesh blobs */}
                    <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#34d399] to-[#06b6d4] opacity-[0.12] blur-[80px]" />
                    <div className="absolute top-[30%] -left-28 w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-[#a78bfa] to-[#ec4899] opacity-[0.10] blur-[80px]" />
                    <div className="absolute -bottom-24 right-[10%] w-[280px] h-[280px] rounded-full bg-gradient-to-bl from-[#f97316] to-[#eab308] opacity-[0.08] blur-[70px]" />
                    <div className="absolute bottom-[20%] -left-16 w-[220px] h-[220px] rounded-full bg-gradient-to-r from-[#06b6d4] to-[#8b5cf6] opacity-[0.08] blur-[60px]" />

                    {/* SVG line art + dots */}
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="transparent"/>
                                <stop offset="50%" stopColor="#34d399" stopOpacity="0.25"/>
                                <stop offset="100%" stopColor="transparent"/>
                            </linearGradient>
                            <linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="transparent"/>
                                <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="transparent"/>
                            </linearGradient>
                            <linearGradient id="lg3" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="transparent"/>
                                <stop offset="50%" stopColor="#f97316" stopOpacity="0.18"/>
                                <stop offset="100%" stopColor="transparent"/>
                            </linearGradient>
                        </defs>
                        {/* Sweeping curves */}
                        <path d="M 0,80 Q 25%,20 50%,60 T 100%,40" fill="none" stroke="url(#lg1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                        <path d="M 0,55% Q 30%,40% 60%,50% T 100%,38%" fill="none" stroke="url(#lg2)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                        <path d="M 0,80% Q 20%,70% 45%,76% T 100%,65%" fill="none" stroke="url(#lg3)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
                        {/* Node dots */}
                        <circle cx="25%" cy="5%" r="3.5" fill="#34d399" opacity="0.35"/>
                        <circle cx="50%" cy="8%" r="2.5" fill="#34d399" opacity="0.25"/>
                        <circle cx="78%" cy="4%" r="3" fill="#06b6d4" opacity="0.3"/>
                        <circle cx="30%" cy="45%" r="3.5" fill="#a78bfa" opacity="0.3"/>
                        <circle cx="65%" cy="48%" r="2.5" fill="#a78bfa" opacity="0.2"/>
                        <circle cx="20%" cy="72%" r="3" fill="#f97316" opacity="0.25"/>
                        <circle cx="50%" cy="78%" r="2.5" fill="#eab308" opacity="0.2"/>
                    </svg>

                    {/* Floating glass cards */}
                    <div className="absolute top-6 right-6 w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm border border-white/40 rotate-12 shadow-lg" />
                    <div className="absolute top-12 right-28 w-10 h-10 rounded-xl bg-gradient-to-br from-[#34d399]/20 to-[#06b6d4]/20 border border-white/30 -rotate-6 shadow-md" />
                    <div className="absolute bottom-32 left-4 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 rotate-6 shadow-lg" />
                    <div className="absolute bottom-16 right-8 w-12 h-12 rounded-xl bg-gradient-to-br from-[#a78bfa]/15 to-[#ec4899]/15 border border-white/25 -rotate-12 shadow-md" />
                    <div className="absolute top-[45%] left-3 w-9 h-9 rounded-lg bg-gradient-to-br from-[#f97316]/15 to-[#eab308]/15 border border-white/25 rotate-[20deg] shadow-sm" />

                    {/* Glowing rings */}
                    <div className="absolute top-8 left-6 w-20 h-20 rounded-full border-2 border-[#34d399]/15 shadow-[0_0_15px_rgba(52,211,153,0.1)]" />
                    <div className="absolute bottom-20 right-12 w-16 h-16 rounded-full border-2 border-[#a78bfa]/15 shadow-[0_0_15px_rgba(167,139,250,0.1)]" />
                    <div className="absolute top-[55%] right-4 w-12 h-12 rounded-full border border-[#f97316]/12 shadow-[0_0_12px_rgba(249,115,22,0.08)]" />

                    {/* Colored dots */}
                    <div className="absolute top-4 left-[30%] w-2 h-2 bg-[#34d399] rounded-full opacity-40" />
                    <div className="absolute top-[18%] right-[22%] w-1.5 h-1.5 bg-[#a78bfa] rounded-full opacity-35" />
                    <div className="absolute top-[38%] right-[6%] w-2.5 h-2.5 bg-[#06b6d4] rounded-full opacity-30" />
                    <div className="absolute bottom-[28%] left-[6%] w-2 h-2 bg-[#ec4899] rounded-full opacity-25" />
                    <div className="absolute bottom-8 left-[40%] w-1.5 h-1.5 bg-[#f97316] rounded-full opacity-35" />
                    <div className="absolute top-[68%] right-[18%] w-2 h-2 bg-[#34d399] rounded-full opacity-25" />
                </div>
                <h1 className="relative z-10 text-xl font-black text-black tracking-widest uppercase mb-8">MY PROFILE</h1>

                <div className="relative z-10 space-y-12">
                    {/* ── Hero Banner ───────────────────────────────────────────────────── */}
            <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 sm:p-12 rounded-[2rem] bg-gradient-to-r from-[#e6cebd] to-[#bce5d5] border-none relative overflow-hidden sm:h-[180px] flex items-center shadow-md">
                {/* Decorative lines */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none hidden sm:block">
                    <svg viewBox="0 0 400 200" className="w-full h-full text-white" stroke="currentColor" fill="none">
                        <path strokeWidth="1" d="M 50,200 L 150,100 L 250,150 L 350,50 L 450,150" />
                        <circle cx="150" cy="100" r="4" fill="currentColor" />
                        <circle cx="250" cy="150" r="4" fill="currentColor" />
                        <circle cx="350" cy="50" r="4" fill="currentColor" />
                    </svg>
                </div>
                {/* Decorative Glass Cards */}
                <div className="absolute right-[5%] top-[15%] w-10 h-10 bg-white/40 backdrop-blur-md rounded-lg sm:flex flex-col items-center justify-end pb-1 shadow-sm rotate-12 hidden">
                     <div className="flex gap-0.5 items-end h-6 px-1 w-full justify-center">
                         <div className="w-1 bg-[#EE6055] h-[60%] rounded-sm"></div>
                         <div className="w-1 bg-[#007A5E] h-[100%] rounded-sm"></div>
                         <div className="w-1 bg-[#4A90E2] h-[80%] rounded-sm"></div>
                     </div>
                     <div className="w-6 h-1 mt-1 flex gap-0.5 justify-center">
                        <div className="w-0.5 h-1 bg-black/60"/><div className="w-1 h-1 bg-black/80"/><div className="w-1.5 h-1 bg-black/70"/><div className="w-1 h-1 bg-black/90"/>
                     </div>
                </div>
                <div className="absolute right-[22%] bottom-[15%] w-12 h-10 bg-white/40 backdrop-blur-md rounded-lg sm:flex items-center justify-center shadow-sm -rotate-6 hidden">
                    <div className="flex gap-0.5 items-end px-1 pb-1">
                        <div className="w-1.5 h-6 bg-black/10 rounded-sm"></div>
                        <div className="w-1.5 h-[1.1rem] bg-black/20 rounded-sm"></div>
                        <div className="w-1.5 h-5 bg-[#4A90E2]/80 rounded-sm"></div>
                    </div>
                </div>
                <div className="absolute right-[12%] bottom-[10%] w-14 h-10 bg-white/50 backdrop-blur-md rounded-lg sm:flex flex-col justify-end pb-1 items-center shadow-md hidden">
                    <div className="flex gap-0.5 items-center justify-center h-6 mt-1">
                        <div className="w-1.5 h-6 bg-black/80 rounded-[1px]"/><div className="w-0.5 h-6 bg-black/70 rounded-[1px]"/><div className="w-1 h-6 bg-black/90 rounded-[1px]"/><div className="w-2 h-6 bg-black rounded-[1px]"/><div className="w-1 h-6 bg-black/80 rounded-[1px]"/>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 w-full">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-white/60 rounded-full blur-xl scale-[1.3] mix-blend-overlay"></div>
                        <div className="h-28 w-28 rounded-full bg-gradient-to-br from-black/[0.05] to-black/[0.15] flex items-center justify-center text-white font-black text-4xl shadow-inner relative z-10 border-[5px] border-white/40 backdrop-blur-xl">
                            {initials}
                        </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                        <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight mb-1">{profile.name}</h2>
                        <div className="flex items-center justify-center sm:justify-start gap-4 mb-3">
                            <p className="text-black/80 font-black text-[1.1rem]">@{profile.username}</p>
                            <Badge className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none ${profile.displayRole === "Admin"
                                ? "bg-purple-100/80 text-purple-800"
                                : "bg-[#c4f0d3]/80 text-[#0f5439] backdrop-blur-sm"}`}>
                                {profile.displayRole}
                            </Badge>
                        </div>
                        <p className="text-black/60 font-black text-[10px] sm:text-xs uppercase tracking-[0.15em]">
                            Member since {joinedDate}
                        </p>
                    </div>
                </div>
            </Motion.div>

            {/* ── Account Information ────────────────────────────────────────────── */}
            <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="pt-4">
                <h3 className="text-2xl font-black text-black mb-6">Account Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_0_rgba(0,0,0,0.03)] border border-black/[0.03] transition-transform hover:-translate-y-1 duration-300">
                        <p className="text-sm font-bold text-black mb-3">Username</p>
                        <p className="text-xl font-black text-black mb-1">@{profile.username}</p>
                        <p className="text-[11px] font-bold text-black/50">(Cannot be changed)</p>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_0_rgba(0,0,0,0.03)] border border-black/[0.03] transition-transform hover:-translate-y-1 duration-300">
                        <p className="text-sm font-bold text-black mb-3">Email Address</p>
                        <p className="text-base font-black text-black mb-1 break-all">{profile.email || "—"}</p>
                        <p className="text-[11px] font-bold text-black/50">(Cannot be changed)</p>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_0_rgba(0,0,0,0.03)] border border-black/[0.03] transition-transform hover:-translate-y-1 duration-300">
                        <p className="text-sm font-bold text-black mb-3">Role</p>
                        <p className="text-xl font-black text-black mb-1">{profile.displayRole}</p>
                        <p className="text-[11px] font-bold text-black/50">(Set by administrator)</p>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_0_rgba(0,0,0,0.03)] border border-black/[0.03] transition-transform hover:-translate-y-1 duration-300">
                        <p className="text-sm font-bold text-black mb-3">Date Joined</p>
                        <p className="text-xl font-black text-black mb-1">{joinedDate}</p>
                    </div>
                </div>
            </Motion.div>

            {/* ── Edit Display Name Modal ──────────────────────────────────────── */}
            <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-16 relative">
                {/* Techy background decor */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] z-0 rounded-[3rem]"></div>
                
                <div className="relative bg-white/40 backdrop-blur-[24px] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-14 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] border border-white/80 mx-auto max-w-2xl overflow-hidden z-10 hover:shadow-[0_12px_48px_0_rgba(31,38,135,0.06)] transition-all">
                    <div className="relative z-10 text-center space-y-8">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight mb-3">Display Name</h2>
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#101010]/80">Update how your name appears across the system</p>
                        </div>

                        <form onSubmit={handleSaveName} className="space-y-6 text-left w-full mx-auto pb-2">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center ml-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#101010]/80">
                                        Full Name
                                    </Label>
                                    <span className={`text-[10px] font-bold tabular-nums ${editName.length > 45 ? "text-red-400" : "text-black/30"}`}>{editName.length}/50</span>
                                </div>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    maxLength={50}
                                    placeholder="John Doe"
                                    className={`rounded-xl h-14 bg-white font-bold text-black placeholder:text-black/30 focus:ring-2 text-base sm:text-lg shadow-[0_2px_12px_0_rgba(0,0,0,0.04)] px-6 border transition-colors ${
                                        editName.length > 0 && editName.trim().length < 2
                                            ? "border-red-300 focus:ring-red-200"
                                            : editName.trim().length >= 2
                                            ? "border-[#399C7E]/50 focus:ring-[#399C7E]/30"
                                            : "border-transparent focus:ring-[#399C7E]/30"
                                    }`}
                                />
                                {editName.length > 0 && editName.trim().length < 2 && (
                                    <p className="text-[10px] font-bold text-red-500 ml-1 uppercase tracking-widest">Name must be at least 2 characters</p>
                                )}
                            </div>
                            <Button type="submit" disabled={isSavingName || !editName.trim() || editName.trim().length < 2} className="w-full mt-2 rounded-[1rem] bg-[#2E9B71] hover:bg-[#20835D] text-white font-black px-8 py-[1.7rem] shadow-xl shadow-[#2E9B71]/20 active:scale-95 transition-all disabled:opacity-50 text-[1.1rem]">
                                {isSavingName ? "Saving…" : nameSuccess ? "Saved!" : "Save Name"}
                            </Button>
                        </form>
                    </div>
                </div>
            </Motion.div>

            {/* ── Change Password Modal ────────────────────────────────────────── */}
            <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-16 relative">
                {/* Techy background decor */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] z-0 rounded-[3rem]"></div>
                
                <div className="relative bg-white/40 backdrop-blur-[24px] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-14 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] border border-white/80 mx-auto max-w-2xl overflow-hidden z-10 hover:shadow-[0_12px_48px_0_rgba(31,38,135,0.06)] transition-all">
                    <div className="relative z-10 text-center space-y-8">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight mb-3">Change Password</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#101010]/80">Minimum 8 characters • Must differ from current password</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6 text-left w-full mx-auto pb-2">
                            {/* Banners */}
                            {passwordError && (
                                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-xl flex items-center gap-2">
                                    <AlertTriangle size={14}/>
                                    {passwordError}
                                </div>
                            )}
                            {passwordSuccess && (
                                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-4 rounded-xl flex items-center gap-2">
                                    <CheckCircle2 size={14}/>
                                    Password updated successfully!
                                </div>
                            )}

                            {/* Form fields */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[#101010]/80 ml-1">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Type current password" className={`rounded-xl h-14 bg-white font-bold text-black pr-14 placeholder:text-black/30 focus:ring-2 text-base sm:text-lg shadow-[0_2px_12px_0_rgba(0,0,0,0.04)] px-6 border transition-colors ${currentPassword ? "border-[#399C7E]/50 focus:ring-[#399C7E]/30" : "border-transparent focus:ring-[#7152EA]/30"}`}/>
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-5 top-1/2 -translate-y-1/2 text-black/80 hover:text-black transition-colors bg-transparent">
                                        {showCurrent ? <EyeOff size={20} strokeWidth={2.5}/> : <Eye size={20} strokeWidth={2.5}/>}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center ml-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#101010]/80">
                                        New Password
                                    </Label>
                                    {newPassword && <span className="text-[10px] font-bold text-black/30 tabular-nums">{newPassword.length} chars</span>}
                                </div>
                                <div className="relative">
                                    <Input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        className={`rounded-xl h-14 bg-white font-bold text-black pr-14 placeholder:text-black/30 focus:ring-2 text-base sm:text-lg shadow-[0_2px_12px_0_rgba(0,0,0,0.04)] px-6 border transition-colors ${
                                            newPassword.length > 0 && newPassword.length < 8
                                                ? "border-red-300 focus:ring-red-200"
                                                : newPassword.length >= 8
                                                ? "border-[#399C7E]/50 focus:ring-[#399C7E]/30"
                                                : "border-transparent focus:ring-[#7152EA]/30"
                                        }`}
                                    />
                                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-5 top-1/2 -translate-y-1/2 text-black/80 hover:text-black transition-colors bg-transparent">
                                        {showNew ? <EyeOff size={20} strokeWidth={2.5}/> : <Eye size={20} strokeWidth={2.5}/>}
                                    </button>
                                </div>
                                {newPassword && (
                                    <div className="space-y-1 px-1">
                                        <div className="flex gap-1">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < newPwdScore ? newPwdBarColor : "bg-black/10"}`} />
                                            ))}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${newPwdStrengthColor}`}>{newPwdStrengthLabel}</p>
                                    </div>
                                )}
                                {newPassword.length > 0 && newPassword.length < 8 && (
                                    <p className="text-[10px] font-bold text-red-500 ml-1 uppercase tracking-widest">At least 8 characters required</p>
                                )}
                                {newPassword.length >= 8 && currentPassword && newPassword === currentPassword && (
                                    <p className="text-[10px] font-bold text-orange-500 ml-1 uppercase tracking-widest">Must differ from your current password</p>
                                )}
                            </div>

                            <div className="space-y-3 pb-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[#101010]/80 ml-1">
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className={`rounded-xl h-14 bg-white font-bold text-black pr-14 placeholder:text-black/30 text-base sm:text-lg shadow-[0_2px_12px_0_rgba(0,0,0,0.04)] px-6 focus:ring-2 border transition-colors ${
                                            confirmPassword && confirmPassword !== newPassword
                                                ? "border-red-300 focus:ring-red-200"
                                                : confirmPassword && confirmPassword === newPassword && newPassword.length >= 8
                                                ? "border-[#399C7E]/50 focus:ring-[#399C7E]/30"
                                                : "border-transparent focus:ring-[#7152EA]/30"
                                        }`}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-5 top-1/2 -translate-y-1/2 text-black/80 hover:text-black transition-colors bg-transparent">
                                        {showConfirm ? <EyeOff size={20} strokeWidth={2.5}/> : <Eye size={20} strokeWidth={2.5}/>}
                                    </button>
                                </div>
                                {confirmPassword && confirmPassword !== newPassword && (
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1 mt-1">Passwords don't match</p>
                                )}
                                {confirmPassword && confirmPassword === newPassword && newPassword.length >= 8 && (
                                    <p className="text-[10px] font-black text-[#007A5E] uppercase tracking-widest ml-1 mt-1">Passwords match</p>
                                )}
                            </div>

                            <Button type="submit" disabled={isSavingPassword || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword || currentPassword === newPassword} className="w-full mt-6 rounded-[1rem] bg-[#6136E7] hover:bg-[#5225D7] text-white font-black px-8 py-[1.7rem] shadow-xl shadow-[#6136E7]/20 active:scale-95 transition-all disabled:opacity-50 text-[1.1rem]">
                                {isSavingPassword ? "Updating…" : "Update Password"}
                            </Button>
                        </form>
                    </div>
                </div>
            </Motion.div>
                </div>
            </div>
        </div>
          </div>
        </div>
    );
};

export default StaffProfile;
