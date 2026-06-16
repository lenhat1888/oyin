from flask import Flask, render_template, jsonify, request, send_from_directory
import json
import os
import re
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.', static_url_path='')

# ============================================
# HÀM DÙNG CHUNG CHO DỮ LIỆU JSON
# ============================================
def load_data(filename):
    """Đọc dữ liệu từ file JSON trong thư mục data/"""
    path = os.path.join('data', filename)
    if not os.path.exists(path):
        default_data = {}
        if filename == 'categories.json':
            default_data = {
                "categories": [
                    {"id": "hsk", "name": "HSK", "icon": "fa-graduation-cap", "description": "Luyện thi HSK", "slug": "hsk", "active": True},
                    {"id": "hsk30", "name": "HSK 3.0", "icon": "fa-star", "description": "HSK 3.0", "slug": "hsk30", "active": True},
                    {"id": "tre-em", "name": "Tiếng Trung Trẻ Em", "icon": "fa-child", "description": "Tiếng Trung trẻ em", "slug": "tre-em", "active": True},
                    {"id": "nguoi-lon", "name": "Tiếng Trung Người Lớn", "icon": "fa-user-tie", "description": "Tiếng Trung người lớn", "slug": "nguoi-lon", "active": True}
                ]
            }
        elif filename == 'slides.json':
            default_data = {"items": []}
        else:
            default_data = {"items": []}
        save_data(filename, default_data)
        return default_data
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(filename, data):
    """Ghi dữ liệu vào file JSON trong thư mục data/"""
    os.makedirs('data', exist_ok=True)
    path = os.path.join('data', filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Đường dẫn file
MENU_FILE = 'data/menu.json'
COURSES_FILE = 'data/courses.json'

# Menu mặc định
DEFAULT_MENU = {
    "items": [
        {
            "id": "home",
            "name": "Trang Chủ",
            "url": "/index.html",
            "children": []
        },
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
        {
            "id": "lich-khai-giang",
            "name": "LỊCH KHAI GIẢNG",
            "url": "/html/lichkhaigianghtml/lichkhaigianghtml.html",
            "children": []
        },
        {
            "id": "khoa-hoc",
            "name": "KHÓA HỌC",
            "url": "/khoa-hoc",
            "children": []
        },
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

# ==================== HÀM ĐỌC/GHI FILE ====================

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
    """Lưu danh sách khóa học"""
    os.makedirs('data', exist_ok=True)
    if not isinstance(courses, list):
        courses = []
    with open(COURSES_FILE, 'w', encoding='utf-8') as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)

# ==================== TRANG WEB ====================

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

# ==================== PHỤC VỤ FILE TĨNH ====================

@app.route('/static/<path:filename>')
def serve_static_file(filename):
    """Phục vụ file tĩnh từ thư mục static/"""
    return send_from_directory('static', filename)

# ==================== API ====================

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
        return jsonify(courses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/<string:type>', methods=['GET'])
def api_get_data(type):
    """Lấy dữ liệu theo loại"""
    allowed = ['menu', 'slides', 'categories', 'documents', 'news']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    if type == 'menu':
        return jsonify(load_menu())
    
    return jsonify(load_data(f"{type}.json"))

@app.route('/api/data/<string:type>', methods=['POST'])
def api_save_data(type):
    """Lưu dữ liệu theo loại"""
    allowed = ['menu', 'slides', 'courses', 'categories', 'documents', 'news']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    data = request.get_json()
    save_data(f"{type}.json", data)
    return jsonify({"success": True})

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
# API UPLOAD ẢNH CHO KHÓA HỌC
# ============================================

UPLOAD_FOLDER_COURSES = 'static/img/courses'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

os.makedirs(UPLOAD_FOLDER_COURSES, exist_ok=True)

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
            return jsonify({"error": "Định dạng không hỗ trợ. Chỉ chấp nhận: png, jpg, jpeg, gif, webp, svg"}), 400
        
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

# ============================================
# API THÊM/XÓA/SỬA CHO ADMIN
# ============================================

@app.route('/api/data/<string:type>/add', methods=['POST'])
def api_add_item(type):
    """Thêm một mục vào dữ liệu"""
    allowed = ['slides', 'courses', 'documents', 'news']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    data = load_data(f"{type}.json")
    if 'items' not in data:
        data['items'] = []
    
    new_item = request.get_json()
    new_item['id'] = re.sub(r'[^a-z0-9]+', '-', new_item.get('name', 'item').lower().strip('-'))
    new_item['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    data['items'].append(new_item)
    save_data(f"{type}.json", data)
    return jsonify({"success": True, "item": new_item})

@app.route('/api/data/<string:type>/<string:item_id>', methods=['DELETE'])
def api_delete_item(type, item_id):
    """Xóa một mục khỏi dữ liệu"""
    allowed = ['slides', 'courses', 'documents', 'news']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    data = load_data(f"{type}.json")
    if 'items' not in data:
        return jsonify({"error": "No items"}), 404
    
    data['items'] = [item for item in data['items'] if item.get('id') != item_id]
    save_data(f"{type}.json", data)
    return jsonify({"success": True})

@app.route('/api/data/<string:type>/<string:item_id>', methods=['PUT'])
def api_update_item(type, item_id):
    """Cập nhật một mục trong dữ liệu"""
    allowed = ['slides', 'courses', 'documents', 'news']
    if type not in allowed:
        return jsonify({"error": "Invalid type"}), 400
    
    try:
        data = load_data(f"{type}.json")
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
                save_data(f"{type}.json", data)
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
    data = load_data('categories.json')
    if 'categories' not in data:
        data['categories'] = []
    
    new_category = request.get_json()
    new_category['id'] = re.sub(r'[^a-z0-9]+', '-', new_category.get('name', 'category').lower().strip('-'))
    
    data['categories'].append(new_category)
    save_data('categories.json', data)
    return jsonify({"success": True, "item": new_category})

@app.route('/api/data/categories/<string:cat_id>', methods=['DELETE'])
def api_delete_category(cat_id):
    """Xóa danh mục khóa học"""
    data = load_data('categories.json')
    if 'categories' not in data:
        return jsonify({"error": "No categories"}), 404
    
    data['categories'] = [c for c in data['categories'] if c.get('id') != cat_id]
    save_data('categories.json', data)
    return jsonify({"success": True})

@app.route('/api/data/categories/<string:cat_id>', methods=['PUT'])
def api_update_category(cat_id):
    """Cập nhật danh mục khóa học"""
    data = load_data('categories.json')
    if 'categories' not in data:
        return jsonify({"error": "No categories"}), 404
    
    updated = request.get_json()
    for i, cat in enumerate(data['categories']):
        if cat.get('id') == cat_id:
            updated['id'] = cat_id
            data['categories'][i] = updated
            save_data('categories.json', data)
            return jsonify({"success": True, "item": updated})
    
    return jsonify({"error": "Category not found"}), 404

# ============================================
# API COURSES - LẤY DANH SÁCH
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

# ============================================
# API COURSES - THÊM MỚI
# ============================================

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
        return jsonify({"success": True, "item": new_course})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# API COURSES - CẬP NHẬT
# ============================================

@app.route('/api/data/courses/<string:course_id>', methods=['PUT'])
def update_course(course_id):
    """API cập nhật khóa học - Giữ nguyên html_file"""
    try:
        courses = load_courses()
        if not isinstance(courses, list):
            return jsonify({"error": "No courses"}), 404
        
        updated = request.get_json()
        
        for i, course in enumerate(courses):
            if course.get('id') == course_id:
                updated['id'] = course_id
                if 'created_at' in course:
                    updated['created_at'] = course['created_at']
                if 'html_file' in course and not updated.get('html_file'):
                    updated['html_file'] = course['html_file']
                courses[i] = updated
                save_courses(courses)
                return jsonify({"success": True, "item": updated})
        
        return jsonify({"error": "Course not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# API COURSES - XÓA (XÓA CẢ FILE HTML)
# ============================================

@app.route('/api/data/courses/<string:course_id>', methods=['DELETE'])
def delete_course(course_id):
    """API xóa khóa học - Xóa cả file HTML"""
    try:
        courses = load_courses()
        if not isinstance(courses, list):
            return jsonify({"error": "No courses"}), 404
        
        course_to_delete = None
        for c in courses:
            if c.get('id') == course_id:
                course_to_delete = c
                break
        
        if not course_to_delete:
            return jsonify({"error": "Course not found"}), 404
        
        html_file = course_to_delete.get('html_file')
        if html_file:
            html_path = os.path.join('html', 'khoahochtml', html_file)
            if os.path.exists(html_path):
                os.remove(html_path)
                print(f"✅ Đã xóa file HTML: {html_path}")
        
        image_url = course_to_delete.get('image_url') or course_to_delete.get('image')
        if image_url:
            image_path = image_url.lstrip('/')
            if os.path.exists(image_path):
                os.remove(image_path)
                print(f"✅ Đã xóa ảnh: {image_path}")
        
        courses = [c for c in courses if c.get('id') != course_id]
        save_courses(courses)
        
        return jsonify({"success": True, "message": "Đã xóa khóa học và file HTML"})
    except Exception as e:
        print(f"❌ Lỗi xóa khóa học: {e}")
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
        /* ========== STICKY NAV ========== */
        .nav-wrapper {{
            position: sticky;
            top: 0;
            z-index: 1000;
            background: linear-gradient(135deg, #e67e22, #d35400);
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
        }}
        
        /* Animation cho nav khi dính */
        @keyframes slideDown {{
            from {{
                transform: translateY(-100%);
                opacity: 0;
            }}
            to {{
                transform: translateY(0);
                opacity: 1;
            }}
        }}
        
        .nav-wrapper {{
            animation: slideDown 0.3s ease-out;
        }}
        
        /* Đảm bảo header không ảnh hưởng */
        header {{
            position: relative;
            z-index: 99;
        }}
        
        /* Phần còn lại của CSS giữ nguyên ... */
        
        :root {{
            --primary: #e67e22;
            --primary-dark: #d35400;
            --primary-light: #f39c12;
            --gradient: linear-gradient(135deg, #e67e22, #d35400);
            --shadow: 0 10px 40px rgba(0,0,0,0.08);
        }}
        
        /* ... CSS còn lại giữ nguyên ... */
        
    </style>
</head>
<body>
    <!-- HEADER -->
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

    <!-- MAIN CONTENT -->
    <main>
        <div class="course-detail-wrapper">
            <!-- Hero -->
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

            <!-- Quick Info -->
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

            <!-- Content Grid -->
            <div class="course-content-grid">
                <div class="course-main">
                    <h2>📖 Giới thiệu khóa học</h2>
                    <div class="description">{detailed_description or description}</div>

                    {f'''
                    <div class="video-section">
                        <iframe src="{video_intro}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
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

                <!-- Sidebar -->
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

    <!-- FOOTER -->
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
                        <li><a href="/admin/dashboard">Quản trị website</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 Ngoại Ngữ O-Yin. Tất cả các quyền được bảo lưu.</p>
            </div>
        </div>
    </footer>

    <!-- ========== JAVASCRIPT ========== -->
    <script>
        // ===== LOAD MENU =====
        async function loadMenu() {{
            try {{
                const response = await fetch('/api/menu');
                const data = await response.json();
                const menuContainer = document.getElementById('dynamic-menu');
                if (!menuContainer) return;
                menuContainer.innerHTML = '';
                data.items.forEach(item => {{
                    const li = document.createElement('li');
                    li.className = 'nav-item';
                    li.innerHTML = `<a href="${{item.url}}">${{item.name}}</a>`;
                    menuContainer.appendChild(li);
                }});
            }} catch (error) {{
                console.error('Lỗi tải menu:', error);
            }}
        }}

        // ===== LOAD FOOTER CATEGORIES =====
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

        // ===== MOBILE MENU TOGGLE =====
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

        // ===== STICKY NAVIGATION =====
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
            
            // Thêm CSS cho class js-sticky
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

        // ===== DOM READY =====
        document.addEventListener('DOMContentLoaded', function() {{
            loadMenu();
            loadFooterCategories();
            initMobileMenu();
            initStickyNav();
        }});
    </script>
</body>
</html>"""

# ==================== MAIN ====================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)