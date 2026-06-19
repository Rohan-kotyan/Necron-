import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const JWT_SECRET = "college_attendance_super_secret_key_2026";

// Body checkers
app.use(express.json());

// Path to database
const DB_PATH = path.resolve(process.cwd(), "src/server/db.json");

// Helper to read DB safely
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Fallback default structure
      return { students: [], lecturers: [], subjects: [], timetable: [], attendance: [] };
    }
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading database:", error);
    return { students: [], lecturers: [], subjects: [], timetable: [], attendance: [] };
  }
}

// Helper to write DB safely
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

// Ensure database file exists on startup
readDB();

// JWT Middleware
const verifyToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(403).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(403).json({ error: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: "Failed to authenticate token" });
    }
    req.user = decoded;
    next();
  });
};

// ======================== API ENDPOINTS ========================

// 1. JWT Authentication
app.post("/api/auth/login", (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password and role are required" });
  }

  const db = readDB();

  if (role === "admin") {
    // Admin login check
    if (email === "admin@college.edu" && password === "password") {
      const token = jwt.sign({ id: "ADMIN", email, role: "admin", name: "System Administrator" }, JWT_SECRET, { expiresIn: "1d" });
      return res.json({
        token,
        user: { id: "ADMIN", email, role: "admin", name: "System Administrator" }
      });
    }
    return res.status(401).json({ error: "Invalid Administration credentials" });
  }

  if (role === "lecturer") {
    const lecturer = db.lecturers.find((b: any) => b.email.toLowerCase() === email.toLowerCase());
    if (lecturer && lecturer.password === password) {
      const token = jwt.sign({ id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name }, JWT_SECRET, { expiresIn: "1d" });
      return res.json({
        token,
        user: { id: lecturer.id, email: lecturer.email, role: "lecturer", name: lecturer.name }
      });
    }
    return res.status(401).json({ error: "Invalid Lecturer credentials" });
  }

  if (role === "student") {
    const student = db.students.find((s: any) => s.email.toLowerCase() === email.toLowerCase() || s.registrationNumber.toLowerCase() === email.toLowerCase());
    if (student && student.password === password) {
      const token = jwt.sign({
        id: student.id,
        email: student.email,
        role: "student",
        name: student.name,
        registrationNumber: student.registrationNumber,
        batch: student.batch,
        specialization: student.specialization
      }, JWT_SECRET, { expiresIn: "1d" });

      return res.json({
        token,
        user: {
          id: student.id,
          email: student.email,
          role: "student",
          name: student.name,
          registrationNumber: student.registrationNumber,
          batch: student.batch,
          specialization: student.specialization
        }
      });
    }
    return res.status(401).json({ error: "Invalid Student credentials" });
  }

  return res.status(400).json({ error: "Unsupported user role" });
});

// 2. Fetch Batches
app.get("/api/batches", (req, res) => {
  res.json({ batches: ["A1", "A2", "A3", "A4"] });
});

// 3. Fetch Subjects
app.get("/api/subjects", (req, res) => {
  const db = readDB();
  res.json({ subjects: db.subjects });
});

// 4. Fetch Timetable for batch
app.get("/api/timetable/batch/:batch", (req, res) => {
  const { batch } = req.params;
  const db = readDB();
  const timetableFiltered = db.timetable.filter((t: any) => t.batch.toUpperCase() === batch.toUpperCase());
  res.json({ timetable: timetableFiltered });
});

// 5. Fetch Students (with filter for batch & specialization)
app.get("/api/students", (req, res) => {
  const { batch, specialization } = req.query;
  const db = readDB();
  let filtered = db.students;

  if (batch) {
    filtered = filtered.filter((s: any) => s.batch.toUpperCase() === (batch as string).toUpperCase());
  }
  if (specialization) {
    filtered = filtered.filter((s: any) => s.specialization.toUpperCase() === (specialization as string).toUpperCase());
  }

  res.json({ students: filtered });
});

// 6. Record/Mark Attendance
app.post("/api/attendance/mark", (req, res) => {
  const { subjectId, date, batch, specialization, records } = req.body;

  if (!subjectId || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: "Missing required fields for marking attendance" });
  }

  const db = readDB();
  
  // Format details
  const cleanDate = date.split("T")[0]; // YYYY-MM-DD
  const newAttendanceList = [...db.attendance];

  records.forEach((rec: { studentId: string; status: 'Present' | 'Absent' }) => {
    // Remove if there's any pre-existing attendance record for this student, subject, and date to avoid duplication
    const index = newAttendanceList.findIndex(
      (a: any) => a.studentId === rec.studentId && a.subjectId === subjectId && a.date === cleanDate
    );

    const recordPayload = {
      id: index >= 0 ? newAttendanceList[index].id : `ATT_${Date.now()}_${rec.studentId}_${Math.floor(Math.random() * 1000)}`,
      studentId: rec.studentId,
      subjectId,
      date: cleanDate,
      status: rec.status
    };

    if (index >= 0) {
      newAttendanceList[index] = recordPayload;
    } else {
      newAttendanceList.push(recordPayload);
    }
  });

  db.attendance = newAttendanceList;
  const writeSuccess = writeDB(db);

  if (writeSuccess) {
    res.json({ success: true, message: "Attendance saved successfully!", count: records.length });
  } else {
    res.status(500).json({ error: "Failed to persist database record updates" });
  }
});

// 7. Get Attendance Log/History with details for Reports
app.get("/api/attendance/history", (req, res) => {
  const db = readDB();
  
  // Join students, subjects, lecturers info for robust grid reporting
  const history = db.attendance.map((attn: any) => {
    const student = db.students.find((s: any) => s.id === attn.studentId);
    const subject = db.subjects.find((sub: any) => sub.id === attn.subjectId);
    const lecturer = subject ? db.lecturers.find((l: any) => l.id === subject.lecturerId) : null;

    return {
      id: attn.id,
      date: attn.date,
      status: attn.status,
      studentId: attn.studentId,
      studentName: student ? student.name : "Unknown Student",
      registrationNumber: student ? student.registrationNumber : "Unknown Reg No",
      batch: student ? student.batch : "Unknown Batch",
      specialization: student ? student.specialization : "N/A",
      subjectId: attn.subjectId,
      subjectName: subject ? subject.name : "Unknown Subject",
      lecturerName: lecturer ? lecturer.name : "N/A"
    };
  });

  res.json({ history });
});

// 8. Fetch individual student attendance cards
app.get("/api/attendance/student/:studentId", (req, res) => {
  const { studentId } = req.params;
  const db = readDB();
  const records = db.attendance.filter((a: any) => a.studentId === studentId);
  res.json({ attendance: records });
});

// ======================== ADMIN ENDPOINTS ========================

// Add Lecturer
app.post("/api/admin/lecturers", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Lecturer credentials lack required inputs" });
  }

  const db = readDB();
  if (db.lecturers.some((l: any) => l.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered for another Lecturer" });
  }

  const id = `LECT${String(db.lecturers.length + 1).padStart(3, "0")}`;
  const newLecturer = { id, name, email, password };
  db.lecturers.push(newLecturer);
  writeDB(db);

  res.json({ success: true, lecturer: newLecturer });
});

// Remove Lecturer
app.delete("/api/admin/lecturers/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.lecturers = db.lecturers.filter((l: any) => l.id !== id);
  writeDB(db);
  res.json({ success: true, id });
});

// Add Student
app.post("/api/admin/students", (req, res) => {
  const { name, email, password, registrationNumber, batch, specialization } = req.body;
  
  if (!name || !email || !password || !registrationNumber || !batch || !specialization) {
    return res.status(400).json({ error: "Please complete all student fields" });
  }

  const db = readDB();
  if (db.students.some((s: any) => s.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already exists in Database" });
  }
  if (db.students.some((s: any) => s.registrationNumber.toLowerCase() === registrationNumber.toLowerCase())) {
    return res.status(400).json({ error: "Registration Number already registered" });
  }

  const id = `STUD${String(db.students.length + 1).padStart(3, "0")}`;
  const newStudent = { id, name, email, password, registrationNumber, batch, specialization };
  db.students.push(newStudent);
  writeDB(db);

  res.json({ success: true, student: newStudent });
});

// Remove Student
app.delete("/api/admin/students/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.students = db.students.filter((s: any) => s.id !== id);
  // Optional: Clean up attendance of student so database is perfect
  db.attendance = db.attendance.filter((a: any) => a.studentId !== id);
  writeDB(db);
  res.json({ success: true, id });
});

// Create/Add Subject
app.post("/api/admin/subjects", (req, res) => {
  const { name, lecturerId } = req.body;
  if (!name || !lecturerId) {
    return res.status(400).json({ error: "Missing subject details" });
  }

  const db = readDB();
  const id = `SUB${String(db.subjects.length + 1).padStart(3, "0")}`;
  const newSubject = { id, name, lecturerId };
  db.subjects.push(newSubject);
  writeDB(db);

  res.json({ success: true, subject: newSubject });
});

// Create Timetable Slot
app.post("/api/admin/timetable", (req, res) => {
  const { batch, day, time, subjectId } = req.body;
  if (!batch || !day || !time || !subjectId) {
    return res.status(400).json({ error: "Missing timetable scheduling elements" });
  }

  const db = readDB();
  const id = `TT${String(db.timetable.length + 1).padStart(3, "0")}`;
  const entry = { id, batch, day, time, subjectId };
  db.timetable.push(entry);
  writeDB(db);

  res.json({ success: true, timetableEntry: entry });
});

// Remove Timetable Slot
app.delete("/api/admin/timetable/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.timetable = db.timetable.filter((t: any) => t.id !== id);
  writeDB(db);
  res.json({ success: true, id });
});


// ==================== VITE CLIENT INTEGRATION ====================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Veritas College Attendance ERP running on port ${PORT}`);
  });
}

startServer();
