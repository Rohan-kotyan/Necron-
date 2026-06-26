import React, { useState, useEffect, useMemo } from "react";
import {
  Users, BookOpen, Calendar, Clock, BarChart3, ChevronRight, CheckCircle2, XCircle, Search,
  ArrowLeft, Download, ShieldCheck, Printer, LogOut, AlertTriangle, FileSpreadsheet, Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import TimetableEditor from "./TimetableEditor";
import { apiFetch } from "../lib/apiFetch";
import type { TimetableEntry } from "../types";

interface UserSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'lecturer';
  };
}

interface LecturerDashboardProps {
  session: UserSession;
  onLogout: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export default function LecturerDashboard({ session, onLogout }: LecturerDashboardProps) {
  const { user } = session;
  const [activeTab, setActiveTab] = useState<"take_attendance" | "reports" | "timetable">("take_attendance");

  const [batchStep, setBatchStep] = useState<number>(1);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("");

  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [timetableList, setTimetableList] = useState<TimetableEntry[]>([]);
  const [callingIndex, setCallingIndex] = useState<number>(0);
  // Records: undefined = unmarked, "Present" | "Absent" = marked.
  // Old code defaulted everyone to "Present" which silently faked attendance.
  const [records, setRecords] = useState<{ [studentId: string]: 'Present' | 'Absent' | undefined }>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reporting states
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [reportSubjectFilter, setReportSubjectFilter] = useState("all");
  const [reportBatchFilter, setReportBatchFilter] = useState("all");
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load subjects + attendance history ONCE on mount — previously this was
  // re-fetching on every batchStep change AND every activeTab change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [subsRes, histRes] = await Promise.all([
          apiFetch<{ subjects: any[] }>("/api/data?type=subjects"),
          apiFetch<{ history: any[] }>("/api/attendance?type=history"),
        ]);
        if (cancelled) return;
        setSubjectsList(subsRes.subjects || []);
        setAttendanceHistory(histRes.history || []);
      } catch (err: any) {
        if (!cancelled) setDataError(err.message || "Failed to load data.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the timetable for the selected batch when the lecturer enters Step 2.
  // This replaces the hardcoded `batch1Timetable` of fake subjects.
  const batchSubjects = useMemo(() => {
    if (!selectedBatch) return [];
    return timetableList
      .filter((t) => t.batch === selectedBatch && t.subjectId !== "BREAK")
      .map((t) => ({
        id: t.subjectId,
        name: t.subjectName || t.subjectId,
        time: t.time,
        day: t.day,
      }));
  }, [timetableList, selectedBatch]);

  useEffect(() => {
    if (batchStep === 2 && selectedBatch) {
      apiFetch<{ timetable: TimetableEntry[] }>(
        `/api/timetable?batch=${encodeURIComponent(selectedBatch)}`
      )
        .then((data) => setTimetableList(data.timetable || []))
        .catch((err) => console.error("Failed to load timetable for batch", err));
    }
  }, [batchStep, selectedBatch]);

  // Today's classes — derived from the real timetable for today's weekday.
  // Replaces the hardcoded "Artificial Intelligence · Batch A1 · Monday 10:00 AM" cards.
  const todayClasses = useMemo(() => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return timetableList
      .filter((t) => t.day === today && t.subjectId !== "BREAK")
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        subjectName: t.subjectName || t.subjectId,
        batch: t.batch,
        time: t.time,
        lecturerName: t.lecturerName,
      }));
  }, [timetableList]);

  // Fetch student roster for the selected batch + specialization.
  const fetchActiveRoster = async () => {
    try {
      const data = await apiFetch<{ students: any[] }>(
        `/api/data?type=students&batch=${encodeURIComponent(selectedBatch)}&specialization=${encodeURIComponent(selectedSpecialization)}`
      );
      const loadedStudents = data.students || [];
      setStudentsList(loadedStudents);

      // Default to UNMARKED — old code defaulted to "Present" which silently
      // recorded every student as present if the lecturer navigated away.
      const initial: { [key: string]: 'Present' | 'Absent' | undefined } = {};
      loadedStudents.forEach((s: any) => {
        initial[s.id] = undefined;
      });
      setRecords(initial);
      setCallingIndex(0);
      setBatchStep(4);
    } catch (err: any) {
      console.error("Failed to load roster", err);
      setSaveError(err.message || "Failed to load roster.");
    }
  };

  // Submit attendance to the backend. Fixed:
  //   • Use LOCAL date (UTC caused wrong-day bucketing).
  //   • Surface server errors via saveError (old code silently swallowed !res.ok).
  //   • Only include students that were actually marked.
  const saveAttendanceToDatabase = async () => {
    // Require explicit marking — refuse to save if any student is unmarked.
    const unmarkedCount = Object.values(records).filter((v) => v === undefined).length;
    if (unmarkedCount > 0) {
      setSaveError(`${unmarkedCount} student(s) are not yet marked. Mark everyone as Present or Absent before saving.`);
      return;
    }

    setSavingAttendance(true);
    setSaveError(null);
    try {
      const formattedRecords = Object.keys(records)
        .filter((sid) => records[sid] !== undefined)
        .map((studentId) => ({
          studentId,
          status: records[studentId] as 'Present' | 'Absent',
        }));

      // Local date in YYYY-MM-DD — NOT new Date().toISOString() which is UTC
      // and lands on the wrong day in timezones east of UTC for late classes.
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      await apiFetch("/api/attendance", {
        method: "POST",
        body: {
          subjectId: selectedSubject.id,
          date: localDate,
          batch: selectedBatch,
          specialization: selectedSpecialization,
          records: formattedRecords,
        },
      });

      setSaveComplete(true);
      setSaveError(null);
      setTimeout(() => {
        setBatchStep(1);
        setSelectedBatch("");
        setSelectedSubject(null);
        setSelectedSpecialization("");
        setRecords({});
        setSaveComplete(false);
      }, 2000);

      // Refresh history in the background.
      apiFetch<{ history: any[] }>("/api/attendance?type=history")
        .then((data) => setAttendanceHistory(data.history || []))
        .catch(() => {});
    } catch (err: any) {
      // Surface the error — old code silently swallowed failures.
      setSaveError(err.message || "Failed to save attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const markIndividualStudent = (status: 'Present' | 'Absent') => {
    const student = studentsList[callingIndex];
    if (student) {
      setRecords((prev) => ({ ...prev, [student.id]: status }));
    }
    if (callingIndex < studentsList.length - 1) {
      setCallingIndex(callingIndex + 1);
    } else {
      setBatchStep(5);
    }
  };

  const totalInBatch = studentsList.length;
  const markedCount = Object.values(records).filter((v) => v !== undefined).length;
  const presentCount = Object.values(records).filter((v) => v === 'Present').length;
  const absentCount = Object.values(records).filter((v) => v === 'Absent').length;
  const attendancePct = totalInBatch > 0 ? (presentCount / totalInBatch) * 100 : 0;

  // CSV export with injection-safe escaping. Cells starting with = + - @ are
  // prefixed with a single quote so Excel/Sheets doesn't evaluate them.
  const csvEscape = (val: any): string => {
    if (val == null) return "";
    const s = String(val);
    if (/^[=+\-@]/.test(s)) return `'${s}`;
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportToCSV = () => {
    const headers = "Date,Student ID,Student Name,Reg No,Batch,Specialization,Subject,Status,Lecturer\n";
    const filteredHistory = attendanceHistory.filter((h) => {
      const matchesSearch = h.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            h.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubj = reportSubjectFilter === "all" || h.subjectId === reportSubjectFilter;
      const matchesBatch = reportBatchFilter === "all" || h.batch === reportBatchFilter;
      return matchesSearch && matchesSubj && matchesBatch;
    });

    const rows = filteredHistory.map((h) =>
      [h.date, h.studentId, h.studentName, h.registrationNumber, h.batch, h.specialization, h.subjectName, h.status, h.lecturerName]
        .map(csvEscape)
        .join(",")
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Veritas_Attendance_Log_${selectedBatch || "All"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 transition-colors duration-300 font-sans">

      <header className="bg-[#0B1120]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 sticky top-0 z-30 print:hidden flex justify-between items-center shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-md font-bold text-white tracking-tight">Veritas Lecturer Workspace</h2>
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              Staff Portal • {user.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-950/70 border border-rose-900/40 cursor-pointer transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {dataError && (
        <div className="p-4 m-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs">
          {dataError}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">

        <aside className="w-full md:w-64 shrink-0 bg-[#0B1120] rounded-3xl p-4 shadow-2xl border border-white/5 space-y-2 h-fit print:hidden">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest px-3 py-2 mb-1">
            Operation Desk
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("take_attendance")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "take_attendance"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <Users className="w-4.5 h-4.5 text-indigo-400" />
            <span>Roll Calling Desk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "reports"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-4.5 h-4.5 text-indigo-400" />
            <span>Attendance Reports</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timetable")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "timetable"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <Calendar className="w-4.5 h-4.5 text-indigo-400" />
            <span>Timetable schedule</span>
          </button>
        </aside>

        <main className="flex-1 bg-[#111827] rounded-3xl p-6 shadow-2xl border border-white/5">

          <AnimatePresence mode="wait">
            {/* TAB #1: Take Attendance */}
            {activeTab === "take_attendance" && (
              <motion.div
                key="take"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 border-b border-white/5 pb-4 flex-wrap">
                  <span className={batchStep >= 1 ? "text-indigo-400 font-bold" : ""}>Step 1: Batch</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className={batchStep >= 2 ? "text-indigo-400 font-bold" : ""}>Step 2: Subject</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className={batchStep >= 3 ? "text-indigo-400 font-bold" : ""}>Step 3: Track</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className={batchStep >= 4 ? "text-indigo-400 font-bold" : ""}>Step 4: Roll Call</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className={batchStep === 5 ? "text-indigo-400 font-bold" : ""}>Step 5: Done</span>
                </div>

                {/* STEP 1: Select Batch */}
                {batchStep === 1 && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white tracking-tight">Step 1: Select Academic Batch</h3>
                      <p className="text-xs text-slate-400">Pick which section block is currently in session.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {["A1", "A2", "A3", "A4"].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setSelectedBatch(b);
                            setBatchStep(2);
                          }}
                          className={`p-6 rounded-2xl border-2 hover:border-indigo-500 cursor-pointer text-center font-bold text-xl transition-all ${
                            selectedBatch === b
                              ? "bg-indigo-950/20 border-indigo-500 text-indigo-400"
                              : "border-white/5 hover:bg-white/5"
                          }`}
                        >
                          Batch {b}
                        </button>
                      ))}
                    </div>

                    {/* Today's Classes — derived from real timetable */}
                    <div className="pt-6 border-t border-white/5 space-y-3">
                      <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400">Your Classes Scheduled Today</h4>
                      {todayClasses.length === 0 ? (
                        <p className="text-xs text-slate-500">No classes scheduled today.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                          {todayClasses.map((c) => (
                            <div key={c.id} className="p-3 bg-[#0B1120] rounded-xl border border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <Clock className="w-4 h-4 text-indigo-400" />
                                <div>
                                  <p className="font-bold text-white">{c.subjectName}</p>
                                  <p className="font-semibold text-[10px] text-slate-400">Batch {c.batch} • {c.time}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded uppercase">Active</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: Select Subject from REAL timetable */}
                {batchStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBatchStep(1)}
                        className="p-1.5 rounded-lg border border-white/5 bg-slate-900 hover:bg-white/5 text-slate-300"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Step 2: Select Current Subject for {selectedBatch}</h3>
                        <p className="text-xs text-slate-400">Select the active module to begin calling rolls.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule List for Batch {selectedBatch}</p>
                      {batchSubjects.length === 0 ? (
                        <p className="text-xs text-slate-500 p-6 text-center bg-[#0B1120] rounded-xl border border-white/5">
                          No subjects found for this batch's timetable. Import the timetable first.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {batchSubjects.map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => setSelectedSubject(row)}
                              className={`p-4 rounded-xl border text-left flex items-start justify-between cursor-pointer transition ${
                                selectedSubject?.id === row.id
                                  ? "bg-indigo-950/20 border-indigo-500 text-indigo-400"
                                  : "border-white/5 hover:bg-white/5"
                              }`}
                            >
                              <div className="space-y-1">
                                <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 font-bold border border-white/5">
                                  {row.id}
                                </span>
                                <h4 className="font-bold text-sm text-white">{row.name}</h4>
                              </div>
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                {row.time}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedSubject && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="pt-6 text-center"
                      >
                        <button
                          onClick={() => setBatchStep(3)}
                          className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Choose Track</span>
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* STEP 3: Specialization */}
                {batchStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBatchStep(2)}
                        className="p-1.5 rounded-lg border border-white/5 bg-slate-900 text-slate-400 hover:bg-white/5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Step 3: Select Specialization</h3>
                        <p className="text-xs text-slate-400">Class rolls can be called specialization-wise as per department rules.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { title: "AI & ML", desc: "Artificial Intelligence & Machine Learning Stream" },
                        { title: "SD", desc: "Software Development Track" },
                        { title: "MV", desc: "Metaverse & XR Technologies" },
                      ].map((spec) => (
                        <button
                          key={spec.title}
                          type="button"
                          onClick={() => setSelectedSpecialization(spec.title)}
                          className={`p-6 rounded-2xl border text-left cursor-pointer transition ${
                            selectedSpecialization === spec.title
                              ? "bg-[#0B1120] border-indigo-500 text-indigo-400"
                              : "border-white/5 hover:bg-white/5"
                          }`}
                        >
                          <h4 className="font-extrabold text-lg text-white">{spec.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{spec.desc}</p>
                        </button>
                      ))}
                    </div>

                    {selectedSpecialization && (
                      <div className="text-center pt-4">
                        <button
                          onClick={fetchActiveRoster}
                          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer transition"
                        >
                          Load Roster & Start Roll Call
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Calling Screen */}
                {batchStep === 4 && studentsList[callingIndex] && (
                  <div className="space-y-6 select-none">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-white/5">
                      <span>Roster Calling Page</span>
                      <span>Student {callingIndex + 1} of {studentsList.length} • Marked: {markedCount}</span>
                    </div>

                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/[0.03]">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(callingIndex / studentsList.length) * 100}%` }}
                      />
                    </div>

                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={studentsList[callingIndex].id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="bg-[#0B1120] rounded-3xl p-8 border border-white/5 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl min-h-64"
                      >
                        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-full flex items-center justify-center border-2 border-white/5 shadow-lg font-black text-3xl font-sans">
                          {studentsList[callingIndex].name.charAt(0)}
                        </div>

                        <div className="space-y-2">
                          <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest">
                            {studentsList[callingIndex].registrationNumber}
                          </span>
                          <h4 className="text-2.5xl font-black tracking-tight text-white">
                            {studentsList[callingIndex].name}
                          </h4>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Speciality: {studentsList[callingIndex].specialization}
                          </p>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => markIndividualStudent('Present')}
                        className="py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-md cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 focus:outline-none transition"
                      >
                        <CheckCircle2 className="w-5 h-5 fill-white text-emerald-600" />
                        <span>PRESENT</span>
                      </button>

                      <button
                        onClick={() => markIndividualStudent('Absent')}
                        className="py-4 rounded-2xl bg-rose-950/40 text-rose-400 border border-rose-900/40 hover:bg-rose-900/45 text-white font-extrabold text-md cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-900/10 focus:outline-none transition"
                      >
                        <XCircle className="w-5 h-5 text-rose-400" />
                        <span>ABSENT</span>
                      </button>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={() => setBatchStep(3)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel Roll Call & Change Filters
                      </button>
                    </div>
                  </div>
                )}

                {batchStep === 4 && studentsList.length === 0 && (
                  <div className="text-center p-12 space-y-4">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg">No Students Registered</h4>
                      <p className="text-xs text-slate-400">There are no students matching Batch {selectedBatch} and Track {selectedSpecialization}.</p>
                    </div>
                    <button
                      onClick={() => setBatchStep(3)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900"
                    >
                      Go Back
                    </button>
                  </div>
                )}

                {/* STEP 5: Summary */}
                {batchStep === 5 && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white tracking-tight">Attendance Calling Summary</h3>
                      <p className="text-xs text-slate-400">Roster completed. Please audit the numbers before saving to university records.</p>
                    </div>

                    {/* Save error */}
                    {saveError && (
                      <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs flex gap-3 items-start">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{saveError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 text-center">
                        <span className="text-2xl font-black text-white">{totalInBatch}</span>
                        <p className="text-[10px] tracking-wider font-extrabold text-slate-400 uppercase mt-0.5">Total Students</p>
                      </div>
                      <div className="p-4 bg-emerald-950/10 rounded-2xl border border-emerald-900/20 text-center">
                        <span className="text-2xl font-black text-emerald-400">{presentCount}</span>
                        <p className="text-[10px] tracking-wider font-extrabold text-slate-400 uppercase mt-0.5">Present count</p>
                      </div>
                      <div className="p-4 bg-rose-950/10 rounded-2xl border border-rose-900/20 text-center">
                        <span className="text-2xl font-black text-rose-400">{absentCount}</span>
                        <p className="text-[10px] tracking-wider font-extrabold text-slate-400 uppercase mt-0.5">Absent count</p>
                      </div>
                      <div className="p-4 bg-indigo-950/10 rounded-2xl border border-indigo-900/20 text-center">
                        <span className="text-2xl font-black text-indigo-400">{attendancePct.toFixed(1)}%</span>
                        <p className="text-[10px] tracking-wider font-extrabold text-slate-400 uppercase mt-0.5">Percentage Rate</p>
                      </div>
                    </div>

                    <div className="bg-slate-900/30 rounded-2xl border border-white/5 overflow-hidden text-xs">
                      <div className="p-3 bg-slate-900 border-b border-white/5 font-bold uppercase tracking-widest text-[10px] text-slate-400">
                        Attendance Verification Ledgers ({selectedSpecialization})
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-white/[0.03]">
                        {studentsList.map((stu) => (
                          <div key={stu.id} className="p-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{stu.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{stu.registrationNumber}</span>

                            <select
                              value={records[stu.id] || ""}
                              onChange={(e) =>
                                setRecords((prev) => ({
                                  ...prev,
                                  [stu.id]: (e.target.value || undefined) as 'Present' | 'Absent' | undefined,
                                }))
                              }
                              className="font-bold bg-[#0F172A] border border-white/5 text-slate-300 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value="">— Unmarked —</option>
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {saveComplete ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-center text-xs"
                      >
                        Verification successful! Saved securely to college databases. Re-routing...
                      </motion.div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={saveAttendanceToDatabase}
                          disabled={savingAttendance}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer shadow-lg transition disabled:opacity-50"
                        >
                          {savingAttendance ? "Submitting Ledger..." : "Save Attendance"}
                        </button>

                        <button
                          onClick={() => setBatchStep(4)}
                          className="py-3 px-6 rounded-xl border border-white/5 bg-slate-900 hover:bg-white/5 font-bold text-xs"
                        >
                          Edit Attendance (Back)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB #2: Reports */}
            {activeTab === "reports" && (
              <motion.div
                key="rep"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Historical Attendance Logs</h3>
                    <p className="text-xs text-slate-400">Search student indexes, filter batches/tracks, and export spreadsheets.</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={exportToCSV}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-white/5 border border-white/5 cursor-pointer text-indigo-400"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      <span>Excel (CSV)</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-white/5 bg-slate-900 hover:bg-white/5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-indigo-400" />
                      <span>Print/PDF Report</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0B1120] p-4 rounded-3xl border border-white/5 text-xs text-slate-300">
                  <div className="sm:col-span-2 relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Roll register (Name or Reg No)..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/5 bg-[#0F172A] text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <select
                      value={reportSubjectFilter}
                      onChange={(e) => setReportSubjectFilter(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] font-bold cursor-pointer text-slate-200"
                    >
                      <option value="all">All Course Subjects</option>
                      {subjectsList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <select
                      value={reportBatchFilter}
                      onChange={(e) => setReportBatchFilter(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] font-bold cursor-pointer text-slate-200"
                    >
                      <option value="all">All Batches (A1-A4)</option>
                      {["A1", "A2", "A3", "A4"].map((b) => <option key={b} value={b}>Batch {b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-[#0B1120] rounded-3xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/60 text-[10px] font-bold tracking-widest text-slate-400 uppercase border-b border-white/5">
                          <th className="py-4 px-5">Date</th>
                          <th className="py-4 px-5">Student Name</th>
                          <th className="py-4 px-5">Registration No</th>
                          <th className="py-4 px-5 font-bold text-[10px]">Track</th>
                          <th className="py-4 px-5">Subject Conducted</th>
                          <th className="py-4 px-5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-xs">
                        {loadingData ? (
                          <tr>
                            <td colSpan={6} className="text-center p-8 text-slate-400">
                              Loading...
                            </td>
                          </tr>
                        ) : (
                          attendanceHistory
                            .filter((h) => {
                              const matchesSearch = h.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                h.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
                              const matchesSubj = reportSubjectFilter === "all" || h.subjectId === reportSubjectFilter;
                              const matchesBatch = reportBatchFilter === "all" || h.batch === reportBatchFilter;
                              return matchesSearch && matchesSubj && matchesBatch;
                            })
                            .map((h) => (
                              <tr key={h.id} className="hover:bg-white/[0.02] transition-all text-xs text-slate-300">
                                <td className="py-4 px-5 font-mono text-slate-400 font-bold">{h.date}</td>
                                <td className="py-4 px-5 font-bold text-white">{h.studentName}</td>
                                <td className="py-4 px-5 font-mono font-bold text-indigo-400 bg-slate-900/40 px-2 py-0.5 rounded border border-white/5">{h.registrationNumber}</td>
                                <td className="py-4 px-5 text-slate-400">{h.specialization}</td>
                                <td className="py-4 px-5 font-bold text-white">{h.subjectName}</td>
                                <td className="py-4 px-5">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                    h.status === "Present"
                                      ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30"
                                      : "bg-rose-950/20 text-rose-400 border border-rose-900/30"
                                  }`}>
                                    {h.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                        )}
                        {attendanceHistory.length === 0 && !loadingData && (
                          <tr>
                            <td colSpan={6} className="text-center p-12 text-slate-400 font-bold">
                              No historic lectures logged in this university term.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB #3: Timetable */}
            {activeTab === "timetable" && (
              <motion.div
                key="time"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">University Timetable Scheme</h3>
                  <p className="text-xs text-slate-400">
                    Master timetable allocations — full editorial control. Import the default Excel sheet, add custom slots, breaks, and subjects.
                  </p>
                </div>

                <TimetableEditor role="lecturer" />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      <footer className="py-12 mt-12 bg-slate-950 border-t border-white/5 text-center text-[10px] text-slate-500 font-bold tracking-widest uppercase print:hidden">
        Veritas University ERP • Managed Securely with HTTPS & AES Token Signatures
      </footer>
    </div>
  );
}
