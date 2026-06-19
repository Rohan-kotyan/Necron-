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
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  time: string;
  subjectId: string;
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
