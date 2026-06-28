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
    case "schedules":
      renderScheduleManager(container);
      break;
    case "teachers":
      renderTeacherManager(container);
      break;
    case "all":
      renderAllDataManager(container);
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
                <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:1px solid #eee;" data-slide-id="${slide.id}">
                    <div style="width:100%;height:120px;background:#eee;overflow:hidden;">
                        <img src="${slide.image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22120%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    </div>
                    <div style="padding:12px;">
                        <strong style="font-size:14px;">${slide.title || "Slide " + (index + 1)}</strong>
                        <div style="font-size:11px;color:#999;margin:2px 0;">ID: ${slide.id}</div>
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

  // 👈 SỬA: Đảm bảo gửi đúng dữ liệu
  const slideData = {
    title: result.title.trim(),
    image: uploadResult.image_url,
    description: result.description?.trim() || "",
    link: result.link?.trim() || "#",
    active: result.active !== false,
    order: 999,
    name: result.title.trim(), // 👈 THÊM: name để tạo ID
  };

  const response = await fetch("/api/data/slides/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slideData),
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

  try {
    // Lấy thông tin slide để xóa ảnh
    const data = await fetch("/api/data/slides").then((r) => r.json());
    const slide = data.items.find((s) => s.id === id);
    if (slide && slide.image) {
      await deleteOldImage(slide.image);
    }

    const response = await fetch(`/api/data/slides/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();

    if (response.ok && result.success) {
      await Modal.show("✅ Xóa thành công!", "success");
      loadTabContent("slides");
    } else {
      await Modal.show(
        "❌ Xóa thất bại: " + (result.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    console.error("❌ Lỗi:", error);
    await Modal.show("❌ Lỗi kết nối!", "error");
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
    // 👇 XÓA ẢNH CŨ TRƯỚC KHI UPLOAD MỚI
    if (slide.image) {
      await deleteOldImage(slide.image);
    }
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

  // Lấy thông tin danh mục để xóa ảnh
  const data = await fetch("/api/data/categories").then((r) => r.json());
  const cat = data.categories.find((c) => c.id === id);
  if (cat && cat.image) {
    await deleteOldImage(cat.image);
  }

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

// ============================================
// QUẢN LÝ DANH MỤC - ĐẦY ĐỦ MODAL
// ============================================

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
      {
        name: "image",
        label: "🖼️ Ảnh đại diện (tùy chọn)",
        type: "file",
        accept: "image/*",
      },
      {
        name: "active",
        label: "✅ Hoạt động",
        type: "checkbox",
        value: true,
      },
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
    const uploadRes = await fetch("/api/upload/category-image", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) {
      imageUrl = uploadResult.image_url;
    } else {
      await Modal.show("❌ Upload ảnh thất bại!", "error");
      return;
    }
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
    const error = await response.json();
    await Modal.show(
      "❌ Thêm thất bại: " + (error.error || "Lỗi không xác định"),
      "error",
    );
  }
}

async function editCategory(id) {
  const data = await fetch("/api/data/categories").then((r) => r.json());
  const cat = data.categories.find((c) => c.id === id);
  if (!cat) {
    await Modal.show("❌ Không tìm thấy danh mục!", "error");
    return;
  }

  // Hiển thị modal form với các trường đầy đủ, có preview ảnh cũ
  const result = await Modal.form(
    [
      {
        name: "name",
        label: "📝 Tên danh mục *",
        type: "text",
        value: cat.name || "",
        required: true,
        placeholder: "VD: HSK 3.0",
      },
      {
        name: "icon",
        label: "🎨 Icon FontAwesome",
        type: "text",
        value: cat.icon || "fa-tag",
        placeholder: "VD: fa-star",
      },
      {
        name: "description",
        label: "📄 Mô tả",
        type: "textarea",
        value: cat.description || "",
        placeholder: "Mô tả danh mục...",
        rows: 60,
      },
      {
        name: "image",
        label: `🖼️ Ảnh đại diện ${cat.image ? "(hiện tại: " + cat.image.split("/").pop() + ")" : ""}`,
        type: "file",
        accept: "image/*",
        help: cat.image
          ? "Chọn ảnh mới để thay thế, bỏ trống để giữ ảnh cũ"
          : "",
      },
      {
        name: "active",
        label: "✅ Hoạt động",
        type: "checkbox",
        value: cat.active !== false,
      },
    ],
    "✏️ Sửa Danh Mục",
    "Cập nhật",
  );

  if (!result) return;

  // Validate
  if (!result.name.trim()) {
    await Modal.show("Vui lòng nhập tên danh mục!", "warning");
    return editCategory(id);
  }

  let imageUrl = cat.image || "";
  if (result.image) {
    const formData = new FormData();
    formData.append("file", result.image);
    const uploadRes = await fetch("/api/upload/category-image", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) {
      // 👇 XÓA ẢNH CŨ TRƯỚC KHI GÁN ẢNH MỚI
      if (cat.image) {
        await deleteOldImage(cat.image);
      }
      imageUrl = uploadResult.image_url;
    } else {
      await Modal.show("❌ Upload ảnh thất bại!", "error");
      return;
    }
  }

  const response = await fetch(`/api/data/categories/${id}`, {
    method: "PUT",
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
    await Modal.show("✅ Cập nhật danh mục thành công!", "success");
    loadTabContent("categories");
  } else {
    const err = await response.json();
    await Modal.show(
      "❌ Cập nhật thất bại: " + (err.error || "Lỗi không xác định"),
      "error",
    );
  }
}

// Đảm bảo các hàm có thể gọi từ global
window.addCategory = addCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory; // vẫn giữ nguyên

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

  // Lấy thông tin review để xóa avatar
  const data = await fetch("/api/data/reviews").then((r) => r.json());
  const review = data.items.find((r) => r.id === id);
  if (review && review.avatar) {
    await deleteOldImage(review.avatar);
  }

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
    // 👇 XÓA ẢNH CŨ TRƯỚC KHI UPLOAD MỚI
    if (review.avatar) {
      await deleteOldImage(review.avatar);
    }
    const formData = new FormData();
    formData.append("file", result.avatar);
    const uploadRes = await fetch("/api/upload/review-avatar", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) {
      avatarUrl = uploadResult.image_url;
    }
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
// QUẢN LÝ LỊCH KHAI GIẢNG (SCHEDULES)
// ============================================
async function renderScheduleManager(container) {
  try {
    const response = await fetch("/api/data/schedules");
    const data = await response.json();
    const schedules = data.items || [];

    container.innerHTML = `
            <h3>📅 Quản lý Lịch Khai Giảng</h3>
            <p style="color:#999;font-size:14px;">Tổng: ${schedules.length} lịch</p>
            <button onclick="showAddScheduleForm()" class="btn-add">+ Thêm lịch</button>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:15px;margin-top:15px;">
                ${
                  schedules.length === 0
                    ? "<p>Chưa có lịch nào</p>"
                    : schedules
                        .map(
                          (s) => `
                    <div style="background:white;border-radius:12px;padding:16px;border:1px solid #eee;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong>${s.course_name}</strong>
                            <span style="font-size:12px;${s.status === "open" ? "color:#4CAF50" : s.status === "full" ? "color:#ff9800" : "color:#999"}">${s.status || "open"}</span>
                        </div>
                        <div style="font-size:13px;color:#666;margin:4px 0;">${s.category} • ${s.schedule_time}</div>
                        <div style="font-size:13px;color:#e67e22;font-weight:700;">${s.tuition}</div>
                        <div style="display:flex;gap:8px;margin-top:10px;">
                            <button onclick="editSchedule('${s.id}')" class="btn-edit" style="flex:1;">✏️</button>
                            <button onclick="deleteSchedule('${s.id}')" class="btn-delete" style="flex:1;">🗑️</button>
                        </div>
                    </div>
                `,
                        )
                        .join("")
                }
            </div>
        `;
  } catch (error) {
    container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
  }
}

// ===== THÊM LỊCH KHAI GIẢNG =====
async function showAddScheduleForm() {
  // Lấy danh sách khóa học để chọn
  let courseOptions = [{ value: "", label: "-- Không liên kết khóa học --" }];

  try {
    const coursesRes = await fetch("/api/schedules/courses");
    const courses = await coursesRes.json();
    courses.forEach((course) => {
      courseOptions.push({
        value: course.id,
        label: `${course.name} (${course.category || "Chưa phân loại"})`,
      });
    });
  } catch (error) {
    console.error("Lỗi tải khóa học:", error);
  }

  const result = await Modal.form(
    [
      {
        name: "course_id",
        label: "📚 Liên kết khóa học (tùy chọn)",
        type: "select",
        options: courseOptions,
        value: "",
        help: "Chọn khóa học để liên kết, nếu có sẽ hiển thị nút 'Tìm hiểu thêm'",
      },
      {
        name: "course_name",
        label: "📚 Tên khóa học *",
        type: "text",
        placeholder: "VD: HSK 1 - Cơ bản",
        required: true,
      },
      {
        name: "category",
        label: "📁 Danh mục",
        type: "text",
        placeholder: "VD: HSK",
        value: "HSK",
      },
      {
        name: "start_date",
        label: "📅 Ngày bắt đầu",
        type: "text",
        placeholder: "VD: 2025-01-15",
      },
      {
        name: "end_date",
        label: "📅 Ngày kết thúc",
        type: "text",
        placeholder: "VD: 2025-03-15",
      },
      {
        name: "schedule_time",
        label: "⏰ Lịch học",
        type: "text",
        placeholder: "VD: Tối T2-T4-T6 (18:30-20:30)",
      },
      {
        name: "tuition",
        label: "💰 Học phí",
        type: "text",
        placeholder: "VD: 2,500,000 VNĐ",
        value: "Liên hệ",
      },
      {
        name: "remaining_slots",
        label: "🪑 Số chỗ còn",
        type: "text",
        placeholder: "VD: 5",
        value: "5",
      },
      {
        name: "total_slots",
        label: "🪑 Tổng số chỗ",
        type: "text",
        placeholder: "VD: 10",
        value: "10",
      },
      {
        name: "status",
        label: "📌 Trạng thái",
        type: "select",
        options: [
          { value: "open", label: "🟢 Còn chỗ" },
          { value: "full", label: "🔴 Đã kín" },
          { value: "upcoming", label: "🟡 Sắp khai giảng" },
          { value: "closed", label: "⚫ Đã đóng" },
        ],
        value: "open",
      },
      {
        name: "teacher",
        label: "👨‍🏫 Giáo viên",
        type: "text",
        placeholder: "VD: Cô Nguyễn Thị Lan",
      },
      {
        name: "location",
        label: "📍 Địa điểm",
        type: "text",
        placeholder: "VD: Online / Offline",
        value: "Online / Offline",
      },
      { name: "active", label: "✅ Hiển thị", type: "checkbox", value: true },
    ],
    "📅 Thêm Lịch Khai Giảng Mới",
    "Thêm lịch",
  );

  if (!result) return;
  if (!result.course_name.trim()) {
    await Modal.show("Vui lòng nhập tên khóa học!", "warning");
    return showAddScheduleForm();
  }

  // Nếu chọn course_id, lấy tên khóa học từ course_id
  let courseName = result.course_name.trim();
  if (result.course_id) {
    try {
      const coursesRes = await fetch("/api/schedules/courses");
      const courses = await coursesRes.json();
      const selected = courses.find((c) => c.id === result.course_id);
      if (selected) {
        courseName = selected.name;
      }
    } catch (error) {
      console.error("Lỗi lấy tên khóa học:", error);
    }
  }

  const response = await fetch("/api/data/schedules/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      course_id: result.course_id || null,
      course_name: courseName,
      category: result.category?.trim() || "HSK",
      start_date: result.start_date?.trim() || "",
      end_date: result.end_date?.trim() || "",
      schedule_time: result.schedule_time?.trim() || "Linh hoạt",
      tuition: result.tuition?.trim() || "Liên hệ",
      remaining_slots: parseInt(result.remaining_slots) || 0,
      total_slots: parseInt(result.total_slots) || 10,
      status: result.status || "open",
      teacher: result.teacher?.trim() || "",
      location: result.location?.trim() || "Online / Offline",
      active: result.active !== false,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Thêm lịch khai giảng thành công!", "success");
    loadTabContent("schedules");
  } else {
    const error = await response.json();
    await Modal.show(
      "❌ Thêm thất bại: " + (error.error || "Lỗi không xác định"),
      "error",
    );
  }
}

// ===== SỬA LỊCH KHAI GIẢNG =====
async function editSchedule(id) {
  const data = await fetch("/api/data/schedules").then((r) => r.json());
  const schedule = data.items.find((s) => s.id === id);
  if (!schedule) {
    await Modal.show("❌ Không tìm thấy lịch!", "error");
    return;
  }

  // Lấy danh sách khóa học để chọn
  let courseOptions = [{ value: "", label: "-- Không liên kết khóa học --" }];

  try {
    const coursesRes = await fetch("/api/schedules/courses");
    const courses = await coursesRes.json();
    courses.forEach((course) => {
      courseOptions.push({
        value: course.id,
        label: `${course.name} (${course.category || "Chưa phân loại"})`,
      });
    });
  } catch (error) {
    console.error("Lỗi tải khóa học:", error);
  }

  const result = await Modal.form(
    [
      {
        name: "course_id",
        label: "📚 Liên kết khóa học (tùy chọn)",
        type: "select",
        options: courseOptions,
        value: schedule.course_id || "",
        help: "Chọn khóa học để liên kết, nếu có sẽ hiển thị nút 'Tìm hiểu thêm'",
      },
      {
        name: "course_name",
        label: "📚 Tên khóa học *",
        type: "text",
        value: schedule.course_name || "",
        required: true,
      },
      {
        name: "category",
        label: "📁 Danh mục",
        type: "text",
        value: schedule.category || "HSK",
      },
      {
        name: "start_date",
        label: "📅 Ngày bắt đầu",
        type: "text",
        value: schedule.start_date || "",
      },
      {
        name: "end_date",
        label: "📅 Ngày kết thúc",
        type: "text",
        value: schedule.end_date || "",
      },
      {
        name: "schedule_time",
        label: "⏰ Lịch học",
        type: "text",
        value: schedule.schedule_time || "Linh hoạt",
      },
      {
        name: "tuition",
        label: "💰 Học phí",
        type: "text",
        value: schedule.tuition || "Liên hệ",
      },
      {
        name: "remaining_slots",
        label: "🪑 Số chỗ còn",
        type: "text",
        value: schedule.remaining_slots || "0",
      },
      {
        name: "total_slots",
        label: "🪑 Tổng số chỗ",
        type: "text",
        value: schedule.total_slots || "10",
      },
      {
        name: "status",
        label: "📌 Trạng thái",
        type: "select",
        options: [
          { value: "open", label: "🟢 Còn chỗ" },
          { value: "full", label: "🔴 Đã kín" },
          { value: "upcoming", label: "🟡 Sắp khai giảng" },
          { value: "closed", label: "⚫ Đã đóng" },
        ],
        value: schedule.status || "open",
      },
      {
        name: "teacher",
        label: "👨‍🏫 Giáo viên",
        type: "text",
        value: schedule.teacher || "",
      },
      {
        name: "location",
        label: "📍 Địa điểm",
        type: "text",
        value: schedule.location || "Online / Offline",
      },
      {
        name: "active",
        label: "✅ Hiển thị",
        type: "checkbox",
        value: schedule.active !== false,
      },
    ],
    "✏️ Sửa Lịch Khai Giảng",
    "Cập nhật",
  );

  if (!result) return;

  // Nếu chọn course_id, lấy tên khóa học từ course_id
  let courseName = result.course_name.trim();
  if (result.course_id) {
    try {
      const coursesRes = await fetch("/api/schedules/courses");
      const courses = await coursesRes.json();
      const selected = courses.find((c) => c.id === result.course_id);
      if (selected) {
        courseName = selected.name;
      }
    } catch (error) {
      console.error("Lỗi lấy tên khóa học:", error);
    }
  }

  const response = await fetch(`/api/data/schedules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      course_id: result.course_id || null,
      course_name: courseName,
      category: result.category?.trim() || "HSK",
      start_date: result.start_date?.trim() || "",
      end_date: result.end_date?.trim() || "",
      schedule_time: result.schedule_time?.trim() || "Linh hoạt",
      tuition: result.tuition?.trim() || "Liên hệ",
      remaining_slots: parseInt(result.remaining_slots) || 0,
      total_slots: parseInt(result.total_slots) || 10,
      status: result.status || "open",
      teacher: result.teacher?.trim() || "",
      location: result.location?.trim() || "Online / Offline",
      active: result.active !== false,
    }),
  });

  if (response.ok) {
    await Modal.show("✅ Cập nhật thành công!", "success");
    loadTabContent("schedules");
  } else {
    await Modal.show("❌ Cập nhật thất bại!", "error");
  }
}

// ===== XÓA LỊCH KHAI GIẢNG =====
async function deleteSchedule(id) {
  const confirmed = await Modal.confirm(
    "Bạn có chắc muốn xóa lịch này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;
  const response = await fetch(`/api/data/schedules/${id}`, {
    method: "DELETE",
  });
  if (response.ok) {
    await Modal.show("✅ Xóa thành công!", "success");
    loadTabContent("schedules");
  } else {
    await Modal.show("❌ Xóa thất bại!", "error");
  }
}

// ============================================
// QUẢN LÝ KHÓA HỌC (COURSES) - DÙNG JSON
// ============================================

async function renderCourseManager(container) {
  try {
    const [coursesRes, categoriesRes] = await Promise.all([
      fetch("/api/data/courses"),
      fetch("/api/data/categories"),
    ]);

    let coursesData = await coursesRes.json();
    const categoriesData = await categoriesRes.json();

    // 👈 SỬA: Lấy đúng dữ liệu từ JSON
    let courses = [];
    if (Array.isArray(coursesData)) {
      courses = coursesData;
    } else if (coursesData.items && Array.isArray(coursesData.items)) {
      courses = coursesData.items;
    }

    const categories = categoriesData.categories || [];
    const catMap = {};
    categories.forEach((c) => (catMap[c.id] = c.name));

    container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:15px;">
                <div>
                    <h3 style="margin:0;">📚 Quản lý Khóa học</h3>
                    <p style="color:#999;font-size:14px;margin:4px 0;">Tổng: ${courses.length} khóa học</p>
                </div>
                <a href="/admin/courses" class="btn-add" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;text-decoration:none;"><i class="fas fa-plus-circle"></i> Thêm khóa học</a>
                </button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px;margin-top:15px;">
                ${
                  courses.length === 0
                    ? `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#999;">
                            <div style="font-size:48px;margin-bottom:16px;">📭</div>
                            <h3 style="color:#555;">Chưa có khóa học</h3>
                            <p>Nhấn "Thêm khóa học" để bắt đầu</p>
                           </div>`
                    : courses
                        .map((course) => {
                          const imgSrc =
                            course.image ||
                            course.image_url ||
                            "/static/img/courses/default.jpg";
                          const catName =
                            catMap[course.category] ||
                            course.category_name ||
                            "Chưa phân loại";
                          return `
                            <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid #eee;transition:all 0.3s;"
                                 onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 25px rgba(230,126,34,0.12)';this.style.borderColor='#e67e22'"
                                 onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';this.style.borderColor='#eee'">
                                <div style="height:150px;overflow:hidden;background:#f0f0f0;">
                                    <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/static/img/courses/default.jpg'">
                                </div>
                                <div style="padding:14px 16px;">
                                    <strong style="font-size:15px;display:block;">${course.name || "Không tên"}</strong>
                                    <span style="background:#f0f0f0;padding:2px 10px;border-radius:10px;font-size:11px;display:inline-block;margin:4px 0;">${catName}</span>
                                    <span style="font-size:12px;color:#999;display:block;">${course.level || "Cơ bản"}</span>
                                    <p style="color:#e67e22;font-weight:bold;font-size:15px;margin:4px 0;">${course.price || "Liên hệ"}</p>
                                    <div style="display:flex;gap:5px;margin-top:8px;">
                                        <button onclick="editCourse('${course.id}')" class="btn-edit" style="flex:1;padding:4px 12px;font-size:12px;">✏️ Sửa</button>
                                        <button onclick="deleteCourse('${course.id}')" class="btn-delete" style="flex:1;padding:4px 12px;font-size:12px;">🗑️ Xóa</button>
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

// ===== THÊM KHÓA HỌC =====
async function showAddCourseForm() {
  const catsRes = await fetch("/api/data/categories");
  const catsData = await catsRes.json();
  const categories = catsData.categories || [];
  const options = categories.map((c) => ({ value: c.id, label: c.name }));
  options.unshift({ value: "", label: "-- Chọn danh mục --" });

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
        placeholder: "VD: Cơ bản",
        value: "Cơ bản",
      },
      {
        name: "category",
        label: "📁 Danh mục *",
        type: "select",
        options: options,
        required: true,
      },
      {
        name: "image",
        label: "🖼️ Ảnh khóa học (tùy chọn)",
        type: "file",
        accept: "image/*",
      },
      {
        name: "price",
        label: "💰 Học phí",
        type: "text",
        placeholder: "VD: 2,500,000 VNĐ",
        value: "Liên hệ",
      },
      {
        name: "price_original",
        label: "💰 Giá gốc (khuyến mãi)",
        type: "text",
        placeholder: "VD: 3,500,000 VNĐ",
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
        name: "subtitle",
        label: "📝 Phụ đề",
        type: "text",
        placeholder: "VD: Khóa học nền tảng cho người mới",
      },
      {
        name: "description",
        label: "📄 Mô tả ngắn *",
        type: "textarea",
        placeholder: "Mô tả ngắn về khóa học...",
        rows: 60,
        required: true,
      },
      {
        name: "detailed_description",
        label: "📖 Mô tả chi tiết",
        type: "textarea",
        placeholder: "Mô tả chi tiết nội dung khóa học...",
        rows: 100,
      },
      {
        name: "benefits",
        label: "🎯 Lợi ích (mỗi dòng 1 lợi ích)",
        type: "textarea",
        placeholder: "Phát âm chuẩn\nTự tin giao tiếp\nĐạt chứng chỉ",
        rows: 80,
      },
      {
        name: "learning_outcomes",
        label: "📋 Kết quả đầu ra (mỗi dòng 1 kết quả)",
        type: "textarea",
        placeholder: "150 từ vựng\n50 chữ Hán",
        rows: 80,
      },
      {
        name: "video_intro",
        label: "🎬 Video giới thiệu (URL)",
        type: "url",
        placeholder: "https://www.youtube.com/embed/xxxxx",
      },
      {
        name: "active",
        label: "✅ Hiển thị",
        type: "checkbox",
        value: true,
      },
    ],
    "📚 Thêm Khóa Học Mới",
    "Thêm khóa học",
  );

  if (!result) return;

  if (!result.name.trim()) {
    await Modal.show("❌ Vui lòng nhập tên khóa học!", "warning");
    return showAddCourseForm();
  }
  if (!result.category) {
    await Modal.show("❌ Vui lòng chọn danh mục!", "warning");
    return showAddCourseForm();
  }
  if (!result.description.trim()) {
    await Modal.show("❌ Vui lòng nhập mô tả!", "warning");
    return showAddCourseForm();
  }

  // Upload ảnh
  let imageUrl = "";
  if (result.image) {
    const formData = new FormData();
    formData.append("file", result.image);
    const uploadRes = await fetch("/api/upload/course-image", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) {
      imageUrl = uploadResult.image_url;
    }
  }

  const courseData = {
    name: result.name.trim(),
    level: result.level?.trim() || "Cơ bản",
    category: result.category,
    image_url: imageUrl,
    image: imageUrl,
    price: result.price?.trim() || "Liên hệ",
    price_original: result.price_original?.trim() || "",
    duration: result.duration?.trim() || "Theo lộ trình",
    schedule: result.schedule?.trim() || "Linh hoạt",
    subtitle: result.subtitle?.trim() || "",
    description: result.description.trim(),
    detailed_description: result.detailed_description?.trim() || "",
    benefits: result.benefits?.trim() || "",
    learning_outcomes: result.learning_outcomes?.trim() || "",
    video_intro: result.video_intro?.trim() || "",
    active: result.active !== false,
  };

  try {
    const response = await fetch("/api/data/courses/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseData),
    });

    const responseData = await response.json();

    if (responseData.success) {
      await Modal.show("✅ Thêm khóa học thành công!", "success");
      loadTabContent("courses");
    } else {
      await Modal.show(
        "❌ Thêm thất bại: " + (responseData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== SỬA KHÓA HỌC =====
async function editCourse(courseId) {
  try {
    const coursesRes = await fetch("/api/data/courses");
    let coursesData = await coursesRes.json();
    let courses = Array.isArray(coursesData)
      ? coursesData
      : coursesData.items || [];
    const course = courses.find((c) => c.id === courseId);

    if (!course) {
      await Modal.show("❌ Không tìm thấy khóa học!", "error");
      return;
    }

    const catsRes = await fetch("/api/data/categories");
    const catsData = await catsRes.json();
    const categories = catsData.categories || [];
    const options = categories.map((c) => ({ value: c.id, label: c.name }));
    options.unshift({ value: "", label: "-- Chọn danh mục --" });

    const result = await Modal.form(
      [
        {
          name: "name",
          label: "📝 Tên khóa học *",
          type: "text",
          value: course.name || "",
          required: true,
        },
        {
          name: "level",
          label: "📊 Cấp độ",
          type: "text",
          value: course.level || "Cơ bản",
        },
        {
          name: "category",
          label: "📁 Danh mục *",
          type: "select",
          options: options,
          value: course.category || "",
          required: true,
        },
        {
          name: "image",
          label: "🖼️ Đổi ảnh (để trống giữ ảnh cũ)",
          type: "file",
          accept: "image/*",
        },
        {
          name: "price",
          label: "💰 Học phí",
          type: "text",
          value: course.price || "Liên hệ",
        },
        {
          name: "price_original",
          label: "💰 Giá gốc (khuyến mãi)",
          type: "text",
          value: course.price_original || "",
        },
        {
          name: "duration",
          label: "⏰ Thời lượng",
          type: "text",
          value: course.duration || "Theo lộ trình",
        },
        {
          name: "schedule",
          label: "📅 Lịch học",
          type: "text",
          value: course.schedule || "Linh hoạt",
        },
        {
          name: "subtitle",
          label: "📝 Phụ đề",
          type: "text",
          value: course.subtitle || "",
        },
        {
          name: "description",
          label: "📄 Mô tả ngắn *",
          type: "textarea",
          value: course.description || "",
          rows: 60,
          required: true,
        },
        {
          name: "detailed_description",
          label: "📖 Mô tả chi tiết",
          type: "textarea",
          value: course.detailed_description || "",
          rows: 100,
        },
        {
          name: "benefits",
          label: "🎯 Lợi ích (mỗi dòng 1 lợi ích)",
          type: "textarea",
          value: course.benefits || "",
          rows: 80,
        },
        {
          name: "learning_outcomes",
          label: "📋 Kết quả đầu ra (mỗi dòng 1 kết quả)",
          type: "textarea",
          value: course.learning_outcomes || "",
          rows: 80,
        },
        {
          name: "video_intro",
          label: "🎬 Video giới thiệu (URL)",
          type: "url",
          value: course.video_intro || "",
        },
        {
          name: "active",
          label: "✅ Hiển thị",
          type: "checkbox",
          value: course.active !== false,
        },
      ],
      "✏️ Sửa Khóa Học",
      "Cập nhật",
    );

    if (!result) return;

    let imageUrl = course.image || course.image_url || "";
    if (result.image) {
      const formData = new FormData();
      formData.append("file", result.image);
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
    }

    const courseData = {
      name: result.name.trim(),
      level: result.level?.trim() || "Cơ bản",
      category: result.category,
      image_url: imageUrl,
      image: imageUrl,
      price: result.price?.trim() || "Liên hệ",
      price_original: result.price_original?.trim() || "",
      duration: result.duration?.trim() || "Theo lộ trình",
      schedule: result.schedule?.trim() || "Linh hoạt",
      subtitle: result.subtitle?.trim() || "",
      description: result.description.trim(),
      detailed_description: result.detailed_description?.trim() || "",
      benefits: result.benefits?.trim() || "",
      learning_outcomes: result.learning_outcomes?.trim() || "",
      video_intro: result.video_intro?.trim() || "",
      active: result.active !== false,
    };

    const response = await fetch(`/api/data/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseData),
    });

    const responseData = await response.json();

    if (responseData.success) {
      await Modal.show("✅ Cập nhật khóa học thành công!", "success");
      loadTabContent("courses");
    } else {
      await Modal.show(
        "❌ Cập nhật thất bại: " + (responseData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== XÓA KHÓA HỌC =====
async function deleteCourse(courseId) {
  const confirmed = await Modal.confirm(
    "⚠️ Bạn có chắc muốn xóa khóa học này?\n\nHành động này không thể hoàn tác!",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;

  try {
    // Lấy thông tin khóa học để xóa ảnh
    const coursesRes = await fetch("/api/data/courses");
    let coursesData = await coursesRes.json();
    let courses = Array.isArray(coursesData)
      ? coursesData
      : coursesData.items || [];
    const course = courses.find((c) => c.id === courseId);
    if (course && (course.image || course.image_url)) {
      await deleteOldImage(course.image || course.image_url);
    }

    const response = await fetch(`/api/data/courses/${courseId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
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
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ============================================
// QUẢN LÝ TÀI LIỆU (DOCUMENTS)
// ============================================

async function renderDocumentManager(container) {
  try {
    const [docsRes, catsRes] = await Promise.all([
      fetch("/api/data/documents"),
      fetch("/api/data/categories"),
    ]);

    const docsData = await docsRes.json();
    const catsData = await catsRes.json();

    const documents = docsData.items || [];
    const categories = catsData.categories || [];

    // Tạo map category
    const catMap = {};
    categories.forEach((c) => (catMap[c.id] = c.name));

    container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:15px;">
                <div>
                    <h3 style="margin:0;">📄 Quản lý Tài liệu</h3>
                    <p style="color:#999;font-size:14px;margin:4px 0;">Tổng: ${documents.length} tài liệu</p>
                </div>
                <button onclick="showAddDocumentForm()" class="btn-add" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;">
                    <i class="fas fa-plus-circle"></i> Thêm tài liệu
                </button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:15px;margin-top:15px;">
                ${
                  documents.length === 0
                    ? `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#999;">
                            <div style="font-size:48px;margin-bottom:16px;">📭</div>
                            <h3 style="color:#555;">Chưa có tài liệu</h3>
                            <p>Nhấn "Thêm tài liệu" để bắt đầu</p>
                           </div>`
                    : documents
                        .map((doc) => {
                          const catName =
                            catMap[doc.category_id] || "Chưa phân loại";
                          const fileIcon = getFileIconForAdmin(doc.file_type);

                          return `
                            <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid #eee;transition:all 0.3s;" 
                                 onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 25px rgba(230,126,34,0.12)';this.style.borderColor='#e67e22'"
                                 onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';this.style.borderColor='#eee'">
                                <div style="padding:16px 18px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px;background:${doc.file_type === "pdf" ? "#f4433610" : "#f8f9fa"}">
                                    <span style="font-size:28px;color:#e67e22;">${fileIcon}</span>
                                    <div style="flex:1;min-width:0;">
                                        <strong style="font-size:15px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.title || "Không có tên"}</strong>
                                        <span style="font-size:12px;color:#999;">${catName} • ${doc.file_type || "Không rõ"}</span>
                                    </div>
                                    <span style="font-size:12px;${doc.active !== false ? "color:#4CAF50;" : "color:#999;"}">${doc.active !== false ? "✅" : "⛔"}</span>
                                </div>
                                <div style="padding:12px 18px;display:flex;gap:8px;flex-wrap:wrap;">
                                    <span style="font-size:12px;color:#999;display:flex;align-items:center;gap:4px;">
                                        <i class="fas fa-eye"></i> ${doc.view_count || 0}
                                    </span>
                                    <span style="font-size:12px;color:#999;display:flex;align-items:center;gap:4px;">
                                        <i class="fas fa-download"></i> ${doc.download_count || 0}
                                    </span>
                                    <span style="font-size:12px;color:#999;display:flex;align-items:center;gap:4px;">
                                        <i class="fas fa-calendar-alt"></i> ${doc.created_at ? doc.created_at.split(" ")[0] : "Chưa có"}
                                    </span>
                                    <div style="margin-left:auto;display:flex;gap:5px;">
                                        <button onclick="editDocument('${doc.id}')" class="btn-edit" style="padding:4px 12px;font-size:12px;">✏️ Sửa</button>
                                        <button onclick="deleteDocument('${doc.id}')" class="btn-delete" style="padding:4px 12px;font-size:12px;">🗑️ Xóa</button>
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

function getFileIconForAdmin(fileType) {
  const map = {
    pdf: '<i class="fas fa-file-pdf" style="color:#f44336;"></i>',
    doc: '<i class="fas fa-file-word" style="color:#2196f3;"></i>',
    docx: '<i class="fas fa-file-word" style="color:#2196f3;"></i>',
    xls: '<i class="fas fa-file-excel" style="color:#4caf50;"></i>',
    xlsx: '<i class="fas fa-file-excel" style="color:#4caf50;"></i>',
    ppt: '<i class="fas fa-file-powerpoint" style="color:#ff9800;"></i>',
    pptx: '<i class="fas fa-file-powerpoint" style="color:#ff9800;"></i>',
    video: '<i class="fas fa-file-video" style="color:#9c27b0;"></i>',
    audio: '<i class="fas fa-file-audio" style="color:#e91e63;"></i>',
    image: '<i class="fas fa-file-image" style="color:#00bcd4;"></i>',
    zip: '<i class="fas fa-file-archive" style="color:#9e9e9e;"></i>',
    other: '<i class="fas fa-file" style="color:#607d8b;"></i>',
  };
  return map[fileType] || map["other"];
}

// ===== THÊM TÀI LIỆU =====
async function showAddDocumentForm() {
  // Lấy danh mục để chọn
  const catsRes = await fetch("/api/data/categories");
  const catsData = await catsRes.json();
  const categories = catsData.categories || [];

  const options = categories.map((c) => ({ value: c.id, label: c.name }));
  options.unshift({ value: "", label: "-- Chọn danh mục --" });

  const result = await Modal.form(
    [
      {
        name: "title",
        label: "📝 Tên tài liệu *",
        type: "text",
        placeholder: "VD: Từ vựng HSK 1 đầy đủ",
        required: true,
      },
      {
        name: "category_id",
        label: "📁 Danh mục *",
        type: "select",
        options: options,
        required: true,
        value: "",
      },
      {
        name: "image",
        label: "🖼️ Ảnh đại diện (tùy chọn)",
        type: "file",
        accept: "image/*",
      },
      {
        name: "summary",
        label: "📄 Tóm tắt",
        type: "textarea",
        placeholder: "Mô tả ngắn về tài liệu...",
        rows: 60,
      },
      {
        name: "description",
        label: "📖 Mô tả chi tiết",
        type: "textarea",
        placeholder:
          "Mô tả chi tiết nội dung tài liệu...\n- Nội dung 1\n- Nội dung 2",
        rows: 100,
      },
      {
        name: "file_url",
        label: "🔗 Link Google Drive *",
        type: "url",
        placeholder: "https://drive.google.com/file/d/XXXXX/view",
        required: true,
        help: "Hệ thống sẽ tự động tạo link preview",
      },
      // 👈 XÓA TRƯỜNG preview_url
      {
        name: "file_type",
        label: "📂 Loại tài liệu",
        type: "select",
        options: [
          { value: "pdf", label: "📄 PDF" },
          { value: "doc", label: "📝 Word" },
          { value: "docx", label: "📝 Word (docx)" },
          { value: "xls", label: "📊 Excel" },
          { value: "xlsx", label: "📊 Excel (xlsx)" },
          { value: "ppt", label: "📽️ PowerPoint" },
          { value: "pptx", label: "📽️ PowerPoint (pptx)" },
          { value: "video", label: "🎬 Video" },
          { value: "audio", label: "🎵 Audio" },
          { value: "image", label: "🖼️ Ảnh" },
          { value: "zip", label: "📦 Zip" },
          { value: "other", label: "📁 Khác" },
        ],
        value: "pdf",
      },
      {
        name: "file_size",
        label: "💾 Dung lượng",
        type: "text",
        placeholder: "VD: 2.4 MB",
        value: "Chưa rõ",
      },
      {
        name: "tags",
        label: "🏷️ Tags (cách nhau bằng dấu phẩy)",
        type: "text",
        placeholder: "VD: HSK1, Từ vựng, Cơ bản",
      },
      {
        name: "is_new",
        label: "✨ Đánh dấu là tài liệu mới",
        type: "checkbox",
        value: false,
      },
      {
        name: "active",
        label: "✅ Hiển thị",
        type: "checkbox",
        value: true,
      },
    ],
    "📄 Thêm Tài Liệu Mới",
    "Thêm tài liệu",
  );

  if (!result) return;

  // Validate
  if (!result.title.trim()) {
    await Modal.show("❌ Vui lòng nhập tên tài liệu!", "warning");
    return showAddDocumentForm();
  }
  if (!result.category_id) {
    await Modal.show("❌ Vui lòng chọn danh mục!", "warning");
    return showAddDocumentForm();
  }
  if (!result.file_url.trim()) {
    await Modal.show("❌ Vui lòng nhập link Google Drive!", "warning");
    return showAddDocumentForm();
  }

  // 👈 TỰ ĐỘNG TẠO PREVIEW URL TỪ FILE URL
  let previewUrl = "";
  const fileUrl = result.file_url.trim();
  // Lấy File ID từ link Google Drive
  const fileIdMatch = fileUrl.match(/\/d\/([^\/]+)\//);
  if (fileIdMatch && fileIdMatch[1]) {
    previewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
  }

  // Upload ảnh
  let imageUrl = "";
  if (result.image) {
    const formData = new FormData();
    formData.append("file", result.image);
    const uploadRes = await fetch("/api/upload/document-image", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) {
      imageUrl = uploadResult.image_url;
    }
  }

  // Xử lý tags
  let tags = [];
  if (result.tags && result.tags.trim()) {
    tags = result.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
  }

  const docData = {
    title: result.title.trim(),
    category_id: result.category_id,
    image: imageUrl,
    summary: result.summary?.trim() || "",
    description: result.description?.trim() || "",
    file_url: fileUrl,
    preview_url: previewUrl, // 👈 TỰ ĐỘNG TẠO
    file_type: result.file_type || "pdf",
    file_size: result.file_size?.trim() || "Chưa rõ",
    tags: tags,
    is_new: result.is_new === true,
    active: result.active !== false,
  };

  try {
    const response = await fetch("/api/data/documents/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docData),
    });

    const responseData = await response.json();

    if (responseData.success) {
      await Modal.show("✅ Thêm tài liệu thành công!", "success");
      loadTabContent("documents");
    } else {
      await Modal.show(
        "❌ Thêm thất bại: " + (responseData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== SỬA TÀI LIỆU =====
async function editDocument(docId) {
  try {
    const docsRes = await fetch("/api/data/documents");
    const docsData = await docsRes.json();
    const doc = docsData.items?.find((d) => d.id === docId);

    if (!doc) {
      await Modal.show("❌ Không tìm thấy tài liệu!", "error");
      return;
    }

    const catsRes = await fetch("/api/data/categories");
    const catsData = await catsRes.json();
    const categories = catsData.categories || [];
    const options = categories.map((c) => ({ value: c.id, label: c.name }));
    options.unshift({ value: "", label: "-- Chọn danh mục --" });

    const result = await Modal.form(
      [
        {
          name: "title",
          label: "📝 Tên tài liệu *",
          type: "text",
          value: doc.title || "",
          required: true,
        },
        {
          name: "category_id",
          label: "📁 Danh mục *",
          type: "select",
          options: options,
          value: doc.category_id || "",
          required: true,
        },
        {
          name: "image",
          label: "🖼️ Đổi ảnh (để trống giữ ảnh cũ)",
          type: "file",
          accept: "image/*",
        },
        {
          name: "summary",
          label: "📄 Tóm tắt",
          type: "textarea",
          value: doc.summary || "",
          rows: 60,
        },
        {
          name: "description",
          label: "📖 Mô tả chi tiết",
          type: "textarea",
          value: doc.description || "",
          rows: 100,
        },
        {
          name: "file_url",
          label: "🔗 Link Google Drive *",
          type: "url",
          value: doc.file_url || "",
          required: true,
          help: "Hệ thống sẽ tự động tạo link preview",
        },
        {
          name: "file_type",
          label: "📂 Loại tài liệu",
          type: "select",
          options: [
            { value: "pdf", label: "📄 PDF" },
            { value: "doc", label: "📝 Word" },
            { value: "docx", label: "📝 Word (docx)" },
            { value: "xls", label: "📊 Excel" },
            { value: "xlsx", label: "📊 Excel (xlsx)" },
            { value: "ppt", label: "📽️ PowerPoint" },
            { value: "pptx", label: "📽️ PowerPoint (pptx)" },
            { value: "video", label: "🎬 Video" },
            { value: "audio", label: "🎵 Audio" },
            { value: "image", label: "🖼️ Ảnh" },
            { value: "zip", label: "📦 Zip" },
            { value: "other", label: "📁 Khác" },
          ],
          value: doc.file_type || "pdf",
        },
        {
          name: "file_size",
          label: "💾 Dung lượng",
          type: "text",
          value: doc.file_size || "Chưa rõ",
        },
        {
          name: "tags",
          label: "🏷️ Tags (cách nhau bằng dấu phẩy)",
          type: "text",
          value: (doc.tags || []).join(", "),
        },
        {
          name: "is_new",
          label: "✨ Đánh dấu là tài liệu mới",
          type: "checkbox",
          value: doc.is_new === true,
        },
        {
          name: "active",
          label: "✅ Hiển thị",
          type: "checkbox",
          value: doc.active !== false,
        },
      ],
      "✏️ Sửa Tài Liệu",
      "Cập nhật",
    );

    if (!result) return;

    let previewUrl = doc.preview_url || "";
    const fileUrl = result.file_url.trim();
    const fileIdMatch = fileUrl.match(/\/d\/([^\/]+)\//);
    if (fileIdMatch && fileIdMatch[1]) {
      previewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }

    let imageUrl = doc.image || "";
    if (result.image) {
      // 👇 XÓA ẢNH CŨ TRƯỚC KHI UPLOAD MỚI
      if (doc.image) {
        await deleteOldImage(doc.image);
      }
      const formData = new FormData();
      formData.append("file", result.image);
      const uploadRes = await fetch("/api/upload/document-image", {
        method: "POST",
        body: formData,
      });
      const uploadResult = await uploadRes.json();
      if (uploadResult.success) {
        imageUrl = uploadResult.image_url;
      }
    }

    let tags = [];
    if (result.tags && result.tags.trim()) {
      tags = result.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
    }

    const docData = {
      title: result.title.trim(),
      category_id: result.category_id,
      image: imageUrl,
      summary: result.summary?.trim() || "",
      description: result.description?.trim() || "",
      file_url: fileUrl,
      preview_url: previewUrl,
      file_type: result.file_type || "pdf",
      file_size: result.file_size?.trim() || "Chưa rõ",
      tags: tags,
      is_new: result.is_new === true,
      active: result.active !== false,
    };

    const response = await fetch(`/api/data/documents/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docData),
    });
    const responseData = await response.json();

    if (responseData.success) {
      await Modal.show("✅ Cập nhật tài liệu thành công!", "success");
      loadTabContent("documents");
    } else {
      await Modal.show(
        "❌ Cập nhật thất bại: " + (responseData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== XÓA TÀI LIỆU =====
async function deleteDocument(docId) {
  const confirmed = await Modal.confirm(
    "⚠️ Bạn có chắc muốn xóa tài liệu này?\n\nHành động này không thể hoàn tác!",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;

  try {
    // Lấy thông tin tài liệu để xóa ảnh
    const data = await fetch("/api/data/documents").then((r) => r.json());
    const doc = data.items.find((d) => d.id === docId);
    if (doc && doc.image) {
      await deleteOldImage(doc.image);
    }

    const response = await fetch(`/api/data/documents/${docId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();

    if (response.ok && result.success) {
      await Modal.show("✅ Đã xóa tài liệu thành công!", "success");
      loadTabContent("documents");
    } else {
      await Modal.show(
        "❌ Xóa thất bại: " + (result.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ============================================
// QUẢN LÝ TIN TỨC (NEWS) - GIỐNG TÀI LIỆU
// ============================================

async function renderNewsManager(container) {
  try {
    const response = await fetch("/api/data/news");
    const data = await response.json();
    const news = data.items || [];

    container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:15px;">
                <div>
                    <h3 style="margin:0;">📰 Quản lý Tin tức</h3>
                    <p style="color:#999;font-size:14px;margin:4px 0;">Tổng: ${news.length} tin tức</p>
                </div>
                <button onclick="showAddNewsForm()" class="btn-add" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;">
                    <i class="fas fa-plus-circle"></i> Thêm tin tức
                </button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:15px;margin-top:15px;">
                ${
                  news.length === 0
                    ? `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#999;">
                            <div style="font-size:48px;margin-bottom:16px;">📭</div>
                            <h3 style="color:#555;">Chưa có tin tức</h3>
                            <p>Nhấn "Thêm tin tức" để bắt đầu</p>
                           </div>`
                    : news
                        .map(
                          (item) => `
                            <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid #eee;transition:all 0.3s;"
                                 onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 25px rgba(230,126,34,0.12)';this.style.borderColor='#e67e22'"
                                 onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';this.style.borderColor='#eee'">
                                <div style="height:140px;overflow:hidden;background:#f0f0f0;">
                                    <img src="${item.image || "/static/img/news/default.jpg"}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/static/img/news/default.jpg'">
                                    ${item.is_new ? `<span style="position:absolute;top:10px;right:10px;background:#4caf50;color:white;padding:2px 12px;border-radius:20px;font-size:11px;font-weight:600;"><i class="fas fa-star"></i> Mới</span>` : ""}
                                </div>
                                <div style="padding:14px 16px;">
                                    <strong style="font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title || "Không có tiêu đề"}</strong>
                                    <div style="font-size:12px;color:#999;margin:4px 0;">
                                        <i class="fas fa-calendar-alt"></i> ${item.created_at ? item.created_at.split(" ")[0] : "Chưa có"}
                                        <span style="margin-left:12px;"><i class="fas fa-eye"></i> ${item.view_count || 0}</span>
                                    </div>
                                    <div style="display:flex;gap:5px;margin-top:8px;">
                                        <button onclick="editNews('${item.id}')" class="btn-edit" style="flex:1;padding:4px 12px;font-size:12px;">✏️ Sửa</button>
                                        <button onclick="deleteNews('${item.id}')" class="btn-delete" style="flex:1;padding:4px 12px;font-size:12px;">🗑️ Xóa</button>
                                    </div>
                                </div>
                            </div>
                        `,
                        )
                        .join("")
                }
            </div>
        `;
  } catch (error) {
    container.innerHTML = `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
  }
}

// ===== THÊM TIN TỨC =====
async function showAddNewsForm() {
  const result = await Modal.form(
    [
      {
        name: "title",
        label: "📝 Tiêu đề tin tức *",
        type: "text",
        placeholder: "VD: Khai giảng khóa học HSK mới",
        required: true,
      },
      {
        name: "category",
        label: "📁 Danh mục",
        type: "text",
        placeholder: "VD: Sự kiện, Thông báo, Khóa học",
        value: "Tin tức",
      },
      {
        name: "summary",
        label: "📄 Tóm tắt",
        type: "textarea",
        placeholder: "Mô tả ngắn về tin tức...",
        rows: 60,
      },
      {
        name: "content",
        label: "📖 Nội dung chi tiết *",
        type: "textarea",
        placeholder: "Nội dung tin tức...\n\n<p>Viết HTML hoặc văn bản...</p>",
        rows: 150,
        required: true,
      },
      {
        name: "image",
        label: "🖼️ Ảnh đại diện (tùy chọn)",
        type: "file",
        accept: "image/*",
      },
      {
        name: "author",
        label: "👤 Tác giả",
        type: "text",
        placeholder: "VD: Admin",
        value: "Admin",
      },
      {
        name: "is_new",
        label: "✨ Đánh dấu là tin mới",
        type: "checkbox",
        value: true,
      },
      {
        name: "active",
        label: "✅ Hiển thị",
        type: "checkbox",
        value: true,
      },
    ],
    "📰 Thêm Tin Tức Mới",
    "Thêm tin tức",
  );

  if (!result) return;

  if (!result.title.trim()) {
    await Modal.show("❌ Vui lòng nhập tiêu đề!", "warning");
    return showAddNewsForm();
  }
  if (!result.content.trim()) {
    await Modal.show("❌ Vui lòng nhập nội dung!", "warning");
    return showAddNewsForm();
  }

  // Upload ảnh
  let imageUrl = "";
  if (result.image) {
    const formData = new FormData();
    formData.append("file", result.image);
    const uploadRes = await fetch("/api/upload/news-image", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) {
      imageUrl = uploadResult.image_url;
    }
  }

  const newsData = {
    title: result.title.trim(),
    category: result.category?.trim() || "Tin tức",
    summary: result.summary?.trim() || "",
    content: result.content.trim(),
    image: imageUrl,
    author: result.author?.trim() || "Admin",
    is_new: result.is_new === true,
    active: result.active !== false,
  };

  try {
    const response = await fetch("/api/data/news/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newsData),
    });

    const responseData = await response.json();

    if (responseData.success) {
      await Modal.show("✅ Thêm tin tức thành công!", "success");
      loadTabContent("news");
    } else {
      await Modal.show(
        "❌ Thêm thất bại: " + (responseData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== SỬA TIN TỨC =====
async function editNews(newsId) {
  try {
    const response = await fetch("/api/data/news");
    const data = await response.json();
    const item = data.items?.find((n) => n.id === newsId);

    if (!item) {
      await Modal.show("❌ Không tìm thấy tin tức!", "error");
      return;
    }

    const result = await Modal.form(
      [
        {
          name: "title",
          label: "📝 Tiêu đề tin tức *",
          type: "text",
          value: item.title || "",
          required: true,
        },
        {
          name: "category",
          label: "📁 Danh mục",
          type: "text",
          value: item.category || "Tin tức",
        },
        {
          name: "summary",
          label: "📄 Tóm tắt",
          type: "textarea",
          value: item.summary || "",
          rows: 60,
        },
        {
          name: "content",
          label: "📖 Nội dung chi tiết *",
          type: "textarea",
          value: item.content || "",
          rows: 150,
          required: true,
        },
        {
          name: "image",
          label: "🖼️ Đổi ảnh (để trống giữ ảnh cũ)",
          type: "file",
          accept: "image/*",
        },
        {
          name: "author",
          label: "👤 Tác giả",
          type: "text",
          value: item.author || "Admin",
        },
        {
          name: "is_new",
          label: "✨ Đánh dấu là tin mới",
          type: "checkbox",
          value: item.is_new === true,
        },
        {
          name: "active",
          label: "✅ Hiển thị",
          type: "checkbox",
          value: item.active !== false,
        },
      ],
      "✏️ Sửa Tin Tức",
      "Cập nhật",
    );

    if (!result) return;

    let imageUrl = item.image || "";
    if (result.image) {
      // 👇 XÓA ẢNH CŨ TRƯỚC KHI UPLOAD MỚI
      if (item.image) {
        await deleteOldImage(item.image);
      }
      const formData = new FormData();
      formData.append("file", result.image);
      const uploadRes = await fetch("/api/upload/news-image", {
        method: "POST",
        body: formData,
      });
      const uploadResult = await uploadRes.json();
      if (uploadResult.success) {
        imageUrl = uploadResult.image_url;
      }
    }

    const newsData = {
      title: result.title.trim(),
      category: result.category?.trim() || "Tin tức",
      summary: result.summary?.trim() || "",
      content: result.content.trim(),
      image: imageUrl,
      author: result.author?.trim() || "Admin",
      is_new: result.is_new === true,
      active: result.active !== false,
    };

    const updateRes = await fetch(`/api/data/news/${newsId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newsData),
    });
    const updateData = await updateRes.json();

    if (updateData.success) {
      await Modal.show("✅ Cập nhật tin tức thành công!", "success");
      loadTabContent("news");
    } else {
      await Modal.show(
        "❌ Cập nhật thất bại: " + (updateData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== XÓA TIN TỨC =====
async function deleteNews(newsId) {
  const confirmed = await Modal.confirm(
    "⚠️ Bạn có chắc muốn xóa tin tức này?\n\nHành động này không thể hoàn tác!",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;

  try {
    // Lấy thông tin tin tức để xóa ảnh
    const data = await fetch("/api/data/news").then((r) => r.json());
    const news = data.items.find((n) => n.id === newsId);
    if (news && news.image) {
      await deleteOldImage(news.image);
    }

    const response = await fetch(`/api/data/news/${newsId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();

    if (response.ok && result.success) {
      await Modal.show("✅ Đã xóa tin tức thành công!", "success");
      loadTabContent("news");
    } else {
      await Modal.show(
        "❌ Xóa thất bại: " + (result.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ============================================
// QUẢN LÝ GIÁO VIÊN (TEACHERS)
// ============================================

async function renderTeacherManager(container) {
  try {
    const response = await fetch("/api/data/teachers");
    const data = await response.json();

    // Xử lý cả 2 trường hợp: array hoặc { items: [] }
    let teachers = [];
    if (Array.isArray(data)) {
      teachers = data;
    } else if (data.items && Array.isArray(data.items)) {
      teachers = data.items;
    }

    // 👉 TẠO NÚT THÊM (HIỂN THỊ MỌI LÚC)
    const buttonHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:15px;">
        <div>
          <h3 style="margin:0;">👨‍🏫 Quản lý Giảng viên</h3>
          <p style="color:#999;font-size:14px;margin:4px 0;">Tổng: ${teachers.length} giảng viên</p>
        </div>
        <button onclick="showAddTeacherForm()" class="btn-add" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;">
          <i class="fas fa-plus-circle"></i> Thêm giảng viên
        </button>
      </div>
    `;

    // Nếu chưa có giảng viên
    if (teachers.length === 0) {
      container.innerHTML =
        buttonHtml +
        `
        <div style="text-align:center;padding:60px 20px;color:#999;background:white;border-radius:16px;border:1px solid #eee;">
          <div style="font-size:48px;margin-bottom:16px;">👨‍🏫</div>
          <h3 style="color:#555;">Chưa có giảng viên</h3>
          <p>Nhấn "Thêm giảng viên" để bắt đầu</p>
        </div>
      `;
      return;
    }

    // Có giảng viên -> hiển thị danh sách
    container.innerHTML =
      buttonHtml +
      `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-top:15px;">
        ${teachers
          .map(
            (teacher) => `
          <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #eee;transition:all 0.3s;">
            <div style="height:200px;overflow:hidden;background:#f0f0f0;">
              <img src="${teacher.image || "/static/img/teachers/default.jpg"}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/static/img/teachers/default.jpg'">
            </div>
            <div style="padding:16px;">
              <strong style="font-size:16px;display:block;">${teacher.name || "Chưa có tên"}</strong>
              <span style="font-size:13px;color:#e67e22;">${teacher.title || "Giảng viên"}</span>
              <div style="display:flex;gap:5px;margin-top:10px;">
                <button onclick="editTeacher('${teacher.id}')" class="btn-edit" style="flex:1;padding:4px 12px;font-size:12px;">✏️ Sửa</button>
                <button onclick="deleteTeacher('${teacher.id}')" class="btn-delete" style="flex:1;padding:4px 12px;font-size:12px;">🗑️ Xóa</button>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
  }
}

// ===== THÊM GIÁO VIÊN =====
async function showAddTeacherForm() {
  const result = await Modal.form(
    [
      {
        name: "name",
        label: "👤 Tên giảng viên *",
        type: "text",
        placeholder: "VD: Nguyễn Thị Lan",
        required: true,
      },
      {
        name: "title",
        label: "📌 Chức danh",
        type: "text",
        placeholder: "VD: Giảng viên chính",
        value: "Giảng viên tiếng Trung",
      },
      {
        name: "image",
        label: "🖼️ Ảnh đại diện",
        type: "file",
        accept: "image/*",
      },
      {
        name: "bio",
        label: "📝 Giới thiệu",
        type: "textarea",
        placeholder: "Giới thiệu về giảng viên...",
        rows: 80,
      },
      {
        name: "experience",
        label: "💼 Kinh nghiệm",
        type: "text",
        placeholder: "VD: 5 năm giảng dạy",
        value: "Nhiều năm kinh nghiệm",
      },
      {
        name: "qualification",
        label: "🎓 Trình độ",
        type: "text",
        placeholder: "VD: Thạc sĩ Ngôn ngữ Trung",
        value: "Thạc sĩ Ngôn ngữ Trung",
      },
      {
        name: "specialties",
        label: "🏷️ Chuyên môn (cách nhau bằng dấu phẩy)",
        type: "text",
        placeholder: "VD: HSK, Giao tiếp, Phát âm",
      },
      {
        name: "is_active",
        label: "✅ Đang giảng dạy",
        type: "checkbox",
        value: true,
      },
    ],
    "👨‍🏫 Thêm Giảng Viên Mới",
    "Thêm giảng viên",
  );

  if (!result) return;
  if (!result.name.trim()) {
    await Modal.show("❌ Vui lòng nhập tên giảng viên!", "warning");
    return showAddTeacherForm();
  }

  let imageUrl = "";
  if (result.image) {
    const formData = new FormData();
    formData.append("file", result.image);
    const uploadRes = await fetch("/api/upload/teacher-image", {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadRes.json();
    if (uploadResult.success) imageUrl = uploadResult.image_url;
  }

  const teacherData = {
    name: result.name.trim(),
    title: result.title?.trim() || "Giảng viên tiếng Trung",
    image: imageUrl,
    bio: result.bio?.trim() || "",
    experience: result.experience?.trim() || "Nhiều năm kinh nghiệm",
    qualification: result.qualification?.trim() || "Thạc sĩ Ngôn ngữ Trung",
    specialties: result.specialties?.trim() || "",
    is_active: result.is_active !== false,
  };

  try {
    const response = await fetch("/api/data/teachers/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teacherData),
    });
    const responseData = await response.json();
    if (responseData.success) {
      await Modal.show("✅ Thêm giảng viên thành công!", "success");
      loadTabContent("teachers");
    } else {
      await Modal.show(
        "❌ Thêm thất bại: " + (responseData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== SỬA GIÁO VIÊN =====
async function editTeacher(teacherId) {
  try {
    const response = await fetch("/api/data/teachers");
    const data = await response.json();
    const teachers = data.items || [];
    const teacher = teachers.find((t) => t.id === teacherId);

    if (!teacher) {
      await Modal.show("❌ Không tìm thấy giảng viên!", "error");
      return;
    }

    const result = await Modal.form(
      [
        {
          name: "name",
          label: "👤 Tên giảng viên *",
          type: "text",
          value: teacher.name || "",
          required: true,
        },
        {
          name: "title",
          label: "📌 Chức danh",
          type: "text",
          value: teacher.title || "Giảng viên tiếng Trung",
        },
        {
          name: "image",
          label: "🖼️ Đổi ảnh (để trống giữ ảnh cũ)",
          type: "file",
          accept: "image/*",
        },
        {
          name: "bio",
          label: "📝 Giới thiệu",
          type: "textarea",
          value: teacher.bio || "",
          rows: 80,
        },
        {
          name: "experience",
          label: "💼 Kinh nghiệm",
          type: "text",
          value: teacher.experience || "Nhiều năm kinh nghiệm",
        },
        {
          name: "qualification",
          label: "🎓 Trình độ",
          type: "text",
          value: teacher.qualification || "Thạc sĩ Ngôn ngữ Trung",
        },
        {
          name: "specialties",
          label: "🏷️ Chuyên môn (cách nhau bằng dấu phẩy)",
          type: "text",
          value: teacher.specialties || "",
        },
        {
          name: "is_active",
          label: "✅ Đang giảng dạy",
          type: "checkbox",
          value: teacher.is_active !== false,
        },
      ],
      "✏️ Sửa Giảng Viên",
      "Cập nhật",
    );

    if (!result) return;

    let imageUrl = teacher.image || "";
    if (result.image) {
      // 👇 XÓA ẢNH CŨ TRƯỚC KHI UPLOAD MỚI
      if (teacher.image) {
        await deleteOldImage(teacher.image);
      }
      const formData = new FormData();
      formData.append("file", result.image);
      const uploadRes = await fetch("/api/upload/teacher-image", {
        method: "POST",
        body: formData,
      });
      const uploadResult = await uploadRes.json();
      if (uploadResult.success) {
        imageUrl = uploadResult.image_url;
      }
    }

    const teacherData = {
      name: result.name.trim(),
      title: result.title?.trim() || "Giảng viên tiếng Trung",
      image: imageUrl,
      bio: result.bio?.trim() || "",
      experience: result.experience?.trim() || "Nhiều năm kinh nghiệm",
      qualification: result.qualification?.trim() || "Thạc sĩ Ngôn ngữ Trung",
      specialties: result.specialties?.trim() || "",
      is_active: result.is_active !== false,
    };

    const updateRes = await fetch(`/api/data/teachers/${teacherId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teacherData),
    });
    const updateData = await updateRes.json();
    if (updateData.success) {
      await Modal.show("✅ Cập nhật giảng viên thành công!", "success");
      loadTabContent("teachers");
    } else {
      await Modal.show(
        "❌ Cập nhật thất bại: " + (updateData.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// ===== XÓA GIÁO VIÊN =====
async function deleteTeacher(teacherId) {
  const confirmed = await Modal.confirm(
    "⚠️ Bạn có chắc muốn xóa giảng viên này?",
    "🗑️ Xác nhận xóa",
  );
  if (!confirmed) return;

  try {
    // Lấy thông tin giáo viên để xóa ảnh
    const data = await fetch("/api/data/teachers").then((r) => r.json());
    const teachers = data.items || [];
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher && teacher.image) {
      await deleteOldImage(teacher.image);
    }

    const response = await fetch(`/api/data/teachers/${teacherId}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (response.ok && result.success) {
      await Modal.show("✅ Đã xóa giảng viên thành công!", "success");
      loadTabContent("teachers");
    } else {
      await Modal.show(
        "❌ Xóa thất bại: " + (result.error || "Lỗi không xác định"),
        "error",
      );
    }
  } catch (error) {
    await Modal.show("❌ Lỗi kết nối: " + error.message, "error");
  }
}

// Đảm bảo các hàm có thể truy cập từ console
window.renderTeacherManager = renderTeacherManager;
window.showAddTeacherForm = showAddTeacherForm;
window.editTeacher = editTeacher;
window.deleteTeacher = deleteTeacher;

// ============================================
// QUẢN LÝ "XEM TẤT CẢ" - TỔNG QUAN DỮ LIỆU
// ============================================

async function renderAllDataManager(container) {
  try {
    // Load tất cả dữ liệu song song
    const [
      slidesRes,
      teachersRes,
      categoriesRes,
      coursesRes,
      documentsRes,
      newsRes,
      reviewsRes,
      schedulesRes,
    ] = await Promise.all([
      fetch("/api/data/slides"),
      fetch("/api/data/teachers"),
      fetch("/api/data/categories"),
      fetch("/api/data/courses"),
      fetch("/api/data/documents"),
      fetch("/api/data/news"),
      fetch("/api/data/reviews"),
      fetch("/api/data/schedules"),
    ]);

    const slides = await slidesRes.json();
    const teachers = await teachersRes.json();
    const categories = await categoriesRes.json();
    const courses = await coursesRes.json();
    const documents = await documentsRes.json();
    const news = await newsRes.json();
    const reviews = await reviewsRes.json();
    const schedules = await schedulesRes.json();

    // 👇 SỬA: XỬ LÝ DỮ LIỆU TEACHERS ĐÚNG CÁCH
    let teachersItems = [];
    if (Array.isArray(teachers)) {
      teachersItems = teachers;
    } else if (teachers.items && Array.isArray(teachers.items)) {
      teachersItems = teachers.items;
    } else {
      // 👇 THÊM FALLBACK: Nếu không có dữ liệu, thử lấy từ JSON
      try {
        const fallbackRes = await fetch("/api/data/teachers");
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData)) {
          teachersItems = fallbackData;
        } else if (fallbackData.items && Array.isArray(fallbackData.items)) {
          teachersItems = fallbackData.items;
        }
      } catch (e) {
        console.warn("Không thể lấy dữ liệu giảng viên fallback:", e);
      }
    }

    console.log("📊 Dữ liệu giảng viên:", teachersItems);
    console.log("📊 Số lượng giảng viên:", teachersItems.length);

    // Xử lý các dữ liệu khác
    const slidesItems = slides.items || [];
    const categoriesItems = categories.categories || [];
    const coursesItems = Array.isArray(courses) ? courses : courses.items || [];
    const documentsItems = documents.items || [];
    const newsItems = news.items || [];
    const reviewsItems = reviews.items || [];
    const schedulesItems = schedules.items || [];

    // Thống kê
    const stats = [
      {
        id: "slides",
        icon: "fa-images",
        label: "Slider",
        count: slidesItems.length,
        color: "#e67e22",
      },
      {
        id: "teachers",
        icon: "fa-chalkboard-teacher",
        label: "Giảng viên",
        count: teachersItems.length,
        color: "#3498db",
      },
      {
        id: "categories",
        icon: "fa-tags",
        label: "Danh mục",
        count: categoriesItems.length,
        color: "#9b59b6",
      },
      {
        id: "courses",
        icon: "fa-book",
        label: "Khóa học",
        count: coursesItems.length,
        color: "#27ae60",
      },
      {
        id: "documents",
        icon: "fa-file-alt",
        label: "Tài liệu",
        count: documentsItems.length,
        color: "#e67e22",
      },
      {
        id: "news",
        icon: "fa-newspaper",
        label: "Tin tức",
        count: newsItems.length,
        color: "#2980b9",
      },
      {
        id: "reviews",
        icon: "fa-star",
        label: "Đánh giá",
        count: reviewsItems.length,
        color: "#f1c40f",
      },
      {
        id: "schedules",
        icon: "fa-calendar-check",
        label: "Lịch khai giảng",
        count: schedulesItems.length,
        color: "#16a085",
      },
    ];

    // Tổng số
    const totalItems = stats.reduce((sum, s) => sum + s.count, 0);

    // Render HTML...
    container.innerHTML = `
      <style>
        .all-dashboard { padding: 0 4px; }
        .all-dashboard .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 30px;
        }
        .all-dashboard .stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #f0f0f0;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .all-dashboard .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          border-color: #e67e22;
        }
        .all-dashboard .stat-card .stat-icon {
          font-size: 24px;
          margin-bottom: 6px;
        }
        .all-dashboard .stat-card .stat-count {
          font-size: 28px;
          font-weight: 800;
          color: #2c3e50;
        }
        .all-dashboard .stat-card .stat-label {
          font-size: 13px;
          color: #999;
          font-weight: 500;
        }
        .all-dashboard .stat-card .stat-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          border-radius: 0 2px 0 0;
          transition: width 1s ease;
        }
        .all-dashboard .section-title {
          font-size: 17px;
          font-weight: 700;
          color: #2c3e50;
          margin: 24px 0 10px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .all-dashboard .section-title .badge-count {
          font-size: 12px;
          background: #e67e22;
          color: white;
          padding: 2px 12px;
          border-radius: 20px;
          font-weight: 600;
        }
        .all-dashboard .item-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }
        .all-dashboard .item-card {
          background: white;
          border-radius: 10px;
          padding: 12px 14px;
          border: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
          text-decoration: none;
          color: inherit;
        }
        .all-dashboard .item-card:hover {
          border-color: #e67e22;
          box-shadow: 0 4px 15px rgba(230,126,34,0.1);
          transform: translateX(4px);
        }
        .all-dashboard .item-card .item-avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .all-dashboard .item-card .item-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .all-dashboard .item-card .item-info {
          flex: 1;
          min-width: 0;
        }
        .all-dashboard .item-card .item-info .item-name {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .all-dashboard .item-card .item-info .item-meta {
          font-size: 12px;
          color: #999;
        }
        .all-dashboard .item-card .item-status {
          font-size: 12px;
          flex-shrink: 0;
        }
        .all-dashboard .view-all-link {
          text-align: center;
          margin-top: 10px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 8px;
          color: #e67e22;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px dashed #e0e0e0;
          font-size: 13px;
        }
        .all-dashboard .view-all-link:hover {
          background: #e67e22;
          color: white;
          border-color: #e67e22;
        }
        .all-dashboard .empty-state {
          text-align: center;
          padding: 24px 20px;
          color: #999;
          background: #fafafa;
          border-radius: 10px;
          border: 1px dashed #e0e0e0;
        }
        .all-dashboard .empty-state .empty-icon {
          font-size: 28px;
          margin-bottom: 4px;
          opacity: 0.5;
        }
        .all-dashboard .empty-state p {
          margin: 0;
          font-size: 14px;
        }
        @media (max-width: 768px) {
          .all-dashboard .stats-grid {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          }
          .all-dashboard .stat-card .stat-count {
            font-size: 22px;
          }
          .all-dashboard .item-list {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <div class="all-dashboard">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
          <div>
            <h2 style="margin:0;font-size:22px;">📊 Tổng Quan Dữ Liệu</h2>
            <p style="color:#999;font-size:14px;margin:4px 0;">
              Tổng cộng <strong style="color:#e67e22;">${totalItems}</strong> mục dữ liệu trên toàn hệ thống
            </p>
          </div>
          <button onclick="refreshAllData()" class="btn-add" style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;font-size:13px;">
            <i class="fas fa-sync-alt"></i> Làm mới
          </button>
        </div>

        <!-- Thống kê -->
        <div class="stats-grid">
          ${stats
            .map(
              (stat) => `
            <div class="stat-card" onclick="switchToTab('${stat.id}')" title="Xem chi tiết ${stat.label}">
              <div class="stat-icon" style="color:${stat.color}"><i class="fas ${stat.icon}"></i></div>
              <div class="stat-count">${stat.count}</div>
              <div class="stat-label">${stat.label}</div>
              <div class="stat-bar" style="width:${stat.count > 0 ? Math.min((stat.count / Math.max(totalItems, 1)) * 100, 100) : 0}%;background:${stat.color};"></div>
            </div>
          `,
            )
            .join("")}
        </div>

        <!-- Chi tiết từng loại -->
        ${renderAllSection("🖼️ Slider", "slides", slidesItems)}
        ${renderAllSection("👨‍🏫 Giảng viên", "teachers", teachersItems)}
        ${renderAllSection("🏷️ Danh mục", "categories", categoriesItems)}
        ${renderAllSection("📚 Khóa học", "courses", coursesItems)}
        ${renderAllSection("📄 Tài liệu", "documents", documentsItems)}
        ${renderAllSection("📰 Tin tức", "news", newsItems)}
        ${renderAllSection("⭐ Đánh giá", "reviews", reviewsItems)}
        ${renderAllSection("📅 Lịch khai giảng", "schedules", schedulesItems)}
      </div>
    `;

    // Animation cho thanh bar
    setTimeout(() => {
      document.querySelectorAll(".stat-bar").forEach((bar) => {
        const width = bar.style.width;
        bar.style.width = "0%";
        setTimeout(() => {
          bar.style.width = width;
        }, 100);
      });
    }, 100);
  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:#e74c3c;">
        <div style="font-size:48px;margin-bottom:16px;">❌</div>
        <h3>Lỗi tải dữ liệu</h3>
        <p>${error.message}</p>
        <button onclick="loadTabContent('all')" class="btn-add" style="margin-top:16px;">🔄 Thử lại</button>
      </div>
    `;
  }
}

// ===== HÀM RENDER SECTION =====
function renderAllSection(title, type, items) {
  if (!items || items.length === 0) {
    return `
      <div class="section-title" id="section-${type}">
        ${title}
        <span class="badge-count">0</span>
      </div>
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>Chưa có dữ liệu</p>
      </div>
    `;
  }

  // Lấy 5 item đầu tiên
  const displayItems = items.slice(0, 5);
  const hasMore = items.length > 5;

  return `
    <div class="section-title" id="section-${type}">
      ${title}
      <span class="badge-count">${items.length}</span>
      <span style="font-size:12px;color:#999;font-weight:400;margin-left:4px;">(hiển thị ${Math.min(5, items.length)}/${items.length})</span>
    </div>
    <div class="item-list">
      ${displayItems.map((item) => renderAllItemCard(item, type)).join("")}
    </div>
    ${
      hasMore
        ? `
      <div class="view-all-link" onclick="switchToTab('${type}')">
        <i class="fas fa-arrow-right"></i> Xem tất cả ${items.length} ${title.toLowerCase()}
      </div>
    `
        : ""
    }
  `;
}

// ===== HÀM RENDER ITEM CARD (ĐÃ SỬA LỖI) =====
function renderAllItemCard(item, type) {
  // Xác định tên - SỬA LỖI CHO SCHEDULES VÀ TEACHERS
  let name = "Không có tên";

  switch (type) {
    case "schedules":
      name = item.course_name || item.name || "Không có tên";
      break;
    case "teachers":
      name = item.name || "Không có tên";
      break;
    case "slides":
      name = item.title || item.name || "Không có tên";
      break;
    case "categories":
      name = item.name || "Không có tên";
      break;
    case "courses":
      name = item.name || "Không có tên";
      break;
    case "documents":
      name = item.title || item.name || "Không có tên";
      break;
    case "news":
      name = item.title || item.name || "Không có tên";
      break;
    case "reviews":
      name = item.name || "Không có tên";
      break;
    default:
      name = item.name || item.title || "Không có tên";
  }

  let image = item.image || item.avatar || "";
  let meta = "";
  let status = "";

  switch (type) {
    case "slides":
      meta = item.link || "#";
      status = item.active !== false ? "✅" : "⛔";
      break;
    case "teachers":
      meta = item.title || "Giảng viên";
      status = item.is_active !== false ? "✅" : "⛔";
      break;
    case "categories":
      meta = item.slug || "";
      status = item.active !== false ? "✅" : "⛔";
      break;
    case "courses":
      meta = `${item.level || "Cơ bản"} • ${item.price || "Liên hệ"}`;
      status = item.active !== false ? "✅" : "⛔";
      break;
    case "documents":
      meta = `${item.category_name || "Chưa phân loại"} • ${item.file_type || "pdf"}`;
      status = item.active !== false ? "✅" : "⛔";
      break;
    case "news":
      meta = item.category || "Tin tức";
      status = item.active !== false ? "✅" : "⛔";
      break;
    case "reviews":
      const stars = "⭐".repeat(Math.min(item.rating || 5, 5));
      meta = `${stars} • ${item.course || ""}`;
      status = item.active !== false ? "✅" : "⛔";
      break;
    case "schedules":
      // 👇 SỬA LỖI: Lấy đúng tên và meta cho schedules
      const statusMap = {
        open: "🟢 Còn chỗ",
        full: "🔴 Đã kín",
        upcoming: "🟡 Sắp khai giảng",
        closed: "⚫ Đã đóng",
      };
      meta = `${item.category || "HSK"} • ${statusMap[item.status] || item.status || "open"}`;
      status = item.active !== false ? "✅" : "⛔";
      break;
    default:
      meta = "";
      status = "";
  }

  // Xác định link đến trang chi tiết
  let detailLink = "#";
  const id = item.id || item._id || "";

  switch (type) {
    case "courses":
      detailLink = `/khoa-hoc/chi-tiet/${id}`;
      break;
    case "documents":
      detailLink = `/thu-vien/chi-tiet/${id}`;
      break;
    case "news":
      detailLink = `/tin-tuc/chi-tiet/${id}`;
      break;
    case "teachers":
      detailLink = `/gioi-thieu/chi-tiet-giao-vien/${id}`;
      break;
    default:
      detailLink = "#";
  }

  const isLink = detailLink !== "#";

  return `
    <a href="${detailLink}" class="item-card" target="${isLink ? "_blank" : ""}" onclick="${!isLink ? "event.preventDefault();" : ""}">
      <div class="item-avatar">
        ${image ? `<img src="${image}" alt="${name}" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-file\\'></i>'">` : `<i class="fas fa-file"></i>`}
      </div>
      <div class="item-info">
        <div class="item-name">${name}</div>
        <div class="item-meta">${meta}</div>
      </div>
      <div class="item-status">${status}</div>
    </a>
  `;
}

// ===== HÀM CHUYỂN ĐỔI TAB =====
function switchToTab(tabName) {
  const tabMap = {
    slides: "slides",
    teachers: "teachers",
    categories: "categories",
    courses: "courses",
    documents: "documents",
    news: "news",
    reviews: "reviews",
    schedules: "schedules",
  };

  const target = tabMap[tabName];
  if (!target) {
    console.warn("Không tìm thấy tab:", tabName);
    return;
  }

  const links = document.querySelectorAll(".sidebar-nav a");
  for (const link of links) {
    if (link.dataset.tab === target) {
      link.click();
      return;
    }
  }

  for (const link of links) {
    if (link.getAttribute("href") === `#${target}`) {
      link.click();
      return;
    }
  }
}

// ===== HÀM LÀM MỚI DỮ LIỆU =====
async function refreshAllData() {
  const btn = document.querySelector(".all-dashboard .btn-add");
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
    btn.disabled = true;
  }

  await loadTabContent("all");

  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới';
    btn.disabled = false;
  }
}

// Export các hàm ra window
window.renderAllDataManager = renderAllDataManager;
window.switchToTab = switchToTab;
window.refreshAllData = refreshAllData;

// ============================================
// LOAD TAB ĐẦU TIÊN
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  loadTabContent("nav");
});
