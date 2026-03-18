import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles, ShieldCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword, verifyOtp, resetPassword } from "@/lib/api";

const STEPS = ["email", "otp", "password", "success"];

const stepVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const otpRefs = useRef([]);
  const countdownRef = useRef(null);

  const go = (next) => {
    setDir(next > step ? 1 : -1);
    setError("");
    setStep(next);
  };

  // --- Resend OTP countdown ---
  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // --- Step 1: Request OTP ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      startCountdown();
      go(1);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- OTP input handlers ---
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // --- Step 2: Verify OTP ---
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { setError("Please enter all 6 digits."); return; }
    setIsLoading(true);
    try {
      await verifyOtp(email.trim(), code);
      go(2);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Resend OTP ---
  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError("");
    try {
      await forgotPassword(email.trim());
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      startCountdown();
    } catch (err) {
      setError(err.message || "Failed to resend. Try again.");
    } finally {
      setIsResending(false);
    }
  };

  // --- Step 3: Reset Password ---
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsLoading(true);
    try {
      await resetPassword(email.trim(), newPassword);
      go(3);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = ["Forgot Password", "Verify OTP", "New Password", "All Done!"];
  const stepSubtitles = [
    "Enter your registered email address",
    `Enter the 6-digit code sent to ${email}`,
    "Create a strong new password",
    "Your password has been reset",
  ];

  return (
    <div className="min-h-screen flex bg-background overflow-hidden relative">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#007A5E]/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED]/10 rounded-full blur-[120px] animate-blob" style={{ animationDelay: "3s" }} />
      </div>

      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative"
      >
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-20 group">
            <div className="h-12 w-12 glass p-2 rounded-xl transition-transform group-hover:rotate-12 bg-white/40">
              <InvigoLogo size={32} />
            </div>
            <span className="font-brand text-4xl text-[#0F172A]">Invigo</span>
          </Link>

          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007A5E]/10 text-[#007A5E] text-[10px] font-black uppercase tracking-[0.2em] mb-6"
            >
              <Sparkles size={12} />
              Secure Recovery
            </motion.div>
            <h2 className="font-display font-alice-bold text-5xl text-[#0F172A] leading-tight mb-6">
              Account <br />
              <span className="gradient-text">Recovery</span>
            </h2>
            <p className="text-xl text-[#0F172A]/70 leading-relaxed font-medium">
              We'll send a one-time code to your registered email to verify your identity and reset your password securely.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="relative z-10 flex gap-4 items-center">
          {["Email", "OTP", "Password", "Done"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                i < step ? "bg-[#007A5E] text-white" :
                i === step ? "bg-[#0F172A] text-white ring-4 ring-[#007A5E]/30" :
                "bg-white/60 text-[#0F172A]/40 border border-[#0F172A]/10"
              }`}>
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-bold hidden xl:block ${i === step ? "text-[#0F172A]" : "text-[#0F172A]/40"}`}>{label}</span>
              {i < 3 && <div className={`w-8 h-px transition-all duration-500 ${i < step ? "bg-[#007A5E]" : "bg-[#0F172A]/10"}`} />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right: Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md card-premium p-10 rounded-[3rem] relative z-20 overflow-hidden"
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 h-1 bg-[#007A5E]/10 w-full rounded-t-[3rem]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#007A5E] to-[#7C3AED] rounded-t-[3rem]"
              animate={{ width: `${((step) / 3) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Step header */}
          <div className="text-center mb-8 mt-2">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h1 className="font-display font-alice-bold text-3xl text-[#0F172A] mb-2">{stepTitles[step]}</h1>
                <p className="text-[#0F172A]/60 font-medium tracking-tight text-sm">{stepSubtitles[step]}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait" custom={dir}>
            {/* STEP 0: Email */}
            {step === 0 && (
              <motion.form
                key="email-step"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="space-y-6"
                onSubmit={handleEmailSubmit}
              >
                {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold text-center border border-red-100">{error}</div>}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 block px-1">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0F172A]/30 group-focus-within:text-[#007A5E] transition-colors" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-12 h-14 rounded-2xl bg-white/50 focus:bg-white focus:ring-2 transition-all font-bold text-[#0F172A] ${
                        email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                          ? "border-red-400 focus:ring-red-200"
                          : email
                          ? "border-[#007A5E] focus:ring-[#007A5E]/20"
                          : "border-[#0F172A]/10 focus:ring-[#007A5E]/20"
                      }`}
                    />
                  </div>
                  {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                    <p className="text-xs text-red-500 font-bold px-1 mt-1">Invalid email address</p>
                  )}
                  {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                    <p className="text-xs text-[#007A5E] font-bold px-1 mt-1">Valid email address</p>
                  )}
                </div>
                <Button disabled={isLoading || (!!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))} type="submit" className="w-full h-14 rounded-2xl bg-[#0F172A] hover:bg-[#007A5E] text-white font-black text-base shadow-xl transition-all flex items-center justify-center gap-3 group disabled:opacity-50">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (<>Send OTP Code <ArrowRight className="group-hover:translate-x-2 transition-transform" /></>)}
                </Button>
                <p className="text-xs text-center text-[#0F172A]/50 font-bold px-2">
                  Don't have an email on file? Contact your administrator to reset your password.
                </p>
                <div className="text-center">
                  <Link to="/login" className="inline-flex items-center gap-1 text-sm font-black text-[#7C3AED] hover:text-[#0F172A] transition-colors">
                    <ArrowLeft size={14} /> Back to Login
                  </Link>
                </div>
              </motion.form>
            )}

            {/* STEP 1: OTP */}
            {step === 1 && (
              <motion.form
                key="otp-step"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="space-y-6"
                onSubmit={handleOtpSubmit}
              >
                {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold text-center border border-red-100">{error}</div>}

                {/* OTP boxes */}
                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <motion.input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 bg-white/60 outline-none transition-all duration-200 text-[#0F172A] ${
                        digit
                          ? "border-[#007A5E] bg-[#007A5E]/5 shadow-md shadow-[#007A5E]/10"
                          : "border-[#0F172A]/15 focus:border-[#007A5E] focus:bg-white focus:ring-2 focus:ring-[#007A5E]/20"
                      }`}
                    />
                  ))}
                </div>

                <Button disabled={isLoading || otp.join("").length !== 6} type="submit" className="w-full h-14 rounded-2xl bg-[#0F172A] hover:bg-[#007A5E] text-white font-black text-base shadow-xl transition-all flex items-center justify-center gap-3 group disabled:opacity-50">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (<>Verify Code <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" /></>)}
                </Button>

                {/* Resend */}
                <div className="text-center space-y-1">
                  <p className="text-xs text-[#0F172A]/40 font-medium">Didn't receive the code?</p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0 || isResending}
                    className="inline-flex items-center gap-2 text-sm font-black text-[#7C3AED] hover:text-[#0F172A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={13} className={isResending ? "animate-spin" : ""} />
                    {isResending ? "Sending..." : countdown > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        Resend in
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-black tabular-nums">{countdown}</span>s
                      </span>
                    ) : "Resend OTP"}
                  </button>
                </div>

                <div className="text-center">
                  <button type="button" onClick={() => go(0)} className="inline-flex items-center gap-1 text-sm font-black text-[#0F172A]/40 hover:text-[#0F172A] transition-colors">
                    <ArrowLeft size={14} /> Change email
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 2: New Password */}
            {step === 2 && (
              <motion.form
                key="password-step"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="space-y-5"
                onSubmit={handlePasswordSubmit}
              >
                {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold text-center border border-red-100">{error}</div>}

                {/* New Password */}
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 block px-1">New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0F172A]/30 group-focus-within:text-[#7C3AED] transition-colors" />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`pl-12 pr-12 h-14 rounded-2xl bg-white/50 focus:bg-white focus:ring-2 transition-all font-bold text-[#0F172A] ${
                        newPassword && newPassword.length < 8
                          ? "border-red-400 focus:ring-red-200"
                          : newPassword
                          ? "border-[#007A5E] focus:ring-[#7C3AED]/20"
                          : "border-[#0F172A]/10 focus:ring-[#7C3AED]/20"
                      }`}
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0F172A]/30 hover:text-[#0F172A] transition-colors">
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {newPassword && newPassword.length < 8 && (
                    <p className="text-xs text-red-500 font-bold px-1">At least 8 characters required</p>
                  )}
                </div>

                {/* Password strength bar + requirements */}
                {newPassword && (
                  <div className="space-y-2 px-1">
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                          i < Math.min(Math.floor(newPassword.length / 3), 4)
                            ? newPassword.length < 8 ? "bg-red-400"
                            : newPassword.length < 12 ? "bg-yellow-400"
                            : "bg-[#007A5E]"
                            : "bg-[#0F172A]/10"
                        }`} />
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${
                        newPassword.length < 8 ? "text-red-400"
                        : newPassword.length < 12 ? "text-yellow-500"
                        : "text-[#007A5E]"
                      }`}>
                        {newPassword.length < 8 ? "Too short" : newPassword.length < 12 ? "Fair" : "Strong"}
                      </p>
                      <span className="text-[10px] font-bold text-[#0F172A]/30 tabular-nums">{newPassword.length} chars</span>
                    </div>
                    <div className="space-y-1 pt-0.5">
                      {[
                        { label: "At least 8 characters", met: newPassword.length >= 8 },
                        { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(newPassword) },
                        { label: "One number (0–9)", met: /[0-9]/.test(newPassword) },
                        { label: "One special character (!@#…)", met: /[^A-Za-z0-9]/.test(newPassword) },
                      ].map(({ label, met }) => (
                        <div key={label} className="flex items-center gap-2">
                          <CheckCircle2 size={11} className={`transition-colors flex-shrink-0 ${met ? "text-[#007A5E]" : "text-[#0F172A]/20"}`} />
                          <span className={`text-[10px] font-bold transition-colors ${met ? "text-[#007A5E]" : "text-[#0F172A]/40"}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 block px-1">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0F172A]/30 group-focus-within:text-[#7C3AED] transition-colors" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-12 pr-12 h-14 rounded-2xl bg-white/50 focus:bg-white focus:ring-2 transition-all font-bold text-[#0F172A] ${
                        confirmPassword && confirmPassword !== newPassword
                          ? "border-red-400 focus:ring-red-200"
                          : confirmPassword && confirmPassword === newPassword
                          ? "border-[#007A5E] focus:ring-[#7C3AED]/20"
                          : "border-[#0F172A]/10 focus:ring-[#7C3AED]/20"
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0F172A]/30 hover:text-[#0F172A] transition-colors">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 font-bold px-1">Passwords do not match</p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && newPassword.length >= 6 && (
                    <p className="text-xs text-[#007A5E] font-bold px-1">Passwords match</p>
                  )}
                </div>

                <Button
                  disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-[#0F172A] hover:bg-[#007A5E] text-white font-black text-base shadow-xl transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (<>Reset Password <ArrowRight className="group-hover:translate-x-2 transition-transform" /></>)}
                </Button>
              </motion.form>
            )}

            {/* STEP 3: Success */}
            {step === 3 && (
              <motion.div
                key="success-step"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="text-center space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#007A5E] to-[#0F172A] flex items-center justify-center shadow-2xl shadow-[#007A5E]/30"
                >
                  <CheckCircle2 className="text-white" size={44} />
                </motion.div>
                <div>
                  <p className="text-[#0F172A]/60 font-medium text-sm leading-relaxed">
                    Your password has been reset successfully.<br />You can now log in with your new password.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full h-14 rounded-2xl bg-[#0F172A] hover:bg-[#007A5E] text-white font-black text-base shadow-xl transition-all flex items-center justify-center gap-3 group"
                >
                  Go to Login <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-xs text-[#0F172A]/40 font-brand">
            Powered by Invigo Gen3 Analytics
          </p>
        </motion.div>
      </div>
    </div>
  );
}