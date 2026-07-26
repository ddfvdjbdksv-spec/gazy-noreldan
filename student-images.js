// ============================================================
//  student-images.js  —  نظام صور الطلاب عبر Cloudinary
//  ------------------------------------------------------------
//  وحدة مستقلة بالكامل (لا تُعدّل أي كود موجود في app.js مباشرة).
//  تُضاف إلى النظام كـ <script> إضافي، وتُستدعى من نقاط محددة فقط:
//    - عند فتح/إغلاق نموذج إضافة أو تعديل طالب
//    - عند حفظ الطالب (لإرفاق مصفوفة images بكائن الطالب)
//    - عند عرض بروفايل الطالب
//    - عند حذف الطالب
//
//  التخزين: لا Base64 إطلاقاً. فقط روابط Cloudinary + public_id
//  تُحفظ داخل student.images ثم تُزامَن مع Firestore بنفس الآلية
//  الحالية (StorageEngine.save + waitForCloudTableSync) بدون أي
//  تعديل في تلك الآلية، لأنها تُخزّن الكائن كاملاً بالفعل.
// ============================================================

(function (global) {
    'use strict';

    const CLOUDINARY_CLOUD_NAME = 'sbc91hvd';
    const CLOUDINARY_UPLOAD_PRESET = 'ml_default';
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const MAX_IMAGES = 4;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const TARGET_SIZE = 1024;   // أقصى أبعاد للصورة المرفوعة (بعد القص 1:1)
    const WEBP_QUALITY = 0.9;   // جودة عالية مع ضغط معقول

    // ── حالة كل عنصر uploader مفتوح حالياً (مفتاح = containerId) ──
    const instances = new Map();

    // ────────────────────────────────────────────────────────
    //  حقن الأنماط مرة واحدة فقط
    // ────────────────────────────────────────────────────────
    function ensureStyles() {
        if (document.getElementById('simg-styles')) return;
        const style = document.createElement('style');
        style.id = 'simg-styles';
        style.textContent = `
            .simg-wrap{direction:rtl;font-family:inherit;}
            .simg-dropzone{border:2px dashed #cbd5e1;border-radius:12px;padding:1.1rem;text-align:center;cursor:pointer;color:#64748b;transition:.2s;background:#f8fafc;}
            .simg-dropzone:hover,.simg-dropzone.simg-drag-over{border-color:var(--primary,#0f4c81);background:#eef4fb;color:var(--primary,#0f4c81);}
            .simg-dropzone i{font-size:1.6rem;display:block;margin-bottom:.4rem;}
            .simg-dropzone small{display:block;margin-top:.3rem;font-size:.72rem;color:#94a3b8;}
            .simg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-top:.75rem;}
            .simg-slot{position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:#f1f5f9;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:grab;}
            .simg-slot img{width:100%;height:100%;object-fit:cover;display:block;}
            .simg-slot.simg-empty{cursor:pointer;color:#cbd5e1;font-size:1.4rem;}
            .simg-slot.simg-drag-over{outline:2px solid var(--primary,#0f4c81);outline-offset:-2px;}
            .simg-badge-main{position:absolute;top:3px;right:3px;background:rgba(16,185,129,.92);color:#fff;font-size:.58rem;font-weight:700;padding:2px 5px;border-radius:5px;}
            .simg-actions{position:absolute;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;gap:.35rem;opacity:0;transition:.15s;}
            .simg-slot:hover .simg-actions{opacity:1;}
            .simg-actions button{width:26px;height:26px;border:none;border-radius:50%;background:#fff;color:#334155;font-size:.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}
            .simg-actions button.simg-danger{color:#ef4444;}
            .simg-progress{position:absolute;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,.4);}
            .simg-progress-bar{height:100%;background:var(--accent,#10b981);width:0%;transition:.2s;}
            .simg-hint{font-size:.72rem;color:#94a3b8;margin-top:.4rem;}
            .simg-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;}
            .simg-lightbox img{max-width:92vw;max-height:92vh;border-radius:8px;}
            .simg-gallery{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.75rem;}
            .simg-gallery img{width:70px;height:70px;object-fit:cover;border-radius:10px;cursor:zoom-in;border:1px solid #e2e8f0;}
            .simg-main-photo{width:100%;height:100%;object-fit:cover;border-radius:50%;cursor:zoom-in;}
        `;
        document.head.appendChild(style);
    }

    // ────────────────────────────────────────────────────────
    //  أدوات مساعدة
    // ────────────────────────────────────────────────────────

    /** يبني رابط Thumbnail من رابط Cloudinary الأصلي عبر تحويل on-the-fly (بدون رفع إضافي) */
    function thumbUrl(url, size = 200) {
        if (!url || typeof url !== 'string' || !url.includes('/upload/')) return url;
        return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,g_auto,f_auto,q_auto/`);
    }

    function validateFile(file) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'صيغة الملف غير مدعومة. يُسمح فقط بـ JPG وPNG وWEBP';
        }
        if (file.size > MAX_FILE_SIZE) {
            return 'حجم الصورة أكبر من 5 ميجابايت';
        }
        return null;
    }

    /** قصّ الصورة مربّعاً (1:1) وتصغيرها وتحويلها WebP مع الحفاظ على الجودة */
    function processImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'));
            img.onload = () => {
                try {
                    const side = Math.min(img.width, img.height);
                    const sx = (img.width - side) / 2;
                    const sy = (img.height - side) / 2;
                    const outSize = Math.min(TARGET_SIZE, side);

                    const canvas = document.createElement('canvas');
                    canvas.width = outSize;
                    canvas.height = outSize;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, sx, sy, side, side, 0, 0, outSize, outSize);

                    const finish = (blob, ext) => {
                        if (!blob) return reject(new Error('فشل ضغط الصورة'));
                        resolve({ blob, filename: `student_${Date.now()}.${ext}` });
                    };

                    if (canvas.toBlob) {
                        canvas.toBlob(
                            (blob) => {
                                if (blob) return finish(blob, 'webp');
                                // fallback لو المتصفح لا يدعم WebP encode
                                canvas.toBlob((b2) => finish(b2, 'jpg'), 'image/jpeg', WEBP_QUALITY);
                            },
                            'image/webp',
                            WEBP_QUALITY
                        );
                    } else {
                        reject(new Error('المتصفح لا يدعم معالجة الصور'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error('ملف الصورة تالف أو غير مدعوم'));
            reader.readAsDataURL(file);
        });
    }

    /** رفع Blob إلى Cloudinary (Unsigned Upload) */
    function uploadToCloudinary(blob, filename, onProgress) {
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('file', blob, filename);
            form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', CLOUDINARY_UPLOAD_URL, true);
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
                        resolve({ url: data.secure_url, publicId: data.public_id });
                    } else {
                        reject(new Error((data.error && data.error.message) || 'فشل الرفع إلى Cloudinary'));
                    }
                } catch (err) {
                    reject(new Error('استجابة غير متوقعة من Cloudinary'));
                }
            };
            xhr.onerror = () => reject(new Error('تعذّر الاتصال بخادم الصور، تحقق من الإنترنت'));
            xhr.send(form);
        });
    }

    // ────────────────────────────────────────────────────────
    //  محاولة حذف صورة من Cloudinary (تتطلب توقيعاً من الخادم)
    //  الرفع Unsigned لكن الحذف يتطلب API Secret، لذا نحاول عبر
    //  نقطة نهاية اختيارية على نفس الخادم المحلي: /api/cloudinary/delete
    //  إن لم تكن متاحة (لم يوفّر المطوّر مفاتيح الحذف) نتجاهل بصمت
    //  ونكتفي بحذف الصورة من قاعدة البيانات (السلوك الافتراضي الآمن).
    // ────────────────────────────────────────────────────────
    async function tryDeleteFromCloudinary(publicId) {
        if (!publicId) return false;
        try {
            const res = await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId })
            });
            if (!res.ok) return false;
            const data = await res.json().catch(() => null);
            return !!(data && data.result === 'ok');
        } catch (e) {
            return false; // لا يوجد خادم حذف مُوقَّع متاح — يُتجاهل بصمت
        }
    }

    // ────────────────────────────────────────────────────────
    //  Uploader Widget (لنموذج إضافة/تعديل الطالب)
    // ────────────────────────────────────────────────────────

    /**
     * يهيّئ صندوق رفع الصور داخل عنصر حاوٍ.
     * @param {string} containerId - معرّف الـ div الذي سيحتوي الواجهة
     * @param {Array}  initialImages - صور موجودة مسبقاً (وضع التعديل)
     */
    function initUploader(containerId, initialImages) {
        ensureStyles();
        const container = document.getElementById(containerId);
        if (!container) return;

        const state = {
            images: Array.isArray(initialImages) ? initialImages.map(i => ({ ...i })) : [],
            deletedPublicIds: [] // صور أُزيلت أثناء هذه الجلسة (لمحاولة حذفها من Cloudinary لاحقاً)
        };
        instances.set(containerId, state);

        render(containerId, container, state);
    }

    function render(containerId, container, state) {
        const slotsHtml = Array.from({ length: MAX_IMAGES }).map((_, i) => {
            const img = state.images[i];
            if (img) {
                return `
                    <div class="simg-slot" draggable="true" data-index="${i}">
                        <img src="${thumbUrl(img.url, 200)}" alt="صورة الطالب" loading="lazy">
                        ${i === 0 ? '<span class="simg-badge-main">الرئيسية</span>' : ''}
                        <div class="simg-actions">
                            <button type="button" data-act="zoom" title="تكبير"><i class="fas fa-search-plus"></i></button>
                            <button type="button" data-act="replace" title="استبدال"><i class="fas fa-sync-alt"></i></button>
                            <button type="button" data-act="delete" class="simg-danger" title="حذف"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
            }
            return `<div class="simg-slot simg-empty" data-index="${i}"><i class="fas fa-plus"></i></div>`;
        }).join('');

        container.innerHTML = `
            <div class="simg-wrap">
                <div class="simg-dropzone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    اسحب وأفلت الصور هنا، أو اضغط للاختيار من الجهاز
                    <small>حتى ${MAX_IMAGES} صور — JPG / PNG / WEBP — بحد أقصى 5MB لكل صورة</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none">
                </div>
                <div class="simg-grid"></div>
                <div class="simg-hint">أول صورة تُرفع تصبح تلقائياً الصورة الرسمية للطالب وتظهر في الكشوف والبطاقات والتقارير.</div>
            </div>
        `;
        container.querySelector('.simg-grid').innerHTML = slotsHtml;

        wireEvents(containerId, container, state);
    }

    function refreshGrid(containerId, container, state) {
        const slotsHtml = Array.from({ length: MAX_IMAGES }).map((_, i) => {
            const img = state.images[i];
            if (img) {
                return `
                    <div class="simg-slot" draggable="true" data-index="${i}">
                        <img src="${thumbUrl(img.url, 200)}" alt="صورة الطالب" loading="lazy">
                        ${i === 0 ? '<span class="simg-badge-main">الرئيسية</span>' : ''}
                        <div class="simg-actions">
                            <button type="button" data-act="zoom" title="تكبير"><i class="fas fa-search-plus"></i></button>
                            <button type="button" data-act="replace" title="استبدال"><i class="fas fa-sync-alt"></i></button>
                            <button type="button" data-act="delete" class="simg-danger" title="حذف"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
            }
            return `<div class="simg-slot simg-empty" data-index="${i}"><i class="fas fa-plus"></i></div>`;
        }).join('');
        const grid = container.querySelector('.simg-grid');
        if (grid) grid.innerHTML = slotsHtml;
        wireSlotEvents(containerId, container, state);
    }

    function wireEvents(containerId, container, state) {
        const dropzone = container.querySelector('.simg-dropzone');
        const fileInput = container.querySelector('input[type="file"]');

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('simg-drag-over'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('simg-drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('simg-drag-over');
            handleFiles(containerId, container, state, e.dataTransfer.files);
        });
        fileInput.addEventListener('change', (e) => {
            handleFiles(containerId, container, state, e.target.files);
            fileInput.value = '';
        });

        wireSlotEvents(containerId, container, state);
    }

    function wireSlotEvents(containerId, container, state) {
        const grid = container.querySelector('.simg-grid');
        let dragFromIndex = null;

        grid.querySelectorAll('.simg-slot').forEach((slot) => {
            const index = Number(slot.dataset.index);

            if (slot.classList.contains('simg-empty')) {
                slot.addEventListener('click', () => {
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.accept = 'image/jpeg,image/png,image/webp';
                    tempInput.onchange = () => handleFiles(containerId, container, state, tempInput.files);
                    tempInput.click();
                });
                return;
            }

            slot.addEventListener('dragstart', () => { dragFromIndex = index; });
            slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('simg-drag-over'); });
            slot.addEventListener('dragleave', () => slot.classList.remove('simg-drag-over'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('simg-drag-over');
                if (dragFromIndex === null || dragFromIndex === index) return;
                const arr = state.images;
                const [moved] = arr.splice(dragFromIndex, 1);
                arr.splice(index, 0, moved);
                refreshGrid(containerId, container, state);
            });

            slot.querySelector('[data-act="zoom"]').addEventListener('click', (e) => {
                e.stopPropagation();
                openLightbox(state.images[index].url);
            });
            slot.querySelector('[data-act="replace"]').addEventListener('click', (e) => {
                e.stopPropagation();
                const tempInput = document.createElement('input');
                tempInput.type = 'file';
                tempInput.accept = 'image/jpeg,image/png,image/webp';
                tempInput.onchange = () => handleFiles(containerId, container, state, tempInput.files, index);
                tempInput.click();
            });
            slot.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
                e.stopPropagation();
                const removed = state.images.splice(index, 1)[0];
                if (removed && removed.publicId) state.deletedPublicIds.push(removed.publicId);
                refreshGrid(containerId, container, state);
            });
        });
    }

    async function handleFiles(containerId, container, state, fileList, replaceIndex) {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        const freeSlots = replaceIndex !== undefined ? 1 : (MAX_IMAGES - state.images.length);
        if (freeSlots <= 0) {
            notify('وصلت للحد الأقصى (4 صور). احذف صورة أولاً لإضافة أخرى', 'error');
            return;
        }

        for (const file of files.slice(0, freeSlots)) {
            const error = validateFile(file);
            if (error) { notify(error, 'error'); continue; }

            const grid = container.querySelector('.simg-grid');
            const targetIndex = replaceIndex !== undefined ? replaceIndex : state.images.length;

            // عنصر مؤقت لعرض تقدّم الرفع
            const tempSlot = document.createElement('div');
            tempSlot.className = 'simg-slot';
            tempSlot.innerHTML = `<i class="fas fa-spinner fa-spin"></i><div class="simg-progress"><div class="simg-progress-bar"></div></div>`;
            if (grid.children[targetIndex]) grid.children[targetIndex].replaceWith(tempSlot);
            else grid.appendChild(tempSlot);
            const progressBar = tempSlot.querySelector('.simg-progress-bar');

            try {
                const { blob, filename } = await processImage(file);
                const result = await uploadToCloudinary(blob, filename, (pct) => {
                    if (progressBar) progressBar.style.width = pct + '%';
                });
                const entry = { url: result.url, publicId: result.publicId, createdAt: new Date().toISOString() };

                if (replaceIndex !== undefined) {
                    const old = state.images[replaceIndex];
                    if (old && old.publicId) state.deletedPublicIds.push(old.publicId);
                    state.images[replaceIndex] = entry;
                } else {
                    state.images.push(entry);
                }
                refreshGrid(containerId, container, state);
                notify('تم رفع الصورة بنجاح', 'success');
            } catch (err) {
                console.error('[StudentImages] upload failed:', err);
                notify('فشل رفع الصورة: ' + (err.message || err), 'error');
                refreshGrid(containerId, container, state);
            }
        }
    }

    function notify(msg, type) {
        if (typeof global.showNotification === 'function') {
            global.showNotification(msg, type);
        } else {
            console.log(`[StudentImages] ${type}: ${msg}`);
        }
    }

    function openLightbox(url) {
        const box = document.createElement('div');
        box.className = 'simg-lightbox';
        box.innerHTML = `<img src="${url}" alt="عرض الصورة بالحجم الكامل">`;
        box.addEventListener('click', () => box.remove());
        document.body.appendChild(box);
    }

    // ────────────────────────────────────────────────────────
    //  API عامة يستخدمها app.js
    // ────────────────────────────────────────────────────────

    /** يُعيد مصفوفة الصور الحالية لعنصر uploader معيّن (لحفظها مع الطالب) */
    function getImages(containerId) {
        const state = instances.get(containerId);
        return state ? state.images.map(i => ({ ...i })) : [];
    }

    /** يُنظّف حالة الـ uploader بعد الحفظ أو عند إغلاق النموذج */
    function destroyUploader(containerId) {
        instances.delete(containerId);
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
    }

    /** أول صورة = الصورة الرسمية. تُستخدم في الكشوف/البطاقات/التقارير */
    function getPrimaryImage(student) {
        if (student && Array.isArray(student.images) && student.images[0]) {
            return student.images[0].url;
        }
        return null;
    }

    /** يبني عنصر <img> أو حرف افتراضي حسب توفر صورة الطالب */
    function renderAvatarHtml(student, size = 60) {
        const url = getPrimaryImage(student);
        if (url) {
            return `<img src="${thumbUrl(url, size * 2)}" class="simg-main-photo" style="width:${size}px;height:${size}px" onclick="StudentImages.openFull('${url}')" alt="صورة ${student.name || ''}">`;
        }
        const initial = (student && student.name) ? student.name.charAt(0) : 'ط';
        return `<span>${initial}</span>`;
    }

    /** يبني معرض الصور الإضافية لعرضه في بروفايل الطالب */
    function renderGalleryHtml(student) {
        const images = (student && Array.isArray(student.images)) ? student.images : [];
        if (!images.length) {
            return '<p style="color:#94a3b8;font-size:.85rem;text-align:center;padding:.5rem;">لا توجد صور مضافة لهذا الطالب</p>';
        }
        return `<div class="simg-gallery">${images.map(img =>
            `<img src="${thumbUrl(img.url, 150)}" onclick="StudentImages.openFull('${img.url}')" alt="صورة الطالب" loading="lazy">`
        ).join('')}</div>`;
    }

    /** يحذف كل صور الطالب من Cloudinary عند حذف الطالب نهائياً (best-effort) */
    async function deleteStudentImages(student) {
        if (!student || !Array.isArray(student.images)) return;
        for (const img of student.images) {
            if (img && img.publicId) {
                await tryDeleteFromCloudinary(img.publicId);
            }
        }
    }

    /** يُستدعى بعد نجاح الحفظ لتفريغ سجلّ "الصور المحذوفة أثناء الجلسة" ومحاولة حذفها فعلياً */
    async function flushDeletions(containerId) {
        const state = instances.get(containerId);
        if (!state || !state.deletedPublicIds.length) return;
        const ids = state.deletedPublicIds.slice();
        state.deletedPublicIds = [];
        for (const pid of ids) {
            await tryDeleteFromCloudinary(pid);
        }
    }

    global.StudentImages = {
        MAX_IMAGES,
        init: initUploader,
        getImages,
        destroy: destroyUploader,
        getPrimaryImage,
        renderAvatarHtml,
        renderGalleryHtml,
        thumbUrl,
        deleteStudentImages,
        flushDeletions,
        openFull: openLightbox
    };
})(window);
