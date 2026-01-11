import express from "express";
import mysql from "mysql2/promise"; // ✨ อัพเกรด: ใช้เวอร์ชั่น Promise
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // ✨ เพิ่ม: สำหรับเรียก Python API (ต้อง npm install node-fetch)

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ==================================================
// 🗄️ DATABASE CONNECTION (Async/Await Pool)
// ==================================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  port: process.env.DB_PORT || 3306,
  password: process.env.DB_PASS || "admin@1234",
  database: process.env.DB_NAME || "triager_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Connected to MySQL Database successfully!");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

// ==================================================
// 🧠 AI INTEGRATION (งานเก่า: เชื่อมต่อ Python Flask)
// ==================================================
async function getAiPrediction(symptoms) {
  try {
    // ยิงไปที่ Python Flask API (งานเก่าของคุณ)
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: symptoms }),
    });

    if (response.ok) {
      const data = await response.json();
      return data; // ส่งคืนผลลัพธ์จาก AI (predictions, triage_level, etc.)
    }
  } catch (error) {
    console.warn("⚠️ AI Service unreachable (Using manual triage only):", error.message);
  }
  return null;
}

// ==================================================
// 🏥 MANUAL TRIAGE SCORE LOGIC
// ==================================================
function calculateTriage(vital, symptoms = "", age = 30, sex = "", indicator = "", aiResult = null) {
  const v = {
    heart_rate_bpm: parseFloat(vital.heart_rate_bpm) || 0,
    systolic_bp: parseFloat(vital.systolic_bp) || 0,
    temp_c: parseFloat(vital.temp_c) || 0,
    spo2_percent: parseFloat(vital.spo2_percent) || 0,
    resp_rate_min: parseFloat(vital.resp_rate_min) || 0,
    pain_score: parseFloat(vital.pain_score) || 0,
    gcs_total: parseFloat(vital.gcs_total),
  };

  let score = 0;
  const reasons = [];

  // --- Vital Sign Scoring (Original Logic) ---
  if (v.heart_rate_bpm > 150 || v.heart_rate_bpm <= 20) score += 4 * 1.5;
  else if (v.heart_rate_bpm > 130 || v.heart_rate_bpm <= 30) score += 3 * 1.5;
  else if (v.heart_rate_bpm > 110 || v.heart_rate_bpm <= 40) score += 2 * 1.5;
  else if (v.heart_rate_bpm > 90 || v.heart_rate_bpm <= 50) score += 1 * 1.5;

  if (v.systolic_bp < 70) score += 4 * 1.8;
  else if (v.systolic_bp < 80 || v.systolic_bp >= 180) score += 3 * 1.8;
  else if (v.systolic_bp < 90 || v.systolic_bp >= 160) score += 2 * 1.8;
  else if (v.systolic_bp < 100 || v.systolic_bp >= 140) score += 1 * 1.8;

  if (v.temp_c > 40.0 || v.temp_c < 34.0) score += 4;
  else if (v.temp_c > 39.0 || v.temp_c < 35.0) score += 3;
  else if (v.temp_c > 38.0 || v.temp_c < 36.0) score += 2;
  else if (v.temp_c > 37.5) score += 1;

  if (v.spo2_percent < 85) score += 5 * 2.0;
  else if (v.spo2_percent < 90) score += 4 * 2.0;
  else if (v.spo2_percent < 92) score += 3 * 2.0;
  else if (v.spo2_percent < 94) score += 2 * 2.0;
  else if (v.spo2_percent < 96) score += 1 * 2.0;

  if (v.resp_rate_min >= 35 || v.resp_rate_min <= 6) score += 4 * 1.5;
  else if (v.resp_rate_min >= 30 || v.resp_rate_min <= 7) score += 3 * 1.5;
  else if (v.resp_rate_min >= 25 || v.resp_rate_min <= 9) score += 2 * 1.5;
  else if (v.resp_rate_min >= 21 || v.resp_rate_min <= 11) score += 1 * 1.5;

  if (v.pain_score >= 10) score += 5 * 0.8;
  else if (v.pain_score >= 9) score += 4 * 0.8;
  else if (v.pain_score >= 7) score += 3 * 0.8;
  else if (v.pain_score >= 5) score += 2 * 0.8;
  else if (v.pain_score >= 3) score += 1 * 0.8;

  // --- GCS Check ---
  if (!isNaN(v.gcs_total)) {
    if (v.gcs_total <= 8) {
      console.log(`🧠 GCS override → RED (GCS=${v.gcs_total})`);
      return { triage: "RED", score, reasoning: ["Severely altered consciousness (GCS ≤ 8)"] };
    } else if (v.gcs_total >= 9 && v.gcs_total <= 12) {
      console.log(`🧠 GCS override → YELLOW (GCS=${v.gcs_total})`);
      return { triage: "YELLOW", score, reasoning: ["Moderately altered consciousness (GCS 9–12)"] };
    }
  }

  const sym = (symptoms || "").toLowerCase();
  let triage = "BLUE";

  // --- Triage Level Logic ---
  // ✨ อัพเกรด: ถ้า AI บอกว่าเป็น RED ให้เชื่อ AI ด้วย
  const isAiCritical = aiResult && aiResult.triage_level === "RED";
  const isAiUrgent = aiResult && aiResult.triage_level === "YELLOW";

  if (
    v.spo2_percent < 90 ||
    v.systolic_bp < 90 ||
    v.resp_rate_min <= 10 || v.resp_rate_min >= 30 ||
    v.heart_rate_bpm <= 40 || v.heart_rate_bpm >= 140 ||
    sym.includes("severe chest pain") ||
    isAiCritical 
  ) {
    triage = "RED";
    reasons.push(isAiCritical ? "AI Detected Critical Condition" : "Critical vital instability");
  } 
  else if (
    (v.systolic_bp >= 90 && v.systolic_bp <= 100) ||
    (v.spo2_percent >= 90 && v.spo2_percent <= 93) ||
    (v.temp_c > 39.5) ||
    (v.resp_rate_min >= 25 && v.resp_rate_min <= 29) ||
    (v.heart_rate_bpm >= 110 && v.heart_rate_bpm <= 139) ||
    (v.pain_score >= 7) ||
    sym.includes("chest pain") ||
    sym.includes("trauma") ||
    isAiUrgent
  ) {
    triage = "YELLOW";
    reasons.push(isAiUrgent ? "AI Detected Urgent Condition" : "Urgent condition (moderate to severe deviation)");
  } 
  else if (
    (v.temp_c >= 38.5 && v.temp_c <= 39.5) ||
    (v.pain_score >= 5 && v.pain_score <= 6) ||
    (v.spo2_percent >= 94 && v.spo2_percent <= 95)
  ) {
    triage = "GREEN";
    reasons.push("Stable but symptomatic");
  } 
  else {
    triage = "BLUE";
    reasons.push("Normal condition");
  }
  
  // ถ้า AI เจอโรค ให้เพิ่มชื่อโรคในเหตุผลด้วย
  if (aiResult && aiResult.predictions && aiResult.predictions.length > 0) {
      reasons.push(`Possible Disease: ${aiResult.predictions[0].disease}`);
  }

  console.log(`🩺 TRIAGE → ${triage} | Score=${score.toFixed(2)}`);
  return { triage, score: Number(score.toFixed(2)), reasoning: reasons };
}

// ==================================================
// 🛤️ ROUTES (Refactored to Async/Await)
// ==================================================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "Dashboard.html")));
app.get("/form", (req, res) => res.sendFile(path.join(__dirname, "public", "form.html")));
app.get("/logs", (req, res) => res.sendFile(path.join(__dirname, "public", "logs.html")));

// 📋 Get all patients
app.get("/patients", async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT 
        p.patient_id, 
        CONCAT(p.first_name, ' ', p.last_name) AS full_name,
        p.sex, p.indicator, p.symptoms,
        p.triage_level, p.triage_score, p.triage_reason,
        p.status_name,
        p.created_at,
        p.updated_at,
        vs.heart_rate_bpm, vs.resp_rate_min,
        CONCAT(vs.systolic_bp, '/', vs.diastolic_bp) AS bp,
        vs.temp_c, vs.spo2_percent, vs.gcs_total, vs.pain_score
      FROM Patient p
      JOIN VitalSigns vs ON p.patient_id = vs.patient_id
      ORDER BY p.triage_score DESC;
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get Status Logs
app.get("/logs/status", async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT sl.statuslog_id, sl.patient_id, CONCAT(p.first_name, ' ', p.last_name) AS patient_name, sl.status_name, sl.statuslog_timestamp
      FROM StatusLog sl JOIN Patient p ON sl.patient_id = p.patient_id
      ORDER BY sl.statuslog_timestamp DESC
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get Color Logs
app.get("/logs/color", async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT cl.colorlog_id, cl.patient_id, CONCAT(p.first_name, ' ', p.last_name) AS patient_name, cl.triage_level, cl.colorlog_timestamp
      FROM ColorLog cl JOIN Patient p ON cl.patient_id = p.patient_id
      ORDER BY cl.colorlog_timestamp DESC
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🏥 Add new patient (Enhanced with AI & Transaction)
app.post("/patients", async (req, res) => {
  const { national_id, first_name, last_name, sex, date_of_birth, indicator, symptoms, vital } = req.body;
  
  if (!first_name || !last_name) return res.status(400).json({ error: "Missing patient name" });

  const connection = await pool.getConnection(); // Get connection for transaction

  try {
    await connection.beginTransaction(); // Start Transaction

    // 1. เรียกใช้ AI (งานเก่า) ถ้ามีอาการ
    let aiResult = null;
    if (symptoms) {
        console.log("🤖 Asking AI to analyze symptoms...");
        aiResult = await getAiPrediction(symptoms);
    }

    // 2. คำนวณ Triage (เอาผล AI มาคิดด้วย)
    const age = date_of_birth ? new Date().getFullYear() - new Date(date_of_birth).getFullYear() : 30;
    const { triage, score, reasoning } = calculateTriage(vital, symptoms, age, sex, indicator, aiResult);

    // 3. Insert Patient
    const [resPatient] = await connection.query(
      "INSERT INTO Patient (national_id, first_name, last_name, sex, date_of_birth, indicator, symptoms, triage_level, triage_score, triage_reason, status_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [national_id, first_name, last_name, sex, date_of_birth, indicator, symptoms, triage, score, reasoning.join('; '), 'Waiting']
    );
    const patientId = resPatient.insertId;

    // 4. Insert Vital Signs
    const { heart_rate_bpm, resp_rate_min, systolic_bp, diastolic_bp, temp_c, spo2_percent, gcs_total, pain_score } = vital || {};
    await connection.query(
      "INSERT INTO VitalSigns (patient_id, heart_rate_bpm, resp_rate_min, systolic_bp, diastolic_bp, temp_c, spo2_percent, gcs_total, pain_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [patientId, heart_rate_bpm, resp_rate_min, systolic_bp, diastolic_bp, temp_c, spo2_percent, gcs_total, pain_score]
    );

    // 5. Insert Initial Logs
    await connection.query("INSERT INTO StatusLog (patient_id, status_name) VALUES (?, ?)", [patientId, 'Waiting']);
    await connection.query("INSERT INTO ColorLog (patient_id, triage_level) VALUES (?, ?)", [patientId, triage]);

    await connection.commit(); // Commit Transaction

    res.status(201).json({
      message: "✅ Patient added successfully",
      patient_id: patientId,
      triage,
      score,
      reasoning,
      ai_analysis: aiResult // ส่งผล AI กลับไปด้วย
    });

  } catch (err) {
    await connection.rollback(); // Rollback if error
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// 🔄 Update patient status
app.put("/patients/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Waiting', 'Under Treatment', 'Transferred', 'Discharged', 'Deceased'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid or missing status" });
  }

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query("SELECT triage_level, triage_score, status_name FROM Patient WHERE patient_id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Patient not found" });

    const currentData = rows[0];
    let { triage_level: newTriageLevel, triage_score: newTriageScore } = currentData;
    const oldStatus = currentData.status_name;

    // Logic เปลี่ยนคะแนนตามสถานะ
    if (status === 'Under Treatment') newTriageScore = 0.0;
    else if (['Transferred', 'Discharged'].includes(status)) {
      newTriageLevel = 'BLUE';
      newTriageScore = 0.0;
    }

    // Update DB
    await connection.query(
      "UPDATE Patient SET status_name = ?, triage_level = ?, triage_score = ? WHERE patient_id = ?",
      [status, newTriageLevel, newTriageScore, id]
    );

    // Insert Logs if changed
    if (oldStatus !== status) {
      await connection.query("INSERT INTO StatusLog (patient_id, status_name) VALUES (?, ?)", [id, status]);
    }
    if (currentData.triage_level !== newTriageLevel) {
      await connection.query("INSERT INTO ColorLog (patient_id, triage_level) VALUES (?, ?)", [id, newTriageLevel]);
    }

    res.json({ message: "Status updated successfully", patient_id: id, status, triage_level: newTriageLevel });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// 🧹 Clear DB
app.delete("/clear-db", async (req, res) => {
  try {
    await pool.query("DELETE FROM StatusLog");
    await pool.query("DELETE FROM ColorLog");
    await pool.query("DELETE FROM VitalSigns");
    await pool.query("DELETE FROM Patient");
    
    // Reset Auto Increment
    const tables = ["StatusLog", "ColorLog", "VitalSigns", "Patient"];
    for (const table of tables) {
      await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }

    res.json({ message: "Database cleared successfully. IDs reset." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Node Server running on port ${PORT}`));