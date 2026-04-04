// ════════════════════════════════════════
//  STATE
// ════════════════════════════════════════
let allMeetings   = [];
let allContacts   = [];   // loaded once for Tagify whitelist
let dtTable       = null;
let selectedIds   = new Set();
let pendingDelete = null;
let tagify        = null; // Tagify instance on #fParticipants
let fpDate        = null; // Flatpickr instance — date
let fpTimeStart   = null; // Flatpickr instance — start time
let fpTimeEnd     = null; // Flatpickr instance — end time

// ════════════════════════════════════════
//  INIT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initDataTable();
    initFlatpickr();
    initTagify();
    loadContacts();   // pre-load contact list for Tagify whitelist
    loadMeetings();

    document.getElementById('searchInput').addEventListener('input', e => {
        dtTable.search(e.target.value).draw();
    });
    document.getElementById('filterStatus').addEventListener('change',   applyFilters);
    document.getElementById('filterDuration').addEventListener('change', applyFilters);
    document.getElementById('selectAll').addEventListener('change',      toggleSelectAll);
});

// ── DataTable ────────────────────────────────────────────────────────────────
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
            { orderable: false, targets: [0, 6] },
            { type: 'date',     targets: [2] }
        ],
        order: [[2, 'asc']]
    });
}

// ── Flatpickr ─────────────────────────────────────────────────────────────────
function initFlatpickr() {
    fpDate = flatpickr('#fDate', {
        dateFormat:  'Y-m-d',
        altInput:    true,
        altFormat:   'F j, Y',
        allowInput:  false,
        disableMobile: true,
    });

    fpTimeStart = flatpickr('#fTime', {
        enableTime:  true,
        noCalendar:  true,
        dateFormat:  'H:i',
        time_24hr:   true,
        minuteIncrement: 15,
        disableMobile: true,
        onClose(selectedDates) {
            // Auto-advance end time to keep minimum 30 min gap
            if (selectedDates[0] && fpTimeEnd) {
                const start = selectedDates[0];
                const end   = fpTimeEnd.selectedDates[0];
                if (!end || end <= start) {
                    const newEnd = new Date(start.getTime() + 30 * 60 * 1000);
                    fpTimeEnd.setDate(newEnd, true);
                }
            }
        }
    });

    fpTimeEnd = flatpickr('#fTimeEnd', {
        enableTime:  true,
        noCalendar:  true,
        dateFormat:  'H:i',
        time_24hr:   true,
        minuteIncrement: 15,
        disableMobile: true,
    });
}

// ── Tagify ────────────────────────────────────────────────────────────────────
function initTagify() {
    tagify = new Tagify(document.getElementById('fParticipants'), {
        whitelist:        [],
        enforceWhitelist: false,             // allow any email, not just contacts
        delimiters:       ',',               // comma separates tags
        pattern:          /^[^\s@]+@[^\s@]+\.[^\s@]+$|^.{2,}$/,  // loose — any text OK
        dropdown: {
            enabled:      1,                 // show suggestions after 1 char
            maxItems:     20,
            closeOnSelect: true,
            searchKeys:   ['value', 'email', 'name'],
        },
        templates: {
            dropdownItem(item) {
                return `<div class='tagify__dropdown__item'>
                    <span class='tagify-contact-avatar'>${(item.name || item.value).charAt(0).toUpperCase()}</span>
                    <span>
                        <strong>${item.name || item.value}</strong>
                        ${item.email ? `<small style="color:#94a3b8;margin-left:6px;">${item.email}</small>` : ''}
                    </span>
                </div>`;
            }
        }
    });
}

// Refresh Tagify whitelist from loaded contacts
function updateTagifyWhitelist() {
    if (!tagify) return;
    const whitelist = allContacts.map(c => ({
        value: c.email || `${c.first_name} ${c.last_name}`,
        name:  `${c.first_name} ${c.last_name}`,
        email: c.email,
    }));
    tagify.settings.whitelist = whitelist;
}

// ════════════════════════════════════════
//  API: LOAD CONTACTS (for Tagify)
// ════════════════════════════════════════
async function loadContacts() {
    try {
        const res  = await fetch('/api/contacts');
        const data = await res.json();
        allContacts = data.contacts || [];
        updateTagifyWhitelist();
    } catch { /* silent — tagify still works without whitelist */ }
}

// ════════════════════════════════════════
//  API: LOAD MEETINGS
// ════════════════════════════════════════
async function loadMeetings() {
    try {
        const res  = await fetch('/api/meetings');
        const data = await res.json();
        allMeetings = data.meetings || [];
        renderTable(allMeetings);
        renderStats(allMeetings);
    } catch {
        showToast('Failed to load meetings', 'error');
    }
}

function renderStats(meetings) {
    document.getElementById('totalCount').textContent   = meetings.length;
}

function renderTable(meetings) {
    dtTable.clear();
    meetings.forEach(m => {
        const status = computeStatus(m.date);
        dtTable.row.add([
            `<input type="checkbox" class="form-check-input row-chk" data-id="${m.id}"
                    style="width:16px;height:16px;cursor:pointer;accent-color:#6366f1;"
                    onchange="handleRowSelect(this)">`,
            buildTitleCell(m),
            buildDateCell(m.date, m.time),
            `<span style="font-weight:600;color:var(--slate-600);">${m.duration} min</span>`,
            buildStatusPill(status),
            buildParticipants(m.participants),
            buildActions(m.id, m.title)
        ]);
    });
    dtTable.draw();
}

// ════════════════════════════════════════
//  CELL BUILDERS
// ════════════════════════════════════════
function monogramColor(title) {
    const colors = ['#6366f1','#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#ec4899','#64748b'];
    let h = 0;
    for (const c of title) h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[h];
}

function buildTitleCell(m) {
    const mono  = (m.title || '?').replace(/[^A-Za-z0-9 ]/g,'').trim()
                    .split(' ').slice(0,2).map(w => w[0]?.toUpperCase() || '').join('');
    const color = monogramColor(m.title);
    const count = m.participants ? m.participants.split(',').filter(Boolean).length : 0;
    const desc  = m.description
        ? `<div class="meeting-desc">${escHtml(m.description.slice(0, 60))}${m.description.length > 60 ? '…' : ''}</div>`
        : '';
    return `<div class="meeting-title-cell">
        <div class="meeting-monogram" style="background:${color}">${mono}</div>
        <div>
            <div class="meeting-name">${escHtml(m.title)}</div>
            <div class="meeting-participants">${count} participant${count !== 1 ? 's' : ''}</div>
            ${desc}
        </div>
    </div>`;
}

function buildDateCell(date, time) {
    if (!date) return '—';
    const d       = new Date(`${date}T${time || '00:00'}`);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = time ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="date-cell">${dateStr}</div><div class="date-sub">${timeStr}</div>`;
}

function computeStatus(date) {
    if (!date) return 'unknown';
    const today = new Date().toISOString().split('T')[0];
    if (date < today)  return 'past';
    if (date === today) return 'today';
    return 'upcoming';
}

function buildStatusPill(status) {
    const map = {
        today:    { cls: 'status-today',    label: 'Today' },
        upcoming: { cls: 'status-upcoming', label: 'Upcoming' },
        past:     { cls: 'status-completed',label: 'Past' },
    };
    const s = map[status] || { cls: '', label: status };
    return `<span class="status-pill ${s.cls}">${s.label}</span>`;
}

function avatarColor(str) {
    const colors = ['#6366f1','#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#ec4899','#64748b'];
    let h = 0;
    for (const c of (str || '')) h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[h];
}

function buildParticipants(participants) {
    if (!participants) return '<span style="color:var(--slate-400);font-size:0.78rem;">—</span>';
    const list = participants.split(',').map(p => p.trim()).filter(Boolean);
    const avatars = list.slice(0, 3).map(email => {
        // Try to match a contact for name + better initials
        const c   = allContacts.find(x => x.email === email);
        const name = c ? `${c.first_name} ${c.last_name}` : email;
        // Build initials: first letter of first + last word of name, or first 2 chars of email prefix
        let ini;
        if (c) {
            ini = ((c.first_name[0] || '') + (c.last_name[0] || '')).toUpperCase();
        } else {
            ini = email.split('@')[0].slice(0, 2).toUpperCase();
        }
        const bg  = avatarColor(email);
        return `<span class="p-avatar-text" title="${escHtml(name)}"
                      style="background:${bg};">${ini}</span>`;
    }).join('');
    const more = list.length > 3
        ? `<span class="p-more">+${list.length - 3}</span>`
        : '';
    return `<div class="participant-avatars">${avatars}${more}</div>`;
}

function buildActions(id, title) {
    return `<div class="action-btn-group" style="justify-content:center;">
        <button class="act-btn edit"   onclick="openEditModal(${id})"  title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="act-btn delete" onclick="openDeleteModal(${id}, '${escHtml(title).replace(/'/g,"\\'")}')" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
    </div>`;
}

// ════════════════════════════════════════
//  FILTERS
// ════════════════════════════════════════
function applyFilters() {
    const status   = document.getElementById('filterStatus').value.toLowerCase();
    const duration = document.getElementById('filterDuration').value;

    $.fn.dataTable.ext.search = [];

    if (status || duration) {
        $.fn.dataTable.ext.search.push((settings, data) => {
            if (settings.nTable.id !== 'meetingsTable') return true;
            const rowStatus   = data[4].toLowerCase();   // col 4 = Status
            const rowDuration = parseInt(data[3]) || 0;  // col 3 = Duration

            if (status && !rowStatus.includes(status)) return false;
            if (duration) {
                if (duration === '90' && rowDuration < 90)                     return false;
                if (duration !== '90' && rowDuration !== parseInt(duration))   return false;
            }
            return true;
        });
    }
    dtTable.draw();
}

// ════════════════════════════════════════
//  SELECTION
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
    if (chk.checked) { selectedIds.add(id);    chk.closest('tr').classList.add('selected-row'); }
    else             { selectedIds.delete(id);  chk.closest('tr').classList.remove('selected-row'); }
    updateBulkBar();
}

function updateBulkBar() {
    document.getElementById('bulkCount').textContent = selectedIds.size;
    document.getElementById('bulkActions').classList.toggle('visible', selectedIds.size > 0);
}

// ════════════════════════════════════════
//  MODAL HELPERS
// ════════════════════════════════════════
function selectColor(el) {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
}

function computeDurationFromRange() {
    const sv = document.getElementById('fTime').value;
    const ev = document.getElementById('fTimeEnd').value;
    if (!sv || !ev) return 30;
    const [sh, sm] = sv.split(':').map(Number);
    const [eh, em] = ev.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 30;
}

function addEndTimeFromDuration(startTime, durationMins) {
    if (!startTime) return '10:00';
    const [h, m] = startTime.split(':').map(Number);
    const total  = h * 60 + m + durationMins;
    return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

// ════════════════════════════════════════
//  CRUD: OPEN ADD MODAL
// ════════════════════════════════════════
function openAddModal() {
    document.getElementById('editMeetingId').value        = '';
    document.getElementById('crudModalTitle').textContent = 'New Meeting';
    document.getElementById('saveLabel').textContent      = 'Create Meeting';
    document.getElementById('fTitle').value               = '';
    document.getElementById('fDescription').value         = '';
    document.getElementById('fTimezone').value            = 'Asia/Kolkata';

    // Flatpickr resets
    fpDate.setDate(new Date(), true);
    fpTimeStart.setDate('09:00', true);
    fpTimeEnd.setDate('10:00',   true);

    // Tagify reset
    tagify.removeAllTags();

    document.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('selected', i === 0));
    new bootstrap.Modal(document.getElementById('meetingCrudModal')).show();
}

// ════════════════════════════════════════
//  CRUD: OPEN EDIT MODAL
// ════════════════════════════════════════
function openEditModal(id) {
    const m = allMeetings.find(x => x.id === id);
    if (!m) return;

    document.getElementById('editMeetingId').value        = m.id;
    document.getElementById('crudModalTitle').textContent = 'Edit Meeting';
    document.getElementById('saveLabel').textContent      = 'Save Changes';
    document.getElementById('fTitle').value               = m.title;
    document.getElementById('fDescription').value         = m.description || '';
    document.getElementById('fTimezone').value            = m.timezone    || 'UTC';

    // Flatpickr
    fpDate.setDate(m.date, true);
    fpTimeStart.setDate(m.time, true);
    fpTimeEnd.setDate(addEndTimeFromDuration(m.time, m.duration || 30), true);

    // Tagify — load existing participants as tags
    tagify.removeAllTags();
    if (m.participants) {
        const tags = m.participants.split(',').map(e => e.trim()).filter(Boolean).map(email => {
            const c = allContacts.find(x => x.email === email);
            return c ? { value: email, name: `${c.first_name} ${c.last_name}` } : { value: email };
        });
        tagify.addTags(tags);
    }

    document.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('selected', i === 0));
    new bootstrap.Modal(document.getElementById('meetingCrudModal')).show();
}

// ════════════════════════════════════════
//  CRUD: SAVE
// ════════════════════════════════════════
async function saveMeetingCrud() {
    const id    = document.getElementById('editMeetingId').value;
    const title = document.getElementById('fTitle').value.trim();
    if (!title) { showToast('Meeting title is required', 'error'); return; }

    const date = document.getElementById('fDate').value;
    const time = document.getElementById('fTime').value;
    if (!date)  { showToast('Please pick a date', 'error'); return; }
    if (!time)  { showToast('Please pick a start time', 'error'); return; }

    const duration = computeDurationFromRange();

    // Collect participants from Tagify tags (use .value which is the email/text)
    const participants = tagify.value.map(t => t.value).join(', ');

    const payload = {
        title,
        description:  document.getElementById('fDescription').value,
        date,
        time,
        timezone:     document.getElementById('fTimezone').value,
        duration,
        participants,
        reminders:    '{"useDefault": true, "overrides": []}',
    };

    try {
        const isEdit = !!id;
        const res    = await fetch(isEdit ? `/api/meetings/${id}` : '/api/meetings', {
            method:  isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();

        bootstrap.Modal.getInstance(document.getElementById('meetingCrudModal'))?.hide();
        showToast(isEdit ? 'Meeting updated ✓' : 'Meeting created ✓', 'success');
        await loadMeetings();
    } catch {
        showToast('Something went wrong. Please try again.', 'error');
    }
}

// ════════════════════════════════════════
//  DELETE
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
            showToast('Meeting deleted ✓', 'success');
        } else if (pendingDelete.type === 'bulk') {
            await Promise.all([...selectedIds].map(id => fetch(`/api/meetings/${id}`, { method: 'DELETE' })));
            selectedIds.clear();
            showToast('Meetings deleted ✓', 'success');
        }
        await loadMeetings();
    } catch { showToast('Failed to delete. Try again.', 'error'); }
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
//  EXPORT
// ════════════════════════════════════════
function exportCSV() {
    if (!allMeetings.length) { showToast('No data to export', 'error'); return; }
    const cols = ['id','title','description','date','time','duration','timezone','participants'];
    const csv  = [cols.join(','), ...allMeetings.map(m =>
        cols.map(c => `"${String(m[c] || '').replace(/"/g, '""')}"`).join(',')
    )].join('\n');
    const a = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `meetings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Exported successfully ✓', 'success');
}

// ════════════════════════════════════════
//  TOAST + HELPERS
// ════════════════════════════════════════
function showToast(msg, type = 'success') {
    const stack = document.getElementById('toastStack');
    const el    = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.innerHTML = `<span class="toast-icon"><i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i></span>${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

function escHtml(str) {
    return String(str || '').replace(/[&<>'"]/g, t =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])
    );
}