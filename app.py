from flask import Flask, render_template, jsonify, request, send_from_directory
import json
import os
import re
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')

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
    """Đọc danh sách khóa học"""
    if not os.path.exists(COURSES_FILE):
        save_courses([])
        return []
    try:
        with open(COURSES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_courses(courses):
    """Lưu danh sách khóa học"""
    os.makedirs('data', exist_ok=True)
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
        
        # Tạo id từ tên
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
        
        # Thêm vào menu
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
        
        if not course_name:
            return jsonify({"success": False, "error": "Tên khóa học không được để trống"}), 400
        
        # Tạo ID từ tên khóa học
        course_id = re.sub(r'[^a-z0-9]+', '-', course_name.lower().strip('-'))
        if course_level:
            level_id = re.sub(r'[^a-z0-9]+', '-', course_level.lower().strip('-'))
            course_id = f"{course_id}-{level_id}"
        
        # Đường dẫn file HTML
        html_filename = f"{course_id}.html"
        html_path = os.path.join('html', 'khoahochtml', html_filename)
        
        # Tạo nội dung HTML
        html_content = generate_course_html(course_name, course_level, description, image_url, price, duration, schedule, category)
        
        # Tạo thư mục nếu chưa có
        os.makedirs(os.path.dirname(html_path), exist_ok=True)
        
        # Ghi file HTML
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Lưu thông tin khóa học vào courses.json
        courses = load_courses()
        new_course = {
            "id": course_id,
            "name": course_name,
            "level": course_level,
            "category": category,
            "description": description,
            "image_url": image_url,
            "price": price,
            "duration": duration,
            "schedule": schedule,
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
        return jsonify({"success": False, "error": str(e)}), 500

def generate_course_html(name, level, description, image_url, price, duration, schedule, category):
    """Tạo nội dung HTML cho trang khóa học"""
    display_name = f"{name} {level}" if level else name
    
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{display_name} - Ngoại Ngữ OYin</title>
    <link rel="stylesheet" href="../../../css/chungcss.css">
    <link rel="stylesheet" href="../../../css/trangchucss.css">
    <style>
        .course-container {{ max-width: 1200px; margin: 40px auto; padding: 0 20px; }}
        .course-header {{ background: linear-gradient(135deg, #e67e22, #d35400); padding: 60px 40px; border-radius: 20px; color: white; text-align: center; margin-bottom: 40px; }}
        .course-header h1 {{ font-size: 36px; margin-bottom: 15px; color: white; }}
        .course-header p {{ font-size: 18px; opacity: 0.95; }}
        .course-content {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }}
        .course-info {{ background: #f8f9fa; padding: 30px; border-radius: 15px; }}
        .course-info h3 {{ color: #e67e22; margin-bottom: 20px; font-size: 24px; }}
        .info-item {{ margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #e9ecef; }}
        .info-label {{ font-weight: 700; color: #333; width: 100px; display: inline-block; }}
        .info-value {{ color: #666; }}
        .course-description {{ background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }}
        .course-description h3 {{ color: #e67e22; margin-bottom: 20px; }}
        .course-description p {{ line-height: 1.8; color: #555; }}
        .course-image {{ text-align: center; margin-bottom: 30px; }}
        .course-image img {{ max-width: 100%; border-radius: 15px; }}
        .btn-register {{ display: inline-block; background: linear-gradient(135deg, #e67e22, #d35400); color: white; padding: 15px 40px; border-radius: 40px; text-decoration: none; font-weight: 700; margin-top: 20px; transition: all 0.3s ease; }}
        .btn-register:hover {{ transform: translateY(-2px); box-shadow: 0 5px 20px rgba(230,126,34,0.4); }}
        @media (max-width: 768px) {{ .course-content {{ grid-template-columns: 1fr; }} .course-header h1 {{ font-size: 28px; }} }}
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
        <div class="course-container">
            <div class="course-header">
                <h1>{display_name}</h1>
                <p>Chương trình đào tạo tiếng Trung chuyên nghiệp</p>
            </div>
            <div class="course-content">
                <div class="course-info">
                    <div class="course-image">
                        {f'<img src="{image_url}" alt="{display_name}">' if image_url else '<div style="background: linear-gradient(135deg, #e67e22, #d35400); height: 200px; border-radius: 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">📚</div>'}
                    </div>
                    <h3>📋 Thông tin khóa học</h3>
                    <div class="info-item"><span class="info-label">📚 Khóa học:</span><span class="info-value">{display_name}</span></div>
                    <div class="info-item"><span class="info-label">📂 Danh mục:</span><span class="info-value">{category}</span></div>
                    <div class="info-item"><span class="info-label">💰 Học phí:</span><span class="info-value">{price}</span></div>
                    <div class="info-item"><span class="info-label">⏰ Thời lượng:</span><span class="info-value">{duration if duration else 'Theo lộ trình'}</span></div>
                    <div class="info-item"><span class="info-label">📅 Lịch học:</span><span class="info-value">{schedule if schedule else 'Linh hoạt'}</span></div>
                    <a href="../../../html/dangkyhtml/dangkyhtml.html" class="btn-register">ĐĂNG KÝ NGAY</a>
                </div>
                <div class="course-description">
                    <h3>📖 Nội dung khóa học</h3>
                    <p>{description}</p>
                </div>
            </div>
        </div>
    </main>
    <script>
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
                    li.innerHTML = `<a href="${{item.url}}">${{item.name}}</a>`;
                    menuContainer.appendChild(li);
                }});
            }} catch (error) {{ console.error('Lỗi tải menu:', error); }}
        }}
        document.addEventListener('DOMContentLoaded', function() {{
            loadMenu();
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
        }});
    </script>
</body>
</html>"""

@app.route('/<path:filename>')
def serve_static(filename):
    """Phục vụ file tĩnh"""
    try:
        return send_from_directory('.', filename)
    except Exception:
        return "File not found", 404

if __name__ == '__main__':
    # Render sẽ tự động gán cổng qua biến môi trường PORT
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)