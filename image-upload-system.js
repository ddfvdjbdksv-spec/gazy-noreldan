/**
 * ═══════════════════════════════════════════════════════════════
 *  image-upload-system.js
 *  نظام رفع الصور الشامل — مستر غازي نور الدين
 *
 *  يغطي:
 *  1. رفع صورة الطالب (إضافة + تعديل)
 *  2. رفع صورة / لوجو المجموعة (إضافة + تعديل)
 *  3. رفع صورة المدرس
 *  4. رفع صورة السنة الدراسية
 *  5. رفع صورة الشخصية (Character / Reward)
 *  6. رفع صورة نظام الدخول (السكرتير)
 *
 *  التخزين: IndexedDB (نفس قاعدة StorageEngine الموجودة)
 *  الصور: base64 → محفوظة في جدول "images" بالـ ID الخاص بالعنصر
 * ═══════════════════════════════════════════════════════════════
 */

// ─── متغير عام لتتبع جدول الصور ──────────────────────────────
window._imageStore = {};   // { "student_123": "data:image/..." , "group_456": "..." }

// ─── تهيئة نظام الصور من localStorage (احتياطي) ──────────────
(function _loadImageStoreFromLS() {
    try {
        const raw = localStorage.getItem('edu_image_store');
        if (raw) window._imageStore = JSON.parse(raw) || {};
    } catch(e) { window._imageStore = {}; }
})();

function _persistImageStore() {
    try {
        localStorage.setItem('edu_image_store', JSON.stringify(window._imageStore || {}));
    } catch(e) {
        // في حالة امتلاء localStorage - حذف أقدم الصور
        console.warn('[ImageStore] localStorage quota exceeded, pruning...');
        const keys = Object.keys(window._imageStore);
        if (keys.length > 5) {
            delete window._imageStore[keys[0]];
            _persistImageStore();
        }
    }
}

/** احفظ صورة عنصر معيّن */
function saveEntityImage(entityType, entityId, dataUrl) {
    const key = `${entityType}_${entityId}`;
    window._imageStore[key] = dataUrl;
    _persistImageStore();
}

/** اجلب صورة عنصر */
function getEntityImage(entityType, entityId) {
    const key = `${entityType}_${entityId}`;
    return (window._imageStore && window._imageStore[key]) || null;
}

/** احذف صورة عنصر */
function deleteEntityImage(entityType, entityId) {
    const key = `${entityType}_${entityId}`;
    if (window._imageStore) delete window._imageStore[key];
    _persistImageStore();
}

// ─── مكوّن رافع الصورة القابل لإعادة الاستخدام ───────────────
/**
 * ينشئ HTML لرافع الصورة
 * @param {string} entityType - student | group | teacher | grade | character | secretary
 * @param {string|null} entityId - id العنصر (null عند الإضافة)
 * @param {object} opts - { label, size, shape }
 */
function buildImageUploadHTML(entityType, entityId = null, opts = {}) {
    const label  = opts.label  || 'الصورة';
    const size   = opts.size   || 90;
    const shape  = opts.shape  || 'circle'; // circle | rounded
    const borderRadius = shape === 'circle' ? '50%' : '16px';

    const existingImg = entityId ? getEntityImage(entityType, entityId) : null;
    const inputId  = `img-input-${entityType}-${entityId || 'new'}`;
    const previewId = `img-preview-${entityType}-${entityId || 'new'}`;

    const avatarBg = existingImg
        ? `background:url('${existingImg}') center/cover no-repeat;`
        : `background:linear-gradient(135deg,var(--primary,#4f46e5),var(--accent,#10b981));`;

    const innerContent = existingImg
        ? ''
        : `<i class="fas fa-camera" style="font-size:${Math.floor(size*0.35)}px;color:white;opacity:0.9;"></i>`;

    return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:1rem;">
            <div id="${previewId}"
                onclick="document.getElementById('${inputId}').click()"
                style="width:${size}px;height:${size}px;border-radius:${borderRadius};
                       ${avatarBg}
                       cursor:pointer;display:flex;align-items:center;justify-content:center;
                       border:3px dashed rgba(255,255,255,0.4);
                       box-shadow:0 4px 15px rgba(0,0,0,0.15);
                       position:relative;overflow:hidden;transition:all 0.2s;"
                title="اضغط لاختيار ${label}">
                ${innerContent}
                <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);
                             padding:4px 0;text-align:center;font-size:${Math.max(9, Math.floor(size*0.12))}px;
                             color:white;opacity:0;transition:opacity 0.2s;"
                     class="img-overlay-label">تغيير</div>
            </div>
            <span style="font-size:0.78rem;color:var(--text-muted,#64748b);text-align:center;">${label}</span>
            <input type="file" id="${inputId}" accept="image/*" style="display:none;"
                onchange="handleImageUpload(this,'${entityType}','${entityId || ''}','${previewId}')">
            ${existingImg ? `
            <button type="button" onclick="removeEntityImageUI('${entityType}','${entityId || ''}','${previewId}','${inputId}')"
                style="font-size:0.72rem;color:var(--danger,#ef4444);background:none;border:none;cursor:pointer;padding:2px 8px;">
                <i class="fas fa-trash-alt"></i> حذف الصورة
            </button>` : ''}
        </div>`;
}

/** معالجة رفع الصورة — تحويلها لـ base64 وعرضها */
function handleImageUpload(inputEl, entityType, entityId, previewId) {
    const file = inputEl.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        if (typeof showNotification === 'function') showNotification('يرجى اختيار ملف صورة صالح', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        if (typeof showNotification === 'function') showNotification('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;

        // ضغط الصورة قبل الحفظ
        _compressImage(dataUrl, function(compressed) {
            // عرض الصورة في الـ preview
            const previewEl = document.getElementById(previewId);
            if (previewEl) {
                previewEl.style.background = `url('${compressed}') center/cover no-repeat`;
                previewEl.innerHTML = `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);padding:4px 0;text-align:center;font-size:10px;color:white;opacity:0;" class="img-overlay-label">تغيير</div>`;
                previewEl.querySelector('.img-overlay-label')?.style && null;
            }

            // حفظ الصورة مؤقتاً في dataset الـ input
            inputEl.dataset.compressed = compressed;

            // إذا كان entityId موجوداً — احفظ فوراً
            if (entityId && entityId !== 'null' && entityId !== '') {
                saveEntityImage(entityType, entityId, compressed);
            }
        });
    };
    reader.readAsDataURL(file);
}

/** ضغط الصورة للتوفير في الذاكرة */
function _compressImage(dataUrl, callback, maxWidth = 300, quality = 0.82) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.floor(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { callback(dataUrl); };
    img.src = dataUrl;
}

/** حذف الصورة من الواجهة */
function removeEntityImageUI(entityType, entityId, previewId, inputId) {
    const previewEl = document.getElementById(previewId);
    const size = previewEl ? previewEl.offsetWidth : 90;
    const borderRadius = previewEl ? previewEl.style.borderRadius : '50%';

    if (previewEl) {
        previewEl.style.background = 'linear-gradient(135deg,var(--primary,#4f46e5),var(--accent,#10b981))';
        previewEl.innerHTML = `<i class="fas fa-camera" style="font-size:${Math.floor(size*0.35)}px;color:white;opacity:0.9;"></i>
            <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);padding:4px 0;text-align:center;font-size:10px;color:white;opacity:0;" class="img-overlay-label">تغيير</div>`;
    }

    const inputEl = document.getElementById(inputId);
    if (inputEl) { inputEl.value = ''; inputEl.dataset.compressed = ''; }

    if (entityId && entityId !== 'null' && entityId !== '') {
        deleteEntityImage(entityType, entityId);
    }

    if (typeof showNotification === 'function') showNotification('تم حذف الصورة', 'success');
}

/** جلب الصورة من inputEl المؤقتة أو من الـ store */
function getUploadedImageFromInput(inputId, entityType, entityId) {
    const inputEl = document.getElementById(inputId);
    if (inputEl && inputEl.dataset.compressed) return inputEl.dataset.compressed;
    if (entityId) return getEntityImage(entityType, entityId);
    return null;
}

// ─── تصدير عام ────────────────────────────────────────────────
window.saveEntityImage      = saveEntityImage;
window.getEntityImage       = getEntityImage;
window.deleteEntityImage    = deleteEntityImage;
window.buildImageUploadHTML = buildImageUploadHTML;
window.handleImageUpload    = handleImageUpload;
window.removeEntityImageUI  = removeEntityImageUI;
window.getUploadedImageFromInput = getUploadedImageFromInput;

console.info('[image-upload-system.js] ✅ نظام الصور الشامل جاهز');
