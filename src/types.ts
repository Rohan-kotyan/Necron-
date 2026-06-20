export interface Student {
  id: string;
  registrationNumber: string;
  name: string;
  email: string;
  password?: string;
  batch: string;
  specialization: 'AI & ML' | 'SD' | 'MV';
}

export interface Lecturer {
  id: string;
  name: string;
  email: string;
  password?: string;
}

export interface Subject {
  id: string;
  name: string;
  lecturerId: string;
}

export interface TimetableEntry {
  id: string;
  batch: string;
  day: TimetableDay;
  time: string;
  subjectId: string;
  /** Subject name — populated when the API joins to subjects */
  subjectName?: string | null;
  /** Lecturer id — populated when the API joins to subjects → lecturers */
  lecturerId?: string | null;
  /** Lecturer name — populated when the API joins to subjects → lecturers */
  lecturerName?: string | null;
  /** True when this slot is a break (subjectId === 'BREAK') */
  isBreak?: boolean;
}

export type TimetableDay =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export const TIMETABLE_DAYS: TimetableDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Result returned by GET /api/timetable (and GET /api/admin/timetable). */
export interface TimetableListResponse {
  timetable: TimetableEntry[];
}

/** Result returned by POST /api/admin/timetable/import. */
export interface TimetableImportResponse {
  success: boolean;
  mode: 'default' | 'upload' | 'raw';
  dryRun: boolean;
  parsed: {
    days: string[];
    batches: string[];
    timeSlots: string[];
    subjects: { name: string; lecturerName: string | null }[];
    lecturers: string[];
    rowCount: number;
    sampleRows?: ParsedTimetableRow[];
  };
  seeded?: {
    lecturers: number;
    subjects: number;
    entries: number;
  };
}

export interface ParsedTimetableRow {
  day: string;
  batch: string;
  time: string;
  rawCell: string;
  subjectName: string;
  lecturerName: string | null;
  isBreak: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent';
}

export interface BatchInfo {
  code: string; // A1, A2, etc.
}

export interface UserSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'lecturer' | 'student' | 'admin';
    registrationNumber?: string;
    batch?: string;
    specialization?: string;
  };
}
