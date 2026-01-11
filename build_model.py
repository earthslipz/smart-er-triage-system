import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import joblib

print("⏳ กำลังอ่านไฟล์ Dataset...")
# อ่านไฟล์ CSV
try:
    df = pd.read_csv('dataset.csv')
    df = df.fillna('') # จัดการช่องว่าง
    
    # รวมอาการทั้งหมด (Symptom_1 ถึง Symptom_17) ให้เป็น List เดียว
    symptom_cols = [f'Symptom_{i}' for i in range(1, 18)]
    df['Symptoms_List'] = df[symptom_cols].apply(
        lambda row: [s.strip() for s in row.values if s.strip() != ''], axis=1
    )
    
    print("⚙️ กำลังแปลงข้อมูล (Encoding)...")
    # เตรียมตัวแปลงข้อมูล (Encoder)
    mlb = MultiLabelBinarizer()
    label_encoder = LabelEncoder()

    # แปลงข้อมูล
    X = pd.DataFrame(mlb.fit_transform(df['Symptoms_List']), columns=mlb.classes_)
    y = label_encoder.fit_transform(df['Disease'])

    print("🧠 กำลังเทรนโมเดล (Training)...")
    # สร้างและเทรนโมเดล
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    print("💾 กำลังบันทึกไฟล์ (Saving)...")
    # แพ็คทุกอย่างรวมกัน
    model_data = {
        "model": model,
        "mlb": mlb,
        "label_encoder": label_encoder
    }

    # บันทึกทับไฟล์เดิม
    joblib.dump(model_data, 'disease_model.pkl')
    print("✅ สร้างไฟล์ disease_model.pkl ใหม่สำเร็จแล้ว! พร้อมใช้งาน")

except Exception as e:
    print(f"❌ เกิดข้อผิดพลาด: {e}")