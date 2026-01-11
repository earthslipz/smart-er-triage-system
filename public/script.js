// ==================================================
// 1. Popup Logic
// ==================================================
const popup = document.getElementById("popup-overlay");
const popupText = document.getElementById("popup-text");

/**
 * Show Popup Message
 * @param {string} text - HTML content to display
 * @param {string} colorClass - CSS class for text color (e.g., 'text-red')
 */
function showPopup(text, colorClass = "text-dark") {
  // Set content
  popupText.innerHTML = text;
  
  // Reset classes and add new color class
  popupText.className = "popup-message"; 
  popupText.classList.add(colorClass);

  // Hide any existing image tags if present (just in case)
  const existingImg = document.getElementById("popup-gif");
  if (existingImg) {
    existingImg.style.display = "none";
  }

  // Show the overlay
  popup.classList.remove("hidden");
}

function hidePopup(delay = 2000, callback) { 
  setTimeout(() => {
    popup.classList.add("hidden");
    if (callback) callback();
  }, delay); 
}

// ==================================================
// 2. Form Submission
// ==================================================
const form = document.getElementById("erForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Loading State
  showPopup("⏳ Processing...", "text-dark");

  const fullName = document.getElementById("fullName").value.trim();
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "-";

  const nationalID = document.getElementById("nationalID").value.trim();
  const gender = document.getElementById("gender").value;
  const birthday = document.getElementById("birthday").value;
  const indicator = document.getElementById("indicator").value; 
  const symptoms = document.getElementById("symptoms").value.trim();

  const gcsScore = parseInt(document.getElementById("gcs").value) || 15;
  const painScore = parseInt(document.getElementById("pain").value) || 0;

  // Validation: GCS Score
  if (gcsScore < 3 || gcsScore > 15) {
    showPopup("⚠️ Please enter GCS between 3–15", "text-red");
    hidePopup(3000);
    return;
  }

  const data = {
    national_id: nationalID,
    first_name: firstName,
    last_name: lastName,
    sex: gender,
    date_of_birth: birthday,
    indicator: indicator, 
    symptoms: symptoms,
    vital: {
      heart_rate_bpm: document.getElementById("heartRate").value,
      resp_rate_min: document.getElementById("respRate").value,
      systolic_bp: document.getElementById("bpMax").value,
      diastolic_bp: document.getElementById("bpMin").value,
      temp_c: document.getElementById("temp").value,
      spo2_percent: document.getElementById("o2").value,
      gcs_total: gcsScore,
      pain_score: painScore,
    },
  };

  try {
    const res = await fetch("/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (res.ok) {
      // Map Triage Level to CSS Class
      let colorClass = "text-dark";
      if (result.triage === "RED") colorClass = "text-red";
      else if (result.triage === "YELLOW") colorClass = "text-yellow";
      else if (result.triage === "GREEN") colorClass = "text-green";
      else if (result.triage === "BLUE") colorClass = "text-blue";

      // 🇬🇧 Construct Success Message (English)
      let message = `<div style="font-size: 3.5rem; margin-bottom: 5px; line-height: 1;">✅</div>
                     <h3 style="margin: 5px 0 15px 0;">Data Saved Successfully</h3>
                     Triage Result: <strong style="font-size: 1.2em;">${result.triage}</strong> <br>
                     <span style="font-size: 0.9em; opacity: 0.8;">(Severity Score: ${result.score})</span>`;

      // AI Analysis Section (Emoji removed)
      if (result.ai_analysis && result.ai_analysis.predictions && result.ai_analysis.predictions.length > 0) {
        const aiDisease = result.ai_analysis.predictions[0];
        message += `<div style="margin-top: 15px; font-size: 0.9em; color: #555; border-top: 1px solid #eee; padding-top: 10px; text-align: left;">
                      <strong>AI Analysis:</strong> Suspected <strong>${aiDisease.disease}</strong> 
                      <span style="font-size: 0.85em; color: #777;">(${aiDisease.confidence.toFixed(1)}% confidence)</span>
                    </div>`;
      }

      showPopup(message, colorClass);
      form.reset();
      hidePopup(3500); // Hide after 3.5 seconds

    } else {
      showPopup("❌ Error: " + result.error, "text-red");
      hidePopup(3000);
    }
  } catch (err) {
    showPopup("⚠️ Connection Error: " + err.message, "text-red");
    hidePopup(3000);
  }
});