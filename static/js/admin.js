// ============================================
// ADMIN.JS - QUẢN LÝ TẤT CẢ TAB
// ============================================

const API_BASE = "/api/data";

// Load tab khi click vào sidebar
document.querySelectorAll(".sidebar-nav a").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    document
      .querySelectorAll(".sidebar-nav a")
      .forEach((a) => a.classList.remove("active"));
    this.classList.add("active");

    const tab = this.dataset.tab;
    document.getElementById("pageTitle").textContent = this.textContent.trim();
    loadTabContent(tab);
  });
});

function loadTabContent(tab) {
  const container = document.getElementById("tabContent");
  container.innerHTML = '<div id="loading">Đang tải...</div>';

  // Render nội dung cho từng tab
  switch (tab) {
    case "nav":
      renderNavManager(container);
      break;
    case "slides":
      renderSlideManager(container);
      break;
    case "categories":
      renderCategoryManager(container);
      break;
    case "courses":
      renderCourseManager(container);
      break;
    case "documents":
      renderDocumentManager(container);
      break;
    case "news":
      renderNewsManager(container);
      break;
  }
}

// ============================================
// 1. QUẢN LÝ NAVIGATION
// ============================================
async function renderNavManager(container) {
  const data = await fetch("/api/data/menu").then((r) => r.json());

  container.innerHTML = `
        <h3>📋 Quản lý Navigation</h3>
        <button onclick="addNavItem()" style="margin:10px 0;padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">
            + Thêm mục
        </button>
        <div id="navTree">
            ${renderNavTree(data.items)}
        </div>
    `;
}

function renderNavTree(items, level = 0) {
  if (!items || items.length === 0) return "<p>Chưa có mục nào</p>";

  return `<ul class="nav-tree" style="list-style:none;padding-left:${level * 20}px;">
        ${items
          .map(
            (item) => `
            <li style="padding:8px 0;border-bottom:1px solid #eee;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>
                        <i class="fas fa-${item.children && item.children.length > 0 ? "folder" : "file"}"></i>
                        ${item.name}
                        <small style="color:#999;font-size:12px;">(${item.url})</small>
                    </span>
                    <div>
                        <button onclick="editNavItem('${item.id}')" style="margin:0 5px;border:none;cursor:pointer;color:#4CAF50;">✏️</button>
                        <button onclick="deleteNavItem('${item.id}')" style="border:none;cursor:pointer;color:#f44336;">🗑️</button>
                    </div>
                </div>
                ${item.children && item.children.length > 0 ? renderNavTree(item.children, level + 1) : ""}
            </li>
        `,
          )
          .join("")}
    </ul>`;
}

// ============================================
// 2. QUẢN LÝ SLIDER
// ============================================
async function renderSlideManager(container) {
  const data = await fetch("/api/data/slides").then((r) => r.json());
  const slides = data.items || [];

  container.innerHTML = `
        <h3>🖼️ Quản lý Ảnh Slider</h3>
        <p style="color:#999;font-size:14px;">Số lượng ảnh: ${slides.length}</p>
        <button onclick="addSlide()" style="margin:10px 0;padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">
            + Thêm ảnh
        </button>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:15px;margin-top:15px;" id="slideList">
            ${
              slides.length === 0
                ? "<p>Chưa có slide nào</p>"
                : slides
                    .map(
                      (slide, index) => `
                <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:1px solid #eee;">
                    <div style="width:100%;height:120px;background:#eee;overflow:hidden;">
                        <img src="${slide.image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22120%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    </div>
                    <div style="padding:12px;">
                        <strong style="font-size:14px;">${slide.title || "Slide " + (index + 1)}</strong>
                        <p style="color:#999;font-size:12px;margin:4px 0;">${slide.description || ""}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                            <span style="font-size:11px;color:#666;">#${slide.order || index + 1}</span>
                            <span style="font-size:11px;${slide.active ? "color:#4CAF50;" : "color:#999;"}">${slide.active ? "✅ Hoạt động" : "⛔ Ẩn"}</span>
                        </div>
                        <div style="display:flex;gap:5px;margin-top:8px;">
                            <button onclick="editSlide('${slide.id}')" style="flex:1;border:none;cursor:pointer;color:#4CAF50;padding:4px 8px;background:#e8f5e9;border-radius:4px;font-size:12px;">✏️ Sửa</button>
                            <button onclick="deleteSlide('${slide.id}')" style="flex:1;border:none;cursor:pointer;color:#f44336;padding:4px 8px;background:#ffebee;border-radius:4px;font-size:12px;">🗑️ Xóa</button>
                        </div>
                    </div>
                </div>
            `,
                    )
                    .join("")
            }
        </div>
    `;
}

// ============================================
// 3. QUẢN LÝ DANH MỤC KHÓA HỌC (4 MỤC CHÍNH)
// ============================================
async function renderCategoryManager(container) {
  const data = await fetch("/api/data/categories").then((r) => r.json());
  const categories = data.categories || [];

  container.innerHTML = `
        <h3>🏷️ Quản lý Danh mục Khóa học</h3>
        <p style="color:#999;font-size:14px;">4 mục chính hiển thị trên trang chủ</p>
        <button onclick="addCategory()" style="margin:10px 0;padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">
            + Thêm danh mục
        </button>
        <div id="categoryList">
            ${categories
              .map(
                (cat) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee;">
                    <div>
                        <i class="fas ${cat.icon}"></i>
                        <strong>${cat.name}</strong>
                        <small style="color:#999;font-size:13px;">(${cat.slug})</small>
                    </div>
                    <div>
                        <button onclick="editCategory('${cat.id}')" style="margin:0 5px;border:none;cursor:pointer;color:#4CAF50;">✏️</button>
                        <button onclick="deleteCategory('${cat.id}')" style="border:none;cursor:pointer;color:#f44336;">🗑️</button>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
}

// ============================================
// 4. QUẢN LÝ KHÓA HỌC
// ============================================
async function renderCourseManager(container) {
  try {
    const [coursesData, categoriesData] = await Promise.all([
      fetch("/api/data/courses").then((r) => r.json()),
      fetch("/api/data/categories").then((r) => r.json()),
    ]);

    console.log("📚 Courses data:", coursesData);

    // XỬ LÝ DỮ LIỆU - LẤY TỪ coursesData.items HOẶC coursesData
    let courses = [];
    if (Array.isArray(coursesData)) {
      courses = coursesData;
    } else if (coursesData.items && Array.isArray(coursesData.items)) {
      courses = coursesData.items;
    } else if (typeof coursesData === "object") {
      courses = Object.values(coursesData);
    }

    // ĐẢM BẢO courses LÀ LIST
    if (!Array.isArray(courses)) {
      courses = [];
    }

    const categories = categoriesData.categories || [];
    const catMap = {};
    categories.forEach((c) => (catMap[c.id] = c.name));

    // Nếu không có khóa học
    if (courses.length === 0) {
      container.innerHTML = `
        <h3>📚 Quản lý Khóa học</h3>
        <p style="color:#999;font-size:14px;">Tổng: 0 khóa học</p>
        <button onclick="showAddCourseForm()" style="margin:10px 0;padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">
          + Thêm khóa học
        </button>
        <p style="color:#999;margin-top:20px;">Chưa có khóa học nào</p>
      `;
      return;
    }

    container.innerHTML = `
      <h3>📚 Quản lý Khóa học</h3>
      <p style="color:#999;font-size:14px;">Tổng: ${courses.length} khóa học</p>
      <button onclick="showAddCourseForm()" style="margin:10px 0;padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">
        + Thêm khóa học
      </button>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px;margin-top:15px;" id="courseList">
        ${courses
          .map((course) => {
            // Lấy ảnh - ưu tiên image, sau đó image_url
            const imgSrc =
              course.image ||
              course.image_url ||
              "/static/img/courses/default.jpg";
            const catName =
              catMap[course.category_id] ||
              catMap[course.category] ||
              "Chưa phân loại";

            return `
            <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:1px solid #eee;">
              <div style="height:120px;overflow:hidden;background:#f0f0f0;">
                <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" 
                     onerror="this.src='/static/img/courses/default.jpg'">
              </div>
              <div style="padding:12px;">
                <strong style="font-size:14px;">${course.name || "Không tên"}</strong>
                <span style="background:#f0f0f0;padding:2px 8px;border-radius:10px;font-size:11px;display:inline-block;margin:4px 0;">${catName}</span>
                <p style="color:#e67e22;font-weight:bold;font-size:14px;margin:4px 0;">${course.price || "Liên hệ"}</p>
                <div style="display:flex;gap:5px;margin-top:8px;">
                  <button onclick="editCourse('${course.id}')" style="flex:1;border:none;cursor:pointer;color:#4CAF50;padding:4px 8px;background:#e8f5e9;border-radius:4px;font-size:12px;">✏️ Sửa</button>
                  <button onclick="deleteCourse('${course.id}')" style="flex:1;border:none;cursor:pointer;color:#f44336;padding:4px 8px;background:#ffebee;border-radius:4px;font-size:12px;">🗑️ Xóa</button>
                </div>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  } catch (error) {
    console.error("❌ Lỗi renderCourseManager:", error);
    container.innerHTML = `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
  }
}

// ============================================
// SỬA KHÓA HỌC - CÓ UPLOAD ẢNH MỚI
// ============================================
async function editCourse(id) {
  try {
    // Lấy thông tin khóa học hiện tại
    const data = await fetch("/api/data/courses").then((r) => r.json());
    let course = null;

    if (Array.isArray(data)) {
      course = data.find((c) => c.id === id);
    } else if (data.items) {
      course = data.items.find((c) => c.id === id);
    }

    if (!course) {
      alert("❌ Không tìm thấy khóa học!");
      return;
    }

    // Lấy danh sách category
    const catData = await fetch("/api/data/categories").then((r) => r.json());
    const categories = catData.categories || [];

    // Tạo modal
    const modal = document.createElement("div");
    modal.id = "courseModal";
    modal.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";

    modal.innerHTML = `
      <div style="background:white;border-radius:20px;padding:30px;max-width:600px;width:90%;max-height:90vh;overflow-y:auto;">
        <h3 style="margin-bottom:20px;color:#e67e22;">✏️ Sửa Khóa Học</h3>
        <form id="editCourseForm">
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Tên khóa học *</label>
            <input type="text" id="edit_courseName" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="${course.name || ""}" required>
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Cấp độ</label>
            <input type="text" id="edit_courseLevel" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="${course.level || ""}" placeholder="VD: Sơ cấp">
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Danh mục *</label>
            <select id="edit_categoryId" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;">
              ${categories
                .map(
                  (c) => `
                <option value="${c.id}" ${c.id === (course.category_id || course.category) ? "selected" : ""}>${c.name}</option>
              `,
                )
                .join("")}
            </select>
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Học phí</label>
            <input type="text" id="edit_price" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="${course.price || ""}" placeholder="VD: 1,500,000 VNĐ">
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Thời lượng</label>
            <input type="text" id="edit_duration" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="${course.duration || ""}" placeholder="VD: 2 tháng">
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Lịch học</label>
            <input type="text" id="edit_schedule" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="${course.schedule || ""}" placeholder="VD: Tối T2-T4-T6">
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Mô tả</label>
            <textarea id="edit_description" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:80px;font-size:14px;">${course.description || ""}</textarea>
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Ảnh hiện tại</label>
            <div style="display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
              <img src="${course.image || course.image_url || ""}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #eee;" 
                   onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f39c12%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2230%22%3E📚%3C/text%3E%3C/svg%3E'">
              <span style="font-size:13px;color:#999;">${course.image || course.image_url ? "Có ảnh" : "Chưa có ảnh"}</span>
            </div>
          </div>
          <div style="margin-bottom:15px;">
            <label style="font-weight:600;display:block;margin-bottom:5px;">Đổi ảnh mới</label>
            <input type="file" id="edit_image" accept="image/*" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;">
            <small style="color:#999;display:block;margin-top:4px;">Chọn ảnh mới để thay thế (để trống nếu giữ ảnh cũ)</small>
          </div>
          <div style="display:flex;gap:10px;margin-top:15px;">
            <button type="submit" style="flex:1;background:linear-gradient(135deg,#4CAF50,#45a049);color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">💾 Cập nhật</button>
            <button type="button" onclick="closeModal('courseModal')" style="flex:0.5;background:#f44336;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">Hủy</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Xử lý submit - SỬA LỖI
    document
      .getElementById("editCourseForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault();

        const fileInput = document.getElementById("edit_image");
        let imageUrl = course.image || course.image_url || "";

        // Upload ảnh mới nếu có - DÙNG API MỚI
        if (fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);

          try {
            const uploadRes = await fetch("/api/upload/course-image", {
              method: "POST",
              body: formData,
            });
            const uploadResult = await uploadRes.json();
            if (uploadResult.success) {
              // Nếu có ảnh cũ, xóa đi
              if (course.image || course.image_url) {
                await deleteOldImage(course.image || course.image_url);
              }
              imageUrl = uploadResult.image_url;
            } else {
              alert("⚠️ Upload ảnh thất bại, giữ ảnh cũ!");
            }
          } catch (error) {
            console.error("Upload ảnh thất bại:", error);
          }
        }

        // GIỮ NGUYÊN CÁC TRƯỜNG KHÁC, KHÔNG LÀM MẤT DỮ LIỆU
        const courseData = {
          name: document.getElementById("edit_courseName").value.trim(),
          level: document.getElementById("edit_courseLevel").value.trim(),
          category_id: document.getElementById("edit_categoryId").value,
          category: document.getElementById("edit_categoryId").value,
          price:
            document.getElementById("edit_price").value.trim() || "Liên hệ",
          duration:
            document.getElementById("edit_duration").value.trim() ||
            "Theo lộ trình",
          schedule:
            document.getElementById("edit_schedule").value.trim() ||
            "Linh hoạt",
          description:
            document.getElementById("edit_description").value.trim() ||
            "Mô tả khóa học...",
          subtitle: course.subtitle || "",
          detailed_description: course.detailed_description || "",
          benefits: course.benefits || "",
          learning_outcomes: course.learning_outcomes || "",
          curriculum: course.curriculum || "",
          schedule_detail: course.schedule_detail || "",
          video_intro: course.video_intro || "",
          price_original: course.price_original || "",
          image: imageUrl,
          image_url: imageUrl,
          // GIỮ NGUYÊN html_file
          html_file: course.html_file,
        };

        if (!courseData.name) {
          alert("❌ Vui lòng nhập tên khóa học!");
          return;
        }

        const response = await fetch(`/api/data/courses/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(courseData),
        });

        if (response.ok) {
          alert("✅ Cập nhật khóa học thành công!");
          modal.remove();
          loadTabContent("courses");
        } else {
          const error = await response.json();
          alert(
            "❌ Cập nhật thất bại: " + (error.error || "Lỗi không xác định"),
          );
        }
      });
  } catch (error) {
    alert("❌ Lỗi: " + error.message);
  }
}

// ============================================
// XÓA KHÓA HỌC
// ============================================

async function deleteCourse(id) {
  if (!confirm("Bạn có chắc muốn xóa khóa học này?")) return;

  try {
    const response = await fetch(`/api/data/courses/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert("✅ Xóa khóa học thành công!");
      loadTabContent("courses");
    } else {
      alert("❌ Xóa thất bại: " + (result.error || "Lỗi không xác định"));
    }
  } catch (error) {
    alert("❌ Lỗi kết nối: " + error.message);
  }
}

// ============================================
// 5. QUẢN LÝ TÀI LIỆU
// ============================================
async function renderDocumentManager(container) {
  const data = await fetch("/api/data/documents").then((r) => r.json());
  const docs = data.items || [];

  container.innerHTML = `
        <h3>📄 Quản lý Tài liệu</h3>
        <p style="color:#999;font-size:14px;">Tổng: ${docs.length} tài liệu</p>
        <button onclick="addDocument()" style="margin:10px 0;padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">
            + Thêm tài liệu
        </button>
        <div id="documentList">
            ${docs
              .map(
                (doc) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee;">
                    <div>
                        <i class="fas fa-file-pdf"></i>
                        <strong>${doc.name}</strong>
                        <small style="color:#999;">${doc.category || ""}</small>
                    </div>
                    <div>
                        <button onclick="editDocument('${doc.id}')" style="margin:0 5px;border:none;cursor:pointer;color:#4CAF50;">✏️</button>
                        <button onclick="deleteDocument('${doc.id}')" style="border:none;cursor:pointer;color:#f44336;">🗑️</button>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
}

// ============================================
// 6. QUẢN LÝ TIN TỨC
// ============================================
async function renderNewsManager(container) {
  const data = await fetch("/api/data/news").then((r) => r.json());
  const news = data.items || [];

  container.innerHTML = `
        <h3>📰 Quản lý Tin tức</h3>
        <p style="color:#999;font-size:14px;">Tổng: ${news.length} tin tức</p>
        <button onclick="addNews()" style="margin:10px 0;padding:8px 16px;background:#e67e22;color:white;border:none;border-radius:5px;cursor:pointer;">
            + Thêm tin tức
        </button>
        <div id="newsList">
            ${news
              .map(
                (item) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee;">
                    <div>
                        <strong>${item.title}</strong>
                        <small style="color:#999;">${item.created_at || ""}</small>
                    </div>
                    <div>
                        <button onclick="editNews('${item.id}')" style="margin:0 5px;border:none;cursor:pointer;color:#4CAF50;">✏️</button>
                        <button onclick="deleteNews('${item.id}')" style="border:none;cursor:pointer;color:#f44336;">🗑️</button>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
}

// ============================================
// CÁC HÀM THÊM/XÓA/SỬA NAVIGATION
// ============================================
async function addNavItem() {
  const name = prompt("Nhập tên menu:");
  if (!name) return;

  const url = prompt("Nhập URL (VD: /trang-moi):") || "#";
  const parentId = prompt("Nhập ID cha (để trống nếu là menu chính):") || "";

  const response = await fetch("/api/menu/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url, parent_id: parentId || null }),
  });

  if (response.ok) {
    alert("✅ Thêm menu thành công!");
    loadTabContent("nav");
  } else {
    alert("❌ Thêm thất bại!");
  }
}

async function deleteNavItem(id) {
  if (!confirm("Bạn có chắc muốn xóa mục này?")) return;

  const response = await fetch(`/api/menu/delete/${id}`, { method: "DELETE" });
  if (response.ok) {
    alert("✅ Xóa thành công!");
    loadTabContent("nav");
  } else {
    alert("❌ Xóa thất bại!");
  }
}

async function editNavItem(id) {
  const newName = prompt("Nhập tên mới:");
  if (!newName) return;

  const response = await fetch(`/api/menu/update/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });

  if (response.ok) {
    alert("✅ Cập nhật thành công!");
    loadTabContent("nav");
  } else {
    alert("❌ Cập nhật thất bại!");
  }
}

// ============================================
// THÊM SLIDE MỚI - UPLOAD ẢNH TRỰC TIẾP
// ============================================
async function addSlide() {
  // Tạo một form upload ảnh đơn giản
  const title = prompt("Nhập tiêu đề slide:");
  if (!title) return;

  // Tạo input file ẩn
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";

  // Chờ người dùng chọn file
  const file = await new Promise((resolve) => {
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        resolve(e.target.files[0]);
      } else {
        resolve(null);
      }
    };
    fileInput.click();
  });

  if (!file) {
    alert("❌ Bạn chưa chọn ảnh!");
    return;
  }

  // Hiển thị loading
  const loadingMsg = document.createElement("div");
  loadingMsg.textContent = "⏳ Đang upload ảnh...";
  loadingMsg.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px 40px;border-radius:10px;z-index:9999;font-size:18px;";
  document.body.appendChild(loadingMsg);

  try {
    // Upload ảnh lên server
    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/upload/slide", {
      method: "POST",
      body: formData,
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      alert(
        "❌ Upload ảnh thất bại: " +
          (uploadResult.error || "Lỗi không xác định"),
      );
      loadingMsg.remove();
      return;
    }

    // Lấy đường dẫn ảnh từ server
    const imageUrl = uploadResult.image_url;
    const description = prompt("Nhập mô tả (tùy chọn):") || "";

    // Lưu vào slides.json
    const response = await fetch("/api/data/slides/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        image: imageUrl,
        description: description,
        link: "#",
        active: true,
        order: 999,
      }),
    });

    loadingMsg.remove();

    if (response.ok) {
      alert("✅ Thêm slide thành công!");
      loadTabContent("slides");
    } else {
      alert("❌ Thêm slide thất bại!");
    }
  } catch (error) {
    loadingMsg.remove();
    alert("❌ Lỗi: " + error.message);
  }
}

async function deleteSlide(id) {
  if (!confirm("Bạn có chắc muốn xóa slide này?")) return;

  const response = await fetch(`/api/data/slides/${id}`, { method: "DELETE" });
  if (response.ok) {
    alert("✅ Xóa thành công!");
    loadTabContent("slides");
  } else {
    alert("❌ Xóa thất bại!");
  }
}

// ============================================
// SỬA SLIDE - CÓ THỂ ĐỔI ẢNH
// ============================================
async function editSlide(id) {
  // Lấy thông tin slide hiện tại
  const data = await fetch("/api/data/slides").then((r) => r.json());
  const slide = data.items.find((s) => s.id === id);

  if (!slide) {
    alert("Không tìm thấy slide!");
    return;
  }

  const newTitle = prompt("✏️ Tiêu đề mới:", slide.title) || slide.title;

  // Hỏi có muốn đổi ảnh không
  const changeImage = confirm(
    "🖼️ Bạn có muốn đổi ảnh không? (OK = Có, Cancel = Không)",
  );
  let newImage = slide.image;

  if (changeImage) {
    // Tạo input file ẩn
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";

    const file = await new Promise((resolve) => {
      fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          resolve(e.target.files[0]);
        } else {
          resolve(null);
        }
      };
      fileInput.click();
    });

    if (file) {
      // Upload ảnh mới
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload/slide", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      if (uploadResult.success) {
        newImage = uploadResult.image_url;
      } else {
        alert("❌ Upload ảnh thất bại, giữ ảnh cũ");
      }
    }
  }

  const newDescription =
    prompt("📝 Mô tả mới:", slide.description) || slide.description;
  const active = confirm(
    "✅ Slide đang hoạt động? (OK = Hoạt động, Cancel = Ẩn)",
  );

  const response = await fetch(`/api/data/slides/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: newTitle,
      image: newImage,
      description: newDescription,
      link: slide.link || "#",
      active: active,
      order: slide.order || 1,
    }),
  });

  if (response.ok) {
    alert("✅ Cập nhật thành công!");
    loadTabContent("slides");
  } else {
    alert("❌ Cập nhật thất bại!");
  }
}

// ============================================
// CÁC HÀM THÊM/XÓA/SỬA DANH MỤC
// ============================================
async function addCategory() {
  // Tạo modal
  const modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";

  modal.innerHTML = `
    <div style="background:white;border-radius:20px;padding:30px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;">
      <h3 style="margin-bottom:20px;color:#e67e22;">➕ Thêm Danh Mục Mới</h3>
      <form id="addCategoryForm">
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Tên danh mục *</label>
          <input type="text" id="cat_name" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" required placeholder="VD: HSK">
        </div>
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Icon FontAwesome</label>
          <input type="text" id="cat_icon" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="fa-tag" placeholder="VD: fa-graduation-cap">
        </div>
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Mô tả</label>
          <textarea id="cat_description" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:60px;font-size:14px;" placeholder="Mô tả danh mục..."></textarea>
        </div>
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Ảnh danh mục</label>
          <input type="file" id="cat_image" accept="image/*" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;">
          <small style="color:#999;display:block;margin-top:4px;">Chọn ảnh đại diện cho danh mục</small>
        </div>
        <div style="display:flex;gap:10px;">
          <button type="submit" style="flex:1;background:linear-gradient(135deg,#e67e22,#d35400);color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">✨ Thêm danh mục</button>
          <button type="button" onclick="this.closest('div[style]').remove()" style="flex:0.5;background:#f44336;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">Hủy</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("addCategoryForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = document.getElementById("cat_name").value.trim();
      const icon = document.getElementById("cat_icon").value.trim() || "fa-tag";
      const description = document
        .getElementById("cat_description")
        .value.trim();
      const fileInput = document.getElementById("cat_image");
      let imageUrl = "";

      if (!name) {
        alert("❌ Vui lòng nhập tên danh mục!");
        return;
      }

      // Upload ảnh nếu có
      if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        try {
          const uploadRes = await fetch("/api/upload/course-image", {
            method: "POST",
            body: formData,
          });
          const uploadResult = await uploadRes.json();
          if (uploadResult.success) {
            imageUrl = uploadResult.image_url;
          }
        } catch (error) {
          console.error("Upload ảnh thất bại:", error);
        }
      }

      const response = await fetch("/api/data/categories/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          icon,
          description,
          slug: name.toLowerCase().replace(/ /g, "-"),
          active: true,
          image: imageUrl,
        }),
      });

      if (response.ok) {
        alert("✅ Thêm danh mục thành công!");
        modal.remove();
        loadTabContent("categories");
      } else {
        alert("❌ Thêm thất bại!");
      }
    });
}

async function deleteCategory(id) {
  if (!confirm("Bạn có chắc muốn xóa danh mục này?")) return;

  const response = await fetch(`/api/data/categories/${id}`, {
    method: "DELETE",
  });
  if (response.ok) {
    alert("✅ Xóa thành công!");
    loadTabContent("categories");
  } else {
    alert("❌ Xóa thất bại!");
  }
}

async function editCategory(id) {
  const data = await fetch("/api/data/categories").then((r) => r.json());
  const cat = data.categories.find((c) => c.id === id);

  if (!cat) {
    alert("❌ Không tìm thấy danh mục!");
    return;
  }

  const modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";

  modal.innerHTML = `
    <div style="background:white;border-radius:20px;padding:30px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;">
      <h3 style="margin-bottom:20px;color:#e67e22;">✏️ Sửa Danh Mục</h3>
      <form id="editCategoryForm">
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Tên danh mục *</label>
          <input type="text" id="edit_cat_name" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="${cat.name || ""}" required>
        </div>
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Icon FontAwesome</label>
          <input type="text" id="edit_cat_icon" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" value="${cat.icon || "fa-tag"}">
        </div>
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Mô tả</label>
          <textarea id="edit_cat_description" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:60px;font-size:14px;">${cat.description || ""}</textarea>
        </div>
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Ảnh hiện tại</label>
          <div style="display:flex;align-items:center;gap:15px;">
            <img src="${cat.image || "/static/img/categories/default.jpg"}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #eee;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23f39c12%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2224%22%3E📁%3C/text%3E%3C/svg%3E'">
            <span style="font-size:13px;color:#999;">${cat.image ? "Có ảnh" : "Chưa có ảnh"}</span>
          </div>
        </div>
        <div style="margin-bottom:15px;">
          <label style="font-weight:600;display:block;margin-bottom:5px;">Đổi ảnh mới (tùy chọn)</label>
          <input type="file" id="edit_cat_image" accept="image/*" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;">
          <small style="color:#999;display:block;margin-top:4px;">Chọn ảnh mới để thay thế</small>
        </div>
        <div style="display:flex;gap:10px;">
          <button type="submit" style="flex:1;background:linear-gradient(135deg,#4CAF50,#45a049);color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">💾 Cập nhật</button>
          <button type="button" onclick="this.closest('div[style]').remove()" style="flex:0.5;background:#f44336;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">Hủy</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("editCategoryForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = document.getElementById("edit_cat_name").value.trim();
      const icon =
        document.getElementById("edit_cat_icon").value.trim() || "fa-tag";
      const description = document
        .getElementById("edit_cat_description")
        .value.trim();
      const fileInput = document.getElementById("edit_cat_image");
      let imageUrl = cat.image || "";

      if (!name) {
        alert("❌ Vui lòng nhập tên danh mục!");
        return;
      }

      // Upload ảnh mới nếu có
      if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        try {
          const uploadRes = await fetch("/api/upload/course-image", {
            method: "POST",
            body: formData,
          });
          const uploadResult = await uploadRes.json();
          if (uploadResult.success) {
            imageUrl = uploadResult.image_url;
          }
        } catch (error) {
          console.error("Upload ảnh thất bại:", error);
        }
      }

      const response = await fetch(`/api/data/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          icon,
          description,
          slug: name.toLowerCase().replace(/ /g, "-"),
          active: cat.active,
          image: imageUrl,
        }),
      });

      if (response.ok) {
        alert("✅ Cập nhật danh mục thành công!");
        modal.remove();
        loadTabContent("categories");
      } else {
        alert("❌ Cập nhật thất bại!");
      }
    });
}
// ============================================
// CÁC HÀM THÊM/XÓA/SỬA TÀI LIỆU
// ============================================
async function addDocument() {
  const name = prompt("Nhập tên tài liệu:");
  if (!name) return;

  const file = prompt("Nhập đường dẫn file (VD: /uploads/doc.pdf):");
  if (!file) return;

  const response = await fetch("/api/data/documents/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, file, category: "Tài liệu học tập" }),
  });

  if (response.ok) {
    alert("✅ Thêm tài liệu thành công!");
    loadTabContent("documents");
  } else {
    alert("❌ Thêm thất bại!");
  }
}

async function deleteDocument(id) {
  if (!confirm("Bạn có chắc muốn xóa tài liệu này?")) return;

  const response = await fetch(`/api/data/documents/${id}`, {
    method: "DELETE",
  });
  if (response.ok) {
    alert("✅ Xóa thành công!");
    loadTabContent("documents");
  } else {
    alert("❌ Xóa thất bại!");
  }
}

async function editDocument(id) {
  alert("Tính năng đang phát triển");
}

// ============================================
// CÁC HÀM THÊM/XÓA/SỬA TIN TỨC
// ============================================
async function addNews() {
  const title = prompt("Nhập tiêu đề tin tức:");
  if (!title) return;

  const content = prompt("Nhập nội dung:") || "Nội dung tin tức...";

  const response = await fetch("/api/data/news/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, status: "published" }),
  });

  if (response.ok) {
    alert("✅ Thêm tin tức thành công!");
    loadTabContent("news");
  } else {
    alert("❌ Thêm thất bại!");
  }
}

async function deleteNews(id) {
  if (!confirm("Bạn có chắc muốn xóa tin tức này?")) return;

  const response = await fetch(`/api/data/news/${id}`, { method: "DELETE" });
  if (response.ok) {
    alert("✅ Xóa thành công!");
    loadTabContent("news");
  } else {
    alert("❌ Xóa thất bại!");
  }
}

async function editNews(id) {
  alert("Tính năng đang phát triển");
}

// ============================================
// FORM THÊM KHÓA HỌC VỚI UPLOAD ẢNH
// ============================================
function showAddCourseForm() {
  // Lấy danh sách category
  fetch("/api/data/categories")
    .then((r) => r.json())
    .then((data) => {
      const categories = data.categories || [];

      // Tạo modal
      const modal = document.createElement("div");
      modal.id = "courseModal";
      modal.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";

      modal.innerHTML = `
        <div style="background:white;border-radius:20px;padding:30px;max-width:700px;width:95%;max-height:90vh;overflow-y:auto;">
          <h3 style="margin-bottom:20px;color:#e67e22;">➕ Thêm Khóa Học Mới</h3>
          <form id="courseFormModal" enctype="multipart/form-data">
            <!-- Tên khóa học -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Tên khóa học *</label>
              <input type="text" id="modal_courseName" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" required placeholder="VD: HSK 1">
            </div>
            
            <!-- Cấp độ -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Cấp độ</label>
              <input type="text" id="modal_courseLevel" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" placeholder="VD: Sơ cấp">
            </div>
            
            <!-- Danh mục -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Danh mục *</label>
              <select id="modal_categoryId" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;">
                ${categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}
              </select>
            </div>

            <!-- Phụ đề -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Phụ đề</label>
              <input type="text" id="modal_subtitle" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" placeholder="VD: Khóa học nền tảng cho người mới bắt đầu">
            </div>

            <!-- Giá -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
              <div>
                <label style="font-weight:600;display:block;margin-bottom:5px;">Học phí</label>
                <input type="text" id="modal_price" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" placeholder="VD: 1,500,000 VNĐ">
              </div>
              <div>
                <label style="font-weight:600;display:block;margin-bottom:5px;">Giá gốc (khuyến mãi)</label>
                <input type="text" id="modal_price_original" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" placeholder="VD: 2,500,000 VNĐ">
              </div>
            </div>

            <!-- Thời lượng & Lịch học -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
              <div>
                <label style="font-weight:600;display:block;margin-bottom:5px;">Thời lượng</label>
                <input type="text" id="modal_duration" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" placeholder="VD: 2 tháng">
              </div>
              <div>
                <label style="font-weight:600;display:block;margin-bottom:5px;">Lịch học</label>
                <input type="text" id="modal_schedule" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" placeholder="VD: Tối T2-T4-T6">
              </div>
            </div>

            <!-- Mô tả -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Mô tả ngắn</label>
              <textarea id="modal_description" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:60px;font-size:14px;" placeholder="Mô tả ngắn về khóa học..."></textarea>
            </div>

            <!-- Mô tả chi tiết -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Mô tả chi tiết</label>
              <textarea id="modal_detailed_description" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:120px;font-size:14px;" placeholder="Nội dung chi tiết khóa học..."></textarea>
            </div>

            <!-- Lợi ích -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Lợi ích (mỗi dòng 1 lợi ích)</label>
              <textarea id="modal_benefits" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:80px;font-size:14px;" placeholder="Phát âm chuẩn&#10;Tự tin giao tiếp&#10;Đạt chứng chỉ"></textarea>
            </div>

            <!-- Kết quả đầu ra -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Kết quả đầu ra (mỗi dòng 1 kết quả)</label>
              <textarea id="modal_outcomes" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:80px;font-size:14px;" placeholder="Đạt 150 từ vựng&#10;Viết 50 chữ Hán"></textarea>
            </div>

            <!-- Lộ trình học -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Lộ trình học (JSON)</label>
              <textarea id="modal_curriculum" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;min-height:100px;font-size:14px;" placeholder='[{"week":"Tuần 1","topic":"Giới thiệu","description":"Nội dung..."}]'></textarea>
              <small style="color:#999;display:block;margin-top:4px;">Định dạng JSON: [{"week":"Tuần 1","topic":"Chủ đề","description":"Mô tả"}]</small>
            </div>

            <!-- Video -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Video giới thiệu (URL)</label>
              <input type="text" id="modal_video" style="width:100%;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;" placeholder="https://www.youtube.com/embed/xxxxx">
            </div>

            <!-- UPLOAD ẢNH - CẢI TIẾN -->
            <div style="margin-bottom:15px;">
              <label style="font-weight:600;display:block;margin-bottom:5px;">Ảnh khóa học</label>
              <div style="display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
                <input type="file" id="modal_image" accept="image/*" style="flex:1;padding:10px;border:2px solid #e9ecef;border-radius:8px;font-size:14px;">
                <button type="button" onclick="document.getElementById('modal_image').value=''" style="padding:8px 16px;background:#f44336;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px;">✕ Xóa ảnh</button>
              </div>
              <div id="modal_image_preview" style="margin-top:10px;display:none;">
                <img id="modal_preview_img" src="#" alt="Preview" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid #eee;">
              </div>
              <small style="color:#999;display:block;margin-top:4px;">Chọn ảnh từ máy tính để upload (hỗ trợ: JPG, PNG, GIF, WEBP)</small>
            </div>

            <!-- Nút -->
            <div style="display:flex;gap:10px;">
              <button type="submit" style="flex:1;background:linear-gradient(135deg,#e67e22,#d35400);color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">✨ Tạo khóa học</button>
              <button type="button" onclick="closeModal('courseModal')" style="flex:0.5;background:#f44336;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px;">Hủy</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);

      // ===== PREVIEW ẢNH KHI CHỌN =====
      document
        .getElementById("modal_image")
        .addEventListener("change", function (e) {
          const previewDiv = document.getElementById("modal_image_preview");
          const previewImg = document.getElementById("modal_preview_img");
          if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function (event) {
              previewImg.src = event.target.result;
              previewDiv.style.display = "block";
            };
            reader.readAsDataURL(this.files[0]);
          } else {
            previewDiv.style.display = "none";
          }
        });

      // Xử lý submit
      document
        .getElementById("courseFormModal")
        .addEventListener("submit", async function (e) {
          e.preventDefault();

          const fileInput = document.getElementById("modal_image");
          let imageUrl = "";

          // Upload ảnh nếu có
          if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            try {
              const uploadRes = await fetch("/api/upload/course-image", {
                method: "POST",
                body: formData,
              });
              const uploadResult = await uploadRes.json();
              if (uploadResult.success) {
                imageUrl = uploadResult.image_url;
              } else {
                alert("⚠️ Upload ảnh thất bại, khóa học vẫn được tạo!");
              }
            } catch (error) {
              console.error("Upload ảnh thất bại:", error);
            }
          }

          // Lấy tất cả dữ liệu từ form
          const courseData = {
            name: document.getElementById("modal_courseName").value.trim(),
            level: document.getElementById("modal_courseLevel").value.trim(),
            category: document.getElementById("modal_categoryId").value,
            price:
              document.getElementById("modal_price").value.trim() || "Liên hệ",
            price_original:
              document.getElementById("modal_price_original").value.trim() ||
              "",
            duration:
              document.getElementById("modal_duration").value.trim() ||
              "Theo lộ trình",
            schedule:
              document.getElementById("modal_schedule").value.trim() ||
              "Linh hoạt",
            description:
              document.getElementById("modal_description").value.trim() ||
              "Mô tả khóa học...",
            subtitle: document.getElementById("modal_subtitle").value.trim(),
            detailed_description: document
              .getElementById("modal_detailed_description")
              .value.trim(),
            benefits: document.getElementById("modal_benefits").value.trim(),
            learning_outcomes: document
              .getElementById("modal_outcomes")
              .value.trim(),
            curriculum: document
              .getElementById("modal_curriculum")
              .value.trim(),
            video_intro: document.getElementById("modal_video").value.trim(),
            image_url: imageUrl,
          };

          if (!courseData.name) {
            alert("❌ Vui lòng nhập tên khóa học!");
            return;
          }

          // Gọi API create_course
          const response = await fetch("/api/course/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(courseData),
          });

          if (response.ok) {
            alert("✅ Thêm khóa học thành công!");
            modal.remove();
            loadTabContent("courses");
          } else {
            const error = await response.json();
            alert("❌ Thêm thất bại: " + (error.error || "Lỗi không xác định"));
          }
        });
    })
    .catch((error) => {
      alert("❌ Lỗi tải danh mục: " + error.message);
    });
}

// ============================================
// XÓA ẢNH CŨ KHI UPLOAD ẢNH MỚI
// ============================================
async function deleteOldImage(imageUrl) {
  if (!imageUrl) return;

  try {
    const response = await fetch("/api/delete-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    return await response.json();
  } catch (error) {
    console.error("Xóa ảnh cũ thất bại:", error);
  }
}

// ============================================
// ĐÓNG MODAL
// ============================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
}

// ============================================
// XÓA KHÓA HỌC - XÓA CẢ FILE HTML
// ============================================
async function deleteCourse(id) {
  if (
    !confirm(
      "⚠️ Bạn có chắc muốn xóa khóa học này?\n\nHành động này sẽ xóa:\n- Thông tin khóa học\n- File HTML chi tiết\n- Ảnh khóa học",
    )
  )
    return;

  try {
    const response = await fetch(`/api/data/courses/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert("✅ Đã xóa khóa học thành công!");
      loadTabContent("courses");
    } else {
      alert("❌ Xóa thất bại: " + (result.error || "Lỗi không xác định"));
    }
  } catch (error) {
    alert("❌ Lỗi kết nối: " + error.message);
  }
}

// ============================================
// LOAD TAB ĐẦU TIÊN
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  loadTabContent("nav");
});
