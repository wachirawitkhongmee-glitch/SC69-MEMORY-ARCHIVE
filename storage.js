/**
 * MEMORY MIRROR SC69 — Storage & Database Manager
 * Handles LocalStorage persistence, IndexedDB for photos, fuzzy matching and import/export.
 */

const StorageManager = (function () {
    const STORAGE_KEY = APP_CONFIG.dbStorageKey;
    const DB_NAME = "MemoryMirrorSC69_DB";
    const DB_VERSION = 1;
    const STORE_NAME = "photos";

    let idb = null;

    // Initialize IndexedDB for high-capacity photo storage
    function initDB() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                console.warn("[StorageManager] IndexedDB not supported; using inline storage");
                resolve(null);
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
            };
            request.onsuccess = function (e) {
                idb = e.target.result;
                resolve(idb);
            };
            request.onerror = function (e) {
                console.warn("[StorageManager] IndexedDB failed to open:", e);
                resolve(null);
            };
        });
    }

    // Initialize data from LocalStorage or seed defaults
    function getAllLetters(includeDrafts = false) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            let letters = [];
            if (!raw) {
                letters = JSON.parse(JSON.stringify(DEFAULT_LETTERS));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
            } else {
                letters = JSON.parse(raw);
            }

            if (!includeDrafts) {
                return letters.filter(l => l.isPublished !== false);
            }
            return letters;
        } catch (e) {
            console.error("[StorageManager] Failed to read letters from localStorage:", e);
            return DEFAULT_LETTERS;
        }
    }

    function saveAllLetters(letters) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
            return true;
        } catch (e) {
            console.error("[StorageManager] Failed to write letters:", e);
            return false;
        }
    }

    function getLetterById(id) {
        const letters = getAllLetters(true);
        return letters.find(l => l.id === id) || null;
    }

    /**
     * Clean and normalize string for robust matching
     */
    function normalize(str) {
        if (!str) return "";
        let s = str.toString().trim().toLowerCase();
        // Handle Thai keyboard typo: key ึ and key 7 share the exact same key!
        s = s.replace(/\/ึ/g, "/7").replace(/\s+ึ/g, " 7");
        // Strip common prefixes only when followed by actual name characters
        s = s.replace(/^(ถึง|to|นาย|นางสาว|ด\.ช\.|ด\.ญ\.|คุณ|พี่|น้อง|เพื่อน|อ\.|ครู|อาจารย์)\s*(.+)$/i, "$2");
        // Remove spaces
        s = s.replace(/\s+/g, "");
        return s;
    }

    function stripPunct(str) {
        return normalize(str).replace(/[\/\-_\.]/g, "");
    }

    /**
     * Search letter by name, nickname, or aliases
     * Supports Thai, English, case-insensitive, slash variants, partial matching
     */
    function findLetterByQuery(query) {
        if (!query || !query.trim()) return null;
        const qNorm = normalize(query);
        const qClean = stripPunct(query);
        const letters = getAllLetters(false);

        // 1. Exact normalized match on nickname or alias first
        for (const letter of letters) {
            const nickNorm = normalize(letter.nickname);
            if (nickNorm && nickNorm === qNorm) {
                return letter;
            }

            if (Array.isArray(letter.aliases)) {
                for (const alias of letter.aliases) {
                    if (normalize(alias) === qNorm) {
                        return letter;
                    }
                }
            }
        }

        // 2. Exact match on recipientName
        for (const letter of letters) {
            const nameNorm = normalize(letter.recipientName);
            if (nameNorm && nameNorm === qNorm) {
                return letter;
            }
        }

        // 3. Punctuation stripped match (e.g. "ออโต้ 7" or "ออโต้7" vs "ออโต้/7")
        for (const letter of letters) {
            const nickClean = stripPunct(letter.nickname);
            if (nickClean && nickClean === qClean) {
                return letter;
            }

            if (Array.isArray(letter.aliases)) {
                for (const alias of letter.aliases) {
                    if (stripPunct(alias) === qClean) {
                        return letter;
                    }
                }
            }
        }

        // 4. Substring / inclusion match (only if query is meaningful)
        if (qNorm.length >= 1) {
            for (const letter of letters) {
                const nameNorm = normalize(letter.recipientName);
                const nickNorm = normalize(letter.nickname);
                const nickClean = stripPunct(letter.nickname);

                if (nickNorm && nickNorm.includes(qNorm)) {
                    return letter;
                }

                if (qClean.length >= 2 && nickClean && nickClean.includes(qClean)) {
                    return letter;
                }

                if (Array.isArray(letter.aliases)) {
                    for (const alias of letter.aliases) {
                        const aliasNorm = normalize(alias);
                        const aliasClean = stripPunct(alias);
                        if (aliasNorm && aliasNorm.includes(qNorm)) {
                            return letter;
                        }
                        if (qClean.length >= 2 && aliasClean && aliasClean.includes(qClean)) {
                            return letter;
                        }
                    }
                }

                if (nameNorm && nameNorm.includes(qNorm)) {
                    return letter;
                }
            }
        }

        return null;
    }

    /**
     * Suggest similar recipients if query didn't match directly
     */
    function getSuggestions(query, limit = 6) {
        if (!query || !query.trim()) return [];
        const qRaw = query.trim().toLowerCase();
        const qNorm = normalize(query);
        const qClean = stripPunct(query);
        const letters = getAllLetters(false);
        const results = [];

        letters.forEach(l => {
            const name = (l.recipientName || "").toLowerCase();
            const nick = (l.nickname || "").toLowerCase();
            const aliases = (l.aliases || []).map(a => (a || "").toLowerCase());

            const nameNorm = normalize(l.recipientName);
            const nickNorm = normalize(l.nickname);
            const nickClean = stripPunct(l.nickname);

            const matchRaw = qRaw.length > 0 && (name.includes(qRaw) || nick.includes(qRaw) || aliases.some(a => a.includes(qRaw)));
            const matchNorm = qNorm.length > 0 && (nameNorm.includes(qNorm) || nickNorm.includes(qNorm));
            const matchClean = qClean.length >= 2 && nickClean && nickClean.includes(qClean);

            if (matchRaw || matchNorm || matchClean) {
                results.push({
                    id: l.id,
                    name: l.recipientName,
                    nickname: l.nickname,
                    role: l.role
                });
            }
        });

        return results.slice(0, limit);
    }

    /**
     * Save or update a single letter
     * Author is ALWAYS enforced as "ต้นปาล์ม"
     */
    function saveLetter(letterData) {
        const letters = getAllLetters(true);
        const now = new Date().toISOString();

        // Enforce system author
        const cleanLetter = {
            ...letterData,
            author: APP_CONFIG.author,
            updatedAt: now
        };

        if (!cleanLetter.id) {
            cleanLetter.id = "letter-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
            cleanLetter.createdAt = now;
            letters.unshift(cleanLetter);
        } else {
            const idx = letters.findIndex(l => l.id === cleanLetter.id);
            if (idx >= 0) {
                cleanLetter.createdAt = letters[idx].createdAt || now;
                letters[idx] = cleanLetter;
            } else {
                cleanLetter.createdAt = now;
                letters.unshift(cleanLetter);
            }
        }

        saveAllLetters(letters);
        return cleanLetter;
    }

    function deleteLetter(id) {
        const letters = getAllLetters(true);
        const filtered = letters.filter(l => l.id !== id);
        saveAllLetters(filtered);
        return filtered.length < letters.length;
    }

    function resetToDefaults() {
        const letters = JSON.parse(JSON.stringify(DEFAULT_LETTERS));
        saveAllLetters(letters);
        return letters;
    }

    function exportJSON() {
        const letters = getAllLetters(true);
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            version: "1.0",
            author: APP_CONFIG.author,
            letters: letters
        }, null, 2);
    }

    function importJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            const letters = Array.isArray(parsed) ? parsed : parsed.letters;
            if (!Array.isArray(letters)) {
                throw new Error("Invalid format: expected array of letters");
            }
            // Enforce author
            letters.forEach(l => {
                l.author = APP_CONFIG.author;
            });
            saveAllLetters(letters);
            return { success: true, count: letters.length };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // Photo caching / storing via IndexedDB
    async function storePhoto(id, dataUrl) {
        if (!idb) await initDB();
        if (!idb) return null;
        return new Promise((resolve) => {
            const tx = idb.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.put({ id: id, dataUrl: dataUrl });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    }

    async function getPhoto(id) {
        if (!idb) await initDB();
        if (!idb) return null;
        return new Promise((resolve) => {
            const tx = idb.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
            req.onerror = () => resolve(null);
        });
    }

    // Initialize on load
    initDB();

    return {
        getAllLetters,
        getLetterById,
        findLetterByQuery,
        getSuggestions,
        saveLetter,
        deleteLetter,
        resetToDefaults,
        exportJSON,
        importJSON,
        storePhoto,
        getPhoto
    };
})();

if (typeof window !== "undefined") {
    window.StorageManager = StorageManager;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { StorageManager };
}
