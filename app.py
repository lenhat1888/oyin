# app.py
from flask import Flask, render_template, jsonify, request, send_from_directory, render_template_string, g, current_app
import json
import os
import re
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from flask_mail import Mail, Message
from flask import redirect
from flask import request
import threading
import time
import queue

# ============================================
# LOAD ENV & INIT FLASK
# ============================================

load_dotenv()

app = Flask(__name__, 
            static_folder='static',      
            static_url_path='/static',   
            template_folder='.')

# ============================================
# JINJA2 FILTERS
# ============================================

@app.template_filter('fromjson')
def fromjson_filter(value):
    """Chuyển đổi JSON string thành object Python trong template"""
    if not value:
        return []
    try:
        if isinstance(value, str):
            return json.loads(value)
        return value
    except:
        return []

# ============================================
# KẾT NỐI MONGODB
# ============================================

MONGO_URI = os.environ.get('MONGO_URI')
MONGO_DB = os.environ.get('MONGO_DB', 'oyin_db')

mongo_client = None
db = None

def get_db():
    """Lấy kết nối MongoDB (tạo mới nếu chưa có)"""
    global db, mongo_client
    if db is not None:
        return db
    
    try:
        if MONGO_URI:
            mongo_client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=5000,
                socketTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            mongo_client.admin.command('ping')
            db = mongo_client[MONGO_DB]
            print(f"✅ Kết nối MongoDB thành công! Database: {MONGO_DB}")
            return db
        else:
            print("⚠️ MONGO_URI không có trong .env, sử dụng JSON fallback")
            return None
    except Exception as e:
        print(f"❌ Lỗi kết nối MongoDB: {e}")
        print("⚠️ Sử dụng JSON fallback")
        return None

# ============================================
# HÀM DÙNG CHUNG
# ============================================

def save_data(collection_name, data):
    """Lưu dữ liệu vào MongoDB và JSON"""
    current_db = get_db()
    if current_db is not None:
        try:
            collection = current_db[collection_name]
            collection.delete_many({})
            
            if collection_name == 'categories':
                items = data.get('categories', [])
            else:
                items = data.get('items', [])
            
            if items:
                for item in items:
                    if '_id' in item:
                        del item['_id']
                collection.insert_many(items)
                print(f"✅ Đã lưu {len(items)} items vào MongoDB: {collection_name}")
            
            return True
        except Exception as e:
            print(f"⚠️ Lỗi lưu MongoDB {collection_name}: {e}")
    
    try:
        os.makedirs('data', exist_ok=True)
        data = convert_objectid(data)
        path = os.path.join('data', f'{collection_name}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"⚠️ Lỗi lưu JSON {collection_name}: {e}")
        return False

def load_data(collection_name):
    """Đọc dữ liệu từ MongoDB hoặc JSON"""
    current_db = get_db()
    if current_db is not None:
        try:
            collection = current_db[collection_name]
            items = list(collection.find({}, {'_id': 0}))
            items = convert_objectid(items)
            
            if collection_name == 'categories':
                if items:
                    return {"categories": items}
                else:
                    return {"categories": get_default_categories()}
            
            if not items:
                json_data = load_data_json(collection_name)
                if json_data and json_data.get('items'):
                    save_data(collection_name, json_data)
                    return json_data
            
            return {"items": items} if items else {"items": []}
            
        except Exception as e:
            print(f"⚠️ Lỗi đọc MongoDB {collection_name}: {e}")
    
    return load_data_json(collection_name)

def get_default_categories():
    """Danh mục mặc định"""
    return [
        {"id": "hsk", "name": "HSK", "icon": "fa-graduation-cap", "description": "Luyện thi HSK", "slug": "hsk", "active": True, "order": 1},
        {"id": "hsk30", "name": "HSK 3.0", "icon": "fa-star", "description": "HSK 3.0", "slug": "hsk30", "active": True, "order": 2},
        {"id": "tre-em", "name": "Tiếng Trung Trẻ Em", "icon": "fa-child", "description": "Tiếng Trung trẻ em", "slug": "tre-em", "active": True, "order": 3},
        {"id": "nguoi-lon", "name": "Tiếng Trung Người Lớn", "icon": "fa-user-tie", "description": "Tiếng Trung người lớn", "slug": "nguoi-lon", "active": True, "order": 4}
    ]

def save_data_json(filename, data):
    """Ghi dữ liệu vào file JSON trong thư mục data/"""
    os.makedirs('data', exist_ok=True)
    path = os.path.join('data', filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
def load_data_json(filename):
    """Đọc dữ liệu từ file JSON trong thư mục data/"""
    path = os.path.join('data', filename)
    if not os.path.exists(path):
        default_data = {"items": []}
        if filename == 'categories.json':
            default_data = {"categories": get_default_categories()}
        elif filename == 'schedules.json':
            default_data = {"items": []}
        save_data_json(filename, default_data)
        return default_data
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def convert_objectid(data):
    """Đệ quy chuyển đổi tất cả ObjectId trong dict/list thành string"""
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
# CẤU HÌNH EMAIL
# ============================================

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')
app.config['MAIL_MAX_EMAILS'] = None
app.config['MAIL_ASCII_ATTACHMENTS'] = False

mail = Mail(app)

print(f"📧 Email: {app.config['MAIL_USERNAME']}")
print(f"📧 Password: {'*' * len(app.config['MAIL_PASSWORD']) if app.config['MAIL_PASSWORD'] else 'Không có'}")

# ============================================
# HÀM GỬI EMAIL (PHẢI ĐỊNH NGHĨA TRƯỚC KHI DÙNG)
# ============================================

def send_registration_email(data):
    """Gửi email xác nhận đăng ký"""
    try:
        user_msg = Message(
            subject="✅ Xác nhận đăng ký khóa học - Ngoại Ngữ O-Yin",
            recipients=[data.get('email')]
        )
        user_msg.body = f"""
Kính gửi {data.get('full_name')},

Cảm ơn bạn đã đăng ký khóa học tại Ngoại Ngữ O-Yin!

📋 THÔNG TIN ĐĂNG KÝ:
─────────────────────────────
Khóa học: {data.get('course')}
Họ tên: {data.get('full_name')}
Số điện thoại: {data.get('phone')}
Email: {data.get('email')}
Ghi chú: {data.get('message', 'Không có')}
─────────────────────────────

✅ Chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ tới.

📞 Mọi thắc mắc vui lòng liên hệ:
- Hotline: 0971 306 143
- Zalo: 0971 306 143
- Email: info@oyin.edu.vn

🌐 Website: https://oyin.edu.vn

Trân trọng,
Ngoại Ngữ O-Yin
Sầm Sơn, Thanh Hóa
"""
        mail.send(user_msg)
        print(f"✅ Đã gửi email xác nhận cho {data.get('email')}")

        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@oyin.edu.vn')
        if admin_email:
            admin_msg = Message(
                subject=f"📝 Đăng ký mới từ {data.get('full_name')}",
                recipients=[admin_email]
            )
            admin_msg.body = f"""
📋 THÔNG BÁO ĐĂNG KÝ MỚI
─────────────────────────────
Họ tên: {data.get('full_name')}
Số điện thoại: {data.get('phone')}
Email: {data.get('email')}
Khóa học: {data.get('course')}
Ghi chú: {data.get('message', 'Không có')}
Ngày đăng ký: {data.get('created_at')}
─────────────────────────────

👉 Vui lòng liên hệ với học viên sớm nhất!
"""
            mail.send(admin_msg)
            print(f"✅ Đã gửi email thông báo cho admin: {admin_email}")

        return True

    except Exception as e:
        print(f"❌ Lỗi gửi email: {e}")
        import traceback
        traceback.print_exc()
        return False

# Khởi tạo kết nối MongoDB
db = get_db()

def send_email_async(data):
    """Gửi email trong background thread"""
    with app.app_context():
        try:
            print(f"📧 Thread bắt đầu gửi email cho {data.get('email')}")
            for attempt in range(3):
                try:
                    send_registration_email(data)
                    print(f"✅ Email gửi thành công cho {data.get('email')} (lần {attempt+1})")
                    return True
                except Exception as e:
                    print(f"⚠️ Lần {attempt+1} thất bại: {e}")
                    if attempt < 2:
                        time.sleep(2)
            print(f"❌ Email thất bại sau 3 lần thử cho {data.get('email')}")
            return False
        except Exception as e:
            print(f"❌ Lỗi thread: {e}")
            import traceback
            traceback.print_exc()
            return False

# Khởi tạo kết nối MongoDB
db = get_db()

# ============================================
# API ĐĂNG KÝ KHÓA HỌC (DÙNG THREADING)
# ============================================

@app.route('/api/dang-ky', methods=['POST'])
def submit_registration():
    """API nhận đăng ký từ form - DÙNG THREADING"""
    try:
        data = request.get_json()
        print("📥 Dữ liệu nhận được:", data)
        
        # Validate required fields
        required_fields = ['full_name', 'phone', 'email', 'course']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "error": f"Vui lòng nhập {field}"
                }), 400
        
        # Validate email
        email = data.get('email', '').strip()
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return jsonify({
                "success": False,
                "error": "Email không hợp lệ"
            }), 400
        
        # Validate phone
        phone = data.get('phone', '').strip()
        if not re.match(r'^[0-9]{10,11}$', phone):
            return jsonify({
                "success": False,
                "error": "Số điện thoại không hợp lệ (10-11 số)"
            }), 400
        
        # Load and save registration
        registrations = load_data('registrations')
        if 'items' not in registrations:
            registrations['items'] = []
        
        reg_count = len(registrations['items']) + 1
        reg_id = f"REG-{datetime.now().strftime('%Y%m')}-{str(reg_count).zfill(3)}"
        
        new_registration = {
            "id": reg_id,
            "full_name": data.get('full_name', '').strip(),
            "phone": phone,
            "email": email,
            "course": data.get('course', '').strip(),
            "course_id": data.get('course_id', ''),
            "message": data.get('message', '').strip(),
            "status": "pending",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        registrations['items'].append(new_registration)
        save_data('registrations', registrations)
        print("✅ Đã lưu đăng ký thành công!")
        
        # 👇 GỬI EMAIL BẰNG THREAD (KHÔNG DÙNG QUEUE)
        thread = threading.Thread(target=send_email_async, args=(new_registration,))
        thread.daemon = True
        thread.start()
        print("📧 Đã khởi tạo thread gửi email (background)")
        
        # 👇 TRẢ VỀ RESPONSE NGAY LẬP TỨC
        return jsonify({
            "success": True,
            "message": "Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất."
        })
        
    except Exception as e:
        print(f"❌ Lỗi đăng ký: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Có lỗi xảy ra, vui lòng thử lại sau"
        }), 500

# ============================================
# MENU
# ============================================

MENU_FILE = 'data/menu.json'
COURSES_FILE = 'data/courses.json'

DEFAULT_MENU = {
    "items": [
        {"id": "home", "name": "TRANG CHỦ", "url": "/", "children": []},
        {
            "id": "gioi-thieu",
            "name": "GIỚI THIỆU",
            "url": "#",
            "children": [
                {"id": "doi-ngu", "name": "Đội Ngũ Giảng Viên", "url": "/gioi-thieu/doi-ngu-giang-vien", "children": []},
                {"id": "ve-chung-toi", "name": "Về Chúng Tôi", "url": "/gioi-thieu/ve-chung-toi", "children": []}
            ]
        },
        {"id": "lich-khai-giang", "name": "LỊCH KHAI GIẢNG", "url": "/lich-khai-giang", "children": []},
        {"id": "khoa-hoc", "name": "KHÓA HỌC", "url": "/khoa-hoc", "children": []},
        {"id": "thu-vien", "name": "THƯ VIỆN", "url": "/thu-vien", "children": []},
        {"id": "tin-tuc", "name": "TIN TỨC", "url": "/tin-tuc", "children": []},
        {"id": "dang-ky", "name": "ĐĂNG KÝ", "url": "/dang-ky", "children": []}
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

# ============================================
# API MIGRATE
# ============================================

@app.route('/api/migrate', methods=['POST'])
def api_migrate():
    """API chuyển dữ liệu từ JSON sang MongoDB"""
    try:
        current_db = get_db()  # 👈 THÊM
        if current_db is None:
            return jsonify({"success": False, "error": "Không có kết nối MongoDB"}), 400
        
        collections = ['slides', 'categories', 'documents', 'news']
        migrated = []
        
        for name in collections:
            json_data = load_data_json(f'{name}.json')
            collection = current_db[name]  # 👈 SỬA
            collection.delete_many({})
            
            if name == 'categories':
                items = json_data.get('categories', [])
            else:
                items = json_data.get('items', [])
            
            if items:
                collection.insert_many(items)
                migrated.append(f"{name}: {len(items)} items")
        
        courses_data = load_data('courses') 
        courses_items = courses_data.get('items', [])  
        if courses_data:
            collection = current_db['courses']  # 👈 SỬA
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
# ========== TẤT CẢ ROUTE TRANG WEB ==========
# ============================================

# ---------- TRANG CHỦ ----------
@app.route('/')
def index():
    """TRANG CHỦ"""
    return render_template('index.html')


# ---------- GIỚI THIỆU ----------
@app.route('/gioi-thieu/doi-ngu-giang-vien')
def doi_ngu_giang_vien():
    """Trang Đội ngũ giảng viên"""
    try:
        return render_template('templates/doingugiangvien.html')
    except Exception as e:
        return f"Lỗi: {e}", 500

@app.route('/gioi-thieu/ve-chung-toi')
def ve_chung_toi():
    """Trang Về chúng tôi"""
    try:
        return render_template('templates/vechungtoi.html')
    except Exception as e:
        return f"Lỗi: {e}", 500


# ---------- LỊCH KHAI GIẢNG ----------
@app.route('/lich-khai-giang')
def lich_khai_giang():
    """Trang lịch khai giảng"""
    try:
        return render_template('templates/lichkhaigiang.html')
    except Exception as e:
        return f"Lỗi: {e}", 500


# ---------- KHÓA HỌC ----------
@app.route('/khoa-hoc')
def khoa_hoc_page():
    try:
        data = load_data('courses')
        courses = data.get('items', [])
        return render_template('templates/khoahoc.html', courses=courses)
    except Exception as e:
        return f"Lỗi: {e}", 500

@app.route('/api/data/courses', methods=['GET'])
def api_get_courses():
    """API lấy danh sách khóa học"""
    try:
        data = load_data('courses')
        courses = data.get('items', [])
        courses = convert_objectid(courses)
        return jsonify(courses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- THƯ VIỆN ----------

@app.route('/thu-vien')
def thu_vien():
    """Trang thư viện tài liệu"""
    try:
        return render_template('templates/thuvien.html')  # 👈 SỬA
    except Exception as e:
        return f"Lỗi: {e}", 500

# ---------- TIN TỨC ----------

@app.route('/tin-tuc')
def tin_tuc():
    """Trang tin tức"""
    try:
        return render_template('templates/tintuc.html')  # 👈 SỬA
    except Exception as e:
        return f"Lỗi: {e}", 500

# ---------- ĐĂNG KÝ ----------

@app.route('/dang-ky')
def dang_ky():
    """Trang đăng ký khóa học"""
    return render_template('templates/dangky.html')  # 👈 SỬA

# Đường dẫn lưu file HTML chi tiết khóa học
HTML_COURSE_FOLDER = os.path.join('templates', 'khoa-hoc', 'chi-tiet-khoa-hoc')


# ============================================
# ADMIN
# ============================================

@app.route('/admin/menu')
def admin_menu():
    """Trang quản trị menu"""
    try:
        menu = load_menu()
        return render_template('templates/admin/admin.html', menu=menu['items'])  # 👈 SỬA
    except Exception as e:
        return f"Lỗi: {e}", 500

@app.route('/admin/courses')
def admin_courses():
    """Trang quản trị khóa học"""
    try:
        return render_template('templates/admin/course_form.html')
    except Exception as e:
        return f"Lỗi: {e}", 500

@app.route('/admin/dashboard')
def admin_dashboard():
    """Trang quản trị tập trung"""
    return render_template('templates/admin/dashboard.html')

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
    try:
        data = load_data('courses')  # ✅ Dùng hàm mới
        courses = data.get('items', [])
        courses = convert_objectid(courses)
        return jsonify(courses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/<string:type>', methods=['GET'])
def api_get_data(type):
    """Lấy dữ liệu theo loại"""
    allowed = ['menu', 'slides', 'categories', 'documents', 'news', 'reviews', 'schedules', 'registrations']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    if type == 'menu':
        return jsonify(load_menu())
    
    data = load_data(type)
    data = convert_objectid(data)
    return jsonify(data)

@app.route('/api/data/<string:type>', methods=['POST'])
def api_save_data(type):
    """Lưu dữ liệu theo loại"""
    allowed = ['menu', 'slides', 'courses', 'categories', 'documents', 'news', 'reviews', 'schedules', 'registrations']
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
# KHÓA HỌC - DÙNG JSON (GIỐNG TÀI LIỆU)
# ============================================

@app.route('/khoa-hoc/chi-tiet/<course_id>')
def course_detail(course_id):
    """Trang chi tiết khóa học - Giống tài liệu"""
    try:
        data = load_data('courses')  # SỬA: load từ data/courses.json
        courses = data.get('items', [])
        course = next((c for c in courses if c.get('id') == course_id), None)

        if not course:
            return "Không tìm thấy khóa học", 404

        # Lấy khóa học liên quan (cùng category)
        related = [c for c in courses if c.get('category') == course.get('category') and c.get('id') != course_id][:3]

        return render_template('templates/khoa-hoc/chi-tiet-khoa-hoc/course_detail.html', 
                               course=course, related=related)
    except Exception as e:
        return f"Lỗi: {e}", 500


# ============================================
# API KHÓA HỌC - QUẢN LÝ (Giống tài liệu)
# ============================================

@app.route('/api/data/courses/add', methods=['POST'])
def api_add_course():
    """Thêm khóa học mới"""
    try:
        data = load_data('courses')
        if 'items' not in data:
            data['items'] = []
        
        new_course = request.get_json()
        
        # Tạo ID duy nhất
        name_for_id = new_course.get('name') or 'khoa-hoc'
        base_id = re.sub(r'[^a-z0-9]+', '-', name_for_id.lower().strip('-'))
        existing_ids = [item.get('id') for item in data['items'] if item.get('id')]
        new_id = base_id
        counter = 1
        while new_id in existing_ids:
            new_id = f"{base_id}-{counter}"
            counter += 1
        
        new_course['id'] = new_id
        new_course['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Lấy tên danh mục
        if new_course.get('category'):
            cats_data = load_data('categories')
            categories = cats_data.get('categories', [])
            for cat in categories:
                if cat.get('id') == new_course.get('category'):
                    new_course['category_name'] = cat.get('name', 'Chưa phân loại')
                    break
        else:
            new_course['category_name'] = 'Chưa phân loại'
        
        data['items'].append(new_course)
        save_data('courses', data)
        
        new_course = convert_objectid(new_course)
        
        return jsonify({"success": True, "item": new_course})
    except Exception as e:
        print(f"❌ Lỗi thêm khóa học: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/data/courses/<string:course_id>', methods=['PUT'])
def api_update_course(course_id):
    """Cập nhật khóa học"""
    try:
        data = load_data('courses')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        updated = request.get_json()
        
        # Cập nhật tên danh mục
        if updated.get('category'):
            cats_data = load_data('categories')
            categories = cats_data.get('categories', [])
            for cat in categories:
                if cat.get('id') == updated.get('category'):
                    updated['category_name'] = cat.get('name', 'Chưa phân loại')
                    break
        else:
            updated['category_name'] = 'Chưa phân loại'
        
        for i, item in enumerate(data['items']):
            if item.get('id') == course_id:
                updated['id'] = course_id
                if 'created_at' in item:
                    updated['created_at'] = item['created_at']
                
                data['items'][i] = updated
                save_data('courses', data)
                
                updated = convert_objectid(updated)
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": "Course not found"}), 404
    except Exception as e:
        print(f"❌ Lỗi cập nhật khóa học: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/data/courses/<string:course_id>', methods=['DELETE'])
def api_delete_course(course_id):
    """Xóa khóa học"""
    try:
        data = load_data('courses')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        original_count = len(data['items'])
        found_index = -1
        
        for i, item in enumerate(data['items']):
            if str(item.get('id')) == str(course_id) or str(item.get('_id')) == str(course_id):
                found_index = i
                break
        
        if found_index == -1:
            return jsonify({"error": "Course not found"}), 404
        
        data['items'].pop(found_index)
        save_data('courses', data)
        data = convert_objectid(data)
        
        return jsonify({"success": True, "message": "Đã xóa thành công", "data": data})
    except Exception as e:
        print(f"❌ Lỗi xóa khóa học: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# API TẠO KHÓA HỌC TỪ FORM (course_form.html)
# ============================================

@app.route('/api/course/create', methods=['POST'])
def create_course_from_form():
    """Tạo khóa học mới từ form"""
    try:
        data = request.get_json()
        print("📥 Dữ liệu nhận được:", data)
        
        # Lấy dữ liệu courses
        courses_data = load_data('courses')
        if 'items' not in courses_data:
            courses_data['items'] = []
        
        # Tạo ID duy nhất
        name_for_id = data.get('name', 'khoa-hoc')
        base_id = re.sub(r'[^a-z0-9]+', '-', name_for_id.lower().strip('-'))
        existing_ids = [item.get('id') for item in courses_data['items'] if item.get('id')]
        new_id = base_id
        counter = 1
        while new_id in existing_ids:
            new_id = f"{base_id}-{counter}"
            counter += 1
        
        # Lấy tên danh mục
        category_id = data.get('category', 'hsk')
        category_name = 'Chưa phân loại'
        cats_data = load_data('categories')
        categories = cats_data.get('categories', [])
        for cat in categories:
            if cat.get('id') == category_id:
                category_name = cat.get('name', 'Chưa phân loại')
                break
        
        # Tạo khóa học mới
        new_course = {
            "id": new_id,
            "name": data.get('name', '').strip(),
            "level": data.get('level', '').strip() or 'Cơ bản',
            "category": category_id,
            "category_name": category_name,
            "subtitle": data.get('subtitle', '').strip(),
            "price": data.get('price', 'Liên hệ'),
            "price_original": data.get('price_original', ''),
            "duration": data.get('duration', 'Theo lộ trình'),
            "schedule": data.get('schedule', 'Linh hoạt'),
            "description": data.get('description', '').strip(),
            "detailed_description": data.get('detailed_description', '').strip(),
            "benefits": data.get('benefits', '').strip(),
            "learning_outcomes": data.get('learning_outcomes', '').strip(),
            "curriculum": data.get('curriculum', '').strip(),
            "video_intro": data.get('video_intro', '').strip(),
            "image": data.get('image_url', ''),
            "image_url": data.get('image_url', ''),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "active": True,
            "html_file": f"{new_id}.html"
        }
        
        # Thêm vào danh sách
        courses_data['items'].append(new_course)
        save_data('courses', courses_data)
        
        new_course = convert_objectid(new_course)
        
        return jsonify({
            "success": True,
            "message": "Tạo khóa học thành công!",
            "course": new_course,
            "html_file": f"{new_id}.html"
        })
        
    except Exception as e:
        print(f"❌ Lỗi tạo khóa học: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ============================================
# API DOCUMENTS - QUẢN LÝ TÀI LIỆU
# ============================================

@app.route('/api/data/documents/add', methods=['POST'])
def api_add_document():
    """Thêm tài liệu mới"""
    try:
        data = load_data('documents')
        if 'items' not in data:
            data['items'] = []
        
        new_doc = request.get_json()
        
        # 👈 LẤY TÊN DANH MỤC TỪ category_id
        category_id = new_doc.get('category_id', '')
        category_name = 'Chưa phân loại'
        
        if category_id:
            # Đọc danh mục để lấy tên
            cats_data = load_data('categories')
            categories = cats_data.get('categories', [])
            for cat in categories:
                if cat.get('id') == category_id:
                    category_name = cat.get('name', 'Chưa phân loại')
                    break
        
        # Tạo ID duy nhất
        name_for_id = new_doc.get('title') or new_doc.get('name') or 'document'
        base_id = re.sub(r'[^a-z0-9]+', '-', name_for_id.lower().strip('-'))
        existing_ids = [item.get('id') for item in data['items'] if item.get('id')]
        new_id = base_id
        counter = 1
        while new_id in existing_ids:
            new_id = f"{base_id}-{counter}"
            counter += 1
        
        new_doc['id'] = new_id
        new_doc['category_name'] = category_name  # 👈 THÊM TÊN DANH MỤC
        new_doc['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_doc['view_count'] = new_doc.get('view_count', 0)
        new_doc['download_count'] = new_doc.get('download_count', 0)
        new_doc['active'] = new_doc.get('active', True)
        new_doc['is_new'] = new_doc.get('is_new', False)
        new_doc['tags'] = new_doc.get('tags', [])
        new_doc['file_size'] = new_doc.get('file_size', 'Chưa rõ')
        
        data['items'].append(new_doc)
        save_data('documents', data)
        
        new_doc = convert_objectid(new_doc)
        
        return jsonify({"success": True, "item": new_doc})
    except Exception as e:
        print(f"❌ Lỗi thêm tài liệu: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/data/documents/<string:doc_id>', methods=['PUT'])
def api_update_document(doc_id):
    """Cập nhật tài liệu"""
    try:
        data = load_data('documents')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        updated = request.get_json()
        
        # 👈 CẬP NHẬT TÊN DANH MỤC
        category_id = updated.get('category_id', '')
        category_name = 'Chưa phân loại'
        
        if category_id:
            cats_data = load_data('categories')
            categories = cats_data.get('categories', [])
            for cat in categories:
                if cat.get('id') == category_id:
                    category_name = cat.get('name', 'Chưa phân loại')
                    break
        
        for i, item in enumerate(data['items']):
            if item.get('id') == doc_id:
                updated['id'] = doc_id
                updated['category_name'] = category_name  # 👈 CẬP NHẬT TÊN
                if 'created_at' in item:
                    updated['created_at'] = item['created_at']
                if 'view_count' in item:
                    updated['view_count'] = item['view_count']
                if 'download_count' in item:
                    updated['download_count'] = item['download_count']
                
                data['items'][i] = updated
                save_data('documents', data)
                
                updated = convert_objectid(updated)
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        print(f"❌ Lỗi cập nhật tài liệu: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/data/documents/<string:doc_id>', methods=['DELETE'])
def api_delete_document(doc_id):
    """Xóa tài liệu"""
    try:
        data = load_data('documents')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        original_count = len(data['items'])
        found_index = -1
        
        for i, item in enumerate(data['items']):
            if str(item.get('id')) == str(doc_id) or str(item.get('_id')) == str(doc_id):
                found_index = i
                break
        
        if found_index == -1:
            return jsonify({"error": "Document not found"}), 404
        
        data['items'].pop(found_index)
        save_data('documents', data)
        data = convert_objectid(data)
        
        return jsonify({"success": True, "message": "Đã xóa thành công", "data": data})
    except Exception as e:
        print(f"❌ Lỗi xóa tài liệu: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    

# ============================================
# API UPLOAD ẢNH TÀI LIỆU
# ============================================

UPLOAD_FOLDER_DOCUMENTS = 'static/img/documents'
os.makedirs(UPLOAD_FOLDER_DOCUMENTS, exist_ok=True)

@app.route('/api/upload/document-image', methods=['POST'])
def upload_document_image():
    """Upload ảnh đại diện cho tài liệu"""
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
        
        file_path = os.path.join(UPLOAD_FOLDER_DOCUMENTS, new_filename)
        file.save(file_path)
        
        image_url = f"/static/img/documents/{new_filename}"
        
        return jsonify({
            "success": True,
            "image_url": image_url,
            "filename": new_filename
        })
        
    except Exception as e:
        print(f"❌ Upload document image error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# TIN TỨC
# ============================================

@app.route('/tin-tuc/chi-tiet/<doc_id>')
def news_detail(doc_id):
    """Trang chi tiết tin tức"""
    try:
        data = load_data('news')
        news_items = data.get('items', [])
        item = next((d for d in news_items if d.get('id') == doc_id), None)

        if not item:
            return "Không tìm thấy tin tức", 404

        # Lấy tin tức liên quan (cùng category)
        related = [d for d in news_items if d.get('category') == item.get('category') and d.get('id') != doc_id][:3]

        return render_template('templates/tin-tuc/chi-tiet-tin-tuc/news_detail.html', 
                               news=item, related=related)
    except Exception as e:
        return f"Lỗi: {e}", 500


# ============================================
# API TIN TỨC - QUẢN LÝ (Giống tài liệu)
# ============================================

@app.route('/api/data/news/add', methods=['POST'])
def api_add_news():
    """Thêm tin tức mới"""
    try:
        data = load_data('news')
        if 'items' not in data:
            data['items'] = []
        
        new_item = request.get_json()
        
        # Tạo ID duy nhất
        name_for_id = new_item.get('title') or 'tin-tuc'
        base_id = re.sub(r'[^a-z0-9]+', '-', name_for_id.lower().strip('-'))
        existing_ids = [item.get('id') for item in data['items'] if item.get('id')]
        new_id = base_id
        counter = 1
        while new_id in existing_ids:
            new_id = f"{base_id}-{counter}"
            counter += 1
        
        new_item['id'] = new_id
        new_item['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # 👈 BỎ view_count
        
        data['items'].append(new_item)
        save_data('news', data)
        
        new_item = convert_objectid(new_item)
        
        return jsonify({"success": True, "item": new_item})
    except Exception as e:
        print(f"❌ Lỗi thêm tin tức: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/data/news/<string:item_id>', methods=['PUT'])
def api_update_news(item_id):
    """Cập nhật tin tức"""
    try:
        data = load_data('news')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        updated = request.get_json()
        
        for i, item in enumerate(data['items']):
            if item.get('id') == item_id:
                updated['id'] = item_id
                if 'created_at' in item:
                    updated['created_at'] = item['created_at']
                # 👈 BỎ view_count
                
                data['items'][i] = updated
                save_data('news', data)
                
                updated = convert_objectid(updated)
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": "News not found"}), 404
    except Exception as e:
        print(f"❌ Lỗi cập nhật tin tức: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/data/news/<string:item_id>', methods=['DELETE'])
def api_delete_news(item_id):
    """Xóa tin tức"""
    try:
        data = load_data('news')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        original_count = len(data['items'])
        found_index = -1
        
        for i, item in enumerate(data['items']):
            if str(item.get('id')) == str(item_id) or str(item.get('_id')) == str(item_id):
                found_index = i
                break
        
        if found_index == -1:
            return jsonify({"error": "News not found"}), 404
        
        data['items'].pop(found_index)
        save_data('news', data)
        data = convert_objectid(data)
        
        return jsonify({"success": True, "message": "Đã xóa thành công", "data": data})
    except Exception as e:
        print(f"❌ Lỗi xóa tin tức: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# API UPLOAD ẢNH TIN TỨC
# ============================================

UPLOAD_FOLDER_NEWS = 'static/img/news'
os.makedirs(UPLOAD_FOLDER_NEWS, exist_ok=True)

@app.route('/api/upload/news-image', methods=['POST'])
def upload_news_image():
    """Upload ảnh đại diện cho tin tức"""
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
        
        file_path = os.path.join(UPLOAD_FOLDER_NEWS, new_filename)
        file.save(file_path)
        
        image_url = f"/static/img/news/{new_filename}"
        
        return jsonify({
            "success": True,
            "image_url": image_url,
            "filename": new_filename
        })
        
    except Exception as e:
        print(f"❌ Upload news image error: {e}")
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
    allowed = ['slides', 'courses', 'documents', 'news', 'reviews', 'schedules', 'registrations']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    data = load_data(type)
    if 'items' not in data:
        data['items'] = []
    
    new_item = request.get_json()
    
    name_for_id = new_item.get('name') or new_item.get('title') or 'item'
    base_id = re.sub(r'[^a-z0-9]+', '-', name_for_id.lower().strip('-'))
    
    existing_ids = [item.get('id') for item in data['items'] if item.get('id')]
    new_id = base_id
    counter = 1
    while new_id in existing_ids:
        new_id = f"{base_id}-{counter}"
        counter += 1
    
    new_item['id'] = new_id
    new_item['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    data['items'].append(new_item)
    save_data(type, data)
    
    new_item = convert_objectid(new_item)
    
    return jsonify({"success": True, "item": new_item})

@app.route('/api/data/<string:type>/<string:item_id>', methods=['DELETE'])
def api_delete_item(type, item_id):
    """Xóa một mục khỏi dữ liệu"""
    allowed = ['slides', 'courses', 'documents', 'news', 'reviews', 'schedules', 'registrations']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    try:
        data = load_data(type)
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        original_count = len(data['items'])
        found_index = -1
        
        for i, item in enumerate(data['items']):
            if str(item.get('id')) == str(item_id) or str(item.get('_id')) == str(item_id):
                found_index = i
                break
        
        if found_index == -1:
            return jsonify({"error": "Item not found"}), 404
        
        data['items'].pop(found_index)
        save_data(type, data)
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
    allowed = ['slides', 'courses', 'documents', 'news', 'reviews', 'schedules', 'registrations']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    try:
        data = load_data(type)
        if 'items' not in data:
            data['items'] = []
        
        updated = request.get_json()
        
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
            
            updated = convert_objectid(updated)
            
            return jsonify({"success": True, "item": updated})
    
    return jsonify({"error": "Category not found"}), 404


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
# THƯ VIỆN TÀI LIỆU
# ============================================

@app.route('/thu-vien/chi-tiet/<doc_id>')
def document_detail(doc_id):
    try:
        data = load_data('documents')
        documents = data.get('items', [])
        doc = next((d for d in documents if d.get('id') == doc_id), None)

        if not doc:
            return "Không tìm thấy tài liệu", 404

        # 👈 THÊM GIÁ TRỊ MẶC ĐỊNH CHO DOC
        doc['view_count'] = doc.get('view_count', 0)
        doc['download_count'] = doc.get('download_count', 0)
        doc['is_new'] = doc.get('is_new', False)
        doc['active'] = doc.get('active', True)
        doc['tags'] = doc.get('tags', [])
        doc['file_size'] = doc.get('file_size', 'Chưa rõ')
        doc['category_name'] = doc.get('category_name', 'Chưa phân loại')
        doc['created_at'] = doc.get('created_at', 'Chưa cập nhật')
        doc['image'] = doc.get('image', '')  # 👈 THÊM DÒNG NÀY

        # Lấy tài liệu liên quan
        related = [d for d in documents if d.get('category_id') == doc.get('category_id') and d.get('id') != doc_id][:4]

        def get_file_icon(file_type):
            icons = {
                'pdf': 'fa-file-pdf',
                'doc': 'fa-file-word', 'docx': 'fa-file-word',
                'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
                'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
                'video': 'fa-file-video',
                'audio': 'fa-file-audio',
                'image': 'fa-file-image',
                'zip': 'fa-file-archive',
                'other': 'fa-file'
            }
            return icons.get(file_type, 'fa-file')

        return render_template('templates/thu-vien/chi-tiet-thu-vien/document_detail.html', 
                               doc=doc, related=related, get_file_icon=get_file_icon)
    except Exception as e:
        return f"Lỗi: {e}", 500

@app.route('/api/document/view/<doc_id>', methods=['POST'])
def increase_document_view(doc_id):
    """Tăng lượt xem cho tài liệu"""
    try:
        data = load_data('documents')
        items = data.get('items', [])
        
        for item in items:
            if item.get('id') == doc_id:
                item['view_count'] = item.get('view_count', 0) + 1
                break
        
        save_data('documents', data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/document/download/<doc_id>', methods=['POST'])
def increase_document_download(doc_id):
    """Tăng lượt tải cho tài liệu"""
    try:
        data = load_data('documents')
        items = data.get('items', [])
        
        for item in items:
            if item.get('id') == doc_id:
                item['download_count'] = item.get('download_count', 0) + 1
                break
        
        save_data('documents', data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    

# ============================================
# API GIÁO VIÊN (TEACHERS)
# ============================================

@app.route('/api/data/teachers', methods=['GET'])
def api_get_teachers():
    """API lấy danh sách giáo viên"""
    try:
        data = load_data('teachers')
        teachers = data.get('items', [])
        teachers = convert_objectid(teachers)
        return jsonify(teachers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/teachers/add', methods=['POST'])
def api_add_teacher():
    """Thêm giáo viên mới"""
    try:
        data = load_data('teachers')
        if 'items' not in data:
            data['items'] = []
        
        new_teacher = request.get_json()
        
        # Tạo ID duy nhất
        name_for_id = new_teacher.get('name') or 'giao-vien'
        base_id = re.sub(r'[^a-z0-9]+', '-', name_for_id.lower().strip('-'))
        existing_ids = [item.get('id') for item in data['items'] if item.get('id')]
        new_id = base_id
        counter = 1
        while new_id in existing_ids:
            new_id = f"{base_id}-{counter}"
            counter += 1
        
        new_teacher['id'] = new_id
        new_teacher['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_teacher['is_active'] = new_teacher.get('is_active', True)
        
        data['items'].append(new_teacher)
        save_data('teachers', data)
        
        new_teacher = convert_objectid(new_teacher)
        return jsonify({"success": True, "item": new_teacher})
    except Exception as e:
        print(f"❌ Lỗi thêm giáo viên: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/data/teachers/<string:teacher_id>', methods=['PUT'])
def api_update_teacher(teacher_id):
    """Cập nhật giáo viên"""
    try:
        data = load_data('teachers')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        updated = request.get_json()
        
        for i, item in enumerate(data['items']):
            if item.get('id') == teacher_id:
                updated['id'] = teacher_id
                if 'created_at' in item:
                    updated['created_at'] = item['created_at']
                
                data['items'][i] = updated
                save_data('teachers', data)
                
                updated = convert_objectid(updated)
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": "Teacher not found"}), 404
    except Exception as e:
        print(f"❌ Lỗi cập nhật giáo viên: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/data/teachers/<string:teacher_id>', methods=['DELETE'])
def api_delete_teacher(teacher_id):
    """Xóa giáo viên"""
    try:
        data = load_data('teachers')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        found_index = -1
        for i, item in enumerate(data['items']):
            if str(item.get('id')) == str(teacher_id) or str(item.get('_id')) == str(teacher_id):
                found_index = i
                break
        
        if found_index == -1:
            return jsonify({"error": "Teacher not found"}), 404
        
        data['items'].pop(found_index)
        save_data('teachers', data)
        data = convert_objectid(data)
        
        return jsonify({"success": True, "message": "Đã xóa thành công", "data": data})
    except Exception as e:
        print(f"❌ Lỗi xóa giáo viên: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# ROUTE CHI TIẾT GIÁO VIÊN
# ============================================

@app.route('/gioi-thieu/chi-tiet-giao-vien/<teacher_id>')
def teacher_detail(teacher_id):
    """Trang chi tiết giáo viên"""
    try:
        data = load_data('teachers')
        teachers = data.get('items', [])
        teacher = next((t for t in teachers if t.get('id') == teacher_id), None)
        
        if not teacher:
            return "Không tìm thấy giáo viên", 404
        
        # Lấy giáo viên liên quan (cùng chuyên môn)
        related = []
        if teacher.get('specialties'):
            specialty_keywords = [s.strip() for s in teacher.get('specialties', '').split(',')[:2]]
            for t in teachers:
                if t.get('id') != teacher_id and t.get('specialties'):
                    t_specialties = [s.strip() for s in t.get('specialties', '').split(',')]
                    if any(kw in t_specialties for kw in specialty_keywords):
                        related.append(t)
                        if len(related) >= 4:
                            break
        
        if len(related) < 4:
            for t in teachers:
                if t.get('id') != teacher_id and t not in related:
                    related.append(t)
                    if len(related) >= 4:
                        break
        
        return render_template('templates/gioi-thieu/chi-tiet-giao-vien/giangvien_detail.html', 
                               teacher=teacher, related=related[:4])
    except Exception as e:
        return f"Lỗi: {e}", 500

# ============================================
# API UPLOAD ẢNH GIÁO VIÊN
# ============================================

UPLOAD_FOLDER_TEACHERS = 'static/img/teachers'
os.makedirs(UPLOAD_FOLDER_TEACHERS, exist_ok=True)

@app.route('/api/upload/teacher-image', methods=['POST'])
def upload_teacher_image():
    """Upload ảnh đại diện cho giáo viên"""
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
        
        file_path = os.path.join(UPLOAD_FOLDER_TEACHERS, new_filename)
        file.save(file_path)
        
        image_url = f"/static/img/teachers/{new_filename}"
        
        return jsonify({
            "success": True,
            "image_url": image_url,
            "filename": new_filename
        })
    except Exception as e:
        print(f"❌ Upload teacher image error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# HỖ TRỢ
# ============================================

@app.route('/chinh-sach-dieu-khoan')
def chinh_sach_dieu_khoan():
    return render_template('templates/chinh-sach-dieu-khoan.html')

@app.route('/chinh-sach-bao-mat')
def chinh_sach_bao_mat():
    return render_template('templates/chinh-sach-bao-mat.html')

@app.route('/cau-hoi-thuong-gap')
def cau_hoi_thuong_gap():
    return render_template('templates/cau-hoi-thuong-gap.html')

# ============================================
# API LẤY DANH SÁCH KHÓA HỌC CHO LỊCH KHAI GIẢNG
# ============================================

@app.route('/api/schedules/courses', methods=['GET'])
def api_get_courses_for_schedule():
    """API lấy danh sách khóa học để chọn khi tạo lịch"""
    try:
        courses_data = load_data('courses')
        courses = courses_data.get('items', [])
        
        # Chỉ lấy thông tin cần thiết: id, name, category, level
        result = []
        for course in courses:
            result.append({
                'id': course.get('id'),
                'name': course.get('name'),
                'category': course.get('category_name') or course.get('category'),
                'level': course.get('level', 'Cơ bản')
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# API LỊCH KHAI GIẢNG - THÊM MỚI (CÓ COURSE_ID)
# ============================================

@app.route('/api/data/schedules/add', methods=['POST'])
def api_add_schedule():
    """Thêm lịch khai giảng mới (có liên kết khóa học)"""
    try:
        data = load_data('schedules')
        if 'items' not in data:
            data['items'] = []
        
        new_schedule = request.get_json()
        
        # Tạo ID duy nhất
        name_for_id = new_schedule.get('course_name') or 'lich-khai-giang'
        base_id = re.sub(r'[^a-z0-9]+', '-', name_for_id.lower().strip('-'))
        existing_ids = [item.get('id') for item in data['items'] if item.get('id')]
        new_id = base_id
        counter = 1
        while new_id in existing_ids:
            new_id = f"{base_id}-{counter}"
            counter += 1
        
        # Nếu có course_id, lấy thông tin khóa học
        course_id = new_schedule.get('course_id')
        course_info = None
        
        if course_id:
            courses_data = load_data('courses')
            courses = courses_data.get('items', [])
            for course in courses:
                if course.get('id') == course_id:
                    course_info = {
                        'id': course.get('id'),
                        'name': course.get('name'),
                        'category': course.get('category_name') or course.get('category'),
                        'level': course.get('level'),
                        'price': course.get('price'),
                        'image': course.get('image') or course.get('image_url')
                    }
                    break
        
        new_schedule['id'] = new_id
        new_schedule['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_schedule['course_info'] = course_info  # Lưu thông tin khóa học
        new_schedule['has_course'] = course_info is not None  # Đánh dấu có liên kết
        
        # Đảm bảo các trường có giá trị mặc định
        new_schedule['active'] = new_schedule.get('active', True)
        new_schedule['remaining_slots'] = new_schedule.get('remaining_slots', 0)
        new_schedule['total_slots'] = new_schedule.get('total_slots', 10)
        new_schedule['status'] = new_schedule.get('status', 'open')
        
        data['items'].append(new_schedule)
        save_data('schedules', data)
        
        new_schedule = convert_objectid(new_schedule)
        
        return jsonify({"success": True, "item": new_schedule})
        
    except Exception as e:
        print(f"❌ Lỗi thêm lịch khai giảng: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# API LỊCH KHAI GIẢNG - CẬP NHẬT (CÓ COURSE_ID)
# ============================================

@app.route('/api/data/schedules/<string:schedule_id>', methods=['PUT'])
def api_update_schedule(schedule_id):
    """Cập nhật lịch khai giảng"""
    try:
        data = load_data('schedules')
        if 'items' not in data:
            return jsonify({"error": "No items"}), 404
        
        updated = request.get_json()
        
        for i, item in enumerate(data['items']):
            if item.get('id') == schedule_id:
                # Nếu có course_id, lấy thông tin khóa học
                course_id = updated.get('course_id')
                course_info = None
                
                if course_id:
                    courses_data = load_data('courses')
                    courses = courses_data.get('items', [])
                    for course in courses:
                        if course.get('id') == course_id:
                            course_info = {
                                'id': course.get('id'),
                                'name': course.get('name'),
                                'category': course.get('category_name') or course.get('category'),
                                'level': course.get('level'),
                                'price': course.get('price'),
                                'image': course.get('image') or course.get('image_url')
                            }
                            break
                
                updated['id'] = schedule_id
                updated['course_info'] = course_info
                updated['has_course'] = course_info is not None
                if 'created_at' in item:
                    updated['created_at'] = item['created_at']
                if 'created_at' not in updated:
                    updated['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                data['items'][i] = updated
                save_data('schedules', data)
                
                updated = convert_objectid(updated)
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": "Schedule not found"}), 404
    except Exception as e:
        print(f"❌ Lỗi cập nhật lịch khai giảng: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

from flask import request, redirect, url_for, session, render_template_string
import hashlib
import os

# ============================================
# CẤU HÌNH MẬT KHẨU ADMIN
# ============================================
ADMIN_USERNAME = "admin"
# Mật khẩu: admin@oyin2024 (mã hóa SHA256)
ADMIN_PASSWORD_HASH = hashlib.sha256("admin@oyin2024".encode()).hexdigest() 

def check_admin_auth():
    """Kiểm tra xác thực admin"""
    if 'admin_logged_in' not in session or session['admin_logged_in'] != True:
        return False
    return True

# ============================================
# ROUTE ĐĂNG NHẬP ADMIN
# ============================================
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Trang đăng nhập admin"""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        # Mã hóa mật khẩu nhập vào để so sánh
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if username == ADMIN_USERNAME and password_hash == ADMIN_PASSWORD_HASH:
            session['admin_logged_in'] = True
            return redirect('/admin/dashboard')
        else:
            return render_template_string(LOGIN_HTML, error="❌ Sai tên đăng nhập hoặc mật khẩu!")
    
    return render_template_string(LOGIN_HTML)

# ============================================
# ROUTE ĐĂNG XUẤT
# ============================================
@app.route('/admin/logout')
def admin_logout():
    """Đăng xuất admin"""
    session.pop('admin_logged_in', None)
    return redirect('/admin/login')

LOGIN_HTML = '''
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập Admin - OYin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Be Vietnam Pro', sans-serif; }
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(145deg, #e67e22 0%, #d35400 100%);
        }
        .login-container {
            background: white;
            padding: 50px 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }
        .login-container .logo {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .login-container h1 {
            font-size: 22px;
            color: #2c3e50;
            margin-bottom: 6px;
        }
        .login-container p.sub {
            color: #999;
            font-size: 14px;
            margin-bottom: 25px;
        }
        .login-container .form-group {
            margin-bottom: 18px;
            text-align: left;
        }
        .login-container .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .login-container .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            transition: border-color 0.3s;
            outline: none;
        }
        .login-container .form-group input:focus {
            border-color: #e67e22;
        }
        .login-container .btn-login {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #e67e22, #d35400);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
        }
        .login-container .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(230,126,34,0.3);
        }
        .login-container .error {
            color: #e74c3c;
            font-size: 14px;
            margin-bottom: 15px;
            padding: 10px;
            background: #fde8e8;
            border-radius: 8px;
        }
        .login-container .footer-text {
            margin-top: 16px;
            font-size: 13px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">🔐</div>
        <h1>OYin Admin</h1>
        <p class="sub">Đăng nhập để quản trị website</p>
        
        {% if error %}
        <div class="error">{{ error }}</div>
        {% endif %}
        
        <form method="POST">
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" name="username" placeholder="Nhập tên đăng nhập..." required autofocus>
            </div>
            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" name="password" placeholder="Nhập mật khẩu..." required>
            </div>
            <button type="submit" class="btn-login">🚀 Đăng nhập</button>
        </form>
        <p class="footer-text">Liên hệ quản trị viên nếu quên mật khẩu</p>
    </div>
</body>
</html>
'''

# ============================================
# MIDDLEWARE BẢO VỆ ADMIN
# ============================================
@app.before_request
def protect_admin_routes():
    """Kiểm tra xác thực trước khi vào các route admin"""
    admin_routes = ['/admin/dashboard', '/admin/courses', '/admin/menu']
    
    # Nếu route hiện tại là admin và chưa đăng nhập
    if any(request.path.startswith(route) for route in admin_routes):
        if not check_admin_auth():
            return redirect('/admin/login')
    
    # Cho phép vào /admin/login
    if request.path == '/admin/login':
        return None
    
app.secret_key = os.environ.get('SECRET_KEY', 'oyin-2024')

# ============================================
# ROUTE KIỂM TRA QUEUE (TÙY CHỌN)
# ============================================

@app.route('/test-email')
def test_email():
    """Test gửi email - Dùng để debug"""
    try:
        test_data = {
            'full_name': 'Test User',
            'email': 'lenhat94664@gmail.com',  # 👈 ĐỔI EMAIL CỦA BẠN
            'phone': '0123456789',
            'course': 'HSK 1 - Sơ Cấp',
            'message': 'Test message from debug'
        }
        
        print("📧 Bắt đầu test gửi email...")
        with app.app_context():
            send_registration_email(test_data)
        
        return """
        <h2>✅ Email đã được gửi!</h2>
        <p>Kiểm tra hộp thư của bạn (cả Spam folder)</p>
        <a href="/">Về trang chủ</a>
        """
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        return f"""
        <h2>❌ Lỗi gửi email</h2>
        <pre>{error_detail}</pre>
        <a href="/">Về trang chủ</a>
        """

# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    # Worker đã được khởi động ở trên, chỉ cần chạy app
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)