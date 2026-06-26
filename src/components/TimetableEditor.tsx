import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Clock,
  BookOpen,
  User,
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coffee,
  Layers,
  Settings2,
  RefreshCw,
} from "lucide-react";
import type { TimetableEntry, TimetableDay } from "../types";
import { TIMETABLE_DAYS } from "../types";
import { apiFetch } from "../lib/apiFetch";
import TimetableView from "./TimetableView";

interface TimetableEditorProps {
  /** Pass through session.user.role to control the import button. */
  role: "lecturer" | "admin";
}

interface Subject {
  id: string;
  name: string;
  lecturerId?: string | null;
}
interface Lecturer {
  id: string;
  name: string;
  email?: string;
}

interface Toast {
  type: "success" | "error" | "info";
  message: string;
}

export default function TimetableEditor({ role }: TimetableEditorProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Editor UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<TimetableEntry>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    batch: "A1",
    day: "Monday" as TimetableDay,
    time: "9:30 - 10:15",
    subjectId: "",
    isBreak: false,
  });
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: "",
    lecturerId: "",
  });
  const [importing, setImporting] = useState(false);

  // ── Load all data ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ttRes, subjRes, lectRes] = await Promise.all([
        apiFetch<{ timetable: TimetableEntry[] }>("/api/admin/timetable"),
        apiFetch<{ subjects: Subject[] }>("/api/data?type=subjects"),
        apiFetch<{ lecturers: Lecturer[] }>("/api/data?type=lecturers"),
      ]);
      setEntries(ttRes.timetable || []);
      setSubjects(subjRes.subjects || []);
      setLecturers(lectRes.lecturers || []);
      const batchSet = new Set<string>();
      (ttRes.timetable || []).forEach((e) => batchSet.add(e.batch));
      setBatches(Array.from(batchSet).sort());
    } catch (e: any) {
      setError(e.message || "Failed to load timetable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── CRUD actions ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newEntry.batch || !newEntry.day || !newEntry.time) {
      showToast("error", "Batch, day and time are required.");
      return;
    }
    if (!newEntry.isBreak && !newEntry.subjectId) {
      showToast("error", "Pick a subject or mark this as a break period.");
      return;
    }
    try {
      const subjectId = newEntry.isBreak ? "BREAK" : newEntry.subjectId;
      await apiFetch("/api/admin/timetable", {
        method: "POST",
        body: {
          batch: newEntry.batch,
          day: newEntry.day,
          time: newEntry.time,
          subjectId,
        },
      });
      showToast("success", "Timetable slot added.");
      setShowAddForm(false);
      setNewEntry({
        batch: newEntry.batch,
        day: newEntry.day,
        time: newEntry.time,
        subjectId: "",
        isBreak: false,
      });
      loadData();
    } catch (e: any) {
      showToast("error", e.message || "Failed to add slot.");
    }
  };

  const handleStartEdit = (entry: TimetableEntry) => {
    setEditingId(entry.id);
    setEditDraft({
      batch: entry.batch,
      day: entry.day,
      time: entry.time,
      subjectId: entry.subjectId,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await apiFetch(`/api/admin/timetable?id=${editingId}`, {
        method: "PUT",
        body: editDraft,
      });
      showToast("success", "Timetable slot updated.");
      handleCancelEdit();
      loadData();
    } catch (e: any) {
      showToast("error", e.message || "Failed to update slot.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable slot? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/admin/timetable?id=${id}`, { method: "DELETE" });
      showToast("success", "Slot deleted.");
      loadData();
    } catch (e: any) {
      showToast("error", e.message || "Failed to delete slot.");
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubject.name || !newSubject.lecturerId) {
      showToast("error", "Subject name and lecturer are required.");
      return;
    }
    try {
      await apiFetch("/api/admin/timetable", {
        method: "POST",
        body: {
          type: "subject",
          name: newSubject.name,
          lecturerId: newSubject.lecturerId,
        },
      });
      showToast("success", `Subject "${newSubject.name}" added.`);
      setShowSubjectForm(false);
      setNewSubject({ name: "", lecturerId: "" });
      loadData();
    } catch (e: any) {
      showToast("error", e.message || "Failed to add subject.");
    }
  };

  const handleImportDefault = async () => {
    if (
      !confirm(
        "Import the default timetable from the embedded Excel sheet?\n\n" +
          "This will REPLACE existing timetable entries for the batches in the sheet (A1). " +
          "Other batches will be preserved."
      )
    )
      return;
    setImporting(true);
    try {
      const result = await apiFetch<any>("/api/admin/timetable/import", {
        method: "POST",
        body: { mode: "default" },
      });
      showToast(
        "success",
        `Imported ${result.seeded?.entries || 0} entries, ${result.seeded?.subjects || 0} subjects, ${result.seeded?.lecturers || 0} lecturers.`
      );
      loadData();
    } catch (e: any) {
      showToast("error", e.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const result = await apiFetch<any>("/api/admin/timetable/import", {
        method: "POST",
        body: { mode: "upload", buffer: b64 },
      });
      showToast(
        "success",
        `Imported ${result.seeded?.entries || 0} entries from "${file.name}".`
      );
      loadData();
    } catch (e: any) {
      showToast("error", e.message || "File import failed.");
    } finally {
      setImporting(false);
    }
  };

  // Group entries for the editor table (group by batch, then day)
  const grouped = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.batch) || [];
      arr.push(e);
      map.set(e.batch, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold tracking-widest text-slate-300 uppercase flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <span>Timetable Editor</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Full editorial control — add, edit, and delete slots, breaks, and
            subjects. Role:{" "}
            <span className="font-bold text-indigo-300 uppercase">{role}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowSubjectForm((s) => !s)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition flex items-center gap-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>New Subject</span>
          </button>
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slot</span>
          </button>
          <button
            onClick={handleImportDefault}
            disabled={importing}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>Import Default Excel</span>
          </button>
          <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload .xlsx</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* New Subject Form (collapsible) */}
      <AnimatePresence>
        {showSubjectForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0B1120] rounded-2xl border border-indigo-500/20 p-5 flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, name: e.target.value })
                  }
                  placeholder="e.g. Data Structures using C++"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                  Lecturer
                </label>
                <select
                  value={newSubject.lecturerId}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, lecturerId: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">— Select Lecturer —</option>
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateSubject}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Subject
                </button>
                <button
                  onClick={() => setShowSubjectForm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Slot Form (collapsible) */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0B1120] rounded-2xl border border-indigo-500/20 p-5">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Batch
                  </label>
                  <input
                    type="text"
                    value={newEntry.batch}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, batch: e.target.value })
                    }
                    placeholder="A1"
                    className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Day
                  </label>
                  <select
                    value={newEntry.day}
                    onChange={(e) =>
                      setNewEntry({
                        ...newEntry,
                        day: e.target.value as TimetableDay,
                      })
                    }
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {TIMETABLE_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Time Slot
                  </label>
                  <input
                    type="text"
                    value={newEntry.time}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, time: e.target.value })
                    }
                    placeholder="9:30 - 10:15"
                    className="w-40 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Subject
                  </label>
                  <select
                    value={newEntry.subjectId}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, subjectId: e.target.value })
                    }
                    disabled={newEntry.isBreak}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                  >
                    <option value="">— Select Subject —</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={newEntry.isBreak}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, isBreak: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  Break
                </label>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual grid view (read-only) */}
      <TimetableView
        entries={entries}
        loading={loading}
        error={error}
        badge="Live preview"
        batches={batches}
        initialBatch="all"
      />

      {/* Tabular editor — grouped by batch */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold tracking-widest text-slate-300 uppercase flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Manage Slots ({entries.length} total)</span>
        </h3>

        {grouped.length === 0 ? (
          <div className="bg-[#0B1120] rounded-3xl border border-white/5 p-10 text-center">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-semibold">
              No timetable entries yet.
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Click <span className="font-bold text-indigo-400">Import Default Excel</span> above to seed from the embedded sheet,
              or add slots manually with <span className="font-bold text-indigo-400">Add Slot</span>.
            </p>
          </div>
        ) : (
          grouped.map(([batch, batchEntries]) => (
            <BatchGroup
              key={batch}
              batch={batch}
              entries={batchEntries}
              subjects={subjects}
              lecturers={lecturers}
              editingId={editingId}
              editDraft={editDraft}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onDelete={handleDelete}
              setEditDraft={setEditDraft}
            />
          ))
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 30, x: "-50%" }}
            className={`fixed bottom-6 left-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-semibold flex items-center gap-2.5 ${
              toast.type === "success"
                ? "bg-emerald-600/90 border-emerald-400 text-white"
                : toast.type === "error"
                ? "bg-rose-600/90 border-rose-400 text-white"
                : "bg-slate-800/95 border-white/20 text-slate-100"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {toast.type === "error" && <AlertCircle className="w-4 h-4" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Batch group subcomponent ───────────────────────────────────────────────
interface BatchGroupProps {
  batch: string;
  entries: TimetableEntry[];
  subjects: Subject[];
  lecturers: Lecturer[];
  editingId: string | null;
  editDraft: Partial<TimetableEntry>;
  onStartEdit: (e: TimetableEntry) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (id: string) => void;
  setEditDraft: React.Dispatch<React.SetStateAction<Partial<TimetableEntry>>>;
  key?: React.Key;
}
function BatchGroup({
  batch,
  entries,
  subjects,
  lecturers,
  editingId,
  editDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  setEditDraft,
}: BatchGroupProps) {
  // Sort entries by day then time
  const sorted = useMemo(() => {
    const dayOrder: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    return [...entries].sort((a, b) => {
      const d = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
      if (d !== 0) return d;
      return a.time.localeCompare(b.time);
    });
  }, [entries]);

  return (
    <div className="bg-[#0B1120] rounded-3xl shadow-2xl shadow-black/40 border border-white/5 overflow-hidden">
      <div className="bg-slate-900/60 px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <h4 className="text-xs font-bold tracking-widest text-slate-300 uppercase flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Batch {batch}</span>
        </h4>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          {entries.length} slots
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="text-slate-500 text-[10px] font-bold tracking-widest uppercase border-b border-white/5">
              <th className="px-5 py-3 w-32">Day</th>
              <th className="px-5 py-3 w-40">Time</th>
              <th className="px-5 py-3">Subject</th>
              <th className="px-5 py-3 w-48">Lecturer</th>
              <th className="px-5 py-3 w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {sorted.map((e) => {
              const isEditing = editingId === e.id;
              const isBreak = e.isBreak || e.subjectId === "BREAK";
              if (isEditing) {
                return (
                  <tr key={e.id} className="bg-indigo-500/5">
                    <td className="px-5 py-3">
                      <select
                        value={editDraft.day || ""}
                        onChange={(ev) =>
                          setEditDraft({
                            ...editDraft,
                            day: ev.target.value as TimetableDay,
                          })
                        }
                        className="bg-slate-900 border border-indigo-500/40 rounded px-2 py-1 text-xs text-white cursor-pointer"
                      >
                        {TIMETABLE_DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={editDraft.time || ""}
                        onChange={(ev) =>
                          setEditDraft({ ...editDraft, time: ev.target.value })
                        }
                        className="bg-slate-900 border border-indigo-500/40 rounded px-2 py-1 text-xs text-white w-32 font-mono"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={editDraft.subjectId || ""}
                        onChange={(ev) =>
                          setEditDraft({
                            ...editDraft,
                            subjectId: ev.target.value,
                          })
                        }
                        className="bg-slate-900 border border-indigo-500/40 rounded px-2 py-1 text-xs text-white w-full max-w-xs cursor-pointer"
                      >
                        <option value="BREAK">— Break —</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 italic">
                      —
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={onSaveEdit}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white mr-1"
                        title="Save"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              }
              const subj = subjects.find((s) => s.id === e.subjectId);
              const lect = lecturers.find((l) => l.id === subj?.lecturerId);
              return (
                <tr
                  key={e.id}
                  className="hover:bg-slate-900/30 transition-all group"
                >
                  <td className="px-5 py-3 text-xs font-bold text-slate-300">
                    {e.day}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      {e.time}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {isBreak ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider text-[10px]">
                        <Coffee className="w-3 h-3" />
                        Break
                      </span>
                    ) : (
                      <div>
                        <div className="font-bold text-white">
                          {e.subjectName || subj?.name || "—"}
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                          {e.subjectId}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {lect ? (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{lect.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 italic">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => onStartEdit(e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white mr-1 opacity-60 group-hover:opacity-100 transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(e.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white opacity-60 group-hover:opacity-100 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
