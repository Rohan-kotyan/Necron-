import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import LoginPortal from "./components/LoginPortal";
import StudentDashboard from "./components/StudentDashboard";
import LecturerDashboard from "./components/LecturerDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true); // default dark

  // Load session from localStorage on startup.
  useEffect(() => {
    const cached = localStorage.getItem("veritas_user_session");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Defensive: check token expiry client-side so an expired token
        // doesn't leave the user "logged in" with failing API calls.
        if (parsed?.token) {
          const parts = parsed.token.split(".");
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              const exp = payload?.exp ? payload.exp * 1000 : 0;
              if (exp && exp > Date.now()) {
                setSession(parsed);
              } else {
                localStorage.removeItem("veritas_user_session");
              }
            } catch {
              setSession(parsed);
            }
          } else {
            setSession(parsed);
          }
        }
      } catch {
        localStorage.removeItem("veritas_user_session");
      }
    }

    // Apply theme.
    const savedTheme = localStorage.getItem("veritas_theme");
    const preferDark = savedTheme ? savedTheme === "dark" : true;
    setIsDark(preferDark);
  }, []);

  // Sync theme changes with <html> class for Tailwind `dark:` variants.
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("veritas_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("veritas_theme", "light");
    }
  }, [isDark]);

  const handleLoginSuccess = (sessionData: any) => {
    setSession(sessionData);
    localStorage.setItem("veritas_user_session", JSON.stringify(sessionData));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("veritas_user_session");
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
        {!session ? (
          <LoginPortal onLoginSuccess={handleLoginSuccess} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            {session.user.role === "student" && (
              <StudentDashboard
                session={session}
                onLogout={handleLogout}
                isDark={isDark}
                onThemeToggle={toggleTheme}
              />
            )}
            {session.user.role === "lecturer" && (
              <LecturerDashboard
                session={session}
                onLogout={handleLogout}
                isDark={isDark}
                onThemeToggle={toggleTheme}
              />
            )}
            {session.user.role === "admin" && (
              <AdminDashboard
                session={session}
                onLogout={handleLogout}
                isDark={isDark}
                onThemeToggle={toggleTheme}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
