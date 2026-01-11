-- ==================================================
-- 1. สร้าง Database (ลบของเก่าทิ้งถ้ามี)
-- ==================================================
DROP DATABASE IF EXISTS triager_system;
CREATE DATABASE triager_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE triager_system;

-- ==================================================
-- 2. สร้างตาราง Master Data (ข้อมูลหลัก)
-- ==================================================

-- ตารางตัวบ่งชี้อาการฉุกเฉิน (Emergency Indicators)
CREATE TABLE EmergencyIndicator (
    indicator_id INT AUTO_INCREMENT PRIMARY KEY,
    indicator VARCHAR(50) UNIQUE NOT NULL
);

-- ตารางสถานะผู้ป่วย (Waiting, Discharged, etc.)
CREATE TABLE PatientStatus (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE NOT NULL
);

-- ตารางระดับความฉุกเฉิน (สี Triage)
CREATE TABLE TriageLevel (
    triage_level_id INT AUTO_INCREMENT PRIMARY KEY,
    c_code VARCHAR(10) UNIQUE NOT NULL, -- RED, YELLOW, etc.
    display_name VARCHAR(50) NOT NULL,
    priority_rank INT NOT NULL
);

-- ==================================================
-- 3. สร้างตารางเก็บข้อมูลผู้ป่วย (Transactional Data)
-- ==================================================

-- ตารางผู้ป่วย (Patient)
CREATE TABLE Patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    national_id VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    sex ENUM('Male', 'Female', 'Other'),
    date_of_birth DATE,
    
    -- ข้อมูลทางการแพทย์
    indicator VARCHAR(50),      -- อาการนำ (FK)
    symptoms TEXT,              -- อาการละเอียด (สำหรับ AI)
    
    -- ผลการคัดกรอง
    triage_level VARCHAR(10),   -- สีที่ได้ (FK)
    triage_score DECIMAL(5, 2) DEFAULT 0.00,
    triage_reason TEXT,         -- เหตุผล (รวมผลจาก AI)
    
    -- สถานะ
    status_name VARCHAR(50) DEFAULT 'Waiting', -- (FK)
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT FK_Patient_Indicator FOREIGN KEY (indicator) REFERENCES EmergencyIndicator (indicator) ON DELETE SET NULL,
    CONSTRAINT FK_Patient_Status FOREIGN KEY (status_name) REFERENCES PatientStatus (status_name) ON UPDATE CASCADE,
    CONSTRAINT FK_Patient_Triage FOREIGN KEY (triage_level) REFERENCES TriageLevel (c_code) ON UPDATE CASCADE
);

-- ตารางสัญญาณชีพ (Vital Signs)
CREATE TABLE VitalSigns (
    vital_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    
    heart_rate_bpm INT,
    resp_rate_min INT,
    systolic_bp INT,
    diastolic_bp INT,
    temp_c DECIMAL(4, 1),
    spo2_percent INT,
    gcs_total INT,          -- สำคัญ: คะแนนการตอบสนอง
    pain_score INT,         -- สำคัญ: คะแนนความเจ็บปวด
    
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key (1 Patient มี 1 Vital Signs ในการ visit ครั้งนั้น)
    CONSTRAINT FK_VitalSigns_Patient FOREIGN KEY (patient_id) REFERENCES Patient (patient_id) ON DELETE CASCADE
);

-- ==================================================
-- 4. สร้างตาราง Logs (เก็บประวัติ)
-- ==================================================

-- ประวัติการเปลี่ยนสถานะ (Status Logs)
CREATE TABLE StatusLog (
    statuslog_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    status_name VARCHAR(50) NOT NULL,
    statuslog_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT FK_StatusLog_Patient FOREIGN KEY (patient_id) REFERENCES Patient (patient_id) ON DELETE CASCADE
);

-- ประวัติการเปลี่ยนสี (Color Logs)
CREATE TABLE ColorLog (
    colorlog_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    triage_level VARCHAR(10) NOT NULL,
    colorlog_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT FK_ColorLog_Patient FOREIGN KEY (patient_id) REFERENCES Patient (patient_id) ON DELETE CASCADE
);

-- ==================================================
-- 5. เพิ่มข้อมูลตั้งต้น (Seed Data)
-- ==================================================

-- ข้อมูล Indicators
INSERT INTO EmergencyIndicator (indicator) VALUES 
('Unconscious'), ('Bleeding'), ('Breathing Difficulty'), ('Chest Pain'), 
('Seizure'), ('Trauma'), ('None');

-- ข้อมูล Status
INSERT INTO PatientStatus (status_name) VALUES 
('Waiting'), ('Under Treatment'), ('Transferred'), ('Discharged'), ('Deceased');

-- ข้อมูล Triage Colors
INSERT INTO TriageLevel (c_code, display_name, priority_rank) VALUES 
('RED', 'Immediate (Emergency)', 1),
('ORANGE', 'Very Urgent', 2),      -- เก็บไว้เผื่อใช้ในอนาคต แม้ Code ปัจจุบันจะยังไม่จ่ายสีนี้
('YELLOW', 'Urgent', 3),
('GREEN', 'Standard', 4),
('BLUE', 'Non-Urgent', 5),
('WHITE', 'Advice Only', 6);

-- ==================================================
-- 6. เพิ่มข้อมูลทดสอบ (Dummy Data)
-- ==================================================

-- 6.1: Case RED (วิกฤต - หายใจไม่ออก)
INSERT INTO Patient (national_id, first_name, last_name, sex, date_of_birth, indicator, symptoms, triage_level, triage_score, triage_reason, status_name)
VALUES ('110000000001', 'Somsak', 'Dang', 'Male', '1980-01-01', 'Breathing Difficulty', 'Severe shortness of breath, turning blue', 'RED', 25.50, 'Critical vital instability; AI Detected Critical', 'Waiting');

INSERT INTO VitalSigns (patient_id, heart_rate_bpm, resp_rate_min, systolic_bp, diastolic_bp, temp_c, spo2_percent, gcs_total, pain_score)
VALUES (LAST_INSERT_ID(), 145, 35, 85, 50, 38.5, 82, 11, 8);

INSERT INTO StatusLog (patient_id, status_name) VALUES (LAST_INSERT_ID(), 'Waiting');
INSERT INTO ColorLog (patient_id, triage_level) VALUES (LAST_INSERT_ID(), 'RED');

-- 6.2: Case YELLOW (เร่งด่วน - ไข้สูง+ปวดหัว)
INSERT INTO Patient (national_id, first_name, last_name, sex, date_of_birth, indicator, symptoms, triage_level, triage_score, triage_reason, status_name)
VALUES ('110000000002', 'Manee', 'Luang', 'Female', '1995-05-20', 'None', 'High fever and severe headache', 'YELLOW', 15.00, 'Urgent condition; Possible Dengue Fever', 'Waiting');

INSERT INTO VitalSigns (patient_id, heart_rate_bpm, resp_rate_min, systolic_bp, diastolic_bp, temp_c, spo2_percent, gcs_total, pain_score)
VALUES (LAST_INSERT_ID(), 115, 22, 110, 70, 39.5, 96, 15, 7);

INSERT INTO StatusLog (patient_id, status_name) VALUES (LAST_INSERT_ID(), 'Waiting');
INSERT INTO ColorLog (patient_id, triage_level) VALUES (LAST_INSERT_ID(), 'YELLOW');

-- 6.3: Case GREEN (ทั่วไป - ปวดท้องนิดหน่อย)
INSERT INTO Patient (national_id, first_name, last_name, sex, date_of_birth, indicator, symptoms, triage_level, triage_score, triage_reason, status_name)
VALUES ('110000000003', 'Piti', 'Kiew', 'Male', '2000-12-12', 'None', 'Mild stomach ache', 'GREEN', 5.00, 'Stable but symptomatic', 'Discharged');

INSERT INTO VitalSigns (patient_id, heart_rate_bpm, resp_rate_min, systolic_bp, diastolic_bp, temp_c, spo2_percent, gcs_total, pain_score)
VALUES (LAST_INSERT_ID(), 80, 18, 120, 80, 37.0, 99, 15, 4);

INSERT INTO StatusLog (patient_id, status_name) VALUES (LAST_INSERT_ID(), 'Discharged');
INSERT INTO ColorLog (patient_id, triage_level) VALUES (LAST_INSERT_ID(), 'GREEN');

-- ตรวจสอบผลลัพธ์
SELECT * FROM Patient;
