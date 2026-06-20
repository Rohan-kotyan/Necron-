import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  Clock,
  Coffee,
  BookOpen,
  User,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import type { TimetableEntry, TimetableDay } from "../types";
import { TIMETABLE_DAYS } from "../types";

interface TimetableViewProps {
  entries: TimetableEntry[];
  loading?: boolean;
  error?: string | null;
  /** Read-only badge ("Student view") — shown as a header pill. */
  badge?: string;
  /** Initial batch filter. Use 'all' to show all batches. */
  initialBatch?: string;
  /** List of available batches for the filter dropdown. */
  batches?: string[];
  /** Compact mode (smaller cells, for embedding inside other dashboards). */
  compact?: boolean;
}

/**
 * Read-only weekly timetable grid. Renders a matrix of Time × Day cells.
 * Used by all 3 roles — students have no edit controls, lecturers/admins
 * see this same view alongside the editor.
 *
 * Sorting & deduplication logic:
 *   The backend returns one row per (batch, day, time, subject). When
 *   multiple batches share a time slot, we group them into a single cell.
 *   When the same batch has multiple subjects at the same slot (electives),
 *   they are stacked vertically inside the cell.
 */
export default function TimetableView({
  entries,
  loading = false,
  error = null,
  badge,
  initialBatch = "all",
  batches = [],
  compact = false,
}: TimetableViewProps) {
  const [batchFilter, setBatchFilter] = useState<string>(
    initialBatch === "all" ? "all" : initialBatch
  );
  const [query, setQuery] = useState("");

  // Build a sorted, unique list of time slots from the entries.
  const timeSlots = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.time));
    return Array.from(set).sort(naturalTimeCompare);
  }, [entries]);

  // Filter entries by batch (if not "all") and search query.
  const filtered = useMemo(() => {
    let list = entries;
    if (batchFilter !== "all") {
      list = list.filter((e) => e.batch === batchFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (e) =>
          (e.subjectName ?? "").toLowerCase().includes(q) ||
          (e.lecturerName ?? "").toLowerCase().includes(q) ||
          e.day.toLowerCase().includes(q) ||
          e.time.toLowerCase().includes(q) ||
          e.batch.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, batchFilter, query]);

  // Build a lookup: timeSlot → day → entries[]
  const grid = useMemo(() => {
    const map = new Map<string, Map<TimetableDay, TimetableEntry[]>>();
    for (const t of timeSlots) map.set(t, new Map());
    for (const e of filtered) {
      const dayMap = map.get(e.time);
      if (!dayMap) continue;
      const arr = dayMap.get(e.day as TimetableDay) || [];
      arr.push(e);
      dayMap.set(e.day as TimetableDay, arr);
    }
    return map;
  }, [filtered, timeSlots]);

  if (loading) {
    return (
      <div className="bg-[#0B1120] rounded-3xl shadow-2xl shadow-black/40 border border-white/5 p-10 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-3 text-indigo-400" />
        <span className="text-sm font-semibold tracking-wider uppercase">
          Loading timetable…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0B1120] rounded-3xl shadow-2xl shadow-black/40 border border-rose-500/30 p-10 flex items-center justify-center text-rose-300">
        <AlertCircle className="w-5 h-5 mr-3 text-rose-400" />
        <span className="text-sm font-semibold">{error}</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-[#0B1120] rounded-3xl shadow-2xl shadow-black/40 border border-white/5 p-12 flex flex-col items-center justify-center text-center">
        <Calendar className="w-10 h-10 text-slate-600 mb-4" />
        <p className="text-sm font-bold text-slate-300 tracking-wider uppercase">
          No timetable entries yet
        </p>
        <p className="text-xs text-slate-500 mt-2 max-w-md">
          The timetable has not been imported. Ask a lecturer or admin to
          import the default Excel sheet from the Timetable editor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          {badge && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" />
              {badge}
            </span>
          )}
          {batches.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Batch
              </label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, lecturer…"
            className="bg-slate-900 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-56"
          />
        </div>
      </div>

      {/* Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="bg-[#0B1120] rounded-3xl shadow-2xl shadow-black/40 border border-white/5 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-[10px] font-bold tracking-widest uppercase border-b border-white/5">
                <th className={`px-5 ${compact ? "py-3" : "py-4"} w-32`}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Time</span>
                  </div>
                </th>
                {TIMETABLE_DAYS.map((day) => (
                  <th
                    key={day}
                    className={`px-5 ${compact ? "py-3" : "py-4"}`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {timeSlots.map((time) => (
                <tr key={time} className="hover:bg-slate-900/20 transition-all">
                  <td
                    className={`px-5 ${
                      compact ? "py-3" : "py-4"
                    } font-mono font-bold text-slate-400 text-[11px] align-top whitespace-nowrap`}
                  >
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{time}</span>
                    </div>
                  </td>
                  {TIMETABLE_DAYS.map((day) => {
                    const cellEntries = grid.get(time)?.get(day) || [];
                    if (cellEntries.length === 0) {
                      return (
                        <td
                          key={day}
                          className={`px-5 ${
                            compact ? "py-3" : "py-4"
                          } align-top`}
                        >
                          <span className="text-slate-700 text-[11px] font-semibold italic">
                            —
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={day}
                        className={`px-5 ${
                          compact ? "py-3" : "py-4"
                        } align-top`}
                      >
                        <div className="flex flex-col gap-1.5">
                          {cellEntries.map((e) => (
                            <CellPill key={e.id} entry={e} compact={compact} />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase text-center">
        Showing {filtered.length} of {entries.length} entries
      </p>
    </div>
  );
}

interface CellPillProps {
  entry: TimetableEntry;
  compact: boolean;
  key?: React.Key;
}
function CellPill({ entry, compact }: CellPillProps) {
  if (entry.isBreak || entry.subjectId === "BREAK") {
    return (
      <div
        className={`rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 ${
          compact ? "py-1.5" : "py-2"
        } flex items-center gap-2`}
      >
        <Coffee className="w-3 h-3 text-amber-400 flex-shrink-0" />
        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
          {entry.subjectName || "Break"}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 ${
        compact ? "py-1.5" : "py-2"
      } hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all`}
    >
      <div className="flex items-start gap-2">
        <BookOpen className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold text-white leading-tight">
            {entry.subjectName || "—"}
          </div>
          {entry.lecturerName && (
            <div className="flex items-center gap-1 mt-0.5">
              <User className="w-2.5 h-2.5 text-slate-500" />
              <span className="text-[10px] text-slate-400 font-medium truncate">
                {entry.lecturerName}
              </span>
            </div>
          )}
          <div className="text-[9px] font-mono text-slate-600 mt-0.5 uppercase tracking-widest">
            {entry.batch}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Natural sort for time strings like "9:30 - 10:15" or "2:00 - 2:55" */
function naturalTimeCompare(a: string, b: string): number {
  const toMinutes = (s: string): number => {
    // Take the first time portion (before any " - ")
    const first = s.split(/[-–]/)[0].trim().toLowerCase();
    // Match "9:30", "2:00", "11:35", "9:30:00 am"
    const m = first.match(/(\d+):(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[4];
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    return h * 60 + min;
  };
  return toMinutes(a) - toMinutes(b);
}
