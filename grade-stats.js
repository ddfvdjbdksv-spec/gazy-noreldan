/**
 * ═══════════════════════════════════════════════════════════════
 *  grade-stats.js
 *  إحصائيات المراحل الدراسية — مستر غازي نور الدين
 *
 *  يعرض في الداشبورد قسماً للاختيار من القائمة وعرض:
 *  - إجمالي الطلاب  / الحاضرون / الغائبون اليوم
 *  - نسب الحضور والغياب
 *  - عدد المجموعات وتوزيع الطلاب عليها
 * ═══════════════════════════════════════════════════════════════
 */

// ─── عرض القسم الرئيسي في الداشبورد ──────────────────────────
function renderGradeStatsSection() {
    const container = document.getElementById('grade-stats-section');
    if (!container) return;

    // بناء خيارات القائمة
    const grades = window.gradesList || [];
    const optionsHTML = grades.map(g => {
        const count = (window.db && db.students) ? db.students.filter(s => String(s.grade) === String(g.id)).length : 0;
        if (count === 0) return `<option value="${g.id}">${g.name}</option>`;
        return `<option value="${g.id}">${g.name} (${count} طالب)</option>`;
    }).join('');

    container.innerHTML = `
        <div style="
            background: linear-gradient(135deg, var(--primary, #4f46e5) 0%, #7c3aed 100%);
            border-radius: 20px; padding: 1.5rem; margin-bottom: 1.5rem;
            box-shadow: 0 8px 30px rgba(79,70,229,0.25);">

            <!-- Header -->
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:1.2rem;">
                <div style="width:44px;height:44px;background:rgba(255,255,255,0.15);
                             border-radius:12px;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-chart-bar" style="color:white;font-size:1.2rem;"></i>
                </div>
                <div>
                    <h3 style="margin:0;color:white;font-size:1.05rem;font-weight:800;">إحصائيات المراحل الدراسية</h3>
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:0.8rem;">اختر مرحلة لعرض إحصائياتها الآنية</p>
                </div>
                <div style="margin-right:auto;">
                    <span id="grade-stats-refresh-badge"
                          style="background:rgba(255,255,255,0.15);color:white;
                                 font-size:0.72rem;padding:3px 10px;border-radius:20px;">
                        <i class="fas fa-circle" style="color:#4ade80;font-size:0.5rem;"></i> مباشر
                    </span>
                </div>
            </div>

            <!-- Grade Selector -->
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <label style="color:rgba(255,255,255,0.85);font-weight:700;font-size:0.9rem;white-space:nowrap;">
                    <i class="fas fa-graduation-cap"></i> اختر المرحلة:
                </label>
                <select id="grade-stats-select"
                        onchange="loadGradeStats(this.value)"
                        style="flex:1;min-width:200px;padding:0.6rem 1rem;
                               border:none;border-radius:12px;font-size:0.95rem;
                               background:rgba(255,255,255,0.92);
                               color:var(--text-main,#1e293b);font-weight:700;cursor:pointer;">
                    <option value="">-- اختر المرحلة --</option>
                    ${optionsHTML}
                </select>
                <button onclick="loadGradeStats(document.getElementById('grade-stats-select').value)"
                        style="padding:0.6rem 1.2rem;background:rgba(255,255,255,0.15);
                               color:white;border:1px solid rgba(255,255,255,0.3);
                               border-radius:12px;cursor:pointer;font-size:0.85rem;
                               transition:all 0.2s;white-space:nowrap;">
                    <i class="fas fa-sync-alt"></i> تحديث
                </button>
            </div>
        </div>

        <!-- Results Container -->
        <div id="grade-stats-results" style="animation: fadeIn 0.3s ease;">
            <div style="text-align:center;padding:2rem;color:var(--text-muted,#64748b);">
                <i class="fas fa-chart-pie" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:0.8rem;"></i>
                <p style="font-size:0.9rem;">اختر مرحلة دراسية من الأعلى لعرض إحصائياتها</p>
            </div>
        </div>
    `;

    // تحميل المرحلة الأخيرة إن وُجدت
    const lastGrade = localStorage.getItem('grade_stats_last_selected');
    if (lastGrade) {
        const sel = document.getElementById('grade-stats-select');
        if (sel) sel.value = lastGrade;
        loadGradeStats(lastGrade);
    }
}

/** حساب وعرض إحصائيات مرحلة دراسية معيّنة */
function loadGradeStats(gradeId) {
    const resultsContainer = document.getElementById('grade-stats-results');
    if (!resultsContainer) return;
    if (!gradeId) {
        resultsContainer.innerHTML = `
            <div style="text-align:center;padding:2rem;color:var(--text-muted,#64748b);">
                <i class="fas fa-chart-pie" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:0.8rem;"></i>
                <p style="font-size:0.9rem;">اختر مرحلة دراسية من الأعلى لعرض إحصائياتها</p>
            </div>`;
        return;
    }

    // حفظ الاختيار
    localStorage.setItem('grade_stats_last_selected', gradeId);

    // التحقق من البيانات
    if (!window.db) { resultsContainer.innerHTML = '<p style="padding:1rem;text-align:center;">جاري تحميل البيانات...</p>'; return; }

    const gradeName = (window.gradesList || []).find(g => String(g.id) === String(gradeId))?.name || 'المرحلة المختارة';

    // ─ بيانات الطلاب ─
    const allStudents = (db.students || []).filter(s => String(s.grade) === String(gradeId));
    const totalStudents = allStudents.length;

    // ─ بيانات اليوم ─
    const today = new Date().toLocaleDateString('en-CA');
    const studentIds = allStudents.map(s => s.id);
    const todayAttendance = (db.attendance || []).filter(a => {
        const aDate = new Date(a.date).toLocaleDateString('en-CA');
        return aDate === today && studentIds.includes(a.studentId);
    });
    const presentToday  = todayAttendance.filter(a => a.status === 'present').length;
    const absentToday   = totalStudents - presentToday;
    const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;
    const absentRate     = 100 - attendanceRate;

    // ─ بيانات المجموعات ─
    const gradeGroups = (db.groups || []).filter(g => {
        const gSys = typeof gradeIdToSystemCode === 'function' ? gradeIdToSystemCode(String(g.grade)) : String(g.grade);
        const wantedSys = typeof gradeIdToSystemCode === 'function' ? gradeIdToSystemCode(String(gradeId)) : String(gradeId);
        return gSys === wantedSys || String(g.grade) === String(gradeId);
    });
    const totalGroups = gradeGroups.length;

    // ─ HTML الإحصائيات ─
    const statsCardsHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.75rem;margin-bottom:1rem;">

            <!-- إجمالي الطلاب -->
            <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.1rem;
                         box-shadow:0 2px 12px rgba(0,0,0,0.07);border-right:4px solid #4f46e5;
                         display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-10px;left:-10px;width:60px;height:60px;
                             background:#4f46e5;opacity:0.06;border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;background:rgba(79,70,229,0.1);border-radius:10px;
                                 display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-users" style="color:#4f46e5;font-size:0.85rem;"></i>
                    </div>
                    <span style="font-size:0.72rem;color:var(--text-muted,#64748b);font-weight:600;">إجمالي الطلاب</span>
                </div>
                <div style="font-size:2rem;font-weight:900;color:#4f46e5;line-height:1;">${totalStudents}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">طالب مقيد</div>
            </div>

            <!-- الحاضرون -->
            <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.1rem;
                         box-shadow:0 2px 12px rgba(0,0,0,0.07);border-right:4px solid #10b981;
                         display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-10px;left:-10px;width:60px;height:60px;
                             background:#10b981;opacity:0.06;border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;background:rgba(16,185,129,0.1);border-radius:10px;
                                 display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-check-circle" style="color:#10b981;font-size:0.85rem;"></i>
                    </div>
                    <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600;">حضور اليوم</span>
                </div>
                <div style="font-size:2rem;font-weight:900;color:#10b981;line-height:1;">${presentToday}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">طالب حاضر</div>
            </div>

            <!-- الغائبون -->
            <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.1rem;
                         box-shadow:0 2px 12px rgba(0,0,0,0.07);border-right:4px solid #ef4444;
                         display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-10px;left:-10px;width:60px;height:60px;
                             background:#ef4444;opacity:0.06;border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;background:rgba(239,68,68,0.1);border-radius:10px;
                                 display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-user-times" style="color:#ef4444;font-size:0.85rem;"></i>
                    </div>
                    <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600;">غائبون اليوم</span>
                </div>
                <div style="font-size:2rem;font-weight:900;color:#ef4444;line-height:1;">${absentToday}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">طالب غائب</div>
            </div>

            <!-- نسبة الحضور -->
            <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.1rem;
                         box-shadow:0 2px 12px rgba(0,0,0,0.07);border-right:4px solid #f59e0b;
                         display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-10px;left:-10px;width:60px;height:60px;
                             background:#f59e0b;opacity:0.06;border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;background:rgba(245,158,11,0.1);border-radius:10px;
                                 display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-percentage" style="color:#f59e0b;font-size:0.85rem;"></i>
                    </div>
                    <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600;">نسبة الحضور</span>
                </div>
                <div style="font-size:2rem;font-weight:900;color:#f59e0b;line-height:1;">${attendanceRate}%</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">${absentRate}% غياب</div>
            </div>

            <!-- عدد المجموعات -->
            <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.1rem;
                         box-shadow:0 2px 12px rgba(0,0,0,0.07);border-right:4px solid #8b5cf6;
                         display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-10px;left:-10px;width:60px;height:60px;
                             background:#8b5cf6;opacity:0.06;border-radius:50%;"></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;background:rgba(139,92,246,0.1);border-radius:10px;
                                 display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-layer-group" style="color:#8b5cf6;font-size:0.85rem;"></i>
                    </div>
                    <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600;">المجموعات</span>
                </div>
                <div style="font-size:2rem;font-weight:900;color:#8b5cf6;line-height:1;">${totalGroups}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">مجموعة نشطة</div>
            </div>
        </div>`;

    // ─ شريط التقدم ─
    const progressHTML = totalStudents > 0 ? `
        <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.2rem;
                     box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
                <span style="font-weight:700;font-size:0.9rem;">
                    <i class="fas fa-chart-line" style="color:var(--primary,#4f46e5);"></i>
                    نسبة الحضور لـ ${gradeName}
                </span>
                <span style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">اليوم ${new Date().toLocaleDateString('ar-EG')}</span>
            </div>
            <div style="background:var(--bg-light,#f1f5f9);border-radius:99px;height:14px;overflow:hidden;position:relative;">
                <div style="height:100%;border-radius:99px;
                             background:linear-gradient(90deg, #10b981 ${attendanceRate}%, transparent ${attendanceRate}%);
                             transition:width 0.8s ease;"></div>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                             font-size:0.68rem;font-weight:800;color:#1e293b;">${attendanceRate}% حضور</div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.72rem;color:var(--text-muted);">
                <span><span style="color:#10b981;font-weight:700;">●</span> حاضرون: ${presentToday}</span>
                <span><span style="color:#ef4444;font-weight:700;">●</span> غائبون: ${absentToday}</span>
            </div>
        </div>` : '';

    // ─ توزيع المجموعات ─
    const groupsHTML = gradeGroups.length > 0 ? `
        <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.2rem;
                     box-shadow:0 2px 12px rgba(0,0,0,0.07);">
            <h4 style="margin:0 0 1rem;font-size:0.95rem;font-weight:800;color:var(--text-main);">
                <i class="fas fa-sitemap" style="color:#8b5cf6;"></i>
                توزيع الطلاب على مجموعات ${gradeName}
            </h4>
            <div style="display:flex;flex-direction:column;gap:0.6rem;">
                ${gradeGroups.map((group, idx) => {
                    const count = allStudents.filter(s => String(s.groupId) === String(group.id)).length;
                    const pct   = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                    const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6'];
                    const clr = colors[idx % colors.length];
                    const groupImg = typeof getEntityImage === 'function' ? getEntityImage('group', group.id) : null;
                    const avatarHTML = groupImg
                        ? `<div style="width:34px;height:34px;border-radius:10px;background:url('${groupImg}') center/cover;flex-shrink:0;"></div>`
                        : `<div style="width:34px;height:34px;border-radius:10px;background:${clr};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:0.8rem;flex-shrink:0;">${group.name.charAt(0)}</div>`;
                    return `
                        <div style="display:flex;align-items:center;gap:10px;padding:0.55rem 0.8rem;
                                     background:var(--bg-light,#f8fafc);border-radius:12px;">
                            ${avatarHTML}
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-weight:700;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%;">${group.name}</span>
                                    <span style="font-weight:800;font-size:0.9rem;color:${clr};">${count} طالب</span>
                                </div>
                                <div style="background:rgba(0,0,0,0.06);border-radius:99px;height:6px;overflow:hidden;">
                                    <div style="height:100%;background:${clr};border-radius:99px;width:${pct}%;transition:width 0.6s ease;"></div>
                                </div>
                                <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${group.time || ''} • ${pct}% من المرحلة</div>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>` : `
        <div style="background:var(--bg-white,#fff);border-radius:16px;padding:1.5rem;
                     box-shadow:0 2px 12px rgba(0,0,0,0.07);text-align:center;color:var(--text-muted);">
            <i class="fas fa-layer-group" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:0.6rem;"></i>
            <p style="font-size:0.85rem;">لا توجد مجموعات مضافة لهذه المرحلة بعد</p>
        </div>`;

    // ─ تجميع الكل ─
    resultsContainer.innerHTML = `
        <div style="margin-bottom:0.7rem;display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;background:#4ade80;border-radius:50%;animation: pulse 2s infinite;"></div>
            <h4 style="margin:0;font-size:0.95rem;font-weight:800;color:var(--text-main);">
                إحصائيات ${gradeName}
            </h4>
            <span style="font-size:0.75rem;color:var(--text-muted);margin-right:auto;">
                آخر تحديث: ${new Date().toLocaleTimeString('ar-EG')}
            </span>
        </div>
        ${statsCardsHTML}
        ${progressHTML}
        ${groupsHTML}
    `;
}

/** تحديث الإحصائيات تلقائياً عند تغير البيانات */
function refreshGradeStatsIfVisible() {
    const sel = document.getElementById('grade-stats-select');
    if (sel && sel.value) {
        loadGradeStats(sel.value);
    }
}

// ─── Hook على تحديث البيانات ──────────────────────────────────
(function _hookGradeStats() {
    // نستمع لتحديث الداشبورد
    const origUpdateDash = window.updateDashboardStats;
    if (typeof origUpdateDash === 'function') {
        window.updateDashboardStats = function() {
            origUpdateDash.apply(this, arguments);
            setTimeout(refreshGradeStatsIfVisible, 50);
        };
    }
})();

// ─── تصدير عام ────────────────────────────────────────────────
window.renderGradeStatsSection   = renderGradeStatsSection;
window.loadGradeStats            = loadGradeStats;
window.refreshGradeStatsIfVisible = refreshGradeStatsIfVisible;

console.info('[grade-stats.js] ✅ نظام الإحصائيات جاهز');
