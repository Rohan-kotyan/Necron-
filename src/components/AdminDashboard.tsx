import React, { useState, useEffect } from "react";
import {
  ShieldCheck, Users, UserPlus, BookOpen, Calendar, Clock, BarChart3, Trash, Plus,
  Search, ShieldAlert, LogOut, Sun, Moon, CheckCircle2, AlertCircle, FileText, Settings
} from "lucide-react";
import { motion } from "motion/react";
import TimetableEditor from "./TimetableEditor";

interface UserSession {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'admin';
    name: string;
  };
}

interface AdminDashboardProps {
  session: UserSession;
  onLogout: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export default function AdminDashboard({ session, onLogout, isDark, onThemeToggle }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"people" | "academics" | "ledger">("people");
  const [students, setStudents] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  
  // Adding forms
  const [newLecturer, setNewLecturer] = useState({ name: "", email: "", password: "password" });
  const [newStudent, setNewStudent] = useState({ name: "", email: "", password: "password", registrationNumber: "", batch: "A1", specialization: "AI & ML" as 'AI & ML' | 'SD' | 'MV' });
  const [newSubject, setNewSubject] = useState({ name: "", lecturerId: "" });
  const [newTimetable, setNewTimetable] = useState({ batch: "A1", day: "Monday" as any, time: "9:00 AM", subjectId: "" });

  // Notifications
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAdminData = async () => {
    try {
      const [studRes, lectRes, subRes, attRes] = await Promise.all([
        fetch("/api/data?type=students"),
        fetch("/api/data?type=lecturers"),
        fetch("/api/data?type=subjects"),
        fetch("/api/attendance?type=history"),
      ]);

      const studData = await studRes.json();
      const lectData = await lectRes.json();
      const subData = await subRes.json();
      const attData = await attRes.json();

      setStudents(studData.students || []);
      setLecturers(lectData.lecturers || []);
      setSubjects(subData.subjects || []);
      setAttendanceLogs(attData.history || []);
    } catch (err) {
      console.error("Failed to load administration data", err);
    }
  };

  // 1. ADD LECTURER
  const handleAddLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLecturer.name || !newLecturer.email) {
      showToast("Please complete lecturer credentials", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLecturer)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      showToast("Lecturer staff member registered successfully!");
      setNewLecturer({ name: "", email: "", password: "password" });
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 2. REMOVE LECTURER
  const handleRemoveLecturer = async (id: string) => {
    if (!confirm("Are you sure you want to remove this Lecturer staff member?")) return;
    try {
      const res = await fetch(`/api/admin/lecturers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Lecturer successfully purged.");
        loadAdminData();
      }
    } catch (err) {
      showToast("Failed to remove lecturer", "error");
    }
  };

  // 3. ADD STUDENT
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email || !newStudent.registrationNumber) {
      showToast("Please complete student profile details", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      showToast("Student profile successfully initialized!");
      setNewStudent({ name: "", email: "", password: "password", registrationNumber: "", batch: "A1", specialization: "AI & ML" });
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 4. REMOVE STUDENT
  const handleRemoveStudent = async (id: string) => {
    if (!confirm("Are you sure you want to remove this student? (This deletes historical attendance records associated with them!)")) return;
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Student purged successfully from ERP Database.");
        loadAdminData();
      }
    } catch (err) {
      showToast("Failed to remove student records", "error");
    }
  };

  // 5. ADD SUBJECT
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.lecturerId) {
      showToast("Please provide subject details & select a Lecturer master", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subject", ...newSubject })
      });
      if (res.ok) {
        showToast("Subject Course added successfully.");
        setNewSubject({ name: "", lecturerId: "" });
        loadAdminData();
      }
    } catch (err) {
      showToast("Failed to create subject", "error");
    }
  };

  // Search Filter in Master ledgers
  const [searchLedgerText, setSearchLedgerText] = useState("");

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 transition-colors duration-300 font-sans">
      
      {/* Toast Alert Header */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold leading-normal ${
          toast.type === "success"
            ? "bg-emerald-600 border-emerald-500 text-white"
            : "bg-rose-600 border-rose-500 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <header className="bg-[#0B1120]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 sticky top-0 z-30 flex justify-between items-center shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Settings className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-md font-bold text-white tracking-tight">Veritas Master Admin</h2>
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Academic Admin Panel</p>
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

      {/* Primary Panels Layout */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">
        
        {/* Admin Navigation drawers */}
        <aside className="w-full md:w-64 shrink-0 bg-[#0B1120] rounded-3xl p-4 shadow-2xl border border-white/5 space-y-2 h-fit">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest px-3 py-2">
            System Overlays
          </div>
          
          <button
            onClick={() => setActiveTab("people")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "people"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <Users className="w-4.5 h-4.5 text-indigo-400" />
            <span>Manage People</span>
          </button>

          <button
            onClick={() => setActiveTab("academics")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "academics"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
            <span>Academics & Curriculums</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "ledger"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-4.5 h-4.5 text-indigo-400" />
            <span>Master Attendance Ledgers</span>
          </button>
        </aside>

        {/* Dynamic Center Panel */}
        <main className="flex-1 bg-[#111827] rounded-3xl p-6 shadow-2xl border border-white/5">
          
          {/* TAB 1: MANAGE PEOPLE */}
          {activeTab === "people" && (
            <div className="space-y-8">
              
              {/* LECTURER PORTLET */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to add Lecturer */}
                <div className="bg-[#0B1120] p-5 rounded-3xl border border-white/5 space-y-4">
                  <h4 className="text-md font-bold tracking-tight flex items-center gap-2 text-white">
                    <UserPlus className="w-4.5 h-4.5 text-indigo-400" />
                    <span>Add Lecturer Staff</span>
                  </h4>
                  <form onSubmit={handleAddLecturer} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newLecturer.name}
                        onChange={(e) => setNewLecturer(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Dr. Frank Reynolds"
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-205 focus:outline-none focus:border-indigo-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={newLecturer.email}
                        onChange={(e) => setNewLecturer(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="lecturer@college.edu"
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-205 focus:outline-none focus:border-indigo-505 mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Default Password</label>
                      <input
                        type="password"
                        required
                        value={newLecturer.password}
                        onChange={(e) => setNewLecturer(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-205 focus:outline-none focus:border-indigo-505 mt-1"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl mt-4 cursor-pointer transition shadow-lg shadow-indigo-500/20"
                    >
                      Initialize Lecturer Account
                    </button>
                  </form>
                </div>

                {/* List of Lecturers */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-sm font-bold tracking-tight text-slate-400 uppercase">Lecturer Staff Indexes</h4>
                  <div className="bg-[#0B1120] border border-white/5 rounded-3xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#0F172A] text-[10px] font-bold text-slate-400 uppercase border-b border-white/5">
                          <th className="py-2.5 px-4">Staff ID</th>
                          <th className="py-2.5 px-4">Name</th>
                          <th className="py-2.5 px-4">Mail</th>
                          <th className="py-2.5 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-slate-300 font-semibold">
                        {lecturers.map((l) => (
                          <tr key={l.id} className="hover:bg-white/[0.02] text-xs">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-400">{l.id}</td>
                            <td className="py-2.5 px-4 font-bold text-white">{l.name}</td>
                            <td className="py-2.5 px-4 font-mono">{l.email}</td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                onClick={() => handleRemoveLecturer(l.id)}
                                className="p-1 text-rose-400 hover:bg-rose-955/20 rounded cursor-pointer transition"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* STUDENT PORTLET */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-8 space-y-4">
                <h3 className="text-md font-bold tracking-tight text-slate-400 uppercase">Student Management</h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form to add Student */}
                  <div className="bg-[#0B1120] p-5 rounded-3xl border border-white/5 space-y-4">
                    <h4 className="text-md font-bold flex items-center gap-2 text-white">
                      <UserPlus className="w-4.5 h-4.5 text-indigo-400" />
                      <span>Register Student Profile</span>
                    </h4>
                    <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Full Student Name</label>
                        <input
                          type="text"
                          required
                          value={newStudent.name}
                          onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Liam Neeson"
                          className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-205 focus:outline-none focus:border-indigo-550 mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Registration Identifier</label>
                        <input
                          type="text"
                          required
                          value={newStudent.registrationNumber}
                          onChange={(e) => setNewStudent(prev => ({ ...prev, registrationNumber: e.target.value.toUpperCase() }))}
                          placeholder="03SU25ML005"
                          className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-205 focus:outline-none focus:border-indigo-550 mt-1 uppercase font-mono font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Batch Code</label>
                          <select
                            value={newStudent.batch}
                            onChange={(e) => setNewStudent(prev => ({ ...prev, batch: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-201 font-bold cursor-pointer"
                          >
                            <option value="A1">Batch A1</option>
                            <option value="A2">Batch A2</option>
                            <option value="A3">Batch A3</option>
                            <option value="A4">Batch A4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Specialization</label>
                          <select
                            value={newStudent.specialization}
                            onChange={(e) => setNewStudent(prev => ({ ...prev, specialization: e.target.value as any }))}
                            className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-201 font-bold cursor-pointer"
                          >
                            <option value="AI & ML">AI & ML</option>
                            <option value="SD">SD (Software)</option>
                            <option value="MV">MV (Metaverse)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Student Portal Email</label>
                        <input
                          type="email"
                          required
                          value={newStudent.email}
                          onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="liam@college.edu"
                          className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-205 focus:outline-none focus:border-indigo-550 mt-1"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl mt-4 cursor-pointer transition shadow-lg shadow-indigo-500/20"
                      >
                        Register Student
                      </button>
                    </form>
                  </div>

                  {/* List of Students */}
                  <div className="lg:col-span-2 space-y-3">
                    <h4 className="text-sm font-bold tracking-tight text-slate-400 uppercase">Student Registrar Directory</h4>
                    <div className="bg-[#0B1120] border border-white/5 rounded-3xl overflow-hidden max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#0F172A] text-[10px] font-bold text-slate-400 uppercase border-b border-white/5">
                            <th className="py-3 px-4">Registration No</th>
                            <th className="py-3 px-4">Student Name</th>
                            <th className="py-3 px-4">Batch</th>
                            <th className="py-3 px-4">Track</th>
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] text-slate-300 font-semibold">
                          {students.map((s) => (
                            <tr key={s.id} className="hover:bg-white/[0.02] text-xs">
                              <td className="py-2.5 px-4"><span className="font-mono font-bold text-indigo-400 bg-slate-900/60 px-2 py-1 rounded border border-white/5">{s.registrationNumber}</span></td>
                              <td className="py-2.5 px-4 font-bold text-white">{s.name}</td>
                              <td className="py-2.5 px-4 font-bold text-center text-slate-300">{s.batch}</td>
                              <td className="py-2.5 px-4 text-slate-400">{s.specialization}</td>
                              <td className="py-2.5 px-4 text-center">
                                <button
                                  onClick={() => handleRemoveStudent(s.id)}
                                  className="p-1 text-rose-400 hover:bg-rose-950/20 rounded cursor-pointer transition"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: CURRICULUMS & TIMETABLES */}
          {activeTab === "academics" && (
            <div className="space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Subject Course */}
                <div className="bg-[#0B1120] p-5 rounded-3xl border border-white/5 text-xs space-y-4">
                  <h4 className="text-md font-bold text-white">Create & Assign Course Subject</h4>
                  <form onSubmit={handleAddSubject} className="space-y-4">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Course Subject Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Quantum Computing"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-200 mt-1 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Assign Lecturer Master Host</label>
                      <select
                        value={newSubject.lecturerId}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, lecturerId: e.target.value }))}
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0F172A] text-slate-200 mt-1 font-bold cursor-pointer"
                      >
                        <option value="">Select Lecturer Staff Member...</option>
                        {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl mt-4 cursor-pointer transition shadow-lg shadow-indigo-500/20"
                    >
                      Assign Subject Course
                    </button>
                  </form>
                </div>

                {/* Sub-list of active courses */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold tracking-tight text-slate-400 uppercase">Active Subject Courses</h4>
                  <div className="bg-[#0B1120] border border-white/5 rounded-3xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase border-b border-white/5">
                          <th className="py-2.5 px-4">ID</th>
                          <th className="py-2.5 px-4">Subject Course</th>
                          <th className="py-2.5 px-4">Owner Lecturer ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-slate-205">
                        {subjects.map((s) => (
                          <tr key={s.id} className="hover:bg-white/[0.02] text-xs">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-400">{s.id}</td>
                            <td className="py-2.5 px-4 font-bold text-white">{s.name}</td>
                            <td className="py-2.5 px-4 font-mono">{s.lecturerId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Master Timetable Editor — full role-based editorial control */}
              <div className="border-t border-white/5 pt-8">
                <TimetableEditor role="admin" />
              </div>

            </div>
          )}

          {/* TAB 3: MASTER ATTENDANCE LEDGER */}
          {activeTab === "ledger" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Full System Attendance records</h3>
                  <p className="text-xs text-slate-450">Master database stream of all roll calling actions performed across college campuses.</p>
                </div>
              </div>

              {/* Search text box */}
              <div className="relative text-xs">
                <span className="absolute left-3.5 top-3 text-slate-400">
                  <Search className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={searchLedgerText}
                  onChange={(e) => setSearchLedgerText(e.target.value)}
                  placeholder="Filter and search all records by Student Name, Subject, or Registration Id..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-205 focus:outline-none focus:border-indigo-550 placeholder:text-slate-650"
                />
              </div>

              {/* Logs database list */}
              <div className="bg-[#0B1120] border border-white/5 rounded-3xl overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase border-b border-white/5">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Registration No</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-slate-300 font-semibold">
                    {attendanceLogs
                      .filter(log => {
                        const cell = `${log.studentName} ${log.subjectName} ${log.registrationNumber}`.toLowerCase();
                        return cell.includes(searchLedgerText.toLowerCase());
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02] text-xs">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-400">{log.date}</td>
                          <td className="py-2.5 px-4 font-bold text-white">{log.studentName}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-400 bg-slate-900/40 px-2 py-0.5 rounded border border-white/5">{log.registrationNumber}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{log.batch}</td>
                          <td className="py-2.5 px-4 font-bold text-white">{log.subjectName}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              log.status === "Present"
                                ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30"
                                : "bg-rose-950/20 text-rose-450 border border-rose-900/30"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {attendanceLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-12 text-slate-400 font-bold">
                          No logging registers indexed in this session.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </main>
      </div>

      <footer className="py-12 mt-12 bg-slate-950 border-t border-white/5 text-center text-[10px] text-slate-500 font-bold tracking-widest uppercase">
        Veritas University ERP • Managed Securely with HTTPS & AES Token Signatures
      </footer>
    </div>
  );
}
