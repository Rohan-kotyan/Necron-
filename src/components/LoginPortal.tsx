import React, { useState } from "react";
import { School, User, Lock, Award, ShieldAlert, AlertCircle, Eye, EyeOff, Mail, Hash, Layers, GraduationCap, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface LoginPortalProps {
  onLoginSuccess: (session: any) => void;
}

const BATCH_OPTIONS = ["A1", "A2", "A3", "A4"];
const SPECIALIZATION_OPTIONS = ["AI & ML", "SD", "MV"];

export default function LoginPortal({ onLoginSuccess }: LoginPortalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"student" | "lecturer" | "admin">("student");

  // Shared login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Sign-up only fields (students)
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
    // Only students can self sign-up; force login mode for staff/admin
    if (r !== "student") {
      setMode("login");
    }
  };

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError(null);
    setSignupSuccess(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all security fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupName || !signupEmail || !signupRegNo || !signupPassword || !signupConfirmPassword) {
      setError("Please fill in all sign-up fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(signupEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          registrationNumber: signupRegNo,
          batch: signupBatch,
          specialization: signupSpecialization,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not create your account.");
      }

      setSignupSuccess(true);
      // Auto-login the newly created student straight into the dashboard
      setTimeout(() => {
        onLoginSuccess(data);
      }, 900);
    } catch (err: any) {
      setError(err.message || "Something went wrong while creating your account.");
    } finally {
      setLoading(false);
    }
  };

  const triggerForgotPassword = () => {
    if (!email) {
      setError("Please enter your email/username below first.");
      return;
    }
    setForgotSent(true);
    setError(null);
    setTimeout(() => {
      setForgotSent(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#111827] rounded-3xl shadow-2xl shadow-black/60 border border-white/5 p-8 relative overflow-hidden"
      >
        {/* Decorative header element */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-900" />

        {/* Logo and Name block */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white mb-4">
            <School className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
            Veritas University
          </h1>
          <p className="text-xs font-bold text-indigo-400 tracking-wider uppercase mt-1">
            Attendance ERP Portal
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-slate-950 p-1.5 rounded-xl grid grid-cols-3 gap-1 mb-4 border border-white/[0.03]">
          {(["student", "lecturer", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => switchRole(r)}
              className={`py-2 text-xs font-bold rounded-lg capitalize transition-all duration-250 cursor-pointer ${
                role === r
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Login / Sign Up Mode Switch a students only, since staff & admin accounts are provisioned by Admin */}
        {role === "student" && (
          <div className="flex items-center justify-center gap-6 mb-6 border-b border-white/[0.05]">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border-b-2 ${
                mode === "login"
                  ? "text-indigo-400 border-indigo-500"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border-b-2 ${
                mode === "signup"
                  ? "text-indigo-400 border-indigo-500"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex gap-3 text-rose-400 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Forgot password success Toast */}
        {forgotSent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex gap-3 text-emerald-400 text-xs leading-relaxed"
          >
            <User className="w-4.5 h-4.5 shrink-0" />
            <span>A temporary reset token has been dispatched to your verified registrar email.</span>
          </motion.div>
        )}

        {/* Sign-up success Toast */}
        {signupSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex gap-3 text-emerald-400 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
            <span>Account created successfully! Signing you in...</span>
          </motion.div>
        )}

        {/* ============== LOGIN FORM ============== */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                {role === "student" ? "Reg Number or Email" : "Staff Email"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === "student" ? "e.g. 03SU25ML001" : "e.g. lecturer@college.edu"}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase">
                  Secure Password
                </label>
                <button
                  type="button"
                  onClick={triggerForgotPassword}
                  className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-bold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Quick Guidance Info Box */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-white/[0.03] flex gap-2.5 text-[11px] text-slate-400 leading-relaxed">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
              <div>
                <p className="font-bold text-slate-200">ERP quick-start demo keys:</p>
                {role === "student" && <p>Reg: <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-white border border-white/5">03SU25ML001</span> or <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-white border border-white/5">rohandd36@gmail.com</span> (Pwd: <span className="text-white">password</span>)</p>}
                {role === "lecturer" && <p>Mail: <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-white border border-white/5">lecturer@college.edu</span> (Pwd: <span className="text-white">password</span>)</p>}
                {role === "admin" && <p>Mail: <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-white border border-white/5">admin@college.edu</span> (Pwd: <span className="text-white">password</span>)</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? "AUTHORIZING SECURITY..." : `ENTER PORTAL AS ${role.toUpperCase()}`}
            </button>

            {role === "student" && (
              <p className="text-center text-xs text-slate-500">
                New student?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}
          </form>
        )}

        {/* ============== SIGN UP FORM (Students) ============== */}
        {mode === "signup" && role === "student" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Rohan Dutta"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="e.g. you@gmail.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Registration Number
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Hash className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={signupRegNo}
                  onChange={(e) => setSignupRegNo(e.target.value)}
                  placeholder="e.g. 03SU25ML045"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                  Batch
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500">
                    <Layers className="w-4.5 h-4.5" />
                  </span>
                  <select
                    value={signupBatch}
                    onChange={(e) => setSignupBatch(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    {BATCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                  Specialization
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500">
                    <GraduationCap className="w-4.5 h-4.5" />
                  </span>
                  <select
                    value={signupSpecialization}
                    onChange={(e) => setSignupSpecialization(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    {SPECIALIZATION_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showSignupPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? "CREATING ACCOUNT..." : "CREATE STUDENT ACCOUNT"}
            </button>

            <p className="text-center text-xs text-slate-500">
              Already registered?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
              >
                Log in instead
              </button>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
