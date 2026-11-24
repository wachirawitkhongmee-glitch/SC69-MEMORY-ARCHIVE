/**
 * MEMORY MIRROR SC69 — Admin Dashboard Controller
 * Full CRUD for letters, photos, secret messages, status, import/export, and live preview.
 */

document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_PW = "tonpalm69"; // Default secure password for Tonpalm
    const SESSION_KEY = APP_CONFIG.adminSessionKey;

    // Sections
    const loginSection = document.getElementById("adminLoginSection");
    const dashboardSection = document.getElementById("adminDashboardSection");
    const loginForm = document.getElementById("loginForm");
    const adminPasswordInput = document.getElementById("adminPassword");
    const loginError = document.getElementById("loginError");
    const btnLogout = document.getElementById("btnLogout");

    // Stats
    const statTotalLetters = document.getElementById("statTotalLetters");
    const statPublishedLetters = document.getElementById("statPublishedLetters");
    const statTotalPhotos = document.getElementById("statTotalPhotos");
    const statSecretLetters = document.getElementById("statSecretLetters");

    // Table & Search
    const lettersTableBody = document.getElementById("lettersTableBody");
    const adminSearchInput = document.getElementById("adminSearchInput");
    const btnAddNewLetter = document.getElementById("btnAddNewLetter");
    const btnExportData = document.getElementById("btnExportData");
    const btnImportData = document.getElementById("btnImportData");
    const importFileInput = document.getElementById("importFileInput");
    const btnResetDefaults = document.getElementById("btnResetDefaults");

    // Form Modal
    const letterFormModal = document.getElementById("letterFormModal");
    const modalFormTitle = document.getElementById("modalFormTitle");
    const letterEditForm = document.getElementById("letterEditForm");
    const editLetterId = document.getElementById("editLetterId");
    const editRecipientName = document.getElementById("editRecipientName");
    const editNickname = document.getElementById("editNickname");
    const editAliases = document.getElementById("editAliases");
    const editRole = document.getElementById("editRole");
    const editDateStamp = document.getElementById("editDateStamp");
    const editIsPublished = document.getElementById("editIsPublished");
    const editMessage = document.getElementById("editMessage");
    const editSecretLetter = document.getElementById("editSecretLetter");
    const photoFileInput = document.getElementById("photoFileInput");
    const formPhotosList = document.getElementById("formPhotosList");
    const btnCloseFormModal = document.getElementById("btnCloseFormModal");
    const btnCancelEdit = document.getElementById("btnCancelEdit");

    // Preview Modal
    const previewModal = document.getElementById("previewModal");
    const previewParchmentContainer = document.getElementById("previewParchmentContainer");
    const btnClosePreview = document.getElementById("btnClosePreview");

    // Temporary photo state for active editing
    let currentEditingPhotos = [];

    // ==========================================
    // 1. AUTHENTICATION
    // ==========================================
    function checkAuth() {
        const isAuth = sessionStorage.getItem(SESSION_KEY) === "true";
        if (isAuth) {
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
            loadDashboard();
        } else {
            loginSection.style.display = "block";
            dashboardSection.style.display = "none";
        }
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const entered = adminPasswordInput.value;
        if (entered === ADMIN_PW || entered === "sc69admin") {
            sessionStorage.setItem(SESSION_KEY, "true");
            loginError.style.display = "none";
            checkAuth();
        } else {
            loginError.style.display = "block";
        }
    });

    btnLogout.addEventListener("click", () => {
        sessionStorage.removeItem(SESSION_KEY);
        checkAuth();
    });

    // ==========================================
    // 2. DASHBOARD DATA & STATS
    // ==========================================
    function loadDashboard() {
        const letters = StorageManager.getAllLetters(true);
        updateStats(letters);
        renderTable(letters);
    }

    function updateStats(letters) {
        const total = letters.length;
        const published = letters.filter(l => l.isPublished !== false).length;
        let photos = 0;
        let secrets = 0;

        letters.forEach(l => {
            if (Array.isArray(l.photos)) photos += l.photos.length;
            if (l.secretLetter && l.secretLetter.trim()) secrets++;
        });

        statTotalLetters.textContent = total;
        statPublishedLetters.textContent = published;
        statTotalPhotos.textContent = photos;
        statSecretLetters.textContent = secrets;
    }

    function renderTable(letters) {
        lettersTableBody.innerHTML = "";

        const query = (adminSearchInput.value || "").trim().toLowerCase();
        const filtered = letters.filter(l => {
            if (!query) return true;
            const name = (l.recipientName || "").toLowerCase();
            const nick = (l.nickname || "").toLowerCase();
            const role = (l.role || "").toLowerCase();
            const aliases = (l.aliases || []).join(" ").toLowerCase();
            return name.includes(query) || nick.includes(query) || role.includes(query) || aliases.includes(query);
        });

        if (filtered.length === 0) {
            lettersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--rope-twine); padding: 30px;">
                        ไม่พบข้อมูลจดหมายที่ค้นหา
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(letter => {
            const tr = document.createElement("tr");

            const isPub = letter.isPublished !== false;
            const statusBadge = isPub
                ? `<span class="badge-status badge-published">เผยแพร่แล้ว</span>`
                : `<span class="badge-status badge-draft">แบบร่าง</span>`;

            const photoCount = Array.isArray(letter.photos) ? letter.photos.length : 0;
            const hasSecret = letter.secretLetter && letter.secretLetter.trim()
                ? `<span style="color: #ECC77D;">🔒 มี</span>`
                : `<span style="color: #888;">─</span>`;

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: #FAF4E6;">${letter.recipientName}</div>
                    <div style="font-size: 0.8rem; color: var(--gold-light); font-family: var(--font-handwriting);">${letter.nickname ? `ชื่อเล่น: ${letter.nickname}` : ''}</div>
                </td>
                <td>
                    <span style="font-size: 0.84rem; color: var(--aged-parchment);">${letter.role || '—'}</span>
                </td>
                <td>
                    <span style="font-size: 0.85rem;">📷 ${photoCount} ใบ</span>
                </td>
                <td>${hasSecret}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action-icon btn-preview-item" data-id="${letter.id}" title="ดูตัวอย่างแบบเต็ม">
                            👁️ ตัวอย่าง
                        </button>
                        <button class="btn-action-icon btn-edit-item" data-id="${letter.id}" title="แก้ไขจดหมาย">
                            ✏️ แก้ไข
                        </button>
                        <button class="btn-action-icon btn-action-delete btn-delete-item" data-id="${letter.id}" title="ลบจดหมาย">
                            🗑️ ลบ
                        </button>
                    </div>
                </td>
            `;

            lettersTableBody.appendChild(tr);
        });

        // Attach event handlers
        document.querySelectorAll(".btn-preview-item").forEach(btn => {
            btn.addEventListener("click", () => openPreview(btn.getAttribute("data-id")));
        });
        document.querySelectorAll(".btn-edit-item").forEach(btn => {
            btn.addEventListener("click", () => openEditForm(btn.getAttribute("data-id")));
        });
        document.querySelectorAll(".btn-delete-item").forEach(btn => {
            btn.addEventListener("click", () => deleteLetter(btn.getAttribute("data-id")));
        });
    }

    adminSearchInput.addEventListener("input", () => {
        renderTable(StorageManager.getAllLetters(true));
    });

    // ==========================================
    // 3. ADD & EDIT LETTER FORM
    // ==========================================
    function openAddForm() {
        modalFormTitle.textContent = "เขียนจดหมายความทรงจำใหม่";
        editLetterId.value = "";
        editRecipientName.value = "";
        editNickname.value = "";
        editAliases.value = "";
        editRole.value = "สภานักเรียน บ.ด.๒ รุ่น 69";
        editDateStamp.value = "24 พฤศจิกายน 2569";
        editIsPublished.checked = true;
        editMessage.value = "";
        editSecretLetter.value = "";

        currentEditingPhotos = [];
        renderFormPhotos();

        letterFormModal.classList.add("active");
    }

    function openEditForm(id) {
        const letter = StorageManager.getLetterById(id);
        if (!letter) return;

        modalFormTitle.textContent = `แก้ไขจดหมาย: ${letter.recipientName}`;
        editLetterId.value = letter.id;
        editRecipientName.value = letter.recipientName || "";
        editNickname.value = letter.nickname || "";
        editAliases.value = Array.isArray(letter.aliases) ? letter.aliases.join(", ") : "";
        editRole.value = letter.role || "";
        editDateStamp.value = letter.dateStamp || "24 พฤศจิกายน 2569";
        editIsPublished.checked = letter.isPublished !== false;
        editMessage.value = letter.message || "";
        editSecretLetter.value = letter.secretLetter || "";

        currentEditingPhotos = JSON.parse(JSON.stringify(letter.photos || []));
        renderFormPhotos();

        letterFormModal.classList.add("active");
    }

    function closeFormModal() {
        letterFormModal.classList.remove("active");
    }

    btnAddNewLetter.addEventListener("click", openAddForm);
    btnCloseFormModal.addEventListener("click", closeFormModal);
    btnCancelEdit.addEventListener("click", closeFormModal);

    // ==========================================
    // 4. PHOTO MANAGEMENT IN FORM
    // ==========================================
    function renderFormPhotos() {
        formPhotosList.innerHTML = "";

        currentEditingPhotos.forEach((photo, idx) => {
            const card = document.createElement("div");
            card.className = "admin-photo-card";
            card.innerHTML = `
                <button type="button" class="btn-remove-photo" data-idx="${idx}" title="ลบรูป">✕</button>
                <img src="${photo.url}" alt="Photo">
                <input type="text" class="admin-photo-caption-input" placeholder="คำบรรยายรูป..." value="${photo.caption || ''}" data-idx="${idx}">
            `;

            formPhotosList.appendChild(card);
        });

        // Attach event listeners for caption change & delete
        formPhotosList.querySelectorAll(".admin-photo-caption-input").forEach(inp => {
            inp.addEventListener("input", (e) => {
                const idx = parseInt(e.target.getAttribute("data-idx"));
                if (currentEditingPhotos[idx]) {
                    currentEditingPhotos[idx].caption = e.target.value;
                }
            });
        });

        formPhotosList.querySelectorAll(".btn-remove-photo").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.target.getAttribute("data-idx"));
                currentEditingPhotos.splice(idx, 1);
                renderFormPhotos();
            });
        });
    }

    photoFileInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Compress image slightly if large for optimal localStorage usage
                    const canvas = document.createElement("canvas");
                    const maxDim = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

                    currentEditingPhotos.push({
                        id: "photo-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
                        url: compressedDataUrl,
                        caption: file.name.replace(/\.[^/.]+$/, ""),
                        date: "2569"
                    });

                    renderFormPhotos();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        photoFileInput.value = "";
    });

    // Save Form
    letterEditForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const id = editLetterId.value;
        const aliasesRaw = editAliases.value;
        const aliasesList = aliasesRaw
            ? aliasesRaw.split(",").map(s => s.trim()).filter(Boolean)
            : [];

        const letterData = {
            id: id || undefined,
            recipientName: editRecipientName.value.trim(),
            nickname: editNickname.value.trim(),
            aliases: aliasesList,
            role: editRole.value.trim(),
            dateStamp: editDateStamp.value.trim(),
            isPublished: editIsPublished.checked,
            message: editMessage.value.trim(),
            secretLetter: editSecretLetter.value.trim(),
            photos: currentEditingPhotos
        };

        StorageManager.saveLetter(letterData);
        closeFormModal();
        loadDashboard();
    });

    // Delete Letter
    function deleteLetter(id) {
        const letter = StorageManager.getLetterById(id);
        if (!letter) return;

        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบจดหมายของ "${letter.recipientName}"?`)) {
            StorageManager.deleteLetter(id);
            loadDashboard();
        }
    }

    // ==========================================
    // 5. LIVE PREVIEW MODAL
    // ==========================================
    function openPreview(id) {
        const letter = StorageManager.getLetterById(id);
        if (!letter) return;

        const displayName = letter.nickname || letter.recipientName;
        const photos = letter.photos || [];

        let photosHtml = "";
        photos.forEach((p, idx) => {
            const tilts = [-3, 3, -2, 2];
            const tilt = tilts[idx % tilts.length];
            photosHtml += `
                <div class="polaroid-item" style="transform: rotate(${tilt}deg); margin: 10px;">
                    <div class="clothespin"></div>
                    <div class="washi-tape-strip"></div>
                    <div class="polaroid-photo-frame">
                        <img src="${p.url}" alt="${p.caption || ''}">
                    </div>
                    <div class="polaroid-caption">
                        <div class="polaroid-caption-text">${p.caption || ''}</div>
                        ${p.date ? `<div class="polaroid-caption-date">${p.date}</div>` : ''}
                    </div>
                </div>
            `;
        });

        const secretHtml = letter.secretLetter && letter.secretLetter.trim()
            ? `
                <div class="secret-letter-section" style="margin-top: 30px;">
                    <div class="secret-letter-card open" style="display: block;">
                        <div class="secret-card-header">
                            <span>🔒 จดหมายลับเฉพาะคุณ</span>
                        </div>
                        <div class="secret-card-text">${letter.secretLetter}</div>
                    </div>
                </div>
            `
            : "";

        previewParchmentContainer.innerHTML = `
            <article class="parchment-letter">
                <div class="letter-header-meta">
                    <div>
                        <h2 class="recipient-salutation">Dear ${displayName},</h2>
                        <span class="recipient-role-badge">${letter.role || 'สภานักเรียน บ.ด.๒ รุ่น 69'}</span>
                    </div>
                    <div class="letter-postmark-stamp">
                        <div class="circular-postmark">
                            <span>BANGKOK</span>
                            <strong>SC69</strong>
                            <span>${letter.dateStamp || '24 พ.ย. 2569'}</span>
                        </div>
                    </div>
                </div>

                <div class="letter-body-content" style="white-space: pre-line;">
                    ${letter.message}
                </div>

                ${secretHtml}

                <div class="letter-signoff">
                    <div class="signoff-closing">ด้วยความหวังดีและความทรงจำดี ๆ</div>
                    <div class="signoff-author">จาก ต้นปาล์ม ♡</div>
                </div>

                ${photos.length > 0 ? `
                    <div class="memory-wall-section" style="margin-top: 40px;">
                        <div class="memory-wall-header">
                            <h3 class="memory-wall-title">ความทรงจำที่ร้อยเรียงไว้</h3>
                        </div>
                        <div class="twine-line-stage">
                            <div class="twine-rope-strand"></div>
                            <div class="polaroid-gallery">
                                ${photosHtml}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </article>
        `;

        previewModal.classList.add("active");
    }

    btnClosePreview.addEventListener("click", () => {
        previewModal.classList.remove("active");
    });

    // ==========================================
    // 6. BACKUP & RESTORE (EXPORT / IMPORT JSON)
    // ==========================================
    btnExportData.addEventListener("click", () => {
        const jsonStr = StorageManager.exportJSON();
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `memory_mirror_sc69_backup_${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    btnImportData.addEventListener("click", () => {
        importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const res = StorageManager.importJSON(event.target.result);
            if (res.success) {
                alert(`นำเข้าข้อมูลจดหมายสำเร็จเรียบร้อย (${res.count} ฉบับ)`);
                loadDashboard();
            } else {
                alert(`เกิดข้อผิดพลาดในการนำเข้าไฟล์: ${res.error}`);
            }
        };
        reader.readAsText(file);
        importFileInput.value = "";
    });

    btnResetDefaults.addEventListener("click", () => {
        if (confirm("คุณต้องการคืนค่าข้อมูลเริ่มต้นของ SC69 ทั้งหมดใช่หรือไม่? (ข้อมูลที่แก้ไขเองจะถูกแทนที่ด้วยค่าตั้งต้น)")) {
            StorageManager.resetToDefaults();
            loadDashboard();
        }
    });

    // Check initial auth state
    checkAuth();
});
