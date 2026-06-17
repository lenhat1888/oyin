// ============================================
// DASHBOARD MODAL - HIỂN THỊ TẤT CẢ DỮ LIỆU
// ============================================

class DashboardModal {
  constructor() {
    this.data = {
      menu: [],
      slides: [],
      categories: [],
      courses: [],
    };
    this.modal = null;
    this.isOpen = false;
  }

  // Mở Modal
  async open() {
    if (this.isOpen) return;

    // Tải dữ liệu
    await this.loadAllData();

    // Tạo modal
    this.createModal();
    this.isOpen = true;
    document.body.style.overflow = "hidden";
  }

  // Đóng Modal
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.isOpen = false;
    document.body.style.overflow = "";
  }

  // Tải tất cả dữ liệu
  async loadAllData() {
    try {
      const [menuRes, slidesRes, categoriesRes, coursesRes] = await Promise.all(
        [
          fetch("/api/data/menu"),
          fetch("/api/data/slides"),
          fetch("/api/data/categories"),
          fetch("/api/data/courses"),
        ],
      );

      const menuData = await menuRes.json();
      const slidesData = await slidesRes.json();
      const categoriesData = await categoriesRes.json();
      const coursesData = await coursesRes.json();

      this.data.menu = menuData.items || [];
      this.data.slides = slidesData.items || [];
      this.data.categories = categoriesData.categories || [];
      this.data.courses = Array.isArray(coursesData)
        ? coursesData
        : coursesData.items || [];

      console.log("✅ Dashboard data loaded:", this.data);
    } catch (error) {
      console.error("❌ Lỗi tải dữ liệu:", error);
      throw error;
    }
  }

  // Tạo Modal HTML
  createModal() {
    // Xóa modal cũ nếu có
    if (this.modal) {
      this.modal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "dashboard-modal-overlay";
    modal.innerHTML = `
            <div class="dashboard-modal">
                <div class="dashboard-modal-header">
                    <h2>📊 Bảng điều khiển dữ liệu</h2>
                    <button class="dashboard-modal-close" onclick="window.dashboardModal.close()">&times;</button>
                </div>
                
                <div class="dashboard-modal-body">
                    <!-- Stats -->
                    <div class="dashboard-stats">
                        <div class="stat-card">
                            <div class="stat-number">${this.data.menu.length}</div>
                            <div class="stat-label">📋 Menu</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.data.slides.length}</div>
                            <div class="stat-label">🖼️ Slider</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.data.categories.length}</div>
                            <div class="stat-label">🏷️ Danh mục</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${this.data.courses.length}</div>
                            <div class="stat-label">📚 Khóa học</div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="dashboard-tabs">
                        <button class="tab-btn active" data-tab="menu">📋 Menu</button>
                        <button class="tab-btn" data-tab="slides">🖼️ Slider</button>
                        <button class="tab-btn" data-tab="categories">🏷️ Danh mục</button>
                        <button class="tab-btn" data-tab="courses">📚 Khóa học</button>
                    </div>

                    <!-- Tab Content -->
                    <div class="dashboard-tab-content">
                        <div id="tab-menu" class="tab-pane active">
                            ${this.renderMenu()}
                        </div>
                        <div id="tab-slides" class="tab-pane">
                            ${this.renderSlides()}
                        </div>
                        <div id="tab-categories" class="tab-pane">
                            ${this.renderCategories()}
                        </div>
                        <div id="tab-courses" class="tab-pane">
                            ${this.renderCourses()}
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Xử lý sự kiện tabs
    this.modal.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.modal
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const tab = btn.dataset.tab;
        this.modal
          .querySelectorAll(".tab-pane")
          .forEach((p) => p.classList.remove("active"));
        const target = document.getElementById(`tab-${tab}`);
        if (target) target.classList.add("active");
      });
    });

    // Click bên ngoài để đóng
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // ESC để đóng
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  // ========== RENDER MENU ==========
  renderMenu() {
    if (!this.data.menu.length) {
      return '<p style="color:#999;">📭 Chưa có mục menu nào</p>';
    }

    return `
            <div class="data-list">
                ${this.data.menu
                  .map(
                    (item) => `
                    <div class="data-item">
                        <div class="data-item-info">
                            <span class="data-item-icon">📁</span>
                            <strong>${item.name}</strong>
                            <span class="data-item-url">${item.url}</span>
                            ${
                              item.children && item.children.length
                                ? `<span class="data-item-badge">${item.children.length} con</span>`
                                : ""
                            }
                        </div>
                        <div class="data-item-actions">
                            <span class="data-item-id">${item.id}</span>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;
  }

  // ========== RENDER SLIDES ==========
  renderSlides() {
    if (!this.data.slides.length) {
      return '<p style="color:#999;">📭 Chưa có slide nào</p>';
    }

    return `
            <div class="data-grid">
                ${this.data.slides
                  .map(
                    (slide) => `
                    <div class="data-card">
                        <div class="data-card-image">
                            <img src="${slide.image}" alt="${slide.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f39c12%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2230%22%3E📷%3C/text%3E%3C/svg%3E'">
                        </div>
                        <div class="data-card-info">
                            <strong>${slide.title || "Slide"}</strong>
                            <span class="data-card-status ${slide.active ? "active" : "inactive"}">
                                ${slide.active ? "✅ Active" : "⛔ Inactive"}
                            </span>
                            <span class="data-card-order">#${slide.order || 0}</span>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;
  }

  // ========== RENDER CATEGORIES ==========
  renderCategories() {
    if (!this.data.categories.length) {
      return '<p style="color:#999;">📭 Chưa có danh mục nào</p>';
    }

    return `
            <div class="data-list">
                ${this.data.categories
                  .map(
                    (cat) => `
                    <div class="data-item">
                        <div class="data-item-info">
                            <span class="data-item-icon"><i class="fas ${cat.icon || "fa-tag"}"></i></span>
                            <strong>${cat.name}</strong>
                            <span class="data-item-url">${cat.slug}</span>
                            ${
                              cat.active
                                ? `<span class="data-item-badge active">Active</span>`
                                : `<span class="data-item-badge inactive">Inactive</span>`
                            }
                        </div>
                        <div class="data-item-actions">
                            <span class="data-item-id">${cat.id}</span>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;
  }

  // ========== RENDER COURSES ==========
  renderCourses() {
    if (!this.data.courses.length) {
      return '<p style="color:#999;">📭 Chưa có khóa học nào</p>';
    }

    return `
            <div class="data-grid">
                ${this.data.courses
                  .map(
                    (course) => `
                    <div class="data-card course-card-item">
                        <div class="data-card-image">
                            <img src="${course.image || course.image_url || ""}" alt="${course.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f39c12%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2230%22%3E📚%3C/text%3E%3C/svg%3E'">
                        </div>
                        <div class="data-card-info">
                            <strong>${course.name}</strong>
                            <span class="data-card-level">${course.level || "Cơ bản"}</span>
                            <span class="data-card-price">${course.price || "Liên hệ"}</span>
                            <span class="data-card-order">⏱️ ${course.duration || "Linh hoạt"}</span>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;
  }
}

// ============================================
// KHỞI TẠO TOÀN CỤC
// ============================================

window.dashboardModal = new DashboardModal();

// ============================================
// CSS CHO MODAL
// ============================================

const dashboardStyles = document.createElement("style");
dashboardStyles.textContent = `
    /* ===== DASHBOARD MODAL OVERLAY ===== */
    .dashboard-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: modalFadeIn 0.3s ease;
    }

    /* ===== DASHBOARD MODAL ===== */
    .dashboard-modal {
        background: #ffffff;
        border-radius: 20px;
        width: 90%;
        max-width: 1000px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
        overflow: hidden;
    }

    /* ===== HEADER ===== */
    .dashboard-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        background: linear-gradient(135deg, #e67e22, #d35400);
        color: white;
        flex-shrink: 0;
    }

    .dashboard-modal-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
    }

    .dashboard-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 32px;
        cursor: pointer;
        transition: all 0.3s;
        line-height: 1;
        padding: 0 8px;
    }

    .dashboard-modal-close:hover {
        transform: rotate(90deg);
        opacity: 0.7;
    }

    /* ===== BODY ===== */
    .dashboard-modal-body {
        padding: 25px 30px;
        overflow-y: auto;
        flex: 1;
    }

    /* ===== STATS ===== */
    .dashboard-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
        margin-bottom: 25px;
    }

    .stat-card {
        background: #f8f9fa;
        padding: 15px 20px;
        border-radius: 12px;
        text-align: center;
        border: 1px solid #eee;
        transition: all 0.3s;
    }

    .stat-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.06);
    }

    .stat-number {
        font-size: 32px;
        font-weight: 800;
        color: #e67e22;
        display: block;
    }

    .stat-label {
        font-size: 13px;
        color: #999;
        margin-top: 4px;
    }

    /* ===== TABS ===== */
    .dashboard-tabs {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid #f0f0f0;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }

    .tab-btn {
        padding: 10px 20px;
        border: none;
        background: none;
        cursor: pointer;
        font-weight: 600;
        color: #999;
        transition: all 0.3s;
        border-bottom: 3px solid transparent;
        font-size: 14px;
        border-radius: 8px 8px 0 0;
    }

    .tab-btn:hover {
        color: #e67e22;
        background: #fff5e6;
    }

    .tab-btn.active {
        color: #e67e22;
        border-bottom-color: #e67e22;
        background: #fff5e6;
    }

    /* ===== TAB CONTENT ===== */
    .tab-pane {
        display: none;
        animation: fadeIn 0.3s ease;
    }

    .tab-pane.active {
        display: block;
    }

    /* ===== DATA LIST ===== */
    .data-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .data-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background: #f8f9fa;
        border-radius: 10px;
        transition: all 0.3s;
        flex-wrap: wrap;
        gap: 8px;
    }

    .data-item:hover {
        background: #f0f0f0;
    }

    .data-item-info {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .data-item-icon {
        font-size: 18px;
    }

    .data-item-url {
        color: #999;
        font-size: 13px;
        font-family: monospace;
        background: #eee;
        padding: 2px 10px;
        border-radius: 4px;
    }

    .data-item-badge {
        font-size: 11px;
        padding: 2px 10px;
        border-radius: 20px;
        background: #e67e22;
        color: white;
        font-weight: 600;
    }

    .data-item-badge.active {
        background: #4CAF50;
    }

    .data-item-badge.inactive {
        background: #f44336;
    }

    .data-item-id {
        font-size: 11px;
        color: #bbb;
        font-family: monospace;
    }

    .data-item-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    /* ===== DATA GRID ===== */
    .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 15px;
    }

    .data-card {
        background: white;
        border: 1px solid #eee;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s;
    }

    .data-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        border-color: #e67e22;
    }

    .data-card-image {
        width: 100%;
        height: 120px;
        overflow: hidden;
        background: #f0f0f0;
    }

    .data-card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .data-card-info {
        padding: 12px 15px;
    }

    .data-card-info strong {
        display: block;
        font-size: 14px;
        color: #2c3e50;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .data-card-status {
        font-size: 11px;
        font-weight: 600;
    }

    .data-card-status.active {
        color: #4CAF50;
    }

    .data-card-status.inactive {
        color: #f44336;
    }

    .data-card-order {
        font-size: 11px;
        color: #bbb;
        display: block;
        margin-top: 2px;
    }

    .data-card-level {
        font-size: 12px;
        color: #e67e22;
        font-weight: 600;
    }

    .data-card-price {
        font-size: 13px;
        font-weight: 700;
        color: #e67e22;
        display: block;
    }

    .course-card-item .data-card-info strong {
        font-size: 13px;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
        .dashboard-modal {
            width: 95%;
            max-height: 95vh;
        }

        .dashboard-modal-header h2 {
            font-size: 18px;
        }

        .dashboard-modal-body {
            padding: 15px;
        }

        .dashboard-stats {
            grid-template-columns: repeat(2, 1fr);
        }

        .data-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .data-item {
            flex-direction: column;
            align-items: flex-start;
        }

        .dashboard-tabs {
            gap: 4px;
        }

        .tab-btn {
            padding: 8px 14px;
            font-size: 12px;
        }
    }

    @media (max-width: 480px) {
        .data-grid {
            grid-template-columns: 1fr;
        }

        .dashboard-stats {
            grid-template-columns: 1fr 1fr;
        }

        .stat-number {
            font-size: 24px;
        }
    }

    /* ===== ANIMATIONS ===== */
    @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes modalSlideIn {
        from { transform: translateY(-30px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(dashboardStyles);
