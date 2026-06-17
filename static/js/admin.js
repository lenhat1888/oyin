// ============================================
// ADMIN.JS - SỬ DỤNG MODAL THAY ALERT/CONFIRM/PROMPT
// ============================================

const API_BASE = "/api/data";

// ============================================
// LOAD TAB
// ============================================
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
  container.innerHTML = '<div id="loading">⏳ Đang tải...</div>';

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
    case "reviews":
      renderReviewManager(container);
      break;
    default:
      container.innerHTML = "<p>Tab không hợp lệ</p>";
  }
}

// ============================================
// 1. QUẢN LÝ NAVIGATION
// ============================================
async function renderNavManager(container) {
  const data = await fetch("/api/data/menu").then((r) => r.json());
  container.innerHTML = `
        <h3>📋 Quản lý Navigation</h3>
        <button onclick="addNavItem()" class="btn-add">+ Thêm mục</button>
        <div id="navTree">${renderNavTree(data.items)}</div>
    `;
}

function renderNavTree(items, level = 0) {
  if (!items || items.length === 0)
    return "<p style='color:#999;'>Chưa có mục nào</p>";
  return `<ul class="nav-tree" style="list-style:none;padding-left:${level * 20}px;">
        ${items
          .map(
            (item) => `
            <li style="padding:8px 0;border-bottom:1px solid #eee;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <span>
                        <i class="fas fa-${item.children && item.children.length > 0 ? "folder" : "file"}"></i>
                        ${item.name}
                        <small style="color:#999;font-size:12px;">(${item.url})</small>
                    </span>
                    <div>
                        <button onclick="editNavItem('${item.id}')" class="btn-edit">✏️</button>
                        <button onclick="deleteNavItem('${item.id}')" class="btn-delete">🗑️</button>
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
// NAVIGATION - DÙNG MODAL
// ============================================
async function addNavItem() {
  // Lấy danh sách menu hiện tại để chọn parent
  const menuData = await fetch("/api/data/menu").then((r) => r.json());
  const menuItems = menuData.items || [];

  // Tạo options cho select
  const options = [{ value: "", label: "-- Không có (menu chính) --" }];

  function addOptions(items, prefix = "") {
    items.forEach((item) => {
      options.push({ value: item.id, label: prefix + item.name });
      if (item.children && item.children.length) {
        addOptions(item.children, prefix + "  └ ");
      }
    });
  }
  addOptions(menuItems);

  const result = await Modal.form(
    [
      {
        name: "name",
        label: "📝 Tên menu *",
        type: "text",
        placeholder: "VD: Trang mới",
        required: true,
      },
      {
        name: "url",
        label: "🔗 URL",
        type: "url",
        placeholder: "VD: /trang-moi.html",
        value: "#",
      },
      {
        name: "parent_id",
        label: "📁 Mục cha",
        type: "select",
        options: options,
        value: "",
      },
    ],
    "➕ Thêm Mục Menu",
    "Thêm",
  );

  if (!result) return;
  if (!result.name.trim()) {
    await Modal.show("Vui lòng nhập tên menu!", "warning");
    return addNavItem();
  }

  const response = await fetch("/api/menu/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: result.name.trim(),
      url: result.url.trim() || "#",
      parent_id: result.parent_id || null,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Thêm menu thành công!", "success");
    loadTabContent("nav");
  } else {
    const error = await response.json();
    await Modal.show(
      "❌ Thêm thất bại: " + (error.error || "Lỗi không xác định"),
      "error",
    );
  }
}

async function deleteNavItem(id) {
  const confirmed = await Modal.confirm(
    "Bạn có chắc muốn xóa mục này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;

  const response = await fetch(`/api/menu/delete/${id}`, { method: "DELETE" });
  if (response.ok) {
    await Modal.show("✅ Xóa thành công!", "success");
    loadTabContent("nav");
  } else {
    await Modal.show("❌ Xóa thất bại!", "error");
  }
}

async function editNavItem(id) {
  const newName = await Modal.prompt("Nhập tên mới:", "", "✏️ Sửa tên menu");
  if (newName === null || !newName.trim()) return;

  const response = await fetch(`/api/menu/update/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName.trim() }),
  });

  if (response.ok) {
    await Modal.show("✅ Cập nhật thành công!", "success");
    loadTabContent("nav");
  } else {
    await Modal.show("❌ Cập nhật thất bại!", "error");
  }
}

// ============================================
// 2. QUẢN LÝ SLIDER - DÙNG MODAL
// ============================================
async function renderSlideManager(container) {
  const data = await fetch("/api/data/slides").then((r) => r.json());
  const slides = data.items || [];

  container.innerHTML = `
        <h3>🖼️ Quản lý Ảnh Slider</h3>
        <p style="color:#999;font-size:14px;">Số lượng ảnh: ${slides.length}</p>
        <button onclick="addSlide()" class="btn-add">+ Thêm ảnh</button>
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
                        <div style="display:flex;gap:5px;margin-top:8px;">
                            <button onclick="editSlide('${slide.id}')" class="btn-edit" style="flex:1;">✏️ Sửa</button>
                            <button onclick="deleteSlide('${slide.id}')" class="btn-delete" style="flex:1;">🗑️ Xóa</button>
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

async function addSlide() {
  const result = await Modal.form(
    [
      {
        name: "title",
        label: "📝 Tiêu đề slide *",
        type: "text",
        placeholder: "Nhập tiêu đề...",
        required: true,
      },
      { name: "image", label: "🖼️ Chọn ảnh *", type: "file", required: true },
      {
        name: "description",
        label: "📄 Mô tả (tùy chọn)",
        type: "textarea",
        placeholder: "Mô tả slide...",
        rows: 60,
      },
      {
        name: "link",
        label: "🔗 Link (tùy chọn)",
        type: "url",
        placeholder: "https://...",
        value: "#",
      },
      { name: "active", label: "✅ Hoạt động", type: "checkbox", value: true },
    ],
    "➕ Thêm Slide Mới",
    "Thêm slide",
  );

  if (!result) return;
  if (!result.image) {
    await Modal.show("❌ Vui lòng chọn ảnh!", "warning");
    return addSlide();
  }

  // Upload ảnh
  const formData = new FormData();
  formData.append("file", result.image);

  const uploadRes = await fetch("/api/upload/slide", {
    method: "POST",
    body: formData,
  });
  const uploadResult = await uploadRes.json();

  if (!uploadResult.success) {
    await Modal.show("❌ Upload ảnh thất bại!", "error");
    return;
  }

  // Lưu vào database
  const response = await fetch("/api/data/slides/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: result.title.trim(),
      image: uploadResult.image_url,
      description: result.description?.trim() || "",
      link: result.link?.trim() || "#",
      active: result.active !== false,
      order: 999,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Thêm slide thành công!", "success");
    loadTabContent("slides");
  } else {
    await Modal.show("❌ Thêm slide thất bại!", "error");
  }
}

async function deleteSlide(id) {
  const confirmed = await Modal.confirm(
    "Bạn có chắc muốn xóa slide này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;

  const response = await fetch(`/api/data/slides/${id}`, { method: "DELETE" });
  if (response.ok) {
    await Modal.show("✅ Xóa thành công!", "success");
    loadTabContent("slides");
  } else {
    await Modal.show("❌ Xóa thất bại!", "error");
  }
}

async function editSlide(id) {
  const data = await fetch("/api/data/slides").then((r) => r.json());
  const slide = data.items.find((s) => s.id === id);
  if (!slide) {
    await Modal.show("❌ Không tìm thấy slide!", "error");
    return;
  }

  const result = await Modal.form(
    [
      {
        name: "title",
        label: "📝 Tiêu đề slide *",
        type: "text",
        value: slide.title || "",
        required: true,
      },
      {
        name: "image",
        label: "🖼️ Đổi ảnh (để trống nếu giữ ảnh cũ)",
        type: "file",
      },
      {
        name: "description",
        label: "📄 Mô tả",
        type: "textarea",
        value: slide.description || "",
        rows: 60,
      },
      { name: "link", label: "🔗 Link", type: "url", value: slide.link || "#" },
      {
        name: "active",
        label: "✅ Hoạt động",
        type: "checkbox",
        value: slide.active !== false,
      },
    ],
    "✏️ Sửa Slide",
    "Cập nhật",
  );

  if (!result) return;

  let imageUrl = slide.image;
  if (result.image) {
    const formData = new FormData();
    formData.append("file", result.image);
    const uploadRes = await fetch("/api/upload/slide", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) {
      imageUrl = uploadResult.image_url;
    }
  }

  const response = await fetch(`/api/data/slides/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: result.title.trim(),
      image: imageUrl,
      description: result.description?.trim() || "",
      link: result.link?.trim() || "#",
      active: result.active !== false,
      order: slide.order || 1,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Cập nhật slide thành công!", "success");
    loadTabContent("slides");
  } else {
    await Modal.show("❌ Cập nhật thất bại!", "error");
  }
}

// ============================================
// 3. QUẢN LÝ DANH MỤC - DÙNG MODAL
// ============================================
async function renderCategoryManager(container) {
  const data = await fetch("/api/data/categories").then((r) => r.json());
  const categories = data.categories || [];

  container.innerHTML = `
        <h3>🏷️ Quản lý Danh mục Khóa học</h3>
        <p style="color:#999;font-size:14px;">Tổng: ${categories.length} danh mục</p>
        <button onclick="addCategory()" class="btn-add">+ Thêm danh mục</button>
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
                        <button onclick="editCategory('${cat.id}')" class="btn-edit">✏️</button>
                        <button onclick="deleteCategory('${cat.id}')" class="btn-delete">🗑️</button>
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

    let courses = [];
    if (Array.isArray(coursesData)) courses = coursesData;
    else if (coursesData.items && Array.isArray(coursesData.items))
      courses = coursesData.items;
    else if (typeof coursesData === "object")
      courses = Object.values(coursesData);

    const categories = categoriesData.categories || [];
    const catMap = {};
    categories.forEach((c) => (catMap[c.id] = c.name));

    container.innerHTML = `
            <h3>📚 Quản lý Khóa học</h3>
            <p style="color:#999;font-size:14px;">Tổng: ${courses.length} khóa học</p>
            <!-- 👈 SỬA NÚT NÀY THÀNH LINK -->
            <a href="/admin/courses" class="btn-add" style="display:inline-block;text-decoration:none;">
                + Thêm khóa học
            </a>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px;margin-top:15px;">
                ${
                  courses.length === 0
                    ? "<p>Chưa có khóa học nào</p>"
                    : courses
                        .map((course) => {
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
                                <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/static/img/courses/default.jpg'">
                            </div>
                            <div style="padding:12px;">
                                <strong style="font-size:14px;">${course.name || "Không tên"}</strong>
                                <span style="background:#f0f0f0;padding:2px 8px;border-radius:10px;font-size:11px;display:inline-block;margin:4px 0;">${catName}</span>
                                <p style="color:#e67e22;font-weight:bold;font-size:14px;margin:4px 0;">${course.price || "Liên hệ"}</p>
                                <div style="display:flex;gap:5px;margin-top:8px;">
                                    <button onclick="editCourse('${course.id}')" class="btn-edit" style="flex:1;">✏️ Sửa</button>
                                    <button onclick="deleteCourse('${course.id}')" class="btn-delete" style="flex:1;">🗑️ Xóa</button>
                                </div>
                            </div>
                        </div>
                    `;
                        })
                        .join("")
                }
            </div>
        `;
  } catch (error) {
    container.innerHTML = `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
  }
}

// ============================================
// THÊM KHÓA HỌC VỚI MODAL
// ============================================
function showAddCourseForm() {
  // Lấy danh mục để chọn
  fetch("/api/data/categories")
    .then((r) => r.json())
    .then(async (data) => {
      const categories = data.categories || [];
      const options = categories.map((c) => ({ value: c.id, label: c.name }));

      const result = await Modal.form(
        [
          {
            name: "name",
            label: "📝 Tên khóa học *",
            type: "text",
            placeholder: "VD: HSK 1",
            required: true,
          },
          {
            name: "level",
            label: "📊 Cấp độ",
            type: "text",
            placeholder: "VD: Sơ cấp",
          },
          {
            name: "category",
            label: "📁 Danh mục *",
            type: "select",
            options: options,
            required: true,
          },
          {
            name: "price",
            label: "💰 Học phí",
            type: "text",
            placeholder: "VD: 1,500,000 VNĐ",
            value: "Liên hệ",
          },
          {
            name: "duration",
            label: "⏰ Thời lượng",
            type: "text",
            placeholder: "VD: 2 tháng",
            value: "Theo lộ trình",
          },
          {
            name: "schedule",
            label: "📅 Lịch học",
            type: "text",
            placeholder: "VD: Tối T2-T4-T6",
            value: "Linh hoạt",
          },
          {
            name: "description",
            label: "📄 Mô tả *",
            type: "textarea",
            placeholder: "Mô tả khóa học...",
            rows: 100,
            required: true,
          },
          { name: "image", label: "🖼️ Ảnh khóa học", type: "file" },
          {
            name: "active",
            label: "✅ Hiển thị",
            type: "checkbox",
            value: true,
          },
        ],
        "➕ Thêm Khóa Học Mới",
        "Tạo khóa học",
      );

      if (!result) return;
      if (!result.name.trim()) {
        await Modal.show("Vui lòng nhập tên khóa học!", "warning");
        return showAddCourseForm();
      }

      let imageUrl = "";
      if (result.image) {
        const formData = new FormData();
        formData.append("file", result.image);
        const uploadRes = await fetch("/api/upload/course-image", {
          method: "POST",
          body: formData,
        });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) imageUrl = uploadResult.image_url;
      }

      const courseData = {
        name: result.name.trim(),
        level: result.level?.trim() || "",
        category: result.category || "hsk",
        price: result.price?.trim() || "Liên hệ",
        duration: result.duration?.trim() || "Theo lộ trình",
        schedule: result.schedule?.trim() || "Linh hoạt",
        description: result.description?.trim() || "Mô tả khóa học...",
        image_url: imageUrl,
      };

      const response = await fetch("/api/course/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        await Modal.show("✅ Thêm khóa học thành công!", "success");
        loadTabContent("courses");
      } else {
        const error = await response.json();
        await Modal.show(
          "❌ Thêm thất bại: " + (error.error || "Lỗi không xác định"),
          "error",
        );
      }
    });
}

// ============================================
// SỬA KHÓA HỌC VỚI MODAL
// ============================================
async function editCourse(id) {
  const data = await fetch("/api/data/courses").then((r) => r.json());
  let course = null;
  if (Array.isArray(data)) course = data.find((c) => c.id === id);
  else if (data.items) course = data.items.find((c) => c.id === id);

  if (!course) {
    await Modal.show("❌ Không tìm thấy khóa học!", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
        <div class="modal-box" style="max-width:600px;max-height:90vh;overflow-y:auto;">
            <div class="modal-header">
                <h3>✏️ Sửa Khóa Học</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editCourseForm">
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:600;display:block;margin-bottom:4px;">Tên khóa học *</label>
                        <input type="text" id="edit_courseName" class="modal-input" value="${course.name || ""}" required>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:600;display:block;margin-bottom:4px;">Cấp độ</label>
                        <input type="text" id="edit_courseLevel" class="modal-input" value="${course.level || ""}" placeholder="VD: Sơ cấp">
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:600;display:block;margin-bottom:4px;">Học phí</label>
                        <input type="text" id="edit_price" class="modal-input" value="${course.price || ""}">
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:600;display:block;margin-bottom:4px;">Mô tả</label>
                        <textarea id="edit_description" class="modal-input" style="min-height:80px;">${course.description || ""}</textarea>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:600;display:block;margin-bottom:4px;">Đổi ảnh mới</label>
                        <input type="file" id="edit_image" accept="image/*" class="modal-input">
                        <small style="color:#999;">Để trống nếu giữ ảnh cũ</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                <button class="btn btn-primary" id="submitEditBtn">💾 Cập nhật</button>
            </div>
        </div>
    `;
  document.body.appendChild(modal);

  document
    .getElementById("submitEditBtn")
    .addEventListener("click", async function () {
      const fileInput = document.getElementById("edit_image");
      let imageUrl = course.image || course.image_url || "";

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
            if (course.image || course.image_url) {
              await deleteOldImage(course.image || course.image_url);
            }
            imageUrl = uploadResult.image_url;
          }
        } catch (error) {
          console.error("Upload ảnh thất bại:", error);
        }
      }

      const courseData = {
        name: document.getElementById("edit_courseName").value.trim(),
        level: document.getElementById("edit_courseLevel").value.trim(),
        price: document.getElementById("edit_price").value.trim() || "Liên hệ",
        description:
          document.getElementById("edit_description").value.trim() ||
          "Mô tả khóa học...",
        image: imageUrl,
        image_url: imageUrl,
        html_file: course.html_file,
        category: course.category || "hsk",
        duration: course.duration || "Theo lộ trình",
        schedule: course.schedule || "Linh hoạt",
      };

      if (!courseData.name) {
        await Modal.show("❌ Vui lòng nhập tên khóa học!", "warning");
        return;
      }

      const response = await fetch(`/api/data/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        await Modal.show("✅ Cập nhật khóa học thành công!", "success");
        modal.remove();
        loadTabContent("courses");
      } else {
        const error = await response.json();
        await Modal.show(
          "❌ Cập nhật thất bại: " + (error.error || "Lỗi không xác định"),
          "error",
        );
      }
    });
}

// ============================================
// XÓA KHÓA HỌC
// ============================================
async function deleteCourse(id) {
  const confirmed = await Modal.confirm(
    "⚠️ Bạn có chắc muốn xóa khóa học này?\n\nHành động này sẽ xóa:\n- Thông tin khóa học\n- File HTML chi tiết\n- Ảnh khóa học",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;

  const response = await fetch(`/api/data/courses/${id}`, { method: "DELETE" });
  const result = await response.json();

  if (response.ok && result.success) {
    await Modal.show("✅ Đã xóa khóa học thành công!", "success");
    loadTabContent("courses");
  } else {
    await Modal.show(
      "❌ Xóa thất bại: " + (result.error || "Lỗi không xác định"),
      "error",
    );
  }
}

// ============================================
// HÀM HỖ TRỢ XÓA ẢNH CŨ
// ============================================
async function deleteOldImage(imageUrl) {
  if (!imageUrl) return;
  try {
    await fetch("/api/delete-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });
  } catch (error) {
    console.error("Xóa ảnh cũ thất bại:", error);
  }
}

// ============================================
// TAB KHÁC (Documents, News) - GIỮ NGUYÊN
// ============================================
async function renderDocumentManager(container) {
  const data = await fetch("/api/data/documents").then((r) => r.json());
  const docs = data.items || [];
  container.innerHTML = `
        <h3>📄 Quản lý Tài liệu</h3>
        <p style="color:#999;font-size:14px;">Tổng: ${docs.length} tài liệu</p>
        <button onclick="addDocument()" class="btn-add">+ Thêm tài liệu</button>
        <div id="documentList">
            ${docs
              .map(
                (doc) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee;">
                    <div><i class="fas fa-file-pdf"></i> <strong>${doc.name}</strong></div>
                    <div>
                        <button onclick="editDocument('${doc.id}')" class="btn-edit">✏️</button>
                        <button onclick="deleteDocument('${doc.id}')" class="btn-delete">🗑️</button>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
}

async function renderNewsManager(container) {
  const data = await fetch("/api/data/news").then((r) => r.json());
  const news = data.items || [];
  container.innerHTML = `
        <h3>📰 Quản lý Tin tức</h3>
        <p style="color:#999;font-size:14px;">Tổng: ${news.length} tin tức</p>
        <button onclick="addNews()" class="btn-add">+ Thêm tin tức</button>
        <div id="newsList">
            ${news
              .map(
                (item) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee;">
                    <div><strong>${item.title}</strong> <small style="color:#999;">${item.created_at || ""}</small></div>
                    <div>
                        <button onclick="editNews('${item.id}')" class="btn-edit">✏️</button>
                        <button onclick="deleteNews('${item.id}')" class="btn-delete">🗑️</button>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
}

// ============================================
// CÁC HÀM CHO TÀI LIỆU VÀ TIN TỨC (DÙNG MODAL)
// ============================================
async function addDocument() {
  const name = await Modal.prompt("Nhập tên tài liệu:", "", "📄 Thêm tài liệu");
  if (name === null) return;
  if (!name.trim()) {
    await Modal.show("Vui lòng nhập tên!", "warning");
    return addDocument();
  }

  const file = await Modal.prompt(
    "Nhập đường dẫn file (VD: /uploads/doc.pdf):",
    "",
    "🔗 Đường dẫn file",
  );
  if (file === null) return;

  const response = await fetch("/api/data/documents/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name.trim(),
      file: file.trim(),
      category: "Tài liệu học tập",
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Thêm tài liệu thành công!", "success");
    loadTabContent("documents");
  } else {
    await Modal.show("❌ Thêm thất bại!", "error");
  }
}

async function deleteDocument(id) {
  const confirmed = await Modal.confirm(
    "Bạn có chắc muốn xóa tài liệu này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;
  const response = await fetch(`/api/data/documents/${id}`, {
    method: "DELETE",
  });
  if (response.ok) {
    await Modal.show("✅ Xóa thành công!", "success");
    loadTabContent("documents");
  } else {
    await Modal.show("❌ Xóa thất bại!", "error");
  }
}

async function addNews() {
  const title = await Modal.prompt(
    "Nhập tiêu đề tin tức:",
    "",
    "📰 Thêm tin tức",
  );
  if (title === null) return;
  if (!title.trim()) {
    await Modal.show("Vui lòng nhập tiêu đề!", "warning");
    return addNews();
  }

  const content = await Modal.prompt(
    "Nhập nội dung:",
    "",
    "📝 Nội dung tin tức",
  );
  if (content === null) return;

  const response = await fetch("/api/data/news/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.trim(),
      content: content.trim() || "Nội dung tin tức...",
      status: "published",
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Thêm tin tức thành công!", "success");
    loadTabContent("news");
  } else {
    await Modal.show("❌ Thêm thất bại!", "error");
  }
}

async function deleteNews(id) {
  const confirmed = await Modal.confirm(
    "Bạn có chắc muốn xóa tin tức này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;
  const response = await fetch(`/api/data/news/${id}`, { method: "DELETE" });
  if (response.ok) {
    await Modal.show("✅ Xóa thành công!", "success");
    loadTabContent("news");
  } else {
    await Modal.show("❌ Xóa thất bại!", "error");
  }
}

// ============================================
// HÀM CHUNG CHO DANH MỤC (Categories)
// ============================================
async function deleteCategory(id) {
  const confirmed = await Modal.confirm(
    "Bạn có chắc muốn xóa danh mục này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;
  const response = await fetch(`/api/data/categories/${id}`, {
    method: "DELETE",
  });
  if (response.ok) {
    await Modal.show("✅ Xóa thành công!", "success");
    loadTabContent("categories");
  } else {
    await Modal.show("❌ Xóa thất bại!", "error");
  }
}

async function editCategory(id) {
  const data = await fetch("/api/data/categories").then((r) => r.json());
  const cat = data.categories.find((c) => c.id === id);
  if (!cat) {
    await Modal.show("❌ Không tìm thấy danh mục!", "error");
    return;
  }

  const newName = await Modal.prompt(
    "✏️ Tên danh mục mới:",
    cat.name,
    "Sửa danh mục",
  );
  if (newName === null) return;

  const response = await fetch(`/api/data/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: newName.trim(),
      icon: cat.icon || "fa-tag",
      description: cat.description || "",
      slug: newName.trim().toLowerCase().replace(/ /g, "-"),
      active: cat.active,
      image: cat.image || "",
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Cập nhật danh mục thành công!", "success");
    loadTabContent("categories");
  } else {
    await Modal.show("❌ Cập nhật thất bại!", "error");
  }
}

async function addCategory() {
  const result = await Modal.form(
    [
      {
        name: "name",
        label: "📝 Tên danh mục *",
        type: "text",
        placeholder: "VD: HSK 3.0",
        required: true,
      },
      {
        name: "icon",
        label: "🎨 Icon FontAwesome",
        type: "text",
        placeholder: "VD: fa-star",
        value: "fa-tag",
      },
      {
        name: "description",
        label: "📄 Mô tả",
        type: "textarea",
        placeholder: "Mô tả danh mục...",
        rows: 60,
      },
      { name: "image", label: "🖼️ Ảnh đại diện (tùy chọn)", type: "file" },
      { name: "active", label: "✅ Hoạt động", type: "checkbox", value: true },
    ],
    "🏷️ Thêm Danh Mục Mới",
    "Thêm danh mục",
  );

  if (!result) return;
  if (!result.name.trim()) {
    await Modal.show("Vui lòng nhập tên danh mục!", "warning");
    return addCategory();
  }

  let imageUrl = "";
  if (result.image) {
    const formData = new FormData();
    formData.append("file", result.image);
    const uploadRes = await fetch("/api/upload/course-image", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) imageUrl = uploadResult.image_url;
  }

  const response = await fetch("/api/data/categories/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: result.name.trim(),
      icon: result.icon.trim() || "fa-tag",
      description: result.description?.trim() || "",
      slug: result.name.trim().toLowerCase().replace(/ /g, "-"),
      active: result.active !== false,
      image: imageUrl,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Thêm danh mục thành công!", "success");
    loadTabContent("categories");
  } else {
    await Modal.show("❌ Thêm thất bại!", "error");
  }
}

// ============================================
// HÀM CHUNG CHO TÀI LIỆU & TIN TỨC (edit)
// ============================================
async function editDocument(id) {
  await Modal.show("Tính năng đang phát triển", "info");
}

async function editNews(id) {
  await Modal.show("Tính năng đang phát triển", "info");
}

// ============================================
// THÊM CSS CHO BUTTON
// ============================================
const btnStyles = document.createElement("style");
btnStyles.textContent = `
    .btn-add {
        margin:10px 0;
        padding:8px 20px;
        background:linear-gradient(135deg,#e67e22,#d35400);
        color:white;
        border:none;
        border-radius:40px;
        cursor:pointer;
        font-weight:600;
        transition:all 0.3s;
    }
    .btn-add:hover {
        transform:translateY(-2px);
        box-shadow:0 6px 20px rgba(230,126,34,0.3);
    }
    .btn-edit {
        margin:0 5px;
        border:none;
        cursor:pointer;
        color:#4CAF50;
        padding:4px 10px;
        background:#e8f5e9;
        border-radius:4px;
        font-size:13px;
        transition:all 0.3s;
    }
    .btn-edit:hover {
        background:#4CAF50;
        color:white;
    }
    .btn-delete {
        margin:0 5px;
        border:none;
        cursor:pointer;
        color:#f44336;
        padding:4px 10px;
        background:#ffebee;
        border-radius:4px;
        font-size:13px;
        transition:all 0.3s;
    }
    .btn-delete:hover {
        background:#f44336;
        color:white;
    }
`;
document.head.appendChild(btnStyles);

// ============================================
// QUẢN LÝ ĐÁNH GIÁ (REVIEWS)
// ============================================
async function renderReviewManager(container) {
  try {
    const response = await fetch("/api/data/reviews");
    const data = await response.json();
    const reviews = data.items || [];

    container.innerHTML = `
            <h3>⭐ Quản lý Đánh giá Học viên</h3>
            <p style="color:#999;font-size:14px;">Tổng: ${reviews.length} đánh giá</p>
            <button onclick="showAddReviewForm()" class="btn-add">+ Thêm đánh giá</button>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:15px;margin-top:15px;">
                ${
                  reviews.length === 0
                    ? "<p>Chưa có đánh giá nào</p>"
                    : reviews
                        .map((review, index) => {
                          const stars = renderStarsForAdmin(review.rating || 5);
                          return `
                        <div style="background:white;border-radius:12px;padding:16px;border:1px solid #eee;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                                <div style="width:45px;height:45px;border-radius:50%;overflow:hidden;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid #e67e22;flex-shrink:0;">
                                    ${review.avatar ? `<img src="${review.avatar}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-user" style="color:#999;font-size:18px;"></i>'}
                                </div>
                                <div style="flex:1;">
                                    <strong style="font-size:14px;">${review.name || "Học viên"}</strong>
                                    <div style="font-size:12px;color:#999;">${review.course || "Khóa học"}</div>
                                </div>
                                <span style="font-size:12px;${review.active ? "color:#4CAF50;" : "color:#999;"}">${review.active ? "✅" : "⛔"}</span>
                            </div>
                            <div style="margin-bottom:8px;">${stars}</div>
                            <div style="font-size:13px;color:#555;line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${review.content || "Không có nội dung"}</div>
                            <div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0;">
                                <button onclick="editReview('${review.id}')" class="btn-edit" style="flex:1;">✏️ Sửa</button>
                                <button onclick="deleteReview('${review.id}')" class="btn-delete" style="flex:1;">🗑️ Xóa</button>
                            </div>
                        </div>
                    `;
                        })
                        .join("")
                }
            </div>
        `;
  } catch (error) {
    container.innerHTML = `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
  }
}

function renderStarsForAdmin(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<i class="fas fa-star" style="color:${i <= rating ? "#f39c12" : "#ddd"};font-size:13px;"></i>`;
  }
  return html;
}

// ===== THÊM ĐÁNH GIÁ =====
async function showAddReviewForm() {
  const result = await Modal.form(
    [
      {
        name: "name",
        label: "👤 Tên học viên *",
        type: "text",
        placeholder: "VD: Nguyễn Văn A",
        required: true,
      },
      {
        name: "content",
        label: "💬 Nội dung đánh giá *",
        type: "textarea",
        placeholder: "Nhận xét về khóa học...",
        rows: 80,
        required: true,
      },
      {
        name: "course",
        label: "📚 Khóa học",
        type: "text",
        placeholder: "VD: HSK 1 - Cơ bản",
      },
      {
        name: "rating",
        label: "⭐ Số sao (1-5)",
        type: "text",
        placeholder: "VD: 5",
        value: "5",
      },
      { name: "avatar", label: "🖼️ Ảnh đại diện (tùy chọn)", type: "file" },
      { name: "active", label: "✅ Hiển thị", type: "checkbox", value: true },
    ],
    "⭐ Thêm Đánh Giá Mới",
    "Thêm đánh giá",
  );

  if (!result) return;
  if (!result.name.trim() || !result.content.trim()) {
    await Modal.show("Vui lòng nhập tên và nội dung!", "warning");
    return showAddReviewForm();
  }

  let avatarUrl = "";
  if (result.avatar) {
    const formData = new FormData();
    formData.append("file", result.avatar);
    const uploadRes = await fetch("/api/upload/review-avatar", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) avatarUrl = uploadResult.image_url;
  }

  const response = await fetch("/api/data/reviews/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: result.name.trim(),
      content: result.content.trim(),
      course: result.course?.trim() || "Khóa học",
      rating: parseInt(result.rating) || 5,
      avatar: avatarUrl,
      active: result.active !== false,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Thêm đánh giá thành công!", "success");
    loadTabContent("reviews");
  } else {
    await Modal.show("❌ Thêm thất bại!", "error");
  }
}

// ===== XÓA ĐÁNH GIÁ =====
async function deleteReview(id) {
  const confirmed = await Modal.confirm(
    "Bạn có chắc muốn xóa đánh giá này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;
  const response = await fetch(`/api/data/reviews/${id}`, { method: "DELETE" });
  if (response.ok) {
    await Modal.show("✅ Xóa thành công!", "success");
    loadTabContent("reviews");
  } else {
    await Modal.show("❌ Xóa thất bại!", "error");
  }
}

// ===== SỬA ĐÁNH GIÁ =====
async function editReview(id) {
  const data = await fetch("/api/data/reviews").then((r) => r.json());
  const review = data.items.find((r) => r.id === id);
  if (!review) {
    await Modal.show("❌ Không tìm thấy đánh giá!", "error");
    return;
  }

  const result = await Modal.form(
    [
      {
        name: "name",
        label: "👤 Tên học viên *",
        type: "text",
        value: review.name || "",
        required: true,
      },
      {
        name: "content",
        label: "💬 Nội dung đánh giá *",
        type: "textarea",
        value: review.content || "",
        rows: 80,
        required: true,
      },
      {
        name: "course",
        label: "📚 Khóa học",
        type: "text",
        value: review.course || "",
      },
      {
        name: "rating",
        label: "⭐ Số sao (1-5)",
        type: "text",
        value: review.rating || "5",
      },
      {
        name: "avatar",
        label: "🖼️ Đổi ảnh (để trống giữ ảnh cũ)",
        type: "file",
      },
      {
        name: "active",
        label: "✅ Hiển thị",
        type: "checkbox",
        value: review.active !== false,
      },
    ],
    "✏️ Sửa Đánh Giá",
    "Cập nhật",
  );

  if (!result) return;

  let avatarUrl = review.avatar || "";
  if (result.avatar) {
    const formData = new FormData();
    formData.append("file", result.avatar);
    const uploadRes = await fetch("/api/upload/review-avatar", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) avatarUrl = uploadResult.image_url;
  }

  const response = await fetch(`/api/data/reviews/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: result.name.trim(),
      content: result.content.trim(),
      course: result.course?.trim() || "Khóa học",
      rating: parseInt(result.rating) || 5,
      avatar: avatarUrl,
      active: result.active !== false,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Cập nhật thành công!", "success");
    loadTabContent("reviews");
  } else {
    await Modal.show("❌ Cập nhật thất bại!", "error");
  }
}

// ============================================
// LOAD TAB ĐẦU TIÊN
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  loadTabContent("nav");
});
