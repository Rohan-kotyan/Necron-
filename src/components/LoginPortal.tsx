import React, { useState, useEffect, useRef } from "react";
import {
  User, Lock, Award, ShieldAlert, AlertCircle, Eye, EyeOff,
  Mail, Hash, Layers, GraduationCap, CheckCircle2, Sparkles,
  Shield, BookOpen, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";

interface LoginPortalProps {
  onLoginSuccess: (session: any) => void;
}

const BATCH_OPTIONS = ["A1", "A2", "A3", "A4"];
const SPECIALIZATION_OPTIONS = ["AI & ML", "SD", "MV"];

const UNIVERSITY_LOGO = "data:image/jpeg;base64,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";

// ─── Floating particle background ───
function ParticleField() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 6,
    duration: Math.random() * 10 + 8,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated grid overlay ───
function GridLines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}

// ─── Glow orb ───
function GlowOrb({ x, y, color }: { x: string; y: string; color: string }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none blur-3xl opacity-20"
      style={{
        left: x,
        top: y,
        width: 300,
        height: 300,
        background: color,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}

// ─── Input field component ───
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
    >
      <label className="block text-[10px] font-bold text-slate-500 tracking-[0.15em] uppercase mb-1.5">
        {label}
      </label>
      <div className="relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors duration-200">
          {icon}
        </span>
        {children}
      </div>
    </motion.div>
  );
}

const inputCls =
  "w-full pl-11 pr-4 py-3 rounded-xl border border-white/[0.07] bg-[#080E1C] text-slate-100 text-sm focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200 placeholder:text-slate-700 hover:border-white/10";

export default function LoginPortal({ onLoginSuccess }: LoginPortalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"student" | "lecturer" | "admin">("student");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRegNo, setSignupRegNo] = useState("");
  const [signupBatch, setSignupBatch] = useState(BATCH_OPTIONS[0]);
  const [signupSpecialization, setSignupSpecialization] = useState(SPECIALIZATION_OPTIONS[0]);
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const switchRole = (r: "student" | "lecturer" | "admin") => {
    setRole(r);
    setError(null);
    if (r !== "student") setMode("login");
  };

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError(null);
    setSignupSuccess(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      let data: any = null;
      const text = await response.text();
      if (text) {
        try { data = JSON.parse(text); } catch {
          throw new Error(`Server returned a non-JSON response (HTTP ${response.status}).`);
        }
      }
      if (!response.ok) throw new Error(data?.error || `Authentication failed (HTTP ${response.status}).`);
      if (!data || !data.token) throw new Error("Server did not return a valid session token.");
      onLoginSuccess(data);
    } catch (err: any) {
      const raw = err?.message || "";
      setError(raw.includes("Unexpected end of JSON input")
        ? "The login service is unreachable. Please try again."
        : raw || "Something went wrong. Please check your credentials.");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupRegNo || !signupPassword || !signupConfirmPassword) {
      setError("Please fill in all sign-up fields."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) { setError("Enter a valid email address."); return; }
    if (signupPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (signupPassword !== signupConfirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/auth/signup/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName, email: signupEmail, password: signupPassword,
          registrationNumber: signupRegNo, batch: signupBatch, specialization: signupSpecialization,
        }),
      });
      let data: any = null;
      const text = await response.text();
      if (text) { try { data = JSON.parse(text); } catch { /* ignore */ } }
      if (!response.ok || !data) throw new Error(data?.error || "Student self-signup is not yet available. Contact the administrator.");
      setSignupSuccess(true);
      setTimeout(() => onLoginSuccess(data), 900);
    } catch (err: any) {
      const raw = err?.message || "";
      setError(raw.includes("Unexpected end of JSON input")
        ? "Student self-signup is not yet available. Please contact the administrator."
        : raw || "Something went wrong while creating your account.");
    } finally { setLoading(false); }
  };

  const triggerForgotPassword = () => {
    if (!email) { setError("Enter your email or username first."); return; }
    setForgotSent(true); setError(null);
    setTimeout(() => setForgotSent(false), 5000);
  };

  const roleConfig = {
    student: { icon: <BookOpen className="w-3.5 h-3.5" />, label: "Student", color: "from-violet-600 to-indigo-600" },
    lecturer: { icon: <Award className="w-3.5 h-3.5" />, label: "Lecturer", color: "from-indigo-600 to-blue-600" },
    admin: { icon: <ShieldAlert className="w-3.5 h-3.5" />, label: "Admin", color: "from-blue-600 to-cyan-600" },
  };

  return (
    <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background layers */}
      <GridLines />
      <ParticleField />
      <GlowOrb x="20%" y="25%" color="radial-gradient(circle, #6366f1, transparent 70%)" />
      <GlowOrb x="80%" y="70%" color="radial-gradient(circle, #3b82f6, transparent 70%)" />
      <GlowOrb x="60%" y="10%" color="radial-gradient(circle, #8b5cf6, transparent 70%)" />

      {/* Animated scanline */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none"
        animate={{ y: ["0vh", "100vh"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="relative bg-[#0A1020]/90 backdrop-blur-xl rounded-3xl border border-white/[0.06] shadow-2xl shadow-black/80 overflow-hidden">
          {/* Top chromatic stripe */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
          <motion.div
            className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 rounded-t-3xl"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="p-8">
            {/* ── Header ── */}
            <motion.div
              className="flex flex-col items-center mb-8 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              {/* Logo ring */}
              <div className="relative mb-5">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "conic-gradient(from 0deg, #6366f1, #3b82f6, #8b5cf6, #6366f1)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative m-[2px] w-[72px] h-[72px] rounded-full bg-[#0A1020] overflow-hidden flex items-center justify-center p-1">
                  <img
                    src={UNIVERSITY_LOGO}
                    alt="Srinivas University"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                {/* Sparkle */}
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/50"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </motion.div>
              </div>

              <h1 className="text-xl font-black text-white tracking-tight leading-tight">
                Srinivas University
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-indigo-500/50" />
                <p className="text-[10px] font-bold text-indigo-400/80 tracking-[0.2em] uppercase">
                  Attendance ERP Portal
                </p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-indigo-500/50" />
              </div>
            </motion.div>

            {/* ── Role Selector ── */}
            <div className="bg-[#060C18] p-1 rounded-2xl grid grid-cols-3 gap-1 mb-5 border border-white/[0.04]">
              {(["student", "lecturer", "admin"] as const).map((r, i) => (
                <motion.button
                  key={r}
                  type="button"
                  onClick={() => switchRole(r)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 + 0.25 }}
                  className={`py-2.5 px-1 flex flex-col items-center gap-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    role === r
                      ? `bg-gradient-to-br ${roleConfig[r].color} text-white shadow-lg`
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {roleConfig[r].icon}
                  {roleConfig[r].label}
                </motion.button>
              ))}
            </div>

            {/* ── Mode Switch (students only) ── */}
            <AnimatePresence>
              {role === "student" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center gap-8 mb-6 border-b border-white/[0.04] pb-0 overflow-hidden"
                >
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className={`pb-3.5 text-[10px] font-bold tracking-[0.15em] uppercase transition-all cursor-pointer border-b-2 ${
                        mode === m
                          ? "text-indigo-400 border-indigo-500"
                          : "text-slate-600 border-transparent hover:text-slate-400"
                      }`}
                    >
                      {m === "login" ? "Sign In" : "Register"}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Toasts ── */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="mb-5 p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/30 flex gap-2.5 text-rose-400 text-xs leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
              {forgotSent && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex gap-2.5 text-emerald-400 text-xs leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>A reset link has been dispatched to your verified registrar email.</span>
                </motion.div>
              )}
              {signupSuccess && (
                <motion.div
                  key="signup-ok"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex gap-2.5 text-emerald-400 text-xs leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Account created! Signing you in…</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══════════════ LOGIN FORM ══════════════ */}
            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.form
                  key="login"
                  onSubmit={handleLogin}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <Field label={role === "student" ? "Reg Number or Email" : "Staff Email"} icon={<User className="w-4 h-4" />}>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === "student" ? "e.g. 03SU25ML001" : "e.g. lecturer@college.edu"}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Password" icon={<Lock className="w-4 h-4" />}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </Field>

                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={triggerForgotPassword}
                      className="text-[10px] text-indigo-400/70 hover:text-indigo-300 font-bold tracking-wide cursor-pointer transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Demo keys hint */}
                  <div className="p-3.5 bg-[#060C18] rounded-xl border border-white/[0.04] flex gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                    <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500/70" />
                    <div>
                      <p className="font-semibold text-slate-400 mb-0.5">Demo credentials</p>
                      {role === "student" && (
                        <p>
                          <span className="font-mono bg-[#0A1020] text-slate-300 px-1.5 py-0.5 rounded border border-white/[0.05] text-[10px]">03SU25ML001</span>{" "}
                          or{" "}
                          <span className="font-mono bg-[#0A1020] text-slate-300 px-1.5 py-0.5 rounded border border-white/[0.05] text-[10px]">rohandd36@gmail.com</span>{" "}
                          — pwd: <span className="text-slate-300 font-semibold">password</span>
                        </p>
                      )}
                      {role === "lecturer" && (
                        <p>
                          <span className="font-mono bg-[#0A1020] text-slate-300 px-1.5 py-0.5 rounded border border-white/[0.05] text-[10px]">lecturer@college.edu</span>{" "}
                          — pwd: <span className="text-slate-300 font-semibold">password</span>
                        </p>
                      )}
                      {role === "admin" && (
                        <p>
                          <span className="font-mono bg-[#0A1020] text-slate-300 px-1.5 py-0.5 rounded border border-white/[0.05] text-[10px]">admin@college.edu</span>{" "}
                          — pwd: <span className="text-slate-300 font-semibold">password</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full h-12 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 relative overflow-hidden ${
                      loading
                        ? "bg-indigo-800/60 cursor-not-allowed"
                        : `bg-gradient-to-r ${roleConfig[role].color} hover:brightness-110 shadow-indigo-900/40`
                    }`}
                  >
                    {!loading && (
                      <motion.div
                        className="absolute inset-0 bg-white/10"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                        <span>Authenticating…</span>
                      </div>
                    ) : (
                      <>
                        <span className="tracking-wide">Access Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>

                  {role === "student" && (
                    <p className="text-center text-[11px] text-slate-600">
                      New student?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("signup")}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                      >
                        Create an account
                      </button>
                    </p>
                  )}
                </motion.form>
              )}

              {/* ══════════════ SIGNUP FORM ══════════════ */}
              {mode === "signup" && role === "student" && (
                <motion.form
                  key="signup"
                  onSubmit={handleSignup}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5"
                >
                  <Field label="Full Name" icon={<User className="w-4 h-4" />}>
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Rohan Dutta"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Email Address" icon={<Mail className="w-4 h-4" />}>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="e.g. you@gmail.com"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Registration Number" icon={<Hash className="w-4 h-4" />}>
                    <input
                      type="text"
                      value={signupRegNo}
                      onChange={(e) => setSignupRegNo(e.target.value)}
                      placeholder="e.g. 03SU25ML045"
                      className={inputCls}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Batch" icon={<Layers className="w-4 h-4" />}>
                      <select
                        value={signupBatch}
                        onChange={(e) => setSignupBatch(e.target.value)}
                        className={`${inputCls} appearance-none cursor-pointer`}
                      >
                        {BATCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                    <Field label="Specialization" icon={<GraduationCap className="w-4 h-4" />}>
                      <select
                        value={signupSpecialization}
                        onChange={(e) => setSignupSpecialization(e.target.value)}
                        className={`${inputCls} appearance-none cursor-pointer`}
                      >
                        {SPECIALIZATION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Password" icon={<Lock className="w-4 h-4" />}>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </Field>

                  <Field label="Confirm Password" icon={<Lock className="w-4 h-4" />}>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={inputCls}
                    />
                  </Field>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 relative overflow-hidden ${
                      loading
                        ? "bg-indigo-800/60 cursor-not-allowed"
                        : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 shadow-lg shadow-indigo-900/40"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                        <span>Creating Account…</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span className="tracking-wide">Create Account</span>
                      </>
                    )}
                  </motion.button>

                  <p className="text-center text-[11px] text-slate-600">
                    Already registered?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                    >
                      Sign in instead
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom footer strip */}
          <div className="px-8 py-3.5 border-t border-white/[0.04] bg-[#060C18]/60 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
            <span className="text-[10px] text-slate-600 font-medium tracking-wide">
              Secure connection · Srinivas University ERP v2.0
            </span>
          </div>
        </div>

        {/* Below-card glow reflection */}
        <div className="h-px mx-8 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent mt-0" />
      </motion.div>
    </div>
  );
}
