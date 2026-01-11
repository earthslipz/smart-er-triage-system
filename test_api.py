import requests
import json

# ข้อมูลอาการที่จะส่งไปถาม (ลองเปลี่ยนข้อความตรงนี้ได้)
symptoms = "I have high fever, headache, and skin rash."

try:
    # ยิงไปที่ API ของเรา
    response = requests.post(
        "http://localhost:5000/analyze", 
        json={"symptoms": symptoms}
    )
    
    # แสดงผลลัพธ์
    print("\n🤖 ผลการวิเคราะห์จาก AI:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))

except Exception as e:
    print("❌ เชื่อมต่อไม่ได้:", e)