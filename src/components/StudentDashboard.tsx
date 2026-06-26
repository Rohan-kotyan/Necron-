import React, { useState, useEffect } from "react";
import {
  User, Award, Calendar, BookOpen, AlertCircle, CheckCircle2, LogOut, Download
} from "lucide-react";
import { motion } from "motion/react";
import StudentCharts from "./StudentCharts";
import TimetableView from "./TimetableView";
import { apiFetch } from "../lib/apiFetch";
import type { TimetableEntry } from "../types";

interface UserSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student';
    registrationNumber: string;
    batch: string;
    specialization: string;
  };
}

interface StudentDashboardProps {
  session: UserSession;
  onLogout: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export default function StudentDashboard({ session, onLogout }: StudentDashboardProps) {
  const { user } = session;
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timetable state — populated from the role-aware /api/timetable endpoint
  // (sends JWT, scopes to student's batch on the server).
  const [ttEntries, setTtEntries] = useState<TimetableEntry[]>([]);
  const [ttLoading, setTtLoading] = useState(true);
  const [ttError, setTtError] = useState<string | null>(null);

  // Single combined data load — no more duplicate fetches.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [subjectsData, attendanceData, ttData] = await Promise.all([
          apiFetch<{ subjects: any[] }>("/api/data?type=subjects"),
          apiFetch<{ attendance: any[] }>(`/api/attendance?type=student&id=${user.id}`),
          apiFetch<{ timetable: TimetableEntry[] }>("/api/timetable"),
        ]);
        if (cancelled) return;
        setSubjects(subjectsData.subjects || []);
        setAttendanceRecords(attendanceData.attendance || []);
        setTtEntries(ttData.timetable || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load your data.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTtLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id, user.batch]);

  // Compute subject-by-subject statistics from REAL attendance records.
  // Removed the HIDDEN_SUBJECTS denylist — that was a hack masking typos
  // in seed data. Fix the seed data instead.
  const subjectStats = subjects
    .filter((sub) => sub.id !== "BREAK")
    .map((sub) => {
      const studentRecords = attendanceRecords.filter(
        (a) => a.subjectId === sub.id
      );
      const total = studentRecords.length;
      const present = studentRecords.filter((a) => a.status === "Present").length;
      const percentage = total > 0 ? (present / total) * 100 : 0;
      const status: "Safe" | "Below Requirement" = percentage >= 75 ? "Safe" : "Below Requirement";

      let calculationText = "";
      if (total === 0) {
        calculationText = "No lecture attendance records logged yet.";
      } else if (percentage < 75) {
        const needed = Math.max(1, Math.ceil(3 * total - 4 * present));
        calculationText = `You must attend the next ${needed} lectures continuously to reach 75%.`;
      } else {
        const allowedMiss = Math.max(0, Math.floor((4 * present - 3 * total) / 3));
        if (allowedMiss === 0) {
          calculationText = "You are right at the border. Do not miss any upcoming lectures.";
        } else {
          calculationText = `You can miss the next ${allowedMiss} lectures and still remain above 75% attendance.`;
        }
      }

      return {
        id: sub.id,
        subjectName: sub.name,
        present,
        total,
        percentage,
        status,
        calculationText,
      };
    });

  // Calculate overall statistics from REAL records.
  const totalClasses = attendanceRecords.length;
  const attendedClasses = attendanceRecords.filter((a) => a.status === "Present").length;
  const overallPercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

  // Monthly stats — derived from REAL attendance records by date, not hardcoded.
  // Group by YYYY-MM, compute percentage per month.
  const monthlyData = (() => {
    const byMonth = new Map<string, { present: number; total: number }>();
    for (const r of attendanceRecords) {
      const m = String(r.date).slice(0, 7); // YYYY-MM
      if (!m) continue;
      const cur = byMonth.get(m) || { present: 0, total: 0 };
      cur.total++;
      if (r.status === "Present") cur.present++;
      byMonth.set(m, cur);
    }
    const monthNames: Record<string, string> = {
      "01": "January", "02": "February", "03": "March", "04": "April",
      "05": "May", "06": "June", "07": "July", "08": "August",
      "09": "September", "10": "October", "11": "November", "12": "December",
    };
    return Array.from(byMonth.entries())
      .sort()
      .slice(-6) // last 6 months
      .map(([ym, stats]) => {
        const [year, month] = ym.split("-");
        const pct = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
        return {
          month: `${monthNames[month] || month} ${year}`,
          percentage: Math.round(pct * 10) / 10,
          classes: stats.total,
        };
      });
  })();

  const triggerPrintSummary = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 transition-colors duration-300 font-sans">
      {/* Header Bar */}
      <header className="bg-[#0B1120]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 sticky top-0 z-20 print:hidden flex justify-between items-center shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            <User className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-md font-bold text-white tracking-tight">Veritas Student Dashboard</h2>
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">{user.batch} batch</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={triggerPrintSummary}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-white/5 bg-slate-900/60 hover:bg-indigo-600 hover:text-white text-slate-300 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Save Ledger (PDF)</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-950/70 border border-rose-900/40 cursor-pointer transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Printable Header */}
        <div className="hidden print:block text-center border-b-2 border-slate-800 pb-6 mb-8 mt-4">
          <h1 className="text-3xl font-extrabold text-slate-900">VERITAS COLLEGE ERP SYSTEM</h1>
          <p className="text-sm tracking-widest text-slate-500 uppercase mt-1">Official Student Academic Attendance Ledger</p>
          <div className="grid grid-cols-2 text-left text-xs mt-6 gap-2 max-w-xl mx-auto border p-4 rounded-xl bg-slate-50 text-slate-800">
            <p><span className="font-bold">Student Name:</span> {user.name}</p>
            <p><span className="font-bold">Registration Number:</span> {user.registrationNumber}</p>
            <p><span className="font-bold">Batch Code:</span> {user.batch}</p>
            <p><span className="font-bold">Major Specialization:</span> {user.specialization}</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex gap-3 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Personal Badge Card */}
        <section className="bg-gradient-to-tr from-[#111827] via-[#0B1120] to-[#1e1b4b] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold tracking-wider uppercase">
                <Award className="w-3.5 h-3.5" />
                Enrollment active
              </div>
              <h1 className="text-2.5xl sm:text-3.5xl font-black text-white tracking-tight">{user.name}</h1>
              <div className="flex flex-wrap gap-y-1.5 gap-x-4 text-xs font-semibold text-slate-400">
                <p>Registration No: <span className="font-mono text-indigo-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">{user.registrationNumber}</span></p>
                <p>Academic Batch: <span className="text-slate-200 bg-white/5 px-2 py-0.5 rounded border border-white/5">{user.batch}</span></p>
                <p>Major Specialization: <span className="text-indigo-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{user.specialization}</span></p>
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 flex gap-6 border border-white/5 w-full sm:w-auto shadow-inner">
              <div className="text-center sm:text-left">
                <div className="text-2.5xl sm:text-3.5xl font-black text-emerald-400">
                  {overallPercentage > 0 ? `${overallPercentage.toFixed(1)}%` : "0.0%"}
                </div>
                <div className="text-[10px] tracking-wider text-slate-400 uppercase font-bold mt-1.5">Average Attendance</div>
              </div>
              <div className="border-l border-white/5 pl-6 text-center sm:text-left">
                <div className="text-2.5xl sm:text-3.5xl font-black text-slate-200">
                  {attendedClasses}/{totalClasses}
                </div>
                <div className="text-[10px] tracking-wider text-slate-400 uppercase font-bold mt-1.5 font-sans">Lectures Logged</div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="p-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="text-xs uppercase tracking-widest text-[#6366f1] font-bold">Consolidating attendance analytics...</span>
          </div>
        ) : (
          <>
            {/* Charts Section */}
            <section className="print:hidden">
              <StudentCharts
                subjectData={subjectStats}
                monthlyData={monthlyData}
                overallPercentage={overallPercentage}
              />
            </section>

            {/* Subject-wise Cards */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Subject-wise Detailed Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {subjectStats.length === 0 && (
                  <div className="col-span-2 p-8 text-center text-slate-500 text-sm">
                    No subjects found. Ask your administrator to import the timetable.
                  </div>
                )}
                {subjectStats.map((stat) => {
                  const isSafe = stat.percentage >= 75;
                  return (
                    <div
                      key={stat.id}
                      className="bg-[#0B1120] rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/40 border border-white/5 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Course Subject</span>
                            <h4 className="text-base sm:text-lg font-bold text-white mt-0.5 break-words leading-snug">{stat.subjectName}</h4>
                          </div>
                          <div className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border whitespace-nowrap ${
                            isSafe
                              ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400"
                              : "bg-rose-950/20 border-rose-900/50 text-rose-400"
                          }`}>
                            {isSafe ? "Safe" : "Below Requirement"}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-end text-xs font-semibold gap-2">
                            <span className="text-slate-400 font-sans font-bold">Attended: {stat.present}/{stat.total} slots</span>
                            <span className={`shrink-0 ${isSafe ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}`}>
                              {stat.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/[0.03]">
                            <div
                              className={`h-full rounded-full transition-all duration-350 ${isSafe ? "bg-emerald-500" : "bg-rose-500"}`}
                              style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className={`mt-5 p-3.5 rounded-2xl text-xs flex gap-3 border ${
                        isSafe
                          ? "bg-slate-900/40 border-white/[0.03] text-slate-300"
                          : "bg-rose-950/10 border-rose-900/20 text-rose-300"
                      }`}>
                        {isSafe ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span className="font-medium leading-relaxed break-words">{stat.calculationText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Timetable */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Timetable Registry (Batch {user.batch})</span>
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-full">
                  Read-only · Student View
                </span>
              </div>

              <TimetableView
                entries={ttEntries}
                loading={ttLoading}
                error={ttError}
                badge={`Batch ${user.batch}`}
                initialBatch={user.batch}
                batches={[user.batch]}
              />
            </section>
          </>
        )}
      </main>

      <footer className="py-12 mt-12 bg-slate-950 border-t border-white/5 text-center text-[10px] text-slate-500 font-bold tracking-widest uppercase print:hidden">
        Veritas University ERP • Managed Securely with HTTPS & AES Token Signatures
      </footer>
    </div>
  );
}
