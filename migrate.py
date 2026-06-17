# migrate.py
import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ.get('MONGO_URI')
MONGO_DB = os.environ.get('MONGO_DB', 'oyin_db')

def migrate_to_mongodb():
    """Chuyển toàn bộ dữ liệu từ JSON sang MongoDB"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        client.admin.command('ping')
        print("✅ Kết nối MongoDB thành công!")
    except Exception as e:
        print(f"❌ Kết nối thất bại: {e}")
        return
    
    collections = ['slides', 'categories', 'documents', 'news']
    
    for name in collections:
        try:
            json_path = os.path.join('data', f'{name}.json')
            if not os.path.exists(json_path):
                print(f"⚠️ File {json_path} không tồn tại, bỏ qua")
                continue
            
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            collection = db[name]
            collection.delete_many({})
            
            if name == 'categories':
                items = data.get('categories', [])
            else:
                items = data.get('items', [])
            
            if items:
                collection.insert_many(items)
                print(f"✅ Đã migrate {len(items)} items vào {name}")
            else:
                print(f"📭 Không có dữ liệu để migrate: {name}")
                
        except Exception as e:
            print(f"❌ Lỗi migrate {name}: {e}")
    
    # Migrate courses
    try:
        json_path = os.path.join('data', 'courses.json')
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                courses_data = json.load(f)
            
            collection = db['courses']
            collection.delete_many({})
            
            if isinstance(courses_data, list):
                items = courses_data
            elif isinstance(courses_data, dict) and 'items' in courses_data:
                items = courses_data['items']
            else:
                items = []
            
            if items:
                collection.insert_many(items)
                print(f"✅ Đã migrate {len(items)} courses")
            else:
                print("📭 Không có dữ liệu courses để migrate")
    except Exception as e:
        print(f"❌ Lỗi migrate courses: {e}")
    
    print("\n✅ Đã hoàn tất migrate dữ liệu!")

if __name__ == '__main__':
    migrate_to_mongodb()