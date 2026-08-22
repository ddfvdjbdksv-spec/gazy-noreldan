/**
 * ═══════════════════════════════════════════════════════════════
 *  app-image-patches.js
 *  تعديلات وإضافات على app.js لدعم الصور الشاملة
 *  يُحمَّل بعد app.js وimage-upload-system.js
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
//  1. STUDENT — إضافة طالب مع صورة
// ═══════════════════════════════════════════════════════════════

/** Wrapper لإضافة طالب مع حفظ صورته */
const _origHandleStudentSubmit = window.handleStudentSubmit;
window.handleStudentSubmit = async function() {
    await _origHandleStudentSubmit.apply(this, arguments);

    // الطالب الجديد هو آخر عنصر في المصفوفة
    const newStudent = db.students[db.students.length - 1];
    if (!newStudent) return;

    const inputEl = document.getElementById('img-input-student-new');
    if (inputEl && inputEl.dataset.compressed) {
        saveEntityImage('student', newStudent.id, inputEl.dataset.compressed);
        // مسح المؤقت
        inputEl.dataset.compressed = '';
        inputEl.value = '';
        // إعادة ضبط الـ preview
        const previewEl = document.getElementById('img-preview-student-new');
        if (previewEl) {
            previewEl.style.background = 'linear-gradient(135deg,var(--primary),var(--accent))';
            previewEl.innerHTML = '<i class="fas fa-camera" style="font-size:28px;color:white;opacity:0.9;"></i>';
        }
    }
};

/** تحديث محتوى editStudent لتحميل صورة الطالب الحالية */
const _origEditStudent = window.editStudent;
window.editStudent = async function(id) {
    await _origEditStudent.apply(this, arguments);

    // تحميل صورة الطالب الموجودة في نافذة التعديل
    const previewEl = document.getElementById('img-preview-student-edit');
    if (!previewEl) return;

    const img = getEntityImage('student', String(id));
    if (img) {
        previewEl.style.background = `url('${img}') center/cover no-repeat`;
        previewEl.innerHTML = '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);padding:4px 0;text-align:center;font-size:10px;color:white;" class="img-overlay-label">تغيير</div>';
    } else {
        previewEl.style.background = 'linear-gradient(135deg,var(--primary),var(--accent))';
        previewEl.innerHTML = '<i class="fas fa-camera" style="font-size:28px;color:white;opacity:0.9;"></i>';
    }
    // ربط الـ input بالـ id الصحيح
    const inputEl = document.getElementById('img-input-student-edit');
    if (inputEl) {
        inputEl.setAttribute('onchange', `handleImageUpload(this,'student','${id}','img-preview-student-edit')`);
    }
};

/** Wrapper لتحديث بيانات طالب مع حفظ صورته */
const _origHandleStudentUpdate = window.handleStudentUpdate;
window.handleStudentUpdate = async function() {
    const idVal = document.getElementById('edit-std-id')?.value;
    await _origHandleStudentUpdate.apply(this, arguments);

    const inputEl = document.getElementById('img-input-student-edit');
    if (inputEl && inputEl.dataset.compressed && idVal) {
        saveEntityImage('student', idVal, inputEl.dataset.compressed);
        inputEl.dataset.compressed = '';
        inputEl.value = '';
    }
};

// ═══════════════════════════════════════════════════════════════
//  2. GROUP — إضافة وتعديل مجموعة مع لوجو
// ═══════════════════════════════════════════════════════════════

/** helper يعيد activeGroupDetailId بشكل آمن */
window._getActiveGroupEditId = function() {
    return (typeof activeGroupDetailId !== 'undefined') ? String(activeGroupDetailId) : '';
};

/** Wrapper لإضافة مجموعة مع لوجو */
window.handleAddGroupWithImage = async function() {
    await handleAddGroup();

    // المجموعة الجديدة هي الأخيرة في db.groups
    const newGroup = db.groups[db.groups.length - 1];
    if (!newGroup) return;

    const inputEl = document.getElementById('img-input-group-new');
    if (inputEl && inputEl.dataset.compressed) {
        saveEntityImage('group', newGroup.id, inputEl.dataset.compressed);
        inputEl.dataset.compressed = '';
        inputEl.value = '';
        // إعادة ضبط الـ preview
        const previewEl = document.getElementById('img-preview-group-new');
        if (previewEl) {
            previewEl.style.background = 'linear-gradient(135deg,var(--primary),#7c3aed)';
            previewEl.innerHTML = '<i class="fas fa-image" style="font-size:28px;color:white;opacity:0.9;"></i>';
        }
    }

    // تحديث الإحصائيات
    if (typeof refreshGradeStatsIfVisible === 'function') refreshGradeStatsIfVisible();
};

/** تحميل صورة المجموعة عند فتح مودال التعديل */
const _origOpenEditGroupModalById = window.openEditGroupModalById;
window.openEditGroupModalById = function(groupId) {
    _origOpenEditGroupModalById.apply(this, arguments);

    setTimeout(() => {
        const previewEl = document.getElementById('img-preview-group-edit');
        if (!previewEl) return;

        const img = getEntityImage('group', String(groupId));
        if (img) {
            previewEl.style.background = `url('${img}') center/cover no-repeat`;
            previewEl.innerHTML = '';
        } else {
            previewEl.style.background = 'linear-gradient(135deg,var(--primary),#7c3aed)';
            previewEl.innerHTML = '<i class="fas fa-image" style="font-size:22px;color:white;opacity:0.9;"></i>';
        }
    }, 50);
};

/** حفظ صورة المجموعة عند حفظ التعديلات */
const _origSaveGroupEdits = window.saveGroupEdits;
window.saveGroupEdits = async function() {
    await _origSaveGroupEdits.apply(this, arguments);
    const inputEl = document.getElementById('img-input-group-edit');
    if (inputEl && inputEl.dataset.compressed && activeGroupDetailId) {
        saveEntityImage('group', activeGroupDetailId, inputEl.dataset.compressed);
        inputEl.dataset.compressed = '';
        inputEl.value = '';
    }
    if (typeof refreshGradeStatsIfVisible === 'function') refreshGradeStatsIfVisible();
};

// ═══════════════════════════════════════════════════════════════
//  3. GRADE — إضافة سنة دراسية مع صورة
// ═══════════════════════════════════════════════════════════════

window.addNewGradeWithImage = async function() {
    const prevLen = gradesList.length;
    addNewGrade(); // الدالة الأصلية
    const newGrade = gradesList[gradesList.length - 1];

    if (newGrade && gradesList.length > prevLen) {
        const inputEl = document.getElementById('img-input-grade-new');
        if (inputEl && inputEl.dataset.compressed) {
            saveEntityImage('grade', newGrade.id, inputEl.dataset.compressed);
            inputEl.dataset.compressed = '';
            inputEl.value = '';
            const previewEl = document.getElementById('img-preview-grade-new');
            if (previewEl) {
                previewEl.style.background = 'linear-gradient(135deg,#f59e0b,#ef4444)';
                previewEl.innerHTML = '<i class="fas fa-graduation-cap" style="font-size:28px;color:white;opacity:0.9;"></i>';
            }
        }
    }

    // تحديث الإحصائيات
    if (typeof renderGradeStatsSection === 'function') renderGradeStatsSection();
};

// ═══════════════════════════════════════════════════════════════
//  4. REWARD / CHARACTER — إضافة مكافأة مع صورة
// ═══════════════════════════════════════════════════════════════

window.handleAddRewardWithImage = function() {
    const title = document.getElementById('rew-title').value;
    const cost  = parseInt(document.getElementById('rew-cost').value);
    if (!title || !cost) return showNotification('يرجى ملء بيانات المكافأة', 'error');

    const newId = Date.now();
    db.rewards.push({ id: newId, title, cost });
    db.save();

    // حفظ الصورة
    const inputEl = document.getElementById('img-input-character-new');
    if (inputEl && inputEl.dataset.compressed) {
        saveEntityImage('character', newId, inputEl.dataset.compressed);
        inputEl.dataset.compressed = '';
        inputEl.value = '';
        const previewEl = document.getElementById('img-preview-character-new');
        if (previewEl) {
            previewEl.style.background = 'linear-gradient(135deg,#f59e0b,#f97316)';
            previewEl.innerHTML = '<i class="fas fa-star" style="font-size:28px;color:white;opacity:0.9;"></i>';
        }
    }

    renderShopWithImages();
    toggleModal('reward-modal', false);
    showNotification('✅ تم إضافة المكافأة بنجاح', 'success');
};

/** عرض متجر المكافآت مع الصور */
function renderShopWithImages() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    if (!db.rewards || db.rewards.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">لا توجد عروض حالياً</p>';
        return;
    }
    grid.innerHTML = db.rewards.map(r => {
        const img = getEntityImage('character', r.id);
        const avatarHTML = img
            ? `<div style="width:70px;height:70px;border-radius:16px;background:url('${img}') center/cover;margin:0 auto 0.8rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>`
            : `<div style="width:70px;height:70px;border-radius:16px;background:linear-gradient(135deg,#f59e0b,#f97316);display:flex;align-items:center;justify-content:center;margin:0 auto 0.8rem;"><i class="fas fa-star" style="font-size:28px;color:white;"></i></div>`;
        return `
            <div class="card shop-card fade-in" style="text-align:center;padding:1.5rem;">
                <div class="points-tag">${r.cost} نقطة</div>
                ${avatarHTML}
                <h3 style="font-size:1rem;font-weight:800;margin-bottom:0.5rem;">${r.title}</h3>
                <p style="color:var(--text-muted); margin:0.5rem 0 1rem; font-size:0.85rem;">استبدل نقاطك بهذا العرض الرائع</p>
                <button class="btn btn-primary" style="width:100%;" onclick="redeemReward(${r.id})">استبدال الآن</button>
            </div>`;
    }).join('');
}

// Override renderShop الأصلية
const _origRenderShop = window.renderShop;
window.renderShop = renderShopWithImages;

// ═══════════════════════════════════════════════════════════════
//  5. SECRETARY — إضافة سكرتير مع لوجو
// ═══════════════════════════════════════════════════════════════

window.addNewSecretaryWithImage = function() {
    const nameInput = document.getElementById('new-secretary-name');
    const passInput = document.getElementById('new-secretary-password');
    if (!nameInput || !passInput) return;

    const name = nameInput.value.trim();
    const password = passInput.value.trim();

    if (!name) return showNotification('يرجى إدخال اسم السكرتير', 'warning');
    if (!password || password.length < 3) return showNotification('⚠️ كلمة المرور قصيرة جداً (3 أحرف على الأقل)', 'warning');

    if (!db.secretaries) db.secretaries = [];

    if (db.secretaries.some(s => String(s.password) === password)) {
        return showNotification('❌ كلمة المرور هذه مستخدمة بالفعل لسكرتير آخر', 'error');
    }
    if (password === '22446' || (typeof RBAC !== 'undefined' && password === RBAC.PASSWORDS?.admin)) {
        return showNotification('❌ لا يمكن استخدام كلمة مرور المشرف', 'error');
    }

    const newId = Date.now();
    const newSecretary = { id: newId, name, password, createdAt: new Date().toISOString() };
    db.secretaries.push(newSecretary);

    // حفظ الصورة
    const inputEl = document.getElementById('img-input-secretary-new');
    if (inputEl && inputEl.dataset.compressed) {
        saveEntityImage('secretary', newId, inputEl.dataset.compressed);
        inputEl.dataset.compressed = '';
        inputEl.value = '';
        // إعادة ضبط preview
        const previewEl = document.getElementById('img-preview-secretary-new');
        if (previewEl) {
            previewEl.style.background = 'linear-gradient(135deg,#06b6d4,#3b82f6)';
            previewEl.innerHTML = '<i class="fas fa-user-tie" style="font-size:22px;color:white;opacity:0.9;"></i>';
        }
    }

    if (typeof _persistSecretaries === 'function') _persistSecretaries();

    nameInput.value = '';
    passInput.value = '';

    showNotification(`✅ تم إضافة حساب السكرتير "${name}" بنجاح`, 'success');
    renderLoginSystemsWithImages();
};

/** عرض أنظمة الدخول مع الصور */
function renderLoginSystemsWithImages() {
    const container = document.getElementById('secretaries-list');
    if (!container) return;
    if (!db.secretaries) db.secretaries = [];

    if (db.secretaries.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">لا يوجد حسابات سكرتارية بعد. أضف أول حساب من الأعلى.</td></tr>';
        return;
    }

    container.innerHTML = db.secretaries.map(sec => {
        const img = getEntityImage('secretary', sec.id);
        const avatarHTML = img
            ? `<img src="${img}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,0.12);" alt="${sec.name}">`
            : `<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#06b6d4,#3b82f6);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:1rem;">${sec.name.charAt(0)}</div>`;

        return `
            <tr>
                <td style="padding:0.7rem 0.5rem;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${avatarHTML}
                        <span style="font-weight:700;">${sec.name}</span>
                    </div>
                </td>
                <td style="padding:0.7rem 0.5rem;">
                    <span id="sec-pass-${sec.id}" style="font-family: monospace; letter-spacing: 2px;">••••••</span>
                    <button class="btn" style="padding:2px 10px; font-size:0.75rem; margin-right:8px;" onclick="toggleSecretaryPasswordVisibility(${sec.id})">
                        <i class="fas fa-eye" id="sec-eye-${sec.id}"></i>
                    </button>
                </td>
                <td style="padding:0.7rem 0.5rem;">
                    <button class="btn" style="background:var(--bg-light); padding:6px 14px; font-size:0.8rem; border-radius:10px;" onclick="startEditSecretary(${sec.id})">
                        <i class="fas fa-key"></i> تغيير كلمة المرور
                    </button>
                    <button class="btn admin-only-btn" style="background:#fee2e2;color:var(--danger); padding:6px 14px; font-size:0.8rem; border-radius:10px; margin-right:6px;" onclick="deleteSecretaryAccount(${sec.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            </tr>`;
    }).join('');
}

// Override renderLoginSystemsSection
const _origRenderLoginSystems = window.renderLoginSystemsSection;
window.renderLoginSystemsSection = renderLoginSystemsWithImages;
window.renderLoginSystemsWithImages = renderLoginSystemsWithImages;

// ═══════════════════════════════════════════════════════════════
//  6. GRADE CARDS — عرض صور السنوات الدراسية في الكاردات
// ═══════════════════════════════════════════════════════════════

const _origRenderGradesList = window.renderGradesList;
window.renderGradesList = function() {
    const container = document.getElementById('grades-container');
    if (!container) return;

    let html = `
        <div class="grade-card-modern fade-in" onclick="toggleModal('add-grade-modal', true)"
             style="--accent-color: var(--primary); border: 2px dashed rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);">
            <div class="card-icon-modern" style="background: rgba(255,255,255,0.1);"><i class="fas fa-plus"></i></div>
            <h2>إضافة سنة جديدة</h2>
            <p>قم بتعريف مرحلة دراسية مخصصة</p>
            <div class="card-stats-modern">اضغط للإضافة</div>
        </div>`;

    html += gradesList.map((g, idx) => {
        const img = getEntityImage('grade', g.id);
        const iconHTML = img
            ? `<div style="width:64px;height:64px;border-radius:16px;background:url('${img}') center/cover;margin:0 auto 1rem;box-shadow:0 4px 15px rgba(0,0,0,0.2);"></div>`
            : `<div class="card-icon-modern"><i class="fas ${g.icon || 'fa-graduation-cap'}"></i></div>`;

        return `
            <div class="grade-card-modern fade-in" onclick="selectGrade(${g.id})"
                 style="--accent-color: hsl(${idx * 137.5}, 70%, 60%); border: 1px solid rgba(255,255,255,0.1); animation-delay: ${idx * 0.1}s; position:relative;">
                ${iconHTML}
                <h2>${g.name}</h2>
                <p>إدارة بيانات مستقلة لـ ${g.name}</p>
                <div class="card-stats-modern">اضغط للدخول</div>
                <button class="btn" style="position: absolute; top: 15px; left: 15px; color: rgba(255,255,255,0.2); background: transparent; padding: 5px;"
                    onclick="event.stopPropagation(); deleteGrade(${g.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
    }).join('');

    container.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════════
//  7. STUDENTS LIST — عرض صور الطلاب في القائمة
// ═══════════════════════════════════════════════════════════════

/**
 * بناء avatar HTML يستخدم الصورة إن وُجدت، وإلا حرف الاسم
 */
window.buildStudentAvatarHTML = function(student, size = 35) {
    const img = student ? getEntityImage('student', student.id) : null;
    if (img) {
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:url('${img}') center/cover;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>`;
    }
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.floor(size*0.35)}px;flex-shrink:0;">${student ? student.name.charAt(0) : '?'}</div>`;
};

// ═══════════════════════════════════════════════════════════════
//  8. PORTAL GRADE CARDS — عرض الصور في البوابة
// ═══════════════════════════════════════════════════════════════

const _origRenderPortalGrades = window.renderPortalGrades;
if (typeof _origRenderPortalGrades === 'function') {
    window.renderPortalGrades = async function() {
        await _origRenderPortalGrades.apply(this, arguments);
        // نحدّث أيقونات الصور بعد الرندر
        setTimeout(_injectGradeImagesInPortal, 100);
    };
}

function _injectGradeImagesInPortal() {
    const cards = document.querySelectorAll('#portal-step-grade .grade-card-modern');
    cards.forEach(card => {
        // ابحث عن icon div وأضف صورة إن وُجدت
        const onclick = card.getAttribute('onclick') || '';
        const match = onclick.match(/showPortalStep\('group','(\d+)'\)/);
        if (!match) return;
        const gradeId = match[1];
        const img = getEntityImage('grade', gradeId);
        if (!img) return;
        const iconEl = card.querySelector('.card-icon-modern');
        if (iconEl) {
            iconEl.style.background = `url('${img}') center/cover`;
            iconEl.innerHTML = '';
        }
    });
}

// ═══════════════════════════════════════════════════════════════
//  9. تهيئة الداشبورد — تشغيل قسم الإحصائيات
// ═══════════════════════════════════════════════════════════════

const _origShowSection = window.showSection;
window.showSection = function(sectionId, ...args) {
    _origShowSection.apply(this, [sectionId, ...args]);

    if (sectionId === 'dashboard') {
        setTimeout(() => {
            if (typeof renderGradeStatsSection === 'function') {
                renderGradeStatsSection();
            }
        }, 100);
    }

    if (sectionId === 'login-systems') {
        setTimeout(() => {
            renderLoginSystemsWithImages();
        }, 50);
    }
};

// ═══════════════════════════════════════════════════════════════
//  10. تهيئة عند تحميل الصفحة
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    // تشغيل الإحصائيات في الداشبورد عند الفتح
    setTimeout(() => {
        if (typeof renderGradeStatsSection === 'function') {
            renderGradeStatsSection();
        }
    }, 800);
});

// تشغيل بعد تحميل البيانات (appBootPromise)
if (window.appBootPromise && typeof window.appBootPromise.then === 'function') {
    window.appBootPromise.then(() => {
        setTimeout(() => {
            if (typeof renderGradeStatsSection === 'function') {
                renderGradeStatsSection();
            }
            // re-render grades مع الصور
            if (typeof renderGradesList === 'function') {
                renderGradesList();
            }
        }, 300);
    });
}

// ═══════════════════════════════════════════════════════════════
//  Hover effect على img-preview divs
// ═══════════════════════════════════════════════════════════════
document.addEventListener('mouseover', function(e) {
    const el = e.target.closest('[id^="img-preview-"]');
    if (!el) return;
    const overlay = el.querySelector('.img-overlay-label');
    if (overlay) overlay.style.opacity = '1';
});
document.addEventListener('mouseout', function(e) {
    const el = e.target.closest('[id^="img-preview-"]');
    if (!el) return;
    const overlay = el.querySelector('.img-overlay-label');
    if (overlay) overlay.style.opacity = '0';
});

console.info('[app-image-patches.js] ✅ تعديلات الصور الشاملة محمّلة');
