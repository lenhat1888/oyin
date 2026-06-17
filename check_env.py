# check_env.py
import os
from dotenv import load_dotenv

# Load file .env
load_dotenv()

print("📁 Kiểm tra file .env")
print("-" * 50)

mongo_uri = os.environ.get('MONGO_URI')
mongo_db = os.environ.get('MONGO_DB')

if mongo_uri:
    print(f"✅ MONGO_URI: {mongo_uri[:50]}...")
    print(f"   Username: oyin_admin")
    print(f"   Cluster: cluster0.2wvcwvi.mongodb.net")
else:
    print("❌ MONGO_URI: Không tìm thấy!")

if mongo_db:
    print(f"✅ MONGO_DB: {mongo_db}")
else:
    print("❌ MONGO_DB: Không tìm thấy (sẽ dùng mặc định 'oyin_db')")

print("-" * 50)
print(f"📂 Thư mục hiện tại: {os.getcwd()}")

# Kiểm tra file .env tồn tại
if os.path.exists('.env'):
    print("✅ File .env tồn tại")
else:
    print("❌ File .env KHÔNG tồn tại!")