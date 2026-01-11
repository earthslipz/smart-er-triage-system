from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import re
import os

app = Flask(__name__)
CORS(app)

# ==================== 1. Load Datasets (Metadata) ====================
print("⏳ Loading datasets...")
try:
    # โหลดไฟล์ CSV สำหรับข้อมูลประกอบ (ความรุนแรง, คำอธิบาย, คำแนะนำ)
    severity_df = pd.read_csv('Symptomseverity.csv')
    description_df = pd.read_csv('symptom_Description.csv')
    precaution_df = pd.read_csv('symptom_precaution.csv')
    
    # โหลด Dataset หลักเผื่อใช้ในกรณี Fallback (Rule-based)
    dataset_df = pd.read_csv('dataset.csv')
    
    print("✅ All CSV datasets loaded successfully")
except Exception as e:
    print(f"❌ Error loading CSV datasets: {e}")
    severity_df = pd.DataFrame() # ป้องกัน Error ถ้ารันไม่ผ่าน

# ==================== 2. Load ML Model & Encoders ====================
print("⏳ Loading ML Model...")
model_data = None
rf_model = None
mlb = None
label_encoder = None

try:
    if os.path.exists('disease_model.pkl'):
        # โหลดไฟล์ .pkl ที่มี dictionary {model, mlb, label_encoder}
        model_data = joblib.load('disease_model.pkl')
        
        rf_model = model_data['model']
        mlb = model_data['mlb']
        label_encoder = model_data['label_encoder']
        
        print("✅ ML Model, MultiLabelBinarizer, and LabelEncoder loaded successfully!")
    else:
        print("⚠️ 'disease_model.pkl' not found. System will run in Rule-Based mode only.")
except Exception as e:
    print(f"❌ Error loading ML model: {e}")

# ==================== 3. Prepare Symptom Helper Data ====================
# สร้าง Dictionary สำหรับ Map ชื่ออาการ -> น้ำหนักความรุนแรง
symptom_weights = {}
if not severity_df.empty:
    for _, row in severity_df.iterrows():
        symptom = str(row['Symptom']).strip().lower().replace('_', ' ')
        weight = int(row['weight'])
        symptom_weights[symptom] = weight

# รายชื่ออาการทั้งหมดที่โมเดลรู้จัก (ดึงจาก MLB classes ถ้ามี)
known_symptoms = []
if mlb:
    known_symptoms = list(mlb.classes_)
else:
    # Fallback ถ้าไม่มี MLB ให้ดึงจาก CSV
    cols = [c for c in dataset_df.columns if 'Symptom' in c]
    all_symps = dataset_df[cols].values.flatten()
    known_symptoms = list(set([s.strip() for s in all_symps if pd.notna(s)]))

# Dictionary ช่วยแปลงภาษาบ้านๆ เป็นศัพท์ใน Dataset
# (คัดมาบางส่วน คุณสามารถเพิ่มเองได้)
symptom_mapping = {
    # General
    "fever": "high_fever", "hot": "high_fever", "chill": "chills", 
    "shiver": "chills", "fatigue": "fatigue", "tired": "fatigue",
    # Head/Neuro
    "headache": "headache", "dizzy": "dizziness", "confused": "altered_sensorium",
    # Respiratory
    "cough": "cough", "sneeze": "continuous_sneezing", "breath": "breathlessness",
    "runny nose": "runny_nose", "sore throat": "throat_irritation",
    # Digestive
    "stomach": "stomach_pain", "vomit": "vomiting", "nausea": "nausea",
    "diarrhea": "diarrhea", "constipation": "constipation", "acid": "acidity",
    # Skin
    "rash": "skin_rash", "itch": "itching", "yellow skin": "yellowish_skin",
    "pimple": "pus_filled_pimples",
    # Pain
    "chest pain": "chest_pain", "joint pain": "joint_pain", "muscle": "muscle_pain",
    "back pain": "back_pain", "neck pain": "neck_pain"
}

# ==================== 4. Helper Functions ====================

def extract_symptoms_nlp(text):
    """แปลงข้อความ User เป็น List อาการที่ตรงกับ Dataset"""
    text = text.lower()
    found_symptoms = []
    
    # 1. เช็คจาก Mapping (Synonyms)
    for key, val in symptom_mapping.items():
        if key in text:
            found_symptoms.append(val)
            
    # 2. เช็คจากชื่ออาการจริงใน Dataset (Exact Match)
    for sym in known_symptoms:
        # แปลงชื่ออาการใน DB (ex: 'stomach_pain') เป็น text (ex: 'stomach pain')
        readable_sym = sym.replace('_', ' ')
        if readable_sym in text:
            found_symptoms.append(sym)
            
    return list(set(found_symptoms)) # ตัดตัวซ้ำ

def get_disease_details(disease_name):
    """ดึงคำอธิบายและคำแนะนำ"""
    desc = ""
    precautions = []
    
    # Description
    d_row = description_df[description_df['Disease'] == disease_name]
    if not d_row.empty:
        desc = d_row.iloc[0]['Description']
        
    # Precautions
    p_row = precaution_df[precaution_df['Disease'] == disease_name]
    if not p_row.empty:
        p_row = p_row.iloc[0]
        precautions = [p_row[f'Precaution_{i}'] for i in range(1, 5) if pd.notna(p_row[f'Precaution_{i}'])]
        
    return desc, precautions

def calculate_severity(symptoms_list):
    """คำนวณคะแนนความรุนแรง"""
    score = 0
    for s in symptoms_list:
        clean_s = s.replace('_', ' ')
        score += symptom_weights.get(clean_s, 1) # Default 1 ถ้าไม่เจอ
    return score

# ==================== 5. Prediction Logic (ML + Rule-based) ====================

def predict_with_ml(symptoms_list):
    """ทำนายด้วย Random Forest (disease_model.pkl)"""
    if rf_model is None or mlb is None or label_encoder is None:
        return None
        
    try:
        # 1. กรองเฉพาะอาการที่โมเดลรู้จัก (ป้องกัน Error ตอน Transform)
        valid_symptoms = [s for s in symptoms_list if s in mlb.classes_]
        
        if not valid_symptoms:
            return None # ไม่มีอาการที่โมเดลรู้จักเลย

        # 2. Transform เป็น Binary Vector (0, 1, 0, 0, ...)
        input_vector = mlb.transform([valid_symptoms])
        
        # ใส่ชื่อ Column ให้ตรงกับตอนเทรน (แก้ Warning)
        input_df = pd.DataFrame(input_vector, columns=mlb.classes_)
        
        # 3. Predict Probability
        probs = rf_model.predict_proba(input_df)[0]
        
        # หา Top 3 โรคที่มีความเป็นไปได้สูงสุด
        top_indices = probs.argsort()[-3:][::-1] # เรียงมากไปน้อย
        results = []
        
        for idx in top_indices:
            confidence = probs[idx] * 100
            if confidence > 0: # เอาเฉพาะที่มีโอกาส
                disease_name = label_encoder.inverse_transform([idx])[0]
                results.append({
                    "disease": disease_name,
                    "confidence": round(confidence, 2)
                })
                
        return results if results else None

    except Exception as e:
        print(f"⚠️ ML Error: {e}")
        return None

def predict_rule_based(symptoms_list):
    """Fallback: ใช้การเทียบคำใน CSV กรณี ML พลาด"""
    scores = {}
    
    for _, row in dataset_df.iterrows():
        disease = row['Disease']
        # ดึงอาการทั้งหมดของโรคนี้จาก CSV
        row_symps = [str(row[c]).strip() for c in dataset_df.columns if 'Symptom' in c and pd.notna(row[c])]
        
        # นับจำนวนอาการที่ตรงกัน
        match_count = len(set(symptoms_list) & set(row_symps))
        
        if match_count > 0:
            if disease not in scores:
                scores[disease] = 0
            scores[disease] += match_count

    # เรียงลำดับตามจำนวนที่แมตช์
    sorted_diseases = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
    
    results = []
    for d, score in sorted_diseases:
        results.append({
            "disease": d,
            "confidence": 50.0 # Rule based ให้ความเชื่อมั่นกลางๆ
        })
    return results

# ==================== 6. API Endpoints ====================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "ml_model_loaded": rf_model is not None,
        "symptoms_db_size": len(known_symptoms)
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    text_input = data.get('symptoms', '')
    
    # 1. NLP Extraction
    extracted_symptoms = extract_symptoms_nlp(text_input)
    
    if not extracted_symptoms:
        return jsonify({
            "success": False,
            "message": "No symptoms detected. Please describe your condition clearly."
        })
        
    # 2. Predict (ML First -> Fallback to Rule-based)
    predictions = predict_with_ml(extracted_symptoms)
    method = "Machine Learning (Random Forest)"
    
    if not predictions:
        predictions = predict_rule_based(extracted_symptoms)
        method = "Rule-Based Matching (Fallback)"
        
    # 3. Enrich Data (Add Description, Precautions, Triage)
    severity_score = calculate_severity(extracted_symptoms)
    
    final_results = []
    for pred in predictions:
        desc, prec = get_disease_details(pred['disease'])
        final_results.append({
            "disease": pred['disease'],
            "confidence": pred['confidence'],
            "description": desc,
            "precautions": prec
        })
        
    # 4. Triage Logic
    triage = "GREEN" # General
    if severity_score > 15:
        triage = "RED" # Critical
    elif severity_score > 8:
        triage = "YELLOW" # Urgent
        
    # ถ้าเจอโรคอันตราย ให้เด้ง RED ทันที
    critical_keywords = ['Heart', 'Stroke', 'Paralysis', 'Dengue', 'Typhoid']
    if final_results and any(k in final_results[0]['disease'] for k in critical_keywords):
        triage = "RED"

    return jsonify({
        "success": True,
        "input_text": text_input,
        "extracted_symptoms": extracted_symptoms,
        "severity_score": severity_score,
        "triage_level": triage,
        "prediction_method": method,
        "predictions": final_results
    })

if __name__ == '__main__':
    print(f"🚀 Server running on port 5000")
    print(f"🧠 Model Status: {'Ready' if rf_model else 'Offline (Check .pkl file)'}")
    app.run(host='0.0.0.0', port=5000, debug=True)