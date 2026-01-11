ได้เลยครับคุณ Earth! นี่คือ **Full Code สำหรับ `README.md**` ฉบับสมบูรณ์ที่ปรับปรุงเครดิตให้คุณเป็น **Project Lead** อย่างถูกต้อง พร้อมรายละเอียดทางเทคนิคที่ครบถ้วนสำหรับใส่ใน GitHub ครับ

ก๊อปปี้โค้ดด้านล่างไปวางทับไฟล์ `README.md` เดิมได้เลยครับ

```markdown
# 🏥 Smart TriagER: AI-Powered Emergency Management System

![Project Status](https://img.shields.io/badge/Status-Active_Development-success)
![Version](https://img.shields.io/badge/Version-2.0_Hybrid_AI-blueviolet)
![Maintainer](https://img.shields.io/badge/Maintainer-Phubase_(Earth)-orange)

**Smart TriagER** is an advanced web-based emergency triage system designed to optimize patient flow in hospital emergency departments. It combines **Clinical Rule-Based Logic** with **Artificial Intelligence (Machine Learning)** to provide accurate, real-time patient prioritization.

---

> ### 🎗️ Acknowledgements & Credits
> This project is an advanced evolution of the original **TriagER System** developed as a capstone project by the **LockShade Team**.
>
> **Current Project Lead (v2.0):**
> * 👨‍💻 **Phubase (Earth)** - *System Architecture, AI Integration & Full-stack Development*
>
> **Original LockShade Team Members (Founders):**
> * **Product Owner:** Thanakit (JJ)
> * **Scrum Master:** Natnicha (Minnie)
> * **Developers:** Phubase (Earth), Tanyarat (Ploysod), Aroonrat (Earn), Thanyakarn (Pear)
>
> *Special thanks to the original team for establishing the core database schema and initial frontend design.*

---

## 🚀 Key Innovations (v2.0)

This updated version introduces **Hybrid Intelligence** to the triage process:

* 🤖 **AI Diagnostic Support:** Utilizes a **Random Forest** model (Python/Scikit-learn) to analyze natural language symptoms and predict potential diseases with ~99% accuracy.
* ⚖️ **Hybrid Triage Logic:** Combines vital sign weighted scores with AI predictions to prevent under-triage.
* 🛡️ **Safety Protocols:** Automated alerts for vulnerable groups (Infants, Elderly, Pregnancy complications).

## ✨ Core Features

* **Real-Time Dashboard:** Live monitoring of patient queues sorted by priority (RED → BLUE).
* **Vital Sign Calculation:** Automatic scoring based on HR, BP, SpO2, Temp, RR, and GCS.
* **Patient Journey Tracking:** Status updates from *Waiting* → *Treatment* → *Discharged*.
* **Comprehensive Logging:** Detailed audit trails for status changes and triage history.
* **Smart Search:** Filter patients by ID, Name, or specific Symptoms.

---

## 🛠️ Tech Stack

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

### Backend & Database
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)

### AI & Machine Learning
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white) ![Flask](https://img.shields.io/badge/Flask-000000?style=flat&logo=flask&logoColor=white) ![Scikit-Learn](https://img.shields.io/badge/scikit_learn-F7931E?style=flat&logo=scikit-learn&logoColor=white)

---

## ⚙️ Installation & Setup

### Prerequisites
* Node.js (v14+)
* Python (3.8+)
* MySQL (8.0+)

### 1. Database Setup
Login to MySQL and import the schema:
```bash
mysql -u root -p < triage-sql.sql

```

### 2. Backend Setup (Node.js)

```bash
# Install dependencies
npm install

# Configure environment variables
# Create a .env file with the following content:
# DB_HOST=localhost
# DB_USER=root
# DB_PASS=your_password
# DB_NAME=triage_db
# PORT=3000

# Start Server
node app.js

```

### 3. AI Service Setup (Python)

```bash
cd ai-service
# Install required libraries
pip install -r requirements.txt
# Run the AI API
python app.py

```

### 4. Access the Application

Open your browser and navigate to: `http://localhost:3000`

---

## 🧮 Triage Logic (Weighted Score)

The system calculates a severity score based on the following weights:

| Vital Sign | Weight | Description |
| --- | --- | --- |
| **SpO2** | 2.0 | Oxygen Saturation (Critical) |
| **BP (Sys)** | 1.8 | Blood Pressure |
| **Heart Rate** | 1.5 | Pulse Rate |
| **Resp. Rate** | 1.5 | Breathing Rate |
| **Temp** | 1.0 | Body Temperature |
| **Pain** | 0.8 | Subjective Pain Score |

**Color Classification:**

* 🔴 **RED (Critical):** Score > 20 or GCS ≤ 8
* 🟠 **ORANGE (Very Urgent):** Score 16-20
* 🟡 **YELLOW (Urgent):** Score 11-15
* 🟢 **GREEN (Standard):** Score 6-10
* 🔵 **BLUE (Non-Urgent):** Score 0-5

---

## 📂 Project Structure

```
smart-triager/
├── public/             # Frontend assets (Dashboard, Forms, Doctor View)
├── ai-service/         # Python Flask API, Model (.pkl), and Notebooks
├── app.js              # Node.js Backend Server entry point
├── triage-sql.sql      # Database Schema import file
├── .env                # Environment variables (Git ignored)
└── README.md           # Project Documentation

```

---

## 📜 License & Presentation

* [View Original Presentation (Canva)](https://www.google.com/search?q=https://www.canva.com/design/DAGzT25N2dI/8OUC8hlX-5ymR2vhbBlB-A/view)
* This project is open-source under the **MIT License**.

---

*Developed with ❤️ by Phubase (Earth) & The LockShade Team.*

```

```
