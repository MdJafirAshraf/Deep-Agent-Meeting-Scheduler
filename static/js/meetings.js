// ════════════════════════════════════════
//  STATE  (unchanged)
// ════════════════════════════════════════
let allMeetings   = [];
let dtTable       = null;
let selectedIds   = new Set();
let pendingDelete = null;

const PLATFORM_ICONS = {
    'Google Meet': '<i class="fa-brands fa-google text-danger"></i>',
    'Zoom':        '<i class="fa-solid fa-video" style="color:#2D8CFF"></i>',
    'Teams':       '<i class="fa-brands fa-microsoft" style="color:#5059c9"></i>',
    'Phone':       '<i class="fa-solid fa-phone" style="color:#10b981"></i>',
    'In-person':   '<i class="fa-solid fa-building" style="color:#f59e0b"></i>',
};

// ════════════════════════════════════════
//  INIT  (unchanged)
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initDataTable();
    loadMeetings();

    document.getElementById('searchInput').addEventListener('input', e => {
        dtTable.search(e.target.value).draw();
    });
    document.getElementById('filterType').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterDuration').addEventListener('change', applyFilters);
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
});

function initDataTable() {
    dtTable = $('#meetingsTable').DataTable({
        dom: 't<"dt-footer-row"<"dataTables_info"i><"dataTables_paginate"p>>',
        pagingType: 'simple_numbers',
        pageLength: 10,
        language: {
            info: 'Showing _START_–_END_ of _TOTAL_ meetings',
            paginate: {
                previous: '<i class="fa-solid fa-chevron-left"></i>',
                next:     '<i class="fa-solid fa-chevron-right"></i>'
            },
            emptyTable: '<div style="padding:48px 0;color:#94a3b8;font-size:0.85rem;font-family:DM Sans,sans-serif;">No meetings found. Create one to get started.</div>'
        },
        columnDefs: [
            { orderable: false, targets: [0, 8] },
            { type: 'date', targets: [3] }
        ],
        order: [[3, 'asc']]
    });
}

// ════════════════════════════════════════
//  API: LOAD  (unchanged)
// ════════════════════════════════════════
async function loadMeetings() {
    try {
        const res  = await fetch('/api/meetings');
        const data = await res.json();
        allMeetings = data.meetings || [];
        renderTable(allMeetings);
        renderStats(allMeetings);
    } catch (e) {
        showToast('Failed to load meetings', 'error');
    }
}

function renderStats(meetings) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('statTotal').textContent    = meetings.length;
    document.getElementById('statToday').textContent    = meetings.filter(m => m.date === today).length;
    document.getElementById('statUpcoming').textContent = meetings.filter(m => m.date > today).length;
    document.getElementById('statExternal').textContent = meetings.filter(m => m.type === 'External').length;
    document.getElementById('totalCount').textContent   = meetings.length;
}

function renderTable(meetings) {
    dtTable.clear();
    meetings.forEach(m => {
        const status = computeStatus(m.date);
        dtTable.row.add([
            `<input type="checkbox" class="form-check-input row-chk" data-id="${m.id}" style="width:16px;height:16px;cursor:pointer;accent-color:#6366f1;" onchange="handleRowSelect(this)">`,
            buildTitleCell(m),
            buildTypeBadge(m.type),
            buildDateCell(m.date, m.time),
            `<span style="font-weight:600;color:var(--slate-600);">${m.duration} min</span>`,
            buildPlatformCell(m.platform || 'Google Meet'),
            buildStatusPill(status),
            buildParticipants(m.participants),
            buildActions(m.id, m.title)
        ]);
    });
    dtTable.draw();
}

// ════════════════════════════════════════
//  CELL BUILDERS  (unchanged logic)
// ════════════════════════════════════════
function monogramColor(title) {
    const colors = [
        '#6366f1','#8b5cf6','#3b82f6','#06b6d4',
        '#10b981','#f59e0b','#ec4899','#64748b'
    ];
    let h = 0;
    for (let c of title) h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[h];
}

function buildTitleCell(m) {
    const mono = (m.title || '?').replace(/[^A-Za-z0-9 ]/g,'').trim().split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');
    const color = monogramColor(m.title);
    const participants = m.participants ? m.participants.split(',').filter(Boolean).length : 0;
    return `<div class="meeting-title-cell">
        <div class="meeting-monogram" style="background:${color}">${mono}</div>
        <div>
            <div class="meeting-name">${escHtml(m.title)}</div>
            <div class="meeting-participants">${participants} participant${participants !== 1 ? 's' : ''}</div>
        </div>
    </div>`;
}

function buildTypeBadge(type) {
    const cls  = { Internal:'type-internal', External:'type-external', Recurring:'type-recurring', Review:'type-review' };
    const icon = { Internal:'🏢', External:'🌐', Recurring:'🔁', Review:'📋' };
    return `<span class="type-badge ${cls[type]||'type-internal'}">${icon[type]||'📅'} ${type||'Internal'}</span>`;
}

function buildDateCell(date, time) {
    if (!date) return '<span style="color:#94a3b8">—</span>';
    const d = new Date(date + 'T00:00');
    const label = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    return `<div class="date-cell">${label}<div class="date-sub"><i class="fa-regular fa-clock me-1"></i>${time||''}</div></div>`;
}

function buildPlatformCell(platform) {
    const icon = PLATFORM_ICONS[platform] || '<i class="fa-solid fa-video"></i>';
    return `<span class="platform-badge">${icon} ${platform}</span>`;
}

function computeStatus(date) {
    if (!date) return 'Upcoming';
    const today = new Date().toISOString().split('T')[0];
    if (date === today) return 'Today';
    if (date > today)   return 'Upcoming';
    return 'Completed';
}

function buildStatusPill(status) {
    const cls = { Today:'status-today', Upcoming:'status-upcoming', Completed:'status-completed', Cancelled:'status-cancelled' };
    return `<span class="status-pill ${cls[status]||'status-upcoming'}">${status}</span>`;
}

function buildParticipants(participantsStr) {
    if (!participantsStr || !participantsStr.trim()) return '<span style="color:#94a3b8;font-size:0.75rem;">No participants</span>';
    const list = participantsStr.split(',').map(p=>p.trim()).filter(Boolean);
    const imgs = list.slice(0,3).map((_, i) =>
        `<img src="https://i.pravatar.cc/150?img=${(i+10)}" class="p-avatar" title="${list[i]}">`
    ).join('');
    const more = list.length > 3 ? `<span class="p-more">+${list.length-3}</span>` : '';
    return `<div class="participant-avatars">${imgs}${more}</div>`;
}

function buildActions(id, title) {
    return `<div class="action-btn-group" style="justify-content:center;">
        <button class="act-btn join"   onclick="joinMeeting(${id})"   title="Join"><i class="fa-solid fa-video"></i></button>
        <button class="act-btn edit"   onclick="openEditModal(${id})"  title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="act-btn delete" onclick="openDeleteModal(${id}, '${escHtml(title).replace(/'/g,"\\'")}')" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
    </div>`;
}

// ════════════════════════════════════════
//  FILTERS  (unchanged)
// ════════════════════════════════════════
function applyFilters() {
    const type     = document.getElementById('filterType').value.toLowerCase();
    const status   = document.getElementById('filterStatus').value.toLowerCase();
    const duration = document.getElementById('filterDuration').value;

    $.fn.dataTable.ext.search = [];

    if (type || status || duration) {
        $.fn.dataTable.ext.search.push((settings, data) => {
            if (settings.nTable.id !== 'meetingsTable') return true;
            const rowType     = data[2].toLowerCase();
            const rowStatus   = data[6].toLowerCase();
            const rowDuration = parseInt(data[4]) || 0;

            if (type   && !rowType.includes(type))     return false;
            if (status && !rowStatus.includes(status)) return false;
            if (duration) {
                if (duration === '90' && rowDuration < 90) return false;
                if (duration !== '90' && rowDuration !== parseInt(duration)) return false;
            }
            return true;
        });
    }
    dtTable.draw();
}

// ════════════════════════════════════════
//  SELECTION  (unchanged)
// ════════════════════════════════════════
function toggleSelectAll() {
    const checked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.row-chk').forEach(chk => {
        chk.checked = checked;
        const id = parseInt(chk.dataset.id);
        checked ? selectedIds.add(id) : selectedIds.delete(id);
        chk.closest('tr').classList.toggle('selected-row', checked);
    });
    updateBulkBar();
}

function handleRowSelect(chk) {
    const id = parseInt(chk.dataset.id);
    if (chk.checked) { selectedIds.add(id); chk.closest('tr').classList.add('selected-row'); }
    else             { selectedIds.delete(id); chk.closest('tr').classList.remove('selected-row'); }
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkActions');
    document.getElementById('bulkCount').textContent = selectedIds.size;
    bar.classList.toggle('visible', selectedIds.size > 0);
}

// ════════════════════════════════════════
//  MODAL HELPERS (new compact form)
// ════════════════════════════════════════
function selectColor(el) {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
}

function toggleNotify(btn) {
    btn.classList.toggle('active');
}

// Auto-compute duration from time range
function computeDurationFromRange() {
    const start = document.getElementById('fTime').value;
    const end   = document.getElementById('fTimeEnd').value;
    if (!start || !end) return 30;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 30;
}

function addEndTimeFromDuration(startTime, durationMins) {
    if (!startTime) return '10:00';
    const [h, m] = startTime.split(':').map(Number);
    const total  = h * 60 + m + durationMins;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
}

// ════════════════════════════════════════
//  CRUD: CREATE / UPDATE
// ════════════════════════════════════════
function openAddModal() {
    document.getElementById('editMeetingId').value = '';
    document.getElementById('crudModalTitle').textContent = 'New Meeting';
    document.getElementById('saveLabel').textContent = 'Create Meeting';
    document.getElementById('fTitle').value       = '';
    document.getElementById('fParticipants').value = '';
    document.getElementById('fLink').value         = '';
    document.getElementById('fType').value         = 'Internal';
    document.getElementById('fPlatform').value     = 'Google Meet';
    document.getElementById('fDuration').value     = '30';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fDate').value    = today;
    document.getElementById('fTime').value    = '09:00';
    document.getElementById('fTimeEnd').value = '10:00';
    // Reset color dots
    document.querySelectorAll('.color-dot').forEach((d,i) => d.classList.toggle('selected', i===0));
    new bootstrap.Modal(document.getElementById('meetingCrudModal')).show();
}

function openEditModal(id) {
    const m = allMeetings.find(x => x.id === id);
    if (!m) return;
    document.getElementById('editMeetingId').value     = m.id;
    document.getElementById('crudModalTitle').textContent = 'Edit Meeting';
    document.getElementById('saveLabel').textContent   = 'Save Changes';
    document.getElementById('fTitle').value            = m.title;
    document.getElementById('fType').value             = m.type || 'Internal';
    document.getElementById('fPlatform').value         = m.platform || 'Google Meet';
    document.getElementById('fDate').value             = m.date;
    document.getElementById('fTime').value             = m.time;
    document.getElementById('fTimeEnd').value          = addEndTimeFromDuration(m.time, m.duration || 30);
    document.getElementById('fDuration').value         = String(m.duration);
    document.getElementById('fParticipants').value     = m.participants || '';
    document.getElementById('fLink').value             = m.link || '';
    document.querySelectorAll('.color-dot').forEach((d,i) => d.classList.toggle('selected', i===0));
    new bootstrap.Modal(document.getElementById('meetingCrudModal')).show();
}

async function saveMeetingCrud() {
    const id    = document.getElementById('editMeetingId').value;
    const title = document.getElementById('fTitle').value.trim();
    if (!title) { showToast('Meeting title is required', 'error'); return; }

    const duration = computeDurationFromRange();

    const payload = {
        title,
        type:         document.getElementById('fType').value,
        platform:     document.getElementById('fPlatform').value,
        date:         document.getElementById('fDate').value,
        time:         document.getElementById('fTime').value,
        duration,
        participants: document.getElementById('fParticipants').value,
        link:         document.getElementById('fLink').value,
    };

    try {
        const isEdit = !!id;
        const url    = isEdit ? `/api/meetings/${id}` : '/api/meetings';
        const method = isEdit ? 'PUT' : 'POST';
        const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error();

        bootstrap.Modal.getInstance(document.getElementById('meetingCrudModal'))?.hide();
        showToast(isEdit ? 'Meeting updated ✓' : 'Meeting created ✓', 'success');
        await loadMeetings();
    } catch {
        showToast('Something went wrong. Please try again.', 'error');
    }
}

// ════════════════════════════════════════
//  CRUD: DELETE  (unchanged)
// ════════════════════════════════════════
function openDeleteModal(id, title) {
    pendingDelete = { type: 'single', id };
    document.getElementById('deleteDesc').textContent = `"${title}" will be permanently removed.`;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
    document.getElementById('confirmDeleteBtn').onclick = execDelete;
}

async function execDelete() {
    bootstrap.Modal.getInstance(document.getElementById('deleteModal'))?.hide();
    if (!pendingDelete) return;

    try {
        if (pendingDelete.type === 'single') {
            const res = await fetch(`/api/meetings/${pendingDelete.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            showToast('Meeting deleted', 'success');
        } else if (pendingDelete.type === 'bulk') {
            await Promise.all([...selectedIds].map(id => fetch(`/api/meetings/${id}`, { method: 'DELETE' })));
            selectedIds.clear();
            updateBulkBar();
            showToast('Meetings deleted', 'success');
        }
        await loadMeetings();
    } catch {
        showToast('Delete failed. Try again.', 'error');
    }
    pendingDelete = null;
}

function bulkDelete() {
    if (!selectedIds.size) return;
    pendingDelete = { type: 'bulk' };
    document.getElementById('deleteDesc').textContent = `${selectedIds.size} meeting(s) will be permanently removed.`;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
    document.getElementById('confirmDeleteBtn').onclick = execDelete;
}

function confirmClearAll() {
    if (!allMeetings.length) { showToast('No meetings to clear', 'error'); return; }
    pendingDelete = { type: 'clearAll' };
    document.getElementById('deleteDesc').textContent = `All ${allMeetings.length} meetings will be permanently removed.`;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
    document.getElementById('confirmDeleteBtn').onclick = async () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal'))?.hide();
        try {
            const res = await fetch('/api/meetings/all', { method: 'DELETE' });
            if (!res.ok) throw new Error();
            showToast('All meetings cleared', 'success');
            await loadMeetings();
        } catch { showToast('Failed to clear meetings', 'error'); }
    };
}

// ════════════════════════════════════════
//  JOIN / EXPORT / TOAST / HELPERS  (unchanged)
// ════════════════════════════════════════
function joinMeeting(id) {
    const m = allMeetings.find(x => x.id === id);
    if (m?.link) { window.open(m.link, '_blank'); return; }
    showToast('No meeting link available', 'error');
}

function exportCSV() {
    if (!allMeetings.length) { showToast('No data to export', 'error'); return; }
    const cols = ['id','title','type','date','time','duration','platform','participants'];
    const csv  = [cols.join(','), ...allMeetings.map(m =>
        cols.map(c => `"${String(m[c]||'').replace(/"/g,'""')}"`).join(',')
    )].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = `meetings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Exported successfully ✓', 'success');
}

function showToast(msg, type='success') {
    const stack = document.getElementById('toastStack');
    const el    = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.innerHTML = `<span class="toast-icon"><i class="fa-solid ${type==='success'?'fa-circle-check':'fa-circle-xmark'}"></i></span>${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

function escHtml(str) {
    return String(str||'').replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]));
}
