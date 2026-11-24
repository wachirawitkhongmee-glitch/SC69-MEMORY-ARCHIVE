/**
 * MEMORY MIRROR SC69 — Main Application Controller
 * Orchestrates Landing Desk, Opening Sequence, Recipient Registry,
 * Personal Letter View, Memory Wall, Secret Letter, and Music Player UI.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Dust motes
    DustParticles.init("dustCanvas");

    // 2. Initialize Sound Engine
    SoundEngine.init();

    // DOM Elements
    const landingSection = document.getElementById("landingSection");
    const registrySection = document.getElementById("registrySection");
    const letterSection = document.getElementById("letterSection");
    const envelopeWrapper = document.getElementById("envelopeWrapper");
    const waxSealBtn = document.getElementById("waxSealBtn");
    const openLetterBtn = document.getElementById("openLetterBtn");
    
    // Registry form elements
    const recipientInput = document.getElementById("recipientInput");
    const recipientAutocomplete = document.getElementById("recipientAutocomplete");
    const findLetterBtn = document.getElementById("findLetterBtn");
    const registryErrorBox = document.getElementById("registryErrorBox");
    const approvedStamp = document.getElementById("approvedStamp");
    const quickChipsContainer = document.getElementById("quickChipsContainer");
    const btnToggleAllChips = document.getElementById("btnToggleAllChips");

    let isAllChipsShown = false;

    // Letter view elements
    const letterSalutation = document.getElementById("letterSalutation");
    const letterRoleBadge = document.getElementById("letterRoleBadge");
    const letterDateStamp = document.getElementById("letterDateStamp");
    const letterBodyContent = document.getElementById("letterBodyContent");
    const polaroidGallery = document.getElementById("polaroidGallery");
    const secretLetterToggle = document.getElementById("secretLetterToggle");
    const secretLetterCard = document.getElementById("secretLetterCard");
    const secretCardText = document.getElementById("secretCardText");
    const closeLetterBtn = document.getElementById("closeLetterBtn");
    const reSearchBtn = document.getElementById("reSearchBtn");
    const toastNotice = document.getElementById("toastNotice");

    // Lightbox modal elements
    const photoLightbox = document.getElementById("photoLightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const lightboxCaption = document.getElementById("lightboxCaption");
    const lightboxDate = document.getElementById("lightboxDate");
    const lightboxCloseBtn = document.getElementById("lightboxCloseBtn");

    // Music Player elements
    const musicPlayer = document.getElementById("musicPlayer");
    const vinylDisc = document.getElementById("vinylDisc");
    const btnPlayPause = document.getElementById("btnPlayPause");
    const btnMute = document.getElementById("btnMute");
    const playerFileHint = document.getElementById("playerFileHint");
    const motionToggleBtn = document.getElementById("motionToggleBtn");

    let currentLetter = null;
    let isOpeningInProgress = false;

    // View Navigation Helper
    function showSection(sectionToShow) {
        [landingSection, registrySection, letterSection].forEach(sec => {
            if (sec) sec.classList.remove("active");
        });
        if (sectionToShow) {
            sectionToShow.classList.add("active");
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }

    // ==========================================
    // 3. ENVELOPE OPENING ANIMATION SEQUENCE
    // ==========================================
    function triggerOpenLetter() {
        if (isOpeningInProgress) return;
        isOpeningInProgress = true;

        // 1. Start music immediately on user gesture
        SoundEngine.startOnOpenLetter();

        // 2. Play wax crack sound & scatter particles
        SoundEngine.playWaxSealBreakSound();

        const sealRect = waxSealBtn.getBoundingClientRect();
        const originX = sealRect.left + sealRect.width / 2;
        const originY = sealRect.top + sealRect.height / 2;
        AnimationController.explodeWaxParticles(originX, originY);

        // 3. Animate 3D envelope opening
        envelopeWrapper.classList.add("is-opening");

        // 4. Play paper rustle sound as sheet slides up
        setTimeout(() => {
            SoundEngine.playPaperRustleSound();
        }, 600);

        // 5. Transition into Recipient Registry Card
        setTimeout(() => {
            showSection(registrySection);
            if (recipientInput) recipientInput.focus();
            isOpeningInProgress = false;
        }, 1800);
    }

    if (openLetterBtn) openLetterBtn.addEventListener("click", triggerOpenLetter);
    if (waxSealBtn) waxSealBtn.addEventListener("click", triggerOpenLetter);

    // ==========================================
    // 4. RECIPIENT LOOKUP & VERIFIED STAMP
    // ==========================================
    function handleSearch() {
        const query = recipientInput.value.trim();
        if (!query) {
            showError("กรุณากรอกชื่อหรือชื่อเล่นเพื่อค้นหาจดหมาย");
            return;
        }

        hideError();
        const found = StorageManager.findLetterByQuery(query);

        if (!found) {
            showError("เหมือนจะยังไม่มีจดหมายของชื่อนี้นะ ลองตรวจสอบชื่อหรือชื่อเล่นอีกครั้ง");
            return;
        }

        // Letter found! Play stamp slam animation
        SoundEngine.playStampThudSound();
        approvedStamp.classList.add("stamp-slam");

        setTimeout(() => {
            renderLetter(found);
            showSection(letterSection);
            approvedStamp.classList.remove("stamp-slam");
        }, 850);
    }

    function showError(msg) {
        if (!registryErrorBox) return;
        registryErrorBox.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>${msg}</span>
        `;
        registryErrorBox.classList.add("show");
    }

    function hideError() {
        if (registryErrorBox) registryErrorBox.classList.remove("show");
    }

    if (findLetterBtn) findLetterBtn.addEventListener("click", () => {
        hideAutocomplete();
        handleSearch();
    });

    if (recipientInput) {
        recipientInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                hideAutocomplete();
                handleSearch();
            } else if (e.key === "Escape") {
                hideAutocomplete();
            }
        });

        recipientInput.addEventListener("input", () => {
            hideError();
            const val = recipientInput.value.trim();
            if (val.length >= 1) {
                showAutocomplete(val);
            } else {
                hideAutocomplete();
            }
        });

        recipientInput.addEventListener("focus", () => {
            const val = recipientInput.value.trim();
            if (val.length >= 1) {
                showAutocomplete(val);
            }
        });
    }

    // Autocomplete Dropdown Logic
    function showAutocomplete(query) {
        if (!recipientAutocomplete) return;
        const suggestions = StorageManager.getSuggestions(query, 6);
        if (suggestions.length === 0) {
            hideAutocomplete();
            return;
        }

        recipientAutocomplete.innerHTML = "";
        suggestions.forEach(item => {
            const row = document.createElement("div");
            row.className = "autocomplete-item";
            const displayName = item.nickname || item.name;
            row.innerHTML = `
                <div>
                    <span class="autocomplete-item-name">${displayName}</span>
                    <span style="font-size: 0.8rem; color: #888; margin-left: 6px;">(${item.name})</span>
                </div>
                <span class="autocomplete-item-role">${item.role || ''}</span>
            `;
            row.addEventListener("click", () => {
                recipientInput.value = displayName;
                hideAutocomplete();
                handleSearch();
            });
            recipientAutocomplete.appendChild(row);
        });

        recipientAutocomplete.classList.add("show");
    }

    function hideAutocomplete() {
        if (recipientAutocomplete) recipientAutocomplete.classList.remove("show");
    }

    document.addEventListener("click", (e) => {
        if (recipientAutocomplete && !recipientAutocomplete.contains(e.target) && e.target !== recipientInput) {
            hideAutocomplete();
        }
    });

    // Dynamic Quick Chips
    function renderQuickChips(showAll = false) {
        if (!quickChipsContainer) return;
        quickChipsContainer.innerHTML = "";

        const allLetters = StorageManager.getAllLetters(false);
        const list = showAll ? allLetters : allLetters.slice(0, 16);

        list.forEach(letter => {
            const chip = document.createElement("span");
            chip.className = "chip-tag";
            const displayName = letter.nickname || letter.recipientName;
            chip.textContent = displayName;
            chip.setAttribute("data-name", displayName);

            chip.addEventListener("click", () => {
                recipientInput.value = displayName;
                hideAutocomplete();
                handleSearch();
            });

            quickChipsContainer.appendChild(chip);
        });

        if (btnToggleAllChips) {
            btnToggleAllChips.textContent = showAll
                ? "ย่อรายชื่อ ▴"
                : `ดูรายชื่อทั้งหมด (${allLetters.length} คน) ▾`;
        }
    }

    if (btnToggleAllChips) {
        btnToggleAllChips.addEventListener("click", () => {
            isAllChipsShown = !isAllChipsShown;
            renderQuickChips(isAllChipsShown);
        });
    }

    // Initialize quick chips on load
    renderQuickChips(false);

    // ==========================================
    // 5. RENDER PERSONAL LETTER VIEW
    // ==========================================
    function renderLetter(letter) {
        currentLetter = letter;

        // Salutation
        const displayName = letter.nickname || letter.recipientName;
        letterSalutation.textContent = `Dear ${displayName},`;

        // Role & Date
        letterRoleBadge.textContent = letter.role || "สภานักเรียน บ.ด.๒ รุ่น 69";
        letterDateStamp.textContent = letter.dateStamp || "24 พฤศจิกายน 2569";

        // Handwriting message reveal
        SoundEngine.playPaperRustleSound();
        AnimationController.revealHandwriting(letterBodyContent, letter.message);

        // Secret Letter
        if (letter.secretLetter && letter.secretLetter.trim()) {
            secretLetterCard.classList.remove("open");
            secretCardText.textContent = letter.secretLetter;
            secretLetterToggle.style.display = "inline-flex";
        } else {
            secretLetterToggle.style.display = "none";
        }

        // Memory Wall (Photos on Twine String)
        renderMemoryWall(letter.photos || []);
    }

    // ==========================================
    // 6. RENDER MEMORY WALL (รูปภาพแขวนบนเชือก)
    // ==========================================
    function renderMemoryWall(photos) {
        if (!polaroidGallery) return;
        polaroidGallery.innerHTML = "";

        if (!photos || photos.length === 0) {
            polaroidGallery.innerHTML = `
                <div style="font-family: var(--font-handwriting); color: var(--sepia-brown); font-size: 1.1rem; padding: 20px;">
                    ยังไม่มีรูปภาพในความทรงจำสำหรับจดหมายฉบับนี้
                </div>
            `;
            return;
        }

        photos.forEach((photo, idx) => {
            const item = document.createElement("div");
            item.className = "polaroid-item";

            // Random slight tilt variation
            const tilts = [-3.5, 2.5, -1.8, 3.8, -2.8, 1.8];
            const tilt = tilts[idx % tilts.length];
            item.style.setProperty("--current-rot", `${tilt}deg`);

            item.innerHTML = `
                <div class="clothespin"></div>
                <div class="washi-tape-strip"></div>
                <div class="polaroid-photo-frame">
                    <img src="${photo.url}" alt="${photo.caption || 'Memory Photo'}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\' viewBox=\\'0 0 200 200\\'%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' fill=\\'%23e2ceaa\\'/ %3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23684832\\' font-family=\\'sans-serif\\' font-size=\\'14\\'%3Eรูปภาพความทรงจำ%3C/text%3E%3C/svg%3E'">
                </div>
                <div class="polaroid-caption">
                    <div class="polaroid-caption-text">${photo.caption || 'ความทรงจำ SC69'}</div>
                    ${photo.date ? `<div class="polaroid-caption-date">${photo.date}</div>` : ''}
                </div>
            `;

            // Attach 3D tilt tracking & Lightbox click
            AnimationController.attachPhotoTilt(item);
            item.addEventListener("click", () => {
                openLightbox(photo);
            });

            polaroidGallery.appendChild(item);
        });
    }

    // ==========================================
    // 7. LIGHTBOX MODAL
    // ==========================================
    function openLightbox(photo) {
        if (!photoLightbox || !lightboxImg) return;
        lightboxImg.src = photo.url;
        lightboxCaption.textContent = photo.caption || "";
        lightboxDate.textContent = photo.date || "";
        photoLightbox.classList.add("active");
    }

    function closeLightbox() {
        if (photoLightbox) photoLightbox.classList.remove("active");
    }

    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener("click", closeLightbox);
    if (photoLightbox) {
        photoLightbox.addEventListener("click", (e) => {
            if (e.target === photoLightbox) closeLightbox();
        });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLightbox();
    });

    // ==========================================
    // 8. SECRET LETTER TOGGLE
    // ==========================================
    if (secretLetterToggle) {
        secretLetterToggle.addEventListener("click", () => {
            const isOpen = secretLetterCard.classList.contains("open");
            SoundEngine.playPaperRustleSound();
            if (isOpen) {
                secretLetterCard.classList.remove("open");
            } else {
                secretLetterCard.classList.add("open");
            }
        });
    }

    // ==========================================
    // 9. LETTER CLOSING (เก็บจดหมายไว้ในความทรงจำ)
    // ==========================================
    function showToast(message) {
        if (!toastNotice) return;
        toastNotice.textContent = message;
        toastNotice.classList.add("show");
        setTimeout(() => {
            toastNotice.classList.remove("show");
        }, 3600);
    }

    if (closeLetterBtn) {
        closeLetterBtn.addEventListener("click", () => {
            SoundEngine.playPaperRustleSound();
            showToast("Keep this memory close to your heart. จดหมายฉบับนี้ถูกเก็บไว้ในความทรงจำแล้ว ♡");
            setTimeout(() => {
                showSection(landingSection);
                envelopeWrapper.classList.remove("is-opening");
            }, 1200);
        });
    }

    if (reSearchBtn) {
        reSearchBtn.addEventListener("click", () => {
            showSection(registrySection);
            if (recipientInput) recipientInput.focus();
        });
    }

    // ==========================================
    // 9.5 SHARED SC69 PHOTO GALLERY (Scroll + Lightbox)
    // ==========================================
    const galleryTrack = document.getElementById("sharedGalleryTrack");
    const galleryScrollLeft = document.getElementById("galleryScrollLeft");
    const galleryScrollRight = document.getElementById("galleryScrollRight");

    if (galleryScrollLeft && galleryTrack) {
        galleryScrollLeft.addEventListener("click", () => {
            galleryTrack.scrollBy({ left: -340, behavior: "smooth" });
        });
    }
    if (galleryScrollRight && galleryTrack) {
        galleryScrollRight.addEventListener("click", () => {
            galleryTrack.scrollBy({ left: 340, behavior: "smooth" });
        });
    }

    // Lightbox click on shared gallery frames
    if (galleryTrack) {
        galleryTrack.querySelectorAll(".shared-gallery-frame").forEach(frame => {
            frame.addEventListener("click", () => {
                const src = frame.getAttribute("data-src");
                const caption = frame.getAttribute("data-caption") || "";
                if (photoLightbox && lightboxImg) {
                    lightboxImg.src = src;
                    if (lightboxCaption) lightboxCaption.textContent = caption;
                    if (lightboxDate) lightboxDate.textContent = "สภานักเรียน บ.ด.๒ รุ่น 69 • 2569";
                    photoLightbox.classList.add("active");
                }
            });
        });

        // Touch/drag scroll support
        let isDown = false;
        let startX, scrollLeftPos;
        galleryTrack.addEventListener("mousedown", (e) => {
            isDown = true;
            galleryTrack.style.cursor = "grabbing";
            startX = e.pageX - galleryTrack.offsetLeft;
            scrollLeftPos = galleryTrack.scrollLeft;
        });
        galleryTrack.addEventListener("mouseleave", () => { isDown = false; galleryTrack.style.cursor = "grab"; });
        galleryTrack.addEventListener("mouseup", () => { isDown = false; galleryTrack.style.cursor = "grab"; });
        galleryTrack.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - galleryTrack.offsetLeft;
            const walk = (x - startX) * 1.5;
            galleryTrack.scrollLeft = scrollLeftPos - walk;
        });
        galleryTrack.style.cursor = "grab";
    }

    // ==========================================
    // 10. MUSIC PLAYER UI SYNCHRONIZATION
    // ==========================================
    SoundEngine.onStateChange((state) => {
        if (state.isPlaying) {
            musicPlayer.classList.add("is-playing");
            vinylDisc.classList.add("spinning");
            btnPlayPause.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                </svg>
            `;
            btnPlayPause.setAttribute("aria-label", "พักเพลง");
        } else {
            musicPlayer.classList.remove("is-playing");
            vinylDisc.classList.remove("spinning");
            btnPlayPause.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
            btnPlayPause.setAttribute("aria-label", "เล่นเพลง");
        }

        if (state.isMuted) {
            btnMute.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                </svg>
            `;
            btnMute.setAttribute("aria-label", "เปิดเสียง");
        } else {
            btnMute.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            `;
            btnMute.setAttribute("aria-label", "ปิดเสียง");
        }

        // File hint
        if (state.isUsingYouTube) {
            playerFileHint.textContent = "กำลังเล่น: หัวใจผูกกัน - Acoustic (YouTube Official)";
        } else if (state.fileNotFound) {
            playerFileHint.textContent = "กำลังใช้เสียงสังเคราะห์อะคูสติก | รองรับ YouTube & MP3";
        } else {
            playerFileHint.textContent = "กำลังเล่น: หัวใจผูกกัน - Acoustic (Memory Mirror SC69)";
        }
    });

    if (btnPlayPause) {
        btnPlayPause.addEventListener("click", () => {
            SoundEngine.togglePlay();
        });
    }

    if (btnMute) {
        btnMute.addEventListener("click", () => {
            SoundEngine.toggleMute();
        });
    }

    if (vinylDisc) {
        vinylDisc.addEventListener("click", () => {
            SoundEngine.togglePlay();
        });
    }

    // Reduced Motion Toggle (if present)
    let isReducedMotionActive = false;
    if (motionToggleBtn) {
        motionToggleBtn.addEventListener("click", () => {
            isReducedMotionActive = !isReducedMotionActive;
            DustParticles.setReducedMotion(isReducedMotionActive);
            motionToggleBtn.textContent = isReducedMotionActive ? "เปิด Animation" : "ลด Animation";
        });
    }

    // Secret Admin Access (Ctrl+Shift+A or 3-click on TP emblem)
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
            e.preventDefault();
            window.location.href = "admin.html";
        }
    });

    const brandEmblem = document.getElementById("brandEmblem");
    let emblemClickCount = 0;
    let emblemClickTimer = null;
    if (brandEmblem) {
        brandEmblem.addEventListener("click", (e) => {
            e.preventDefault();
            emblemClickCount++;
            clearTimeout(emblemClickTimer);
            if (emblemClickCount >= 3) {
                window.location.href = "admin.html";
                emblemClickCount = 0;
            } else {
                emblemClickTimer = setTimeout(() => {
                    emblemClickCount = 0;
                }, 1200);
            }
        });
    }
});
