# app.py
from flask import Flask, render_template, jsonify, request, send_from_directory
import json
import os
import re
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# ============================================
# LOAD ENV & INIT FLASK
# ============================================

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')

# ============================================
# KẾT NỐI MONGODB
# ============================================

MONGO_URI = os.environ.get('MONGO_URI')
MONGO_DB = os.environ.get('MONGO_DB', 'oyin_db')

# Biến toàn cục để dùng cho MongoDB
mongo_client = None
db = None

try:
    if MONGO_URI:
        mongo_client = MongoClient(MONGO_URI)
        # Kiểm tra kết nối
        mongo_client.admin.command('ping')
        db = mongo_client[MONGO_DB]
        print(f"✅ Kết nối MongoDB thành công! Database: {MONGO_DB}")
    else:
        print("⚠️ MONGO_URI không có trong .env, sử dụng JSON fallback")
except Exception as e:
    print(f"❌ Lỗi kết nối MongoDB: {e}")
    print("⚠️ Sử dụng JSON fallback")

# ============================================
# HÀM DÙNG CHUNG - HỖ TRỢ CẢ MONGODB VÀ JSON
# ============================================

def save_data(collection_name, data):
    """Lưu dữ liệu vào MongoDB và JSON"""
    if db is not None:
        try:
            collection = db[collection_name]
            collection.delete_many({})
            
            if collection_name == 'categories':
                items = data.get('categories', [])
            else:
                items = data.get('items', [])
            
            if items:
                # 👈 LOẠI BỎ _id TRƯỚC KHI LƯU
                for item in items:
                    if '_id' in item:
                        del item['_id']
                collection.insert_many(items)
                print(f"✅ Đã lưu {len(items)} items vào MongoDB: {collection_name}")
            
            return True
        except Exception as e:
            print(f"⚠️ Lỗi lưu MongoDB {collection_name}: {e}")
    
    # Fallback sang JSON
    try:
        os.makedirs('data', exist_ok=True)
        # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI LƯU JSON
        data = convert_objectid(data)
        path = os.path.join('data', f'{collection_name}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"⚠️ Lỗi lưu JSON {collection_name}: {e}")
        return False
    
def get_default_categories():
    """Danh mục mặc định"""
    return [
        {"id": "hsk", "name": "HSK", "icon": "fa-graduation-cap", "description": "Luyện thi HSK", "slug": "hsk", "active": True, "order": 1},
        {"id": "hsk30", "name": "HSK 3.0", "icon": "fa-star", "description": "HSK 3.0", "slug": "hsk30", "active": True, "order": 2},
        {"id": "tre-em", "name": "Tiếng Trung Trẻ Em", "icon": "fa-child", "description": "Tiếng Trung trẻ em", "slug": "tre-em", "active": True, "order": 3},
        {"id": "nguoi-lon", "name": "Tiếng Trung Người Lớn", "icon": "fa-user-tie", "description": "Tiếng Trung người lớn", "slug": "nguoi-lon", "active": True, "order": 4}
    ]

# ============================================
# HÀM LƯU JSON (FALLBACK)
# ============================================

def load_data(collection_name):
    """
    Đọc dữ liệu từ MongoDB hoặc JSON
    collection_name: tên collection (slides, categories, documents, news)
    """
    # Ưu tiên dùng MongoDB nếu có kết nối
    if db is not None:
        try:
            collection = db[collection_name]
            items = list(collection.find({}))
            
            # 👈 CHUYỂN ĐỔI OBJECTID THÀNH STRING
            items = convert_objectid(items)
            
            if collection_name == 'categories':
                if items:
                    return {"categories": items}
                else:
                    # Trả về categories mặc định nếu chưa có
                    return {"categories": get_default_categories()}
            
            return {"items": items} if items else {"items": []}
            
        except Exception as e:
            print(f"⚠️ Lỗi đọc MongoDB {collection_name}: {e}")
    
    # Fallback sang JSON
    return load_data_json(collection_name)  

def save_data_json(filename, data):
    """Ghi dữ liệu vào file JSON trong thư mục data/"""
    os.makedirs('data', exist_ok=True)
    path = os.path.join('data', filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ============================================
# HÀM CHUYỂN ĐỔI OBJECTID THÀNH STRING
# ============================================

def convert_objectid(data):
    """
    Đệ quy chuyển đổi tất cả ObjectId trong dict/list thành string
    """
    if isinstance(data, list):
        return [convert_objectid(item) for item in data]
    elif isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == '_id' and isinstance(value, ObjectId):
                result[key] = str(value)
            else:
                result[key] = convert_objectid(value)
        return result
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data

# ============================================
# MENU (VẪN DÙNG JSON VÌ CÓ CẤU TRÚC PHỨC TẠP)
# ============================================

MENU_FILE = 'data/menu.json'
COURSES_FILE = 'data/courses.json'

DEFAULT_MENU = {
    "items": [
        {"id": "home", "name": "Trang Chủ", "url": "/index.html", "children": []},
        {
            "id": "gioi-thieu",
            "name": "GIỚI THIỆU",
            "url": "#",
            "children": [
                {"id": "doi-ngu", "name": "Đội Ngũ Giảng Viên", "url": "/html/gioithieuhtml/doingugiangvienhtml.html", "children": []},
                {"id": "danh-gia", "name": "Đánh Giá Của Học Viên", "url": "/html/gioithieuhtml/danhgiacuahocvienhtml.html", "children": []},
                {"id": "su-kien", "name": "Sự Kiện", "url": "/html/gioithieuhtml/sukienhtml.html", "children": []}
            ]
        },
        {"id": "lich-khai-giang", "name": "LỊCH KHAI GIẢNG", "url": "/html/lichkhaigianghtml/lichkhaigianghtml.html", "children": []},
        {"id": "khoa-hoc", "name": "KHÓA HỌC", "url": "/khoa-hoc", "children": []},
        {
            "id": "thu-vien",
            "name": "THƯ VIỆN",
            "url": "#",
            "children": [
                {"id": "tu-vung", "name": "Từ Vựng", "url": "/html/thuvienhtml/tuvunghtml.html", "children": []},
                {"id": "ngu-phap", "name": "Ngữ Pháp", "url": "/html/thuvienhtml/nguphaphtml.html", "children": []},
                {"id": "giao-trinh", "name": "Giáo Trình Chuẩn HSK", "url": "/html/thuvienhtml/giaotrinhchuanhskhtml.html", "children": []},
                {"id": "sach", "name": "Sách Tiếng Trung", "url": "/html/thuvienhtml/sachtiengtrunghtml.html", "children": []}
            ]
        }
    ]
}

def load_menu():
    """Đọc menu từ file JSON"""
    os.makedirs('data', exist_ok=True)
    if not os.path.exists(MENU_FILE):
        save_menu(DEFAULT_MENU)
        return DEFAULT_MENU
    try:
        with open(MENU_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                save_menu(DEFAULT_MENU)
                return DEFAULT_MENU
            return json.loads(content)
    except (json.JSONDecodeError, FileNotFoundError):
        save_menu(DEFAULT_MENU)
        return DEFAULT_MENU

def save_menu(menu_data):
    """Lưu menu vào file JSON"""
    os.makedirs('data', exist_ok=True)
    with open(MENU_FILE, 'w', encoding='utf-8') as f:
        json.dump(menu_data, f, ensure_ascii=False, indent=2)

def load_courses():
    """Đọc danh sách khóa học - LUÔN TRẢ VỀ LIST"""
    # Ưu tiên MongoDB
    if db is not None:
        try:
            collection = db['courses']
            courses = list(collection.find({}))
            # 👈 CHUYỂN ĐỔI OBJECTID THÀNH STRING
            courses = convert_objectid(courses)
            if courses:
                return courses
        except Exception as e:
            print(f"⚠️ Lỗi đọc courses từ MongoDB: {e}")
    
    # Fallback sang JSON
    if not os.path.exists(COURSES_FILE):
        save_courses([])
        return []
    try:
        with open(COURSES_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                save_courses([])
                return []
            data = json.loads(content)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                if 'items' in data:
                    return data['items']
                return list(data.values()) if data else []
            return []
    except (json.JSONDecodeError, Exception) as e:
        print(f"Lỗi đọc courses.json: {e}")
        save_courses([])
        return []

def save_courses(courses):
    """Lưu danh sách khóa học vào MongoDB và JSON"""
    if db is not None:
        try:
            collection = db['courses']
            collection.delete_many({})
            if courses:
                # 👈 LOẠI BỎ _id TRƯỚC KHI LƯU
                for course in courses:
                    if '_id' in course:
                        del course['_id']
                collection.insert_many(courses)
                print(f"✅ Đã lưu {len(courses)} courses vào MongoDB")
        except Exception as e:
            print(f"⚠️ Lỗi lưu courses vào MongoDB: {e}")
    
    # Lưu vào JSON (giữ nguyên)
    try:
        os.makedirs('data', exist_ok=True)
        if not isinstance(courses, list):
            courses = []
        # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI LƯU JSON
        courses = convert_objectid(courses)
        with open(COURSES_FILE, 'w', encoding='utf-8') as f:
            json.dump(courses, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Lỗi lưu courses.json: {e}")

# ============================================
# API MIGRATE - CHUYỂN DỮ LIỆU SANG MONGODB
# ============================================

@app.route('/api/migrate', methods=['POST'])
def api_migrate():
    """API chuyển dữ liệu từ JSON sang MongoDB"""
    try:
        if db is None:
            return jsonify({"success": False, "error": "Không có kết nối MongoDB"}), 400
        
        collections = ['slides', 'categories', 'documents', 'news']
        migrated = []
        
        for name in collections:
            # Đọc từ JSON
            json_data = load_data_json(f'{name}.json')
            
            # Lưu vào MongoDB
            collection = db[name]
            collection.delete_many({})
            
            if name == 'categories':
                items = json_data.get('categories', [])
            else:
                items = json_data.get('items', [])
            
            if items:
                collection.insert_many(items)
                migrated.append(f"{name}: {len(items)} items")
        
        # Migrate courses
        courses_data = load_courses()
        if courses_data:
            collection = db['courses']
            collection.delete_many({})
            collection.insert_many(courses_data)
            migrated.append(f"courses: {len(courses_data)} items")
        
        return jsonify({
            "success": True,
            "message": f"Đã migrate: {', '.join(migrated)}"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# TRANG WEB
# ============================================

@app.route('/')
def index():
    """Trang chủ"""
    return send_from_directory('.', 'index.html')

@app.route('/khoa-hoc')
def khoa_hoc_page():
    """Trang hiển thị tất cả khóa học"""
    try:
        courses = load_courses()
        return render_template('khoahoc.html', courses=courses)
    except Exception as e:
        return f"Lỗi: {e}", 500

@app.route('/admin/menu')
def admin_menu():
    """Trang quản trị menu"""
    try:
        menu = load_menu()
        return render_template('admin.html', menu=menu['items'])
    except Exception as e:
        return f"Lỗi: {e}", 500

@app.route('/admin/courses')
def admin_courses():
    """Trang quản trị khóa học"""
    return render_template('course_form.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    """Trang quản trị tập trung"""
    return render_template('admin/dashboard.html')

# ============================================
# PHỤC VỤ FILE TĨNH
# ============================================

@app.route('/static/<path:filename>')
def serve_static_file(filename):
    """Phục vụ file tĩnh từ thư mục static/"""
    return send_from_directory('static', filename)

# ============================================
# API
# ============================================

@app.route('/api/menu', methods=['GET'])
def get_menu():
    """API lấy menu"""
    try:
        return jsonify(load_menu())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/courses', methods=['GET'])
def get_courses():
    """API lấy danh sách khóa học"""
    try:
        courses = load_courses()
        # 👈 CHUYỂN ĐỔI OBJECTID
        courses = convert_objectid(courses)
        return jsonify(courses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/<string:type>', methods=['GET'])
def api_get_data(type):
    """Lấy dữ liệu theo loại"""
    allowed = ['menu', 'slides', 'categories', 'documents', 'news', 'reviews']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    if type == 'menu':
        return jsonify(load_menu())
    
    data = load_data(type)
    # 👈 CHUYỂN ĐỔI OBJECTID (nếu cần)
    data = convert_objectid(data)
    return jsonify(data)

@app.route('/api/data/<string:type>', methods=['POST'])
def api_save_data(type):
    """Lưu dữ liệu theo loại"""
    allowed = ['menu', 'slides', 'courses', 'categories', 'documents', 'news', 'reviews']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    data = request.get_json()
    if type == 'menu':
        save_menu(data)
    else:
        save_data(type, data)
    return jsonify({"success": True})

# ============================================
# API MENU - THÊM/XÓA/SỬA
# ============================================

@app.route('/api/menu/add', methods=['POST'])
def add_menu_item():
    """API thêm mục menu"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Không có dữ liệu"}), 400
        
        name = data.get('name', '').strip()
        if not name:
            return jsonify({"success": False, "error": "Tên không được để trống"}), 400
        
        url = data.get('url', '#').strip()
        parent_id = data.get('parent_id')
        
        menu = load_menu()
        
        base_id = re.sub(r'[^a-z0-9]+', '-', name.lower().strip('-'))
        new_id = base_id
        counter = 1
        
        def check_id_exists(items, check_id):
            for item in items:
                if item['id'] == check_id:
                    return True
                if item.get('children') and check_id_exists(item['children'], check_id):
                    return True
            return False
        
        while check_id_exists(menu['items'], new_id):
            new_id = f"{base_id}-{counter}"
            counter += 1
        
        new_item = {
            "id": new_id,
            "name": name,
            "url": url,
            "children": []
        }
        
        if parent_id and parent_id != "":
            def find_and_add(items, pid, item):
                for i in range(len(items)):
                    if items[i]['id'] == pid:
                        items[i]['children'].append(item)
                        return True
                    if items[i].get('children') and find_and_add(items[i]['children'], pid, item):
                        return True
                return False
            
            if not find_and_add(menu['items'], parent_id, new_item):
                return jsonify({"success": False, "error": "Không tìm thấy mục cha"}), 400
        else:
            menu['items'].append(new_item)
        
        save_menu(menu)
        return jsonify({"success": True, "item": new_item})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/menu/delete/<item_id>', methods=['DELETE'])
def delete_menu_item(item_id):
    """API xóa mục menu"""
    try:
        menu = load_menu()
        
        def remove_item(items, target_id):
            for i, item in enumerate(items):
                if item['id'] == target_id:
                    items.pop(i)
                    return True
                if item.get('children') and remove_item(item['children'], target_id):
                    return True
            return False
        
        remove_item(menu['items'], item_id)
        save_menu(menu)
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/menu/update/<item_id>', methods=['PUT'])
def update_menu_item(item_id):
    """API cập nhật mục menu"""
    try:
        data = request.get_json()
        menu = load_menu()
        
        def update_item(items, target_id):
            for item in items:
                if item['id'] == target_id:
                    if 'name' in data:
                        item['name'] = data['name']
                    if 'url' in data:
                        item['url'] = data['url']
                    return True
                if item.get('children') and update_item(item['children'], target_id):
                    return True
            return False
        
        update_item(menu['items'], item_id)
        save_menu(menu)
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# API COURSE - TẠO KHÓA HỌC MỚI
# ============================================

@app.route('/api/course/create', methods=['POST'])
def create_course():
    """Tạo khóa học mới: tạo file HTML + thêm vào menu"""
    try:
        data = request.get_json()
        
        course_name = data.get('name', '').strip()
        course_level = data.get('level', '').strip()
        category = data.get('category', 'Khóa học')
        description = data.get('description', '').strip()
        image_url = data.get('image_url', '')
        price = data.get('price', 'Liên hệ')
        duration = data.get('duration', '')
        schedule = data.get('schedule', '')
        
        subtitle = data.get('subtitle', '')
        detailed_description = data.get('detailed_description', '')
        benefits = data.get('benefits', '')
        learning_outcomes = data.get('learning_outcomes', '')
        curriculum = data.get('curriculum', '')
        schedule_detail = data.get('schedule_detail', '')
        video_intro = data.get('video_intro', '')
        price_original = data.get('price_original', '')
        
        if not course_name:
            return jsonify({"success": False, "error": "Tên khóa học không được để trống"}), 400
        
        course_id = re.sub(r'[^a-z0-9]+', '-', course_name.lower().strip('-'))
        if course_level:
            level_id = re.sub(r'[^a-z0-9]+', '-', course_level.lower().strip('-'))
            course_id = f"{course_id}-{level_id}"
        
        html_filename = f"{course_id}.html"
        html_path = os.path.join('html', 'khoahochtml', html_filename)
        
        html_content = generate_course_html(
            name=course_name,
            level=course_level,
            description=description,
            image_url=image_url,
            price=price,
            duration=duration,
            schedule=schedule,
            category=category,
            subtitle=subtitle,
            detailed_description=detailed_description,
            benefits=benefits,
            learning_outcomes=learning_outcomes,
            curriculum=curriculum,
            schedule_detail=schedule_detail,
            video_intro=video_intro,
            price_original=price_original
        )
        
        os.makedirs(os.path.dirname(html_path), exist_ok=True)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        courses = load_courses()
        if not isinstance(courses, list):
            courses = []
        
        new_course = {
            "id": course_id,
            "name": course_name,
            "level": course_level,
            "category": category,
            "description": description,
            "image_url": image_url,
            "image": image_url,
            "price": price,
            "duration": duration,
            "schedule": schedule,
            "subtitle": subtitle,
            "detailed_description": detailed_description,
            "benefits": benefits,
            "learning_outcomes": learning_outcomes,
            "curriculum": curriculum,
            "schedule_detail": schedule_detail,
            "video_intro": video_intro,
            "price_original": price_original,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "html_file": html_filename
        }
        courses.append(new_course)
        
        # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI LƯU
        courses = convert_objectid(courses)
        
        save_courses(courses)
        
        return jsonify({
            "success": True, 
            "message": f"Đã tạo khóa học {course_name} {course_level} thành công!",
            "course_id": course_id,
            "html_file": html_filename
        })
        
    except Exception as e:
        print(f"Lỗi tạo khóa học: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# API UPLOAD ẢNH
# ============================================

UPLOAD_FOLDER_COURSES = 'static/img/courses'
UPLOAD_FOLDER_SLIDES = 'static/img/slides'
UPLOAD_FOLDER_REVIEWS = 'static/img/reviews'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

os.makedirs(UPLOAD_FOLDER_COURSES, exist_ok=True)
os.makedirs(UPLOAD_FOLDER_SLIDES, exist_ok=True)
os.makedirs(UPLOAD_FOLDER_REVIEWS, exist_ok=True)

def allowed_file(filename):
    """Kiểm tra định dạng file cho phép"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload/course-image', methods=['POST'])
def upload_course_image():
    """Upload ảnh khóa học"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "Không có file"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Tên file rỗng"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Định dạng không hỗ trợ"}), 400
        
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_filename = f"{name}_{timestamp}{ext}"
        
        file_path = os.path.join(UPLOAD_FOLDER_COURSES, new_filename)
        file.save(file_path)
        
        image_url = f"/static/img/courses/{new_filename}"
        
        return jsonify({
            "success": True,
            "image_url": image_url,
            "filename": new_filename
        })
        
    except Exception as e:
        print(f"❌ Upload course image error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload/slide', methods=['POST'])
def upload_slide():
    """Upload ảnh slide"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "Không có file"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "Tên file rỗng"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"success": False, "error": "Định dạng không hỗ trợ"}), 400
        
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_filename = f"{name}_{timestamp}{ext}"
        
        file_path = os.path.join(UPLOAD_FOLDER_SLIDES, new_filename)
        file.save(file_path)
        
        image_url = f"/static/img/slides/{new_filename}"
        
        return jsonify({
            "success": True,
            "image_url": image_url,
            "filename": new_filename
        })
        
    except Exception as e:
        print(f"❌ Upload slide error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/upload/review-avatar', methods=['POST'])
def upload_review_avatar():
    """Upload ảnh đại diện đánh giá"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "Không có file"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "Tên file rỗng"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"success": False, "error": "Định dạng không hỗ trợ"}), 400
        
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_filename = f"{name}_{timestamp}{ext}"
        
        file_path = os.path.join(UPLOAD_FOLDER_REVIEWS, new_filename)
        file.save(file_path)
        
        image_url = f"/static/img/reviews/{new_filename}"
        
        return jsonify({
            "success": True,
            "image_url": image_url,
            "filename": new_filename
        })
        
    except Exception as e:
        print(f"❌ Upload review avatar error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    
# ============================================
# API THÊM/XÓA/SỬA CHO ADMIN
# ============================================

@app.route('/api/data/<string:type>/add', methods=['POST'])
def api_add_item(type):
    """Thêm một mục vào dữ liệu"""
    allowed = ['slides', 'courses', 'documents', 'news', 'reviews']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    data = load_data(type)
    if 'items' not in data:
        data['items'] = []
    
    new_item = request.get_json()
    new_item['id'] = re.sub(r'[^a-z0-9]+', '-', new_item.get('name', 'item').lower().strip('-'))
    new_item['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    data['items'].append(new_item)
    save_data(type, data)
    
    # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI TRẢ VỀ
    new_item = convert_objectid(new_item)
    
    return jsonify({"success": True, "item": new_item})

@app.route('/api/data/<string:type>/<string:item_id>', methods=['DELETE'])
def api_delete_item(type, item_id):
    """Xóa một mục khỏi dữ liệu"""
    allowed = ['slides', 'courses', 'documents', 'news', 'reviews']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    try:
        data = load_data(type)
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        # Tìm và xóa item
        original_count = len(data['items'])
        data['items'] = [item for item in data['items'] if item.get('id') != item_id and str(item.get('_id')) != item_id]
        
        if len(data['items']) == original_count:
            return jsonify({"error": "Item not found"}), 404
        
        save_data(type, data)
        
        # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI TRẢ VỀ
        data = convert_objectid(data)
        
        return jsonify({"success": True, "message": "Đã xóa thành công", "data": data})
        
    except Exception as e:
        print(f"❌ Lỗi xóa {type}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/data/<string:type>/<string:item_id>', methods=['PUT'])
def api_update_item(type, item_id):
    """Cập nhật một mục trong dữ liệu"""
    allowed = ['slides', 'courses', 'documents', 'news', 'reviews']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    try:
        data = load_data(type)
        if 'items' not in data:
            data['items'] = []
        
        updated = request.get_json()
        print(f"Updating {type} {item_id}: {updated}")
        
        for i, item in enumerate(data['items']):
            if item.get('id') == item_id:
                updated['id'] = item_id
                if 'created_at' in item:
                    updated['created_at'] = item['created_at']
                if 'active' not in updated:
                    updated['active'] = True
                if 'order' not in updated:
                    updated['order'] = i + 1
                    
                data['items'][i] = updated
                save_data(type, data)
                
                # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI TRẢ VỀ
                updated = convert_objectid(updated)
                
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": f"Item {item_id} not found"}), 404
        
    except Exception as e:
        print(f"Update error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================
# API CATEGORIES
# ============================================

@app.route('/api/data/categories/add', methods=['POST'])
def api_add_category():
    """Thêm danh mục khóa học"""
    data = load_data('categories')
    if 'categories' not in data:
        data['categories'] = []
    
    new_category = request.get_json()
    new_category['id'] = re.sub(r'[^a-z0-9]+', '-', new_category.get('name', 'category').lower().strip('-'))
    
    data['categories'].append(new_category)
    save_data('categories', data)
    
    # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI TRẢ VỀ
    new_category = convert_objectid(new_category)
    
    return jsonify({"success": True, "item": new_category})

@app.route('/api/data/categories/<string:cat_id>', methods=['DELETE'])
def api_delete_category(cat_id):
    """Xóa danh mục khóa học"""
    try:
        data = load_data('categories')
        if 'categories' not in data:
            return jsonify({"error": "No categories"}), 404
        
        original_count = len(data['categories'])
        data['categories'] = [c for c in data['categories'] if c.get('id') != cat_id and str(c.get('_id')) != cat_id]
        
        if len(data['categories']) == original_count:
            return jsonify({"error": "Category not found"}), 404
        
        save_data('categories', data)
        return jsonify({"success": True, "message": "Đã xóa danh mục thành công"})
        
    except Exception as e:
        print(f"❌ Lỗi xóa category: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/categories/<string:cat_id>', methods=['PUT'])
def api_update_category(cat_id):
    """Cập nhật danh mục khóa học"""
    data = load_data('categories')
    if 'categories' not in data:
        return jsonify({"error": "No categories"}), 404
    
    updated = request.get_json()
    for i, cat in enumerate(data['categories']):
        if cat.get('id') == cat_id:
            updated['id'] = cat_id
            data['categories'][i] = updated
            save_data('categories', data)
            
            # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI TRẢ VỀ
            updated = convert_objectid(updated)
            
            return jsonify({"success": True, "item": updated})
    
    return jsonify({"error": "Category not found"}), 404

# ============================================
# API COURSES
# ============================================

@app.route('/api/data/courses', methods=['GET'])
def get_courses_data():
    """API lấy danh sách khóa học - Luôn trả về list"""
    try:
        courses = load_courses()
        if not isinstance(courses, list):
            if isinstance(courses, dict):
                courses = list(courses.values())
            else:
                courses = []
        return jsonify(courses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/data/courses/add', methods=['POST'])
def add_course():
    """API thêm khóa học mới"""
    try:
        data = request.get_json()
        courses = load_courses()
        if not isinstance(courses, list):
            courses = []
        
        course_id = re.sub(r'[^a-z0-9]+', '-', data.get('name', 'course').lower().strip('-'))
        if data.get('level'):
            level_id = re.sub(r'[^a-z0-9]+', '-', data.get('level', '').lower().strip('-'))
            course_id = f"{course_id}-{level_id}"
        
        new_course = {
            "id": course_id,
            "name": data.get('name', ''),
            "level": data.get('level', ''),
            "category_id": data.get('category_id', ''),
            "category": data.get('category', ''),
            "description": data.get('description', ''),
            "image": data.get('image', '') or data.get('image_url', ''),
            "image_url": data.get('image_url', '') or data.get('image', ''),
            "price": data.get('price', 'Liên hệ'),
            "duration": data.get('duration', 'Theo lộ trình'),
            "schedule": data.get('schedule', 'Linh hoạt'),
            "subtitle": data.get('subtitle', ''),
            "detailed_description": data.get('detailed_description', ''),
            "benefits": data.get('benefits', ''),
            "learning_outcomes": data.get('learning_outcomes', ''),
            "curriculum": data.get('curriculum', ''),
            "schedule_detail": data.get('schedule_detail', ''),
            "video_intro": data.get('video_intro', ''),
            "price_original": data.get('price_original', ''),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "html_file": f"{course_id}.html"
        }
        courses.append(new_course)
        save_courses(courses)
        
        # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI TRẢ VỀ
        new_course = convert_objectid(new_course)
        
        return jsonify({"success": True, "item": new_course})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/data/courses/<string:course_id>', methods=['PUT'])
def update_course(course_id):
    """API cập nhật khóa học - Giữ nguyên html_file"""
    try:
        courses = load_courses()
        if not isinstance(courses, list):
            return jsonify({"error": "No courses"}), 404
        
        updated = request.get_json()
        
        for i, course in enumerate(courses):
            if course.get('id') == course_id or str(course.get('_id')) == course_id:
                updated['id'] = course_id
                if 'created_at' in course:
                    updated['created_at'] = course['created_at']
                if 'html_file' in course and not updated.get('html_file'):
                    updated['html_file'] = course['html_file']
                courses[i] = updated
                save_courses(courses)
                
                # 👈 CHUYỂN ĐỔI OBJECTID TRƯỚC KHI TRẢ VỀ
                updated = convert_objectid(updated)
                
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": "Course not found"}), 404
    except Exception as e:
        print(f"❌ Lỗi update course: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/data/courses/<string:course_id>', methods=['DELETE'])
def delete_course(course_id):
    """API xóa khóa học - Xóa cả file HTML"""
    try:
        courses = load_courses()
        if not isinstance(courses, list):
            return jsonify({"error": "No courses"}), 404
        
        # Tìm khóa học cần xóa
        course_to_delete = None
        for c in courses:
            # So sánh cả id và _id (nếu có)
            if c.get('id') == course_id or str(c.get('_id')) == course_id:
                course_to_delete = c
                break
        
        if not course_to_delete:
            return jsonify({"error": "Course not found"}), 404
        
        # Xóa file HTML
        html_file = course_to_delete.get('html_file')
        if html_file:
            html_path = os.path.join('html', 'khoahochtml', html_file)
            if os.path.exists(html_path):
                os.remove(html_path)
                print(f"✅ Đã xóa file HTML: {html_path}")
        
        # Xóa ảnh
        image_url = course_to_delete.get('image_url') or course_to_delete.get('image')
        if image_url:
            image_path = image_url.lstrip('/')
            if os.path.exists(image_path):
                os.remove(image_path)
                print(f"✅ Đã xóa ảnh: {image_path}")
        
        # Xóa khỏi danh sách
        courses = [c for c in courses if c.get('id') != course_id and str(c.get('_id')) != course_id]
        save_courses(courses)
        
        return jsonify({"success": True, "message": "Đã xóa khóa học và file HTML"})
        
    except Exception as e:
        print(f"❌ Lỗi xóa khóa học: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================
# ĐÁNH GIÁ CỦA HỌC VIÊN
# ============================================   
@app.route('/api/data/reviews', methods=['GET'])
def get_reviews():
    """API lấy danh sách đánh giá"""
    try:
        return jsonify(load_data('reviews'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# API XÓA ẢNH CŨ
# ============================================

@app.route('/api/delete-image', methods=['POST'])
def delete_image():
    """Xóa ảnh cũ trên server"""
    try:
        data = request.get_json()
        image_url = data.get('image_url', '')
        
        if not image_url:
            return jsonify({"success": False, "error": "Không có URL ảnh"}), 400
        
        file_path = image_url.lstrip('/')
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"success": True, "message": "Đã xóa ảnh cũ"})
        else:
            return jsonify({"success": True, "message": "File không tồn tại"})
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    

# ============================================
# HÀM TẠO HTML CHO KHÓA HỌC
# ============================================

def generate_course_html(name, level, description, image_url, price, duration, schedule, category,
                         subtitle="", detailed_description="", benefits=None, learning_outcomes=None,
                         curriculum=None, schedule_detail=None, video_intro="", price_original=""):
    """Tạo nội dung HTML cho trang khóa học - UI ĐẸP"""
    display_name = f"{name} {level}" if level else name
    
    category_display = category
    try:
        with open('data/categories.json', 'r', encoding='utf-8') as f:
            cats = json.load(f)
            if 'categories' in cats:
                for c in cats['categories']:
                    if c.get('id') == category or c.get('slug') == category:
                        category_display = c.get('name', category)
                        break
    except:
        pass
    
    benefits_html = ""
    if benefits:
        if isinstance(benefits, str):
            try:
                benefits = json.loads(benefits)
            except:
                benefits = [b for b in benefits.split('\n') if b.strip()]
        benefits_html = "".join([f'<li><i class="fas fa-check-circle"></i>{b}</li>' for b in benefits if b])
    
    outcomes_html = ""
    if learning_outcomes:
        if isinstance(learning_outcomes, str):
            try:
                learning_outcomes = json.loads(learning_outcomes)
            except:
                learning_outcomes = [o for o in learning_outcomes.split('\n') if o.strip()]
        outcomes_html = "".join([f'<li><i class="fas fa-check-circle"></i>{o}</li>' for o in learning_outcomes if o])
    
    curriculum_html = ""
    if curriculum:
        if isinstance(curriculum, str):
            try:
                curriculum = json.loads(curriculum)
            except:
                curriculum = []
        for item in curriculum:
            if isinstance(item, dict):
                curriculum_html += f'''
                <div class="curriculum-item">
                    <div class="curriculum-week">{item.get("week", "")}</div>
                    <div class="curriculum-content">
                        <h4>{item.get("topic", "")}</h4>
                        <p>{item.get("description", "")}</p>
                    </div>
                </div>
                '''
    
    final_image_url = image_url if image_url else '/static/img/courses/default.jpg'
    
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{display_name} - Ngoại Ngữ OYin</title>
    <link rel="stylesheet" href="../../../css/chungcss.css">
    <link rel="stylesheet" href="../../../css/trangchucss.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        .nav-wrapper {{
            position: sticky;
            top: 0;
            z-index: 1000;
            background: linear-gradient(135deg, #e67e22, #d35400);
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
        }}
        @keyframes slideDown {{
            from {{ transform: translateY(-100%); opacity: 0; }}
            to {{ transform: translateY(0); opacity: 1; }}
        }}
        .nav-wrapper {{
            animation: slideDown 0.3s ease-out;
        }}
        header {{
            position: relative;
            z-index: 99;
        }}
        :root {{
            --primary: #e67e22;
            --primary-dark: #d35400;
            --primary-light: #f39c12;
            --gradient: linear-gradient(135deg, #e67e22, #d35400);
            --shadow: 0 10px 40px rgba(0,0,0,0.08);
        }}
        .course-detail-wrapper {{
            max-width: 1300px;
            margin: 0 auto;
            padding: 40px 20px;
        }}
        .course-hero {{
            background: linear-gradient(135deg, #e67e22, #d35400);
            padding: 50px 40px;
            border-radius: 20px;
            color: white;
            margin-bottom: 30px;
        }}
        .course-hero h1 {{
            font-size: 36px;
            margin-bottom: 10px;
        }}
        .course-hero .subtitle {{
            font-size: 18px;
            opacity: 0.9;
        }}
        .badge-group {{
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 20px;
        }}
        .badge {{
            background: rgba(255,255,255,0.2);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
        }}
        .quick-info {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            background: #f8f9fa;
            padding: 30px;
            border-radius: 16px;
            margin-bottom: 30px;
        }}
        .quick-info-item {{
            text-align: center;
        }}
        .quick-info-item i {{
            font-size: 28px;
            color: #e67e22;
        }}
        .quick-info-item .value {{
            font-size: 20px;
            font-weight: 700;
            color: #2c3e50;
        }}
        .quick-info-item .label {{
            font-size: 13px;
            color: #999;
        }}
        .course-content-grid {{
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
        }}
        .course-main {{
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.05);
        }}
        .course-main h2 {{
            font-size: 22px;
            color: #2c3e50;
            margin-bottom: 15px;
        }}
        .description {{
            line-height: 1.8;
            color: #444;
            white-space: pre-wrap;
        }}
        .benefits-grid ul, .benefits-grid {{
            list-style: none;
            padding: 0;
        }}
        .benefits-grid li {{
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .benefits-grid li i {{
            color: #4CAF50;
            font-size: 18px;
        }}
        .curriculum-list {{
            margin-top: 10px;
        }}
        .curriculum-item {{
            display: flex;
            gap: 20px;
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }}
        .curriculum-week {{
            font-weight: 700;
            color: #e67e22;
            min-width: 80px;
        }}
        .curriculum-content h4 {{
            margin-bottom: 5px;
            color: #2c3e50;
        }}
        .curriculum-content p {{
            color: #666;
            font-size: 14px;
        }}
        .course-sidebar {{
            display: flex;
            flex-direction: column;
            gap: 20px;
        }}
        .sidebar-card {{
            background: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.05);
            border: 1px solid #eee;
        }}
        .course-image img {{
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 12px;
        }}
        .price {{
            font-size: 28px;
            font-weight: 800;
            color: #e67e22;
            display: block;
            margin: 15px 0 5px;
        }}
        .price-original {{
            font-size: 16px;
            color: #999;
            text-decoration: line-through;
        }}
        .btn-register {{
            display: block;
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #e67e22, #d35400);
            color: white;
            border: none;
            border-radius: 40px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            text-decoration: none;
            margin-top: 15px;
            transition: all 0.3s;
        }}
        .btn-register:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(230,126,34,0.3);
        }}
        .info-row {{
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }}
        .info-row .label {{
            color: #999;
        }}
        .info-row .value {{
            font-weight: 600;
            color: #2c3e50;
        }}
        @media (max-width: 768px) {{
            .course-content-grid {{
                grid-template-columns: 1fr;
            }}
            .course-hero {{
                padding: 30px 20px;
            }}
            .course-hero h1 {{
                font-size: 28px;
            }}
            .quick-info {{
                grid-template-columns: 1fr;
            }}
            .curriculum-item {{
                flex-direction: column;
                gap: 5px;
            }}
        }}
    </style>
</head>
<body>
    <header>
        <div class="information">
            <div class="informationtext informationtextlogo">
                <a href="../../../index.html"><img src="../../../img/logooyin.png" alt="Logo" class="informationimg" /></a>
            </div>
            <div class="informationtext informationtextname">
                <strong class="informationtextname2">NGOẠI NGỮ O-YIN</strong>
            </div>
            <div class="informationtext informationtextcall">
                <div class="informationtextcallimg"><img src="../../../img/dienthoai.png" alt="Liên Hệ" class="callimg" /></div>
                <div class="informationtextcall12">
                    <div class="informationtextcall1">LIÊN HỆ ZALO</div>
                    <div class="informationtextcall2">0971 306 143(Hoàng Ngân)</div>
                </div>
            </div>
            <div class="informationtext informationtextsupport">
                <div class="informationtextsupportimg"><img src="../../../img/dongho.jpg" alt="Hỗ trợ" class="supportimg" /></div>
                <div class="informationtextsupport12">
                    <div class="informationtextsupport1">HỖ TRỢ</div>
                    <div class="informationtextsupport2">24/7</div>
                </div>
            </div>
        </div>
        <div class="nav-wrapper">
            <div class="mobile-menu"><div class="menu-toggle"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div></div>
            <div class="nav-main"><ul class="nav-list" id="dynamic-menu"><li>Đang tải menu...</li></ul></div>
            <div class="register-btn"><a href="../../../html/dangkyhtml/dangkyhtml.html">ĐĂNG KÝ</a></div>
        </div>
    </header>

    <main>
        <div class="course-detail-wrapper">
            <div class="course-hero">
                <h1>{display_name}</h1>
                <p class="subtitle">{subtitle or description[:100] if description else ''}</p>
                <div class="badge-group">
                    <span class="badge"><i class="fas fa-tag"></i> {category_display}</span>
                    <span class="badge"><i class="fas fa-level-up-alt"></i> {level or 'Cơ bản'}</span>
                    <span class="badge"><i class="fas fa-clock"></i> {duration}</span>
                    {f'<span class="badge"><i class="fas fa-video"></i> Học online</span>' if video_intro else ''}
                </div>
            </div>

            <div class="quick-info">
                <div class="quick-info-item">
                    <i class="fas fa-clock"></i>
                    <div class="value">{duration}</div>
                    <div class="label">Thời lượng</div>
                </div>
                <div class="quick-info-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div class="value">{schedule}</div>
                    <div class="label">Lịch học</div>
                </div>
                <div class="quick-info-item">
                    <i class="fas fa-graduation-cap"></i>
                    <div class="value">{level or 'Cơ bản'}</div>
                    <div class="label">Trình độ</div>
                </div>
            </div>

            <div class="course-content-grid">
                <div class="course-main">
                    <h2>📖 Giới thiệu khóa học</h2>
                    <div class="description">{detailed_description or description}</div>

                    {f'''
                    <div class="video-section" style="margin-top:20px;">
                        <iframe src="{video_intro}" style="width:100%;height:400px;border:none;border-radius:12px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                    ''' if video_intro else ''}

                    {f'''
                    <h2 style="margin-top:30px;">🎯 Lợi ích khi tham gia</h2>
                    <div class="benefits-grid">
                        <ul>
                            {benefits_html}
                        </ul>
                    </div>
                    ''' if benefits_html else ''}

                    {f'''
                    <h2 style="margin-top:30px;">📋 Kết quả đầu ra</h2>
                    <div class="benefits-grid">
                        <ul>
                            {outcomes_html}
                        </ul>
                    </div>
                    ''' if outcomes_html else ''}

                    {f'''
                    <h2 style="margin-top:30px;">📅 Lộ trình học tập</h2>
                    <div class="curriculum-list">
                        {curriculum_html}
                    </div>
                    ''' if curriculum_html else ''}
                </div>

                <div class="course-sidebar">
                    <div class="sidebar-card">
                        <div class="course-image">
                            <img src="{final_image_url}" alt="{display_name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23f39c12%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2248%22%3E📚%3C/text%3E%3C/svg%3E'">
                        </div>
                        <div>
                            <span class="price">{price}</span>
                            {f'<span class="price-original">{price_original}</span>' if price_original else ''}
                        </div>
                        <a href="../../../html/dangkyhtml/dangkyhtml.html" class="btn-register">
                            <i class="fas fa-arrow-right"></i> Đăng ký ngay
                        </a>
                    </div>

                    <div class="sidebar-card">
                        <h4 style="color:#2c3e50;margin-bottom:15px;">📋 Thông tin chi tiết</h4>
                        <div class="info-row">
                            <span class="label">Khóa học</span>
                            <span class="value">{display_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Danh mục</span>
                            <span class="value">{category_display}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Trình độ</span>
                            <span class="value">{level or 'Cơ bản'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Thời lượng</span>
                            <span class="value">{duration}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Lịch học</span>
                            <span class="value">{schedule}</span>
                        </div>
                    </div>

                    <div class="sidebar-card" style="background:linear-gradient(135deg,#fff9f5,#fff);border-color:#e67e2220;">
                        <h4 style="color:#e67e22;margin-bottom:10px;">💬 Cần tư vấn?</h4>
                        <p style="font-size:14px;color:#666;margin-bottom:15px;">Liên hệ ngay để được hỗ trợ chi tiết về khóa học.</p>
                        <a href="https://zalo.me/0971306143" target="_blank" style="display:block;width:100%;padding:12px;background:#0181f5;color:white;border:none;border-radius:10px;text-align:center;text-decoration:none;font-weight:600;">
                            <i class="fas fa-comment"></i> Tư vấn qua Zalo
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="footer-container">
            <div class="footer-row">
                <div class="footer-col">
                    <div class="footer-logo">
                        <img src="../../../img/logooyin.png" alt="Logo">
                        <h3>NGOẠI NGỮ O-YIN</h3>
                    </div>
                    <p class="footer-desc">Trung tâm đào tạo tiếng Trung uy tín hàng đầu.</p>
                    <div class="footer-social">
                        <a href="#" class="social-icon facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="#" class="social-icon zalo"><i class="fab fa-zalo"></i></a>
                        <a href="#" class="social-icon youtube"><i class="fab fa-youtube"></i></a>
                        <a href="#" class="social-icon tiktok"><i class="fab fa-tiktok"></i></a>
                    </div>
                </div>
                <div class="footer-col">
                    <h4>📞 LIÊN HỆ</h4>
                    <ul class="footer-contact">
                        <li><i class="fas fa-map-marker-alt"></i> Sầm Sơn, Thanh Hóa</li>
                        <li><i class="fas fa-phone-alt"></i> 0971 306 143</li>
                        <li><i class="fas fa-envelope"></i> info@oyin.edu.vn</li>
                        <li><i class="fas fa-clock"></i> Thứ 2 - Chủ Nhật: 8:00 - 21:00</li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>📚 KHÓA HỌC</h4>
                    <ul class="footer-links" id="footerCategories"></ul>
                </div>
                <div class="footer-col">
                    <h4>🛡️ HỖ TRỢ</h4>
                    <ul class="footer-links">
                        <li><a href="#">Chính sách & Điều khoản</a></li>
                        <li><a href="#">Chính sách bảo mật</a></li>
                        <li><a href="#">Hướng dẫn thanh toán</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 Ngoại Ngữ O-Yin. Tất cả các quyền được bảo lưu.</p>
            </div>
        </div>
    </footer>

    <script>
        // ===== LOAD MENU VỚI DROPDOWN =====
        async function loadMenu() {{
            try {{
                const response = await fetch('/api/menu');
                const data = await response.json();
                const menuItems = data.items;
                const menuContainer = document.getElementById('dynamic-menu');
                if (!menuContainer) return;
                
                menuContainer.innerHTML = '';
                
                menuItems.forEach(item => {{
                    const li = document.createElement('li');
                    li.className = 'nav-item';
                    
                    if (item.children && item.children.length > 0) {{
                        li.classList.add('has-dropdown');
                        li.innerHTML = `
                            <a href="${{item.url}}">${{item.name}}</a>
                            <ul class="dropdown">
                                ${{renderChildren(item.children)}}
                            </ul>
                        `;
                    }} else {{
                        li.innerHTML = `<a href="${{item.url}}">${{item.name}}</a>`;
                    }}
                    
                    menuContainer.appendChild(li);
                }});
                
                // Thêm sự kiện click cho dropdown trên mobile
                if (window.innerWidth <= 768) {{
                    document.querySelectorAll('.has-dropdown > a').forEach(link => {{
                        link.addEventListener('click', function(e) {{
                            e.preventDefault();
                            const dropdown = this.nextElementSibling;
                            if (dropdown) {{
                                dropdown.classList.toggle('show');
                            }}
                        }});
                    }});
                    
                    document.querySelectorAll('.dropdown-sub > span').forEach(span => {{
                        span.addEventListener('click', function(e) {{
                            e.preventDefault();
                            const subDropdown = this.nextElementSibling;
                            if (subDropdown) {{
                                subDropdown.classList.toggle('show');
                            }}
                        }});
                    }});
                }}
                
            }} catch (error) {{
                console.error('Lỗi tải menu:', error);
                const menuContainer = document.getElementById('dynamic-menu');
                if (menuContainer) {{
                    menuContainer.innerHTML = '<li>Lỗi tải menu</li>';
                }}
            }}
        }}

        function renderChildren(children) {{
            let html = '';
            children.forEach(child => {{
                if (child.children && child.children.length > 0) {{
                    html += `
                        <li class="dropdown-sub">
                            <span>${{child.name}}</span>
                            <ul class="sub-dropdown">
                                ${{renderChildren(child.children)}}
                            </ul>
                        </li>
                    `;
                }} else {{
                    html += `<li><a href="${{child.url}}">${{child.name}}</a></li>`;
                }}
            }});
            return html;
        }}

        async function loadFooterCategories() {{
            try {{
                const response = await fetch('/api/data/categories');
                const data = await response.json();
                const container = document.getElementById('footerCategories');
                if (!container) return;
                container.innerHTML = (data.categories || []).map(cat =>
                    `<li><a href="/khoa-hoc?category=${{cat.slug}}">${{cat.name}}</a></li>`
                ).join('');
                container.innerHTML += `<li><a href="/khoa-hoc">Tất cả khóa học</a></li>`;
            }} catch (error) {{
                console.error('Lỗi tải footer:', error);
            }}
        }}

        function initMobileMenu() {{
            const menuToggle = document.querySelector('.menu-toggle');
            const navMain = document.querySelector('.nav-main');
            if (menuToggle && navMain) {{
                menuToggle.addEventListener('click', function() {{
                    navMain.classList.toggle('active');
                    const bars = document.querySelectorAll('.bar');
                    if (navMain.classList.contains('active')) {{
                        bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
                        bars[1].style.opacity = '0';
                        bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
                    }} else {{
                        bars[0].style.transform = 'rotate(0) translate(0, 0)';
                        bars[1].style.opacity = '1';
                        bars[2].style.transform = 'rotate(0) translate(0, 0)';
                    }}
                }});
            }}
        }}

        function initStickyNav() {{
            const navWrapper = document.querySelector('.nav-wrapper');
            const header = document.querySelector('header');
            if (!navWrapper || !header) return;
            let navHeight = navWrapper.offsetHeight;
            let stickyOffset = header.offsetHeight;
            
            function handleSticky() {{
                if (window.scrollY >= stickyOffset) {{
                    navWrapper.classList.add('js-sticky');
                    if (!document.querySelector('.sticky-spacer')) {{
                        const spacer = document.createElement('div');
                        spacer.className = 'sticky-spacer';
                        spacer.style.height = navHeight + 'px';
                        navWrapper.parentNode.insertBefore(spacer, navWrapper);
                    }}
                }} else {{
                    navWrapper.classList.remove('js-sticky');
                    const spacer = document.querySelector('.sticky-spacer');
                    if (spacer) spacer.remove();
                }}
            }}
            
            const style = document.createElement('style');
            style.textContent = `
                .nav-wrapper.js-sticky {{
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                    z-index: 10000 !important;
                    animation: slideDown 0.3s ease !important;
                    box-shadow: 0 4px 25px rgba(0,0,0,0.2) !important;
                }}
                @keyframes slideDown {{
                    from {{ transform: translateY(-100%); }}
                    to {{ transform: translateY(0); }}
                }}
            `;
            document.head.appendChild(style);
            window.addEventListener('scroll', handleSticky);
            window.addEventListener('resize', function() {{
                stickyOffset = header.offsetHeight;
                navHeight = navWrapper.offsetHeight;
                handleSticky();
            }});
            handleSticky();
        }}

        document.addEventListener('DOMContentLoaded', function() {{
            loadMenu();
            loadFooterCategories();
            initMobileMenu();
            initStickyNav();
        }});
    </script>
</body>
</html>"""

# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port) 