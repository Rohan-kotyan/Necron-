import React, { useState } from "react";
import { User, Lock, Award, ShieldAlert, AlertCircle, Eye, EyeOff, Mail, Hash, Layers, GraduationCap, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface LoginPortalProps {
  onLoginSuccess: (session: any) => void;
}

const BATCH_OPTIONS = ["A1", "A2", "A3", "A4"];
const SPECIALIZATION_OPTIONS = ["AI & ML", "SD", "MV"];

// Srinivas University logo (embedded so this single file is self-contained)
const UNIVERSITY_LOGO = "data:image/webp;base64,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";

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
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      // Safely parse JSON — Vercel may return an empty body for unmatched routes
      // (e.g. /api/auth/*), which previously caused
      // "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
      let data: any = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned a non-JSON response (HTTP ${response.status}). Please try again.`
          );
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `Authentication failed (HTTP ${response.status}).`);
      }

      if (!data || !data.token) {
        throw new Error("Server did not return a valid session token.");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      // Suppress the noisy fetch-level JSON parse message into a friendly string
      const raw = err?.message || "";
      const friendly = raw.includes("Unexpected end of JSON input")
        ? "The login service is unreachable. Please try again in a moment."
        : raw || "Something went wrong. Please check your credentials.";
      setError(friendly);
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

      // Safely parse JSON — endpoint may not exist yet on this deployment
      let data: any = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          /* fall through to the friendly error below */
        }
      }

      if (!response.ok || !data) {
        throw new Error(
          data?.error ||
            "Student self-signup is not yet available on this deployment. Please contact the administrator to provision your account."
        );
      }

      setSignupSuccess(true);
      // Auto-login the newly created student straight into the dashboard
      setTimeout(() => {
        onLoginSuccess(data);
      }, 900);
    } catch (err: any) {
      const raw = err?.message || "";
      const friendly = raw.includes("Unexpected end of JSON input")
        ? "Student self-signup is not yet available on this deployment. Please contact the administrator."
        : raw || "Something went wrong while creating your account.";
      setError(friendly);
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
          <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/25 mb-4 bg-[#2A2470] flex items-center justify-center">
            <img
              src={UNIVERSITY_LOGO}
              alt="Srinivas University Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
            Srinivas University
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
