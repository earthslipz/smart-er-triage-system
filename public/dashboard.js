// ==================================================
// 🧠 TRIAGE DASHBOARD FRONTEND
// ==================================================
const patientTable = document.getElementById("patientTable");
const totalPatients = document.getElementById("totalPatients");
const criticalCount = document.getElementById("criticalCount");
const urgentCount = document.getElementById("urgentCount");
const mildCount = document.getElementById("mildCount");
const minorCount = document.getElementById("minorCount");
const deceasedCount = document.getElementById("deceasedCount");

const triagePriority = {
  RED: 1,
  ORANGE: 2,
  YELLOW: 3,
  GREEN: 4,
  BLUE: 5,
};

// ==================================================
// 🕒 Format Timestamp
// ==================================================
function formatTimestamp(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// ==================================================
// 🔄 ดึงข้อมูลจาก Backend
// ==================================================
async function loadPatients() {
  try {
    // console.log("🔄 Fetching patients from backend...");
    const res = await fetch("/patients");
    
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    
    if (!Array.isArray(data)) {
      throw new Error("Invalid data format (expected array)");
    }

    // 📊 เรียงตาม Priority → Score (RED → BLUE)
    data.sort((a, b) => {
      const rankA = triagePriority[a.triage_level] || 99;
      const rankB = triagePriority[b.triage_level] || 99;
      if (rankA === rankB) {
        const scoreA = parseFloat(a.triage_score) || 0;
        const scoreB = parseFloat(b.triage_score) || 0;
        return scoreB - scoreA;
      }
      return rankA - rankB;
    });

    // ล้างตารางเก่า
    patientTable.innerHTML = "";

    const counts = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0, BLUE: 0, DECEASED: 0 };
    let activePatientCount = 0; // ตัวนับลำดับ (ไม่รวมคนเสียชีวิต)

    // ==================================================
    // 🧾 เติมข้อมูลในตาราง
    // ==================================================
    data.forEach((p) => {
      const currentStatus = p.status_name || "Waiting";

      // 1. ถ้าเสียชีวิต ให้นับยอด แต่ไม่ต้องแสดงแถว
      if (currentStatus === "Deceased") {
        counts.DECEASED++;
        return; // ✨ MAGIC: ข้ามการสร้างแถวไปเลย
      }

      // นับ Active Patient
      activePatientCount++;

      const triage = (p.triage_level || "UNKNOWN").toUpperCase();
      const color = getColor(triage);
      counts[triage] = (counts[triage] || 0) + 1;

      const score = p.triage_score ? parseFloat(p.triage_score).toFixed(2) : "-";
      const priority = activePatientCount; 
      const lastUpdated = formatTimestamp(p.updated_at);

      const row = `
        <tr data-id="${p.patient_id}">
          <td>${priority}</td>
          <td>
          <a href="doctor_view.html?id=${p.patient_id}" 
          target="_blank"
          style="color: #554A9D; font-weight: bold; text-decoration: none; border-bottom: 1px dashed #554A9D;">
           ${p.full_name || "-"}
           </a>
          </td>
          <td>${p.full_name || "-"}</td>
          <td><span style="color: ${color}; font-weight: bold;">${triage}</span></td>
          <td>${p.sex || "-"}</td>
          <td>${score}</td>
          <td>${p.symptoms || "-"}</td>
          <td style="white-space: nowrap;">
            <select class="status-select">
              <option value="Waiting" ${currentStatus === "Waiting" ? "selected" : ""}>Waiting</option>
              <option value="Under Treatment" ${currentStatus === "Under Treatment" ? "selected" : ""}>Treatment</option>
              <option value="Transferred" ${currentStatus === "Transferred" ? "selected" : ""}>Transferred</option>
              <option value="Discharged" ${currentStatus === "Discharged" ? "selected" : ""}>Discharged</option>
              <option value="Deceased" ${currentStatus === "Deceased" ? "selected" : ""}>Deceased</option>
            </select>
            <button class="update-btn" title="Save Status">💾</button>
          </td>
          <td>${lastUpdated}</td>
        </tr>
      `;

      patientTable.insertAdjacentHTML("beforeend", row);
    });

    // 📦 อัปเดต summary box
    totalPatients.textContent = data.length; // นับรวมทั้งหมด (รวม Deceased)
    criticalCount.textContent = counts.RED;
    urgentCount.textContent = (counts.ORANGE || 0) + (counts.YELLOW || 0);
    mildCount.textContent = counts.GREEN;
    minorCount.textContent = counts.BLUE;
    deceasedCount.textContent = counts.DECEASED;

    addUpdateListeners();

  } catch (err) {
    console.error("❌ Error loading patients:", err);
    patientTable.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: red; font-weight: bold; padding: 20px;">
          ⚠️ Failed to load patient data: ${err.message}
        </td>
      </tr>
    `;
  }
}

// ==================================================
// 🎨 สี triage
// ==================================================
function getColor(level) {
  switch (level) {
    case "RED": return "#dc3545";
    case "ORANGE": return "#fd7e14";
    case "YELLOW": return "#e0a800"; // ปรับสีเหลืองให้อ่านง่ายขึ้น
    case "GREEN": return "#28a745";
    case "BLUE": return "#007bff";
    default: return "#6c757d";
  }
}

// ==================================================
// 🔁 Update Status Listener
// ==================================================
function addUpdateListeners() {
  document.querySelectorAll(".update-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      const id = row.dataset.id;
      const newStatus = row.querySelector(".status-select").value;

      console.log(`🩺 Updating status for patient ID ${id} → ${newStatus}`);

      // ⚠️ ถามยืนยันถ้าเลือก Deceased (กันมือลั่น)
      if (newStatus === "Deceased") {
        if (!confirm(`⚠️ Are you sure you want to mark as "Deceased"?\nThis record will be removed from the list immediately.`)) {
            return; 
        }
      }

      try {
        const response = await fetch(`/patients/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // แจ้งเตือนเล็กน้อย (หรือปิดไปก็ได้ถ้าไม่อยากให้เด้ง)
        // alert(`✅ Status updated to: ${newStatus}`);
        
        // โหลดตารางใหม่ทันที (ถ้าเป็น Deceased มันจะหายไปเองตาม Logic)
        loadPatients();

      } catch (error) {
        console.error("❌ Error updating status:", error);
        alert(`⚠️ Failed to update status: ${error.message}`);
      }
    });
  });
}

// ==================================================
// 🔍 ระบบค้นหา
// ==================================================
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const filter = searchInput.value.trim().toLowerCase();
    const rows = patientTable.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
      const idCell = rows[i].cells[1];
      const nameCell = rows[i].cells[2];
      const symptomsCell = rows[i].cells[6];

      if (idCell && nameCell) {
        const idText = idCell.textContent.toLowerCase();
        const nameText = nameCell.textContent.toLowerCase();
        const symptomText = symptomsCell ? symptomsCell.textContent.toLowerCase() : "";

        rows[i].style.display =
          idText.includes(filter) || nameText.includes(filter) || symptomText.includes(filter)
            ? ""
            : "none";
      }
    }
  });
}

// ==================================================
// 🛠️ Setup Action Buttons (Clear DB, Logs)
// ==================================================
function setupActionButtons() {
    // หาตำแหน่งที่จะวางปุ่ม (Controls Area หรือ Search Form)
    const targetArea = document.querySelector(".controls-area") || document.querySelector(".search form");
    
    if (!targetArea) return;

    // สร้าง Container สำหรับปุ่ม เพื่อความสวยงาม
    const btnGroup = document.createElement("div");
    btnGroup.style.display = "flex";
    btnGroup.style.gap = "10px";
    btnGroup.style.marginTop = "0px"; // ปรับตามความเหมาะสม

    // 1. Status Logs Button
    const statusBtn = document.createElement("button");
    statusBtn.textContent = "📋 Logs";
    statusBtn.className = "search__button";
    statusBtn.onclick = () => window.open("/logs/status", '_blank');

    // 2. Color Logs Button
    const colorBtn = document.createElement("button");
    colorBtn.textContent = "🎨 Colors";
    colorBtn.className = "search__button";
    colorBtn.onclick = () => window.open("/logs/color", '_blank');

    // 3. Clear DB Button
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "🧹 Clear DB";
    clearBtn.className = "clear__button";
    clearBtn.onclick = async () => {
        const confirmClear = confirm("⚠️ Are you sure you want to delete ALL patient data?");
        if (!confirmClear) return;

        try {
            const res = await fetch("/clear-db", { method: "DELETE" });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            alert("✅ Database cleared successfully!");
            loadPatients();
        } catch (err) {
            console.error("❌ Clear DB error:", err);
            alert("⚠️ Failed to clear DB: " + err.message);
        }
    };

    // ใส่ปุ่มลงในกลุ่ม
    btnGroup.appendChild(statusBtn);
    btnGroup.appendChild(colorBtn);
    btnGroup.appendChild(clearBtn);

    // ใส่กลุ่มปุ่มลงในหน้าเว็บ
    targetArea.appendChild(btnGroup);
}

// ==================================================
// 🚀 เริ่มต้นทำงาน
// ==================================================
setupActionButtons();
loadPatients();