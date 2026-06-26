import * as XLSX from "xlsx";
import { getSupabase, nextId } from "../_db";
import { hashPassword } from "../_password";

/**
 * Excel parser + DB seeder for the timetable module.
 *
 * The source spreadsheet has a "block" layout — each day is a small group
 * of rows:
 *
 *   DAY/TIME | BATCH | 9:30 - 10:15 | 10:30 - 11:20 | 11:35 - 12:35 |  | 2:00 - 2:55 | 3:00-3:55 | ...
 *   MONDAY   | A1    | Data Struct.. | HTML...        | Soft Skills.. |  | Internship  | SPORTS    | ...
 *   DAY/TIME | BATCH | 9:30 - 10:15 | ...
 *   TUESDAY  | A1    | ...
 *
 * Some cells are empty (treated as break periods). The first non-empty
 * cell in each block is the day header. We parse block-by-block.
 */

export interface ParsedTimetableRow {
  day: string;
  batch: string;
  time: string;
  rawCell: string; // original text — subject + lecturer
  subjectName: string;
  lecturerName: string | null;
  isBreak: boolean;
}

export interface ParsedTimetable {
  rows: ParsedTimetableRow[];
  days: string[];
  batches: string[];
  timeSlots: string[];
  subjects: { name: string; lecturerName: string | null }[];
  lecturers: string[];
}

const DAY_NAMES = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

function normalizeDay(s: string): string | null {
  const t = s.trim().toLowerCase();
  if (!DAY_NAMES.has(t)) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Parses a subject cell of the form:
 *   "Data Structures using C++(Sriranjini)"
 *   "Operating Systems(SD)(62)Sandhya Bangera,Introduction to Virtual Reality(MV)(10)Aishwarya A M,Introduction to Machine Learning(AM)(49)Shilpa Bhandari"
 *
 * Returns one or more { subjectName, lecturerName } pairs.
 * For multi-subject cells (electives), each comma-separated part is treated
 * as a separate subject.
 */
export function parseSubjectCell(raw: string): {
  subjectName: string;
  lecturerName: string | null;
}[] {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  // Split on commas that separate subjects (but not commas inside parens).
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of cleaned) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);

  return parts
    .map((part) => {
      const p = part.trim();
      if (!p) return null;

      // Match the LAST parenthetical group as the lecturer name.
      // The pattern captures things like "(Sriranjini)" or "(Shilpa Bhandari)"
      // or "(Shaila Kumari)". We treat the last (...) as the lecturer.
      const matches = p.match(/\(([^()]+)\)/g) || [];
      let lecturerName: string | null = null;
      let subjectName = p;

      if (matches.length > 0) {
        const lastParen = matches[matches.length - 1];
        const inner = lastParen.slice(1, -1).trim();
        // Heuristic: the lecturer's name is alphabetic (not a number like "62" or "10")
        if (/^[A-Za-z][A-Za-z .'-]*$/.test(inner)) {
          lecturerName = inner;
          subjectName = p.slice(0, p.lastIndexOf(lastParen)).replace(/\s+/g, " ").trim();
        } else {
          // Last paren was a number (count) — try the second-to-last
          if (matches.length >= 2) {
            const secondLast = matches[matches.length - 2];
            const inner2 = secondLast.slice(1, -1).trim();
            if (/^[A-Za-z][A-Za-z .'-]*$/.test(inner2)) {
              lecturerName = inner2;
              subjectName = p
                .slice(0, p.lastIndexOf(secondLast))
                .replace(/\s+/g, " ")
                .trim();
            }
          }
        }
      }

      // Strip any leftover trailing parens from subjectName
      subjectName = subjectName.replace(/\([^()]*\)\s*$/, "").replace(/\s+/g, " ").trim();
      if (!subjectName) subjectName = p;
      return { subjectName, lecturerName };
    })
    .filter((x): x is { subjectName: string; lecturerName: string | null } => x !== null);
}

export function parseTimetableXlsx(buffer: Buffer): ParsedTimetable {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  // header: 1 → array of arrays (raw cells)
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  const parsedRows: ParsedTimetableRow[] = [];
  const daySet = new Set<string>();
  const batchSet = new Set<string>();
  const timeSet = new Set<string>();
  const subjectMap = new Map<string, { name: string; lecturerName: string | null }>();
  const lecturerSet = new Set<string>();

  let currentDay: string | null = null;
  let currentBatch: string | null = null;
  let currentTimeSlots: string[] = [];

  for (const row of rows) {
    const firstCell = String(row[0] ?? "").trim();
    const day = normalizeDay(firstCell);

    const lowerFirst = firstCell.toLowerCase();
    if (
      lowerFirst.startsWith("day/time") ||
      lowerFirst.startsWith("day / time") ||
      lowerFirst.startsWith("day - time") ||
      lowerFirst.startsWith("day\\time")
    ) {
      // Header row — collect the time slots
      currentTimeSlots = [];
      for (let i = 2; i < row.length; i++) {
        const t = String(row[i] ?? "").trim();
        if (t) currentTimeSlots.push(t);
      }
      continue;
    }

    if (day) {
      // Day row
      currentDay = day;
      currentBatch = String(row[1] ?? "").trim() || currentBatch || "A1";
      // Strip any parenthetical from the batch like "A1(407)" → "A1"
      currentBatch = currentBatch.replace(/\(.*\)$/, "").trim();
      daySet.add(currentDay);
      batchSet.add(currentBatch);

      if (!currentTimeSlots.length) continue;

      for (let i = 0; i < currentTimeSlots.length; i++) {
        const cellVal = String(row[i + 2] ?? "").trim();
        if (!cellVal) {
          // Empty cell → break period
          parsedRows.push({
            day: currentDay,
            batch: currentBatch,
            time: currentTimeSlots[i],
            rawCell: "",
            subjectName: "Break",
            lecturerName: null,
            isBreak: true,
          });
          timeSet.add(currentTimeSlots[i]);
          continue;
        }

        const parsed = parseSubjectCell(cellVal);
        if (parsed.length === 0) {
          parsedRows.push({
            day: currentDay,
            batch: currentBatch,
            time: currentTimeSlots[i],
            rawCell: cellVal,
            subjectName: cellVal,
            lecturerName: null,
            isBreak: false,
          });
        } else {
          // Use the first parsed subject as the canonical one for this slot.
          // (Multi-elective slots collapse to the first for grid display;
          // the raw cell is preserved for reference.)
          const p = parsed[0];
          parsedRows.push({
            day: currentDay,
            batch: currentBatch,
            time: currentTimeSlots[i],
            rawCell: cellVal,
            subjectName: p.subjectName,
            lecturerName: p.lecturerName,
            isBreak: false,
          });
          subjectMap.set(p.subjectName, { name: p.subjectName, lecturerName: p.lecturerName });
          if (p.lecturerName) lecturerSet.add(p.lecturerName);
        }
        timeSet.add(currentTimeSlots[i]);
      }
    }
  }

  return {
    rows: parsedRows,
    days: Array.from(daySet),
    batches: Array.from(batchSet),
    timeSlots: Array.from(timeSet),
    subjects: Array.from(subjectMap.values()),
    lecturers: Array.from(lecturerSet),
  };
}

/**
 * Upserts parsed timetable data into Supabase.
 * - Creates any missing lecturers (auto-generated LECT### IDs)
 * - Creates any missing subjects (auto-generated SUB### IDs)
 * - Wipes existing timetable rows for the affected batch(es) before inserting
 *
 * Returns counts for the UI.
 */
export async function seedTimetableFromParsed(parsed: ParsedTimetable): Promise<{
  lecturers: number;
  subjects: number;
  entries: number;
  skippedSubjects: string[];
  skippedEntries: number;
}> {
  const supabase = getSupabase();
  const skippedSubjects: string[] = [];
  let skippedEntries = 0;

  // 1. Lecturers — fetch existing by name, insert missing.
  // Don't select password_hash (not needed here, and reduces payload).
  const { data: existingLecturers } = await supabase
    .from("lecturers")
    .select("id, name, email");
  const lecturerByName = new Map<string, { id: string }>();
  for (const l of existingLecturers || []) {
    lecturerByName.set(l.name.toLowerCase(), { id: l.id });
  }
  for (const name of parsed.lecturers) {
    if (!lecturerByName.has(name.toLowerCase())) {
      const id = await nextId("LECT", "lecturers");
      // Build a unique email by appending a numeric suffix on collision.
      // The old code stripped all non-[a-z.] chars which made "John" and
      // "John D" both map to john@srinivas.edu.in.
      const baseLocalPart = name
        .toLowerCase()
        .replace(/[^a-z.]/g, "")
        .replace(/\.+/g, ".")
        .replace(/^\.|\.$/g, "") || "lecturer";
      let email = `${baseLocalPart}@srinivas.edu.in`;
      let suffix = 2;
      while (
        Array.from(lecturerByName.values()).some(
          (l) => l.id.toLowerCase() === email.toLowerCase()
        )
      ) {
        email = `${baseLocalPart}${suffix}@srinivas.edu.in`;
        suffix++;
      }
      // Generate a random strong password instead of literal "password".
      const randomPwd =
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10).toUpperCase();
      const passwordHash = await hashPassword(randomPwd);
      const { data, error } = await supabase
        .from("lecturers")
        .insert({ id, name, email, password_hash: passwordHash })
        .select("id, name")
        .single();
      if (!error && data) {
        lecturerByName.set(data.name.toLowerCase(), { id: data.id });
      }
    }
  }

  // 2. Subjects — fetch existing by name, insert missing.
  const { data: existingSubjects } = await supabase
    .from("subjects")
    .select("id, name, lecturer_id");
  const subjectByName = new Map<string, { id: string }>();
  for (const s of existingSubjects || []) {
    subjectByName.set(s.name.toLowerCase(), { id: s.id });
  }
  for (const subj of parsed.subjects) {
    if (!subjectByName.has(subj.name.toLowerCase())) {
      const lecturerId =
        subj.lecturerName && lecturerByName.has(subj.lecturerName.toLowerCase())
          ? lecturerByName.get(subj.lecturerName.toLowerCase())!.id
          : null;
      // Skip if we couldn't resolve a lecturer — record why for the caller.
      if (!lecturerId) {
        skippedSubjects.push(subj.name);
        continue;
      }
      const id = await nextId("SUB", "subjects");
      const { data, error } = await supabase
        .from("subjects")
        .insert({ id, name: subj.name, lecturer_id: lecturerId })
        .select("id, name")
        .single();
      if (!error && data) {
        subjectByName.set(data.name.toLowerCase(), { id: data.id });
      }
    }
  }

  // 3. Wipe existing timetable rows for the affected batches.
  if (parsed.batches.length > 0) {
    await supabase.from("timetable").delete().in("batch", parsed.batches);
  }

  // 4. Insert timetable entries using sequence-based IDs.
  const rows: { id: string; batch: string; day: string; time: string; subject_id: string }[] = [];
  for (const r of parsed.rows) {
    let subjectId: string;
    if (r.isBreak) {
      subjectId = "BREAK";
    } else {
      const found = subjectByName.get(r.subjectName.toLowerCase());
      if (!found) {
        skippedSubjects.push(r.subjectName);
        skippedEntries++;
        continue; // skip if subject couldn't be created (no lecturer)
      }
      subjectId = found.id;
    }
    const id = await nextId("TT", "timetable");
    rows.push({
      id,
      batch: r.batch,
      day: r.day,
      time: r.time,
      subject_id: subjectId,
    });
  }

  if (rows.length > 0) {
    // Insert in batches of 200 (Supabase payload limit safety).
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from("timetable").insert(chunk);
      if (error) {
        console.error("[timetable seed] insert error:", error.message);
        throw error;
      }
    }
  }

  return {
    lecturers: lecturerByName.size,
    subjects: subjectByName.size,
    entries: rows.length,
    skippedSubjects: Array.from(new Set(skippedSubjects)),
    skippedEntries,
  };
}
