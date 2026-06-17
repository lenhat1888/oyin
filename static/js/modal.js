// ============================================
// MODAL SYSTEM - THAY THẾ ALERT/CONFIRM/PROMPT
// ============================================

const Modal = {
  // Hiển thị modal thông báo
  show(message, type = "info", title = "") {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.innerHTML = `
                <div class="modal-box modal-${type}">
                    <div class="modal-header">
                        <h3>${title || getTitle(type)}</h3>
                        <button class="modal-close" onclick="Modal.close()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="Modal.close()">OK</button>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);
      this._resolve = resolve;
      this._modal = modal;
    });
  },

  // Hiển thị modal xác nhận (Yes/No)
  confirm(message, title = "Xác nhận") {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.innerHTML = `
                <div class="modal-box modal-confirm">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="Modal.close(false)">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Modal.close(false)">Hủy</button>
                        <button class="btn btn-danger" onclick="Modal.close(true)">Xác nhận</button>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);
      this._resolve = resolve;
      this._modal = modal;
    });
  },

  // Hiển thị modal prompt (nhập liệu)
  prompt(message, defaultValue = "", title = "Nhập thông tin") {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.innerHTML = `
                <div class="modal-box modal-prompt">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="Modal.close(null)">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <input type="text" id="modalInput" class="modal-input" value="${defaultValue || ""}" placeholder="Nhập giá trị...">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Modal.close(null)">Hủy</button>
                        <button class="btn btn-primary" onclick="Modal.close(document.getElementById('modalInput').value)">OK</button>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);
      this._resolve = resolve;
      this._modal = modal;
      // Tự động focus vào input
      setTimeout(() => {
        const input = document.getElementById("modalInput");
        if (input) {
          input.focus();
          input.select();
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              Modal.close(input.value);
            }
            if (e.key === "Escape") {
              Modal.close(null);
            }
          });
        }
      }, 100);
    });
  },
  // ===== HIỂN THỊ MODAL FORM NHIỀU TRƯỜNG =====
  form(fields, title = "Nhập thông tin", submitText = "Lưu") {
    return new Promise((resolve) => {
      let htmlFields = fields
        .map((field, index) => {
          let fieldHtml = "";

          // Text input
          if (field.type === "text" || field.type === "url") {
            fieldHtml = `
            <div class="form-field">
              <label>${field.label}</label>
              <input type="${field.type === "url" ? "url" : "text"}" 
                     id="field_${index}" 
                     class="modal-input" 
                     value="${field.value || ""}" 
                     placeholder="${field.placeholder || ""}"
                     ${field.required ? "required" : ""}>
            </div>
          `;
          }

          // Textarea
          if (field.type === "textarea") {
            fieldHtml = `
            <div class="form-field">
              <label>${field.label}</label>
              <textarea id="field_${index}" 
                        class="modal-input" 
                        style="min-height:${field.rows || 80}px;" 
                        placeholder="${field.placeholder || ""}"
                        ${field.required ? "required" : ""}>${field.value || ""}</textarea>
            </div>
          `;
          }

          // File input (có preview ảnh)
          if (field.type === "file") {
            fieldHtml = `
            <div class="form-field">
              <label>${field.label}</label>
              <input type="file" 
                     id="field_${index}" 
                     accept="image/*" 
                     class="modal-input" 
                     style="padding:8px;"
                     ${field.required ? "required" : ""}>
              <div id="preview_${index}" class="file-preview" style="display:none; margin-top:10px;">
                <img id="preview_img_${index}" src="#" alt="Preview" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid #eee;">
              </div>
            </div>
          `;
          }

          // Select dropdown
          if (field.type === "select") {
            const options = field.options
              .map(
                (opt) =>
                  `<option value="${opt.value}" ${opt.value === field.value ? "selected" : ""}>${opt.label}</option>`,
              )
              .join("");

            fieldHtml = `
            <div class="form-field">
              <label>${field.label}</label>
              <select id="field_${index}" class="modal-input" ${field.required ? "required" : ""}>
                ${options}
              </select>
            </div>
          `;
          }

          // Checkbox (boolean)
          if (field.type === "checkbox") {
            fieldHtml = `
            <div class="form-field" style="display:flex;align-items:center;gap:12px;">
              <input type="checkbox" 
                     id="field_${index}" 
                     ${field.value ? "checked" : ""} 
                     style="width:20px;height:20px;cursor:pointer;">
              <label style="margin:0;cursor:pointer;">${field.label}</label>
            </div>
          `;
          }

          return fieldHtml;
        })
        .join("");

      const modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.innerHTML = `
        <div class="modal-box modal-form" style="max-width:600px;max-height:90vh;overflow-y:auto;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="Modal.closeForm()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="modalForm" onsubmit="return false;">
              ${htmlFields}
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Modal.closeForm()">Hủy</button>
            <button class="btn btn-primary" id="formSubmitBtn">${submitText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this._formModal = modal;
      this._formResolve = resolve;
      this._formFields = fields;

      // ===== PREVIEW ẢNH =====
      fields.forEach((field, index) => {
        if (field.type === "file") {
          const fileInput = document.getElementById(`field_${index}`);
          if (fileInput) {
            fileInput.addEventListener("change", function (e) {
              const previewDiv = document.getElementById(`preview_${index}`);
              const previewImg = document.getElementById(
                `preview_img_${index}`,
              );
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
          }
        }
      });

      // ===== SUBMIT =====
      document.getElementById("formSubmitBtn").addEventListener("click", () => {
        const result = {};
        let valid = true;

        fields.forEach((field, index) => {
          const el = document.getElementById(`field_${index}`);
          if (!el) return;

          if (field.type === "file") {
            result[field.name] =
              el.files && el.files.length > 0 ? el.files[0] : null;
          } else if (field.type === "checkbox") {
            result[field.name] = el.checked;
          } else {
            result[field.name] = el.value;
          }
        });

        // Kiểm tra required
        fields.forEach((field, index) => {
          if (field.required) {
            const value = result[field.name];
            if (!value || (typeof value === "string" && !value.trim())) {
              valid = false;
              const el = document.getElementById(`field_${index}`);
              if (el) {
                el.style.borderColor = "#f44336";
                el.focus();
                setTimeout(() => {
                  el.style.borderColor = "";
                }, 2000);
              }
            }
          }
        });

        if (!valid) {
          Modal.show("⚠️ Vui lòng điền đầy đủ thông tin!", "warning");
          return;
        }

        Modal.closeForm(result);
      });

      // Enter để submit
      document.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && document.querySelector(".modal-form")) {
          document.getElementById("formSubmitBtn").click();
        }
      });
    });
  },

  closeForm(value) {
    if (this._formModal) {
      this._formModal.remove();
      this._formModal = null;
    }
    if (this._formResolve) {
      this._formResolve(value || null);
      this._formResolve = null;
    }
  },

  close(value) {
    if (this._modal) {
      this._modal.remove();
      this._modal = null;
    }
    if (this._resolve) {
      this._resolve(value);
      this._resolve = null;
    }
  },
};

function getTitle(type) {
  const titles = {
    success: "✅ Thành công",
    error: "❌ Lỗi",
    warning: "⚠️ Cảnh báo",
    info: "📢 Thông báo",
  };
  return titles[type] || titles.info;
}

// ============================================
// CSS CHO MODAL
// ============================================
const modalStyles = document.createElement("style");
modalStyles.textContent = `
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        animation: modalFadeIn 0.3s ease;
        backdrop-filter: blur(4px);
    }
    
    .modal-box {
        background: white;
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px 16px;
        border-bottom: 1px solid #eee;
    }
    
    .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #999;
        transition: all 0.3s;
        padding: 0 8px;
        line-height: 1;
    }
    
    .modal-close:hover {
        color: #f44336;
        transform: rotate(90deg);
    }
    
    .modal-body {
        padding: 24px;
    }
    
    .modal-body p {
        margin: 0;
        font-size: 15px;
        line-height: 1.7;
        color: #444;
        white-space: pre-wrap;
    }
    
    .modal-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        font-size: 15px;
        margin-top: 12px;
        transition: border-color 0.3s;
        box-sizing: border-box;
    }
    
    .modal-input:focus {
        outline: none;
        border-color: #e67e22;
        box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.1);
    }
    
    .modal-footer {
        padding: 16px 24px 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        border-top: 1px solid #f0f0f0;
    }
    
    .btn {
        padding: 10px 28px;
        border: none;
        border-radius: 40px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .btn-primary {
        background: linear-gradient(135deg, #e67e22, #d35400);
        color: white;
    }
    
    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(230, 126, 34, 0.3);
    }
    
    .btn-danger {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
    }
    
    .btn-danger:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(244, 67, 54, 0.3);
    }
    
    .btn-secondary {
        background: #f5f5f5;
        color: #666;
    }
    
    .btn-secondary:hover {
        background: #eee;
    }

    /* ===== FORM STYLES ===== */
    .form-field {
        margin-bottom: 16px;
    }

    .form-field label {
        display: block;
        font-weight: 600;
        margin-bottom: 6px;
        color: #333;
        font-size: 14px;
    }

    .form-field label::after {
        content: attr(data-required);
        color: #f44336;
        margin-left: 4px;
    }

    .form-field .modal-input {
        width: 100%;
        padding: 10px 14px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        font-size: 14px;
        transition: border-color 0.3s;
        box-sizing: border-box;
    }

    .form-field .modal-input:focus {
        outline: none;
        border-color: #e67e22;
        box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.1);
    }

    .file-preview {
        margin-top: 10px;
    }

    .file-preview img {
        max-width: 200px;
        max-height: 150px;
        border-radius: 8px;
        border: 1px solid #eee;
        object-fit: cover;
    }
    
    .modal-success .modal-header { border-bottom-color: #4CAF50; }
    .modal-success .modal-header h3 { color: #4CAF50; }
    
    .modal-error .modal-header { border-bottom-color: #f44336; }
    .modal-error .modal-header h3 { color: #f44336; }
    
    .modal-warning .modal-header { border-bottom-color: #ff9800; }
    .modal-warning .modal-header h3 { color: #ff9800; }
    
    @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes modalSlideIn {
        from { transform: translateY(-30px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }
`;
document.head.appendChild(modalStyles);

// Gán Modal vào window để dùng toàn cục
window.Modal = Modal;
