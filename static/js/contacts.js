// ═══════════════════════════════════════════
//  STATE  (unchanged)
// ═══════════════════════════════════════════
let allContacts   = [];
let dtTable       = null;
let selectedIds   = new Set();
let pendingDel    = null;
let currentView   = 'table';
let drawerContact = null;

const AVATAR_COLORS = [
    '#6366f1','#8b5cf6','#3b82f6','#06b6d4',
    '#10b981','#f59e0b','#ec4899','#64748b'
];

// ═══════════════════════════════════════════
//  INIT  (unchanged)
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initDT();
    loadContacts();
    document.getElementById('searchInput').addEventListener('input', e => { dtTable.search(e.target.value).draw(); });
    document.getElementById('fRole').addEventListener('change', applyFilters);
    document.getElementById('fCompany').addEventListener('change', applyFilters);
    document.getElementById('fStatus').addEventListener('change', applyFilters);
});

function initDT() {
    dtTable = $('#contactsTable').DataTable({
        dom: 't<"dt-bottom-bar"<"dataTables_info"i><"dataTables_paginate"p>>',
        pagingType: 'simple_numbers',
        pageLength: 10,
        language: {
            info: 'Showing _START_–_END_ of _TOTAL_ contacts',
            paginate: {
                previous: '<i class="fa-solid fa-chevron-left"></i>',
                next:     '<i class="fa-solid fa-chevron-right"></i>'
            },
            emptyTable: '<div style="padding:48px 0;color:#94a3b8;font-size:0.83rem;font-family:DM Sans,sans-serif;">No contacts yet — add your first one above.</div>'
        },
        columnDefs: [{ orderable: false, targets: [0, 7] }],
        order: [[1, 'asc']]
    });
}

// ═══════════════════════════════════════════
//  API: LOAD  (unchanged)
// ═══════════════════════════════════════════
async function loadContacts() {
    try {
        const r = await fetch('/api/contacts');
        const d = await r.json();
        allContacts = d.contacts || [];
        renderTable(allContacts);
        renderGrid(allContacts);
        renderStats(allContacts);
        populateCompanyFilter(allContacts);
    } catch { showToast('Failed to load contacts', 'err'); }
}

function renderStats(contacts) {
    const companies = new Set(contacts.map(c => c.company).filter(Boolean));
    document.getElementById('statTotal').textContent     = contacts.length;
    document.getElementById('statActive').textContent    = contacts.filter(c => c.status === 'Active').length;
    document.getElementById('statCompanies').textContent = companies.size;
    document.getElementById('statExternal').textContent  = contacts.filter(c => c.company && c.company.toLowerCase() !== 'internal').length;
    document.getElementById('totalBadge').textContent    = contacts.length;
}

function populateCompanyFilter(contacts) {
    const sel = document.getElementById('fCompany');
    const cur = sel.value;
    sel.innerHTML = '<option value="">All Companies</option>';
    [...new Set(contacts.map(c => c.company).filter(Boolean))].sort().forEach(co => {
        const o = document.createElement('option');
        o.value = co; o.textContent = co; sel.appendChild(o);
    });
    sel.value = cur;
}

// ═══════════════════════════════════════════
//  RENDER TABLE  (unchanged)
// ═══════════════════════════════════════════
function renderTable(contacts) {
    dtTable.clear();
    contacts.forEach(c => {
        dtTable.row.add([
            `<input type="checkbox" class="form-check-input row-chk" data-id="${c.id}" style="width:16px;height:16px;cursor:pointer;accent-color:#6366f1;" onchange="handleSel(this)">`,
            buildContactCell(c),
            buildRoleTag(c.role),
            buildCompanyCell(c.company),
            `<span style="font-size:0.78rem;color:var(--slate-600);font-weight:500;">${escH(c.phone||'—')}</span>`,
            buildStatusPill(c.status),
            buildLastContact(c.last_contact),
            buildActions(c.id, c.first_name + ' ' + c.last_name)
        ]);
    });
    dtTable.draw();
}

// ═══════════════════════════════════════════
//  CELL BUILDERS  (updated colors)
// ═══════════════════════════════════════════
function initials(f, l) { return ((f||'')[0]||'').toUpperCase() + ((l||'')[0]||'').toUpperCase(); }
function avatarColor(name) {
    let h = 0; for (let c of (name||'')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[h];
}

function buildContactCell(c) {
    const ini = initials(c.first_name, c.last_name);
    const col = avatarColor(c.first_name + c.last_name);
    const img = c.avatar_url
        ? `<img src="${c.avatar_url}" class="c-avatar" alt="${escH(c.first_name)}">`
        : `<div class="c-avatar-mono" style="background:${col}">${ini}</div>`;
    return `<div class="contact-cell" onclick="openDrawer(${c.id})">
        ${img}
        <div>
            <div class="c-name">${escH(c.first_name)} ${escH(c.last_name)}</div>
            <div class="c-email">${escH(c.email||'')}</div>
        </div>
    </div>`;
}

const ROLE_MAP  = { 'Developer':'role-dev','Designer':'role-design','Marketing Lead':'role-mkt','Product Manager':'role-pm','Operations':'role-ops' };
const ROLE_ICON = { 'Developer':'💻','Designer':'🎨','Marketing Lead':'📣','Product Manager':'📋','Operations':'⚙️' };

function buildRoleTag(role) {
    return `<span class="role-tag ${ROLE_MAP[role]||'role-default'}">${ROLE_ICON[role]||'👤'} ${escH(role||'—')}</span>`;
}

const CO_COLORS = ['#6366f1','#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b'];
function coColor(name) {
    let h=0; for(let c of (name||'')) h=(h*31+c.charCodeAt(0))%CO_COLORS.length;
    return CO_COLORS[h];
}
function buildCompanyCell(company) {
    if (!company) return `<span style="color:var(--slate-300);">—</span>`;
    return `<div class="company-cell">
        <span class="co-dot" style="background:${coColor(company)}"></span>
        <span style="font-weight:600;color:var(--slate-700);font-size:0.8rem;">${escH(company)}</span>
    </div>`;
}

function buildStatusPill(status) {
    const cls = { Active:'s-active', Inactive:'s-inactive', Pending:'s-pending' };
    return `<span class="s-pill ${cls[status]||'s-inactive'}">${status||'—'}</span>`;
}

function buildLastContact(date) {
    if (!date) return `<div class="lc-text" style="color:var(--slate-300);">Never</div>`;
    const d    = new Date(date);
    const diff = Math.floor((Date.now() - d) / 86400000);
    const rel  = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff}d ago`;
    return `<div class="lc-text">${rel}</div>
            <div class="lc-sub">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>`;
}

function buildActions(id, name) {
    const safe = name.replace(/'/g,"\\'");
    return `<div class="qa-group">
        <button class="qa-btn call" title="Call"     onclick="event.stopPropagation();quickCall(${id})"><i class="fa-solid fa-phone"></i></button>
        <button class="qa-btn mail" title="Email"    onclick="event.stopPropagation();quickEmail(${id})"><i class="fa-regular fa-envelope"></i></button>
        <button class="qa-btn meet" title="Schedule" onclick="event.stopPropagation();quickMeet(${id})"><i class="fa-regular fa-calendar-plus"></i></button>
        <button class="qa-btn edit" title="Edit"     onclick="event.stopPropagation();openEditModal(${id})"><i class="fa-solid fa-pen"></i></button>
        <button class="qa-btn del"  title="Delete"   onclick="event.stopPropagation();openDeleteModal(${id},'${safe}')"><i class="fa-regular fa-trash-can"></i></button>
    </div>`;
}

// ═══════════════════════════════════════════
//  GRID VIEW  (updated to use new design tokens)
// ═══════════════════════════════════════════
function renderGrid(contacts) {
    const gb = document.getElementById('gridBody');
    if (!contacts.length) {
        gb.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--slate-400);font-size:0.83rem;">No contacts to display.</div>';
        return;
    }
    gb.innerHTML = contacts.map(c => {
        const ini = initials(c.first_name, c.last_name);
        const col = avatarColor(c.first_name + c.last_name);
        const statusCls = {Active:'s-active',Inactive:'s-inactive',Pending:'s-pending'}[c.status]||'s-inactive';
        return `<div class="grid-card" onclick="openDrawer(${c.id})">
            <div class="grid-avatar" style="background:${col}">${ini}</div>
            <div>
                <div class="grid-name">${escH(c.first_name)} ${escH(c.last_name)}</div>
                <div class="grid-role">${escH(c.role||'')}</div>
            </div>
            <span class="s-pill ${statusCls}">${c.status||'—'}</span>
            <div class="grid-company">${escH(c.company||'—')}</div>
        </div>`;
    }).join('');
}

function setView(v) {
    currentView = v;
    document.getElementById('tableView').style.display = v === 'table' ? '' : 'none';
    document.getElementById('gridView').style.display  = v === 'grid'  ? '' : 'none';
    document.getElementById('viewTable').classList.toggle('active', v === 'table');
    document.getElementById('viewGrid').classList.toggle('active',  v === 'grid');
}

// ═══════════════════════════════════════════
//  FILTERS  (unchanged)
// ═══════════════════════════════════════════
function applyFilters() {
    const role    = document.getElementById('fRole').value.toLowerCase();
    const company = document.getElementById('fCompany').value.toLowerCase();
    const status  = document.getElementById('fStatus').value.toLowerCase();
    $.fn.dataTable.ext.search = [];
    if (role || company || status) {
        $.fn.dataTable.ext.search.push((settings, data) => {
            if (settings.nTable.id !== 'contactsTable') return true;
            if (role    && !data[2].toLowerCase().includes(role))    return false;
            if (company && !data[3].toLowerCase().includes(company)) return false;
            if (status  && !data[5].toLowerCase().includes(status))  return false;
            return true;
        });
    }
    dtTable.draw();
    const filtered = allContacts.filter(c => {
        if (role    && !(c.role||'').toLowerCase().includes(role))       return false;
        if (company && !(c.company||'').toLowerCase().includes(company)) return false;
        if (status  && !(c.status||'').toLowerCase().includes(status))   return false;
        return true;
    });
    renderGrid(filtered);
}

// ═══════════════════════════════════════════
//  SELECTION  (unchanged)
// ═══════════════════════════════════════════
function toggleAll(chk) {
    document.querySelectorAll('.row-chk').forEach(c => {
        c.checked = chk.checked;
        const id = parseInt(c.dataset.id);
        chk.checked ? selectedIds.add(id) : selectedIds.delete(id);
        c.closest('tr').classList.toggle('sel-row', chk.checked);
    });
    updateBulk();
}
function handleSel(chk) {
    const id = parseInt(chk.dataset.id);
    chk.checked ? selectedIds.add(id) : selectedIds.delete(id);
    chk.closest('tr').classList.toggle('sel-row', chk.checked);
    updateBulk();
}
function updateBulk() {
    const bar = document.getElementById('bulkBar');
    document.getElementById('bulkN').textContent = selectedIds.size;
    bar.classList.toggle('on', selectedIds.size > 0);
}

// ═══════════════════════════════════════════
//  DRAWER  (unchanged logic)
// ═══════════════════════════════════════════
function openDrawer(id) {
    const c = allContacts.find(x => x.id === id);
    if (!c) return;
    drawerContact = c;
    const ini = initials(c.first_name, c.last_name);
    const col = avatarColor(c.first_name + c.last_name);
    const avEl = document.getElementById('dAvatar');
    avEl.style.background = col;
    avEl.textContent = ini;
    document.getElementById('dName').textContent        = `${c.first_name} ${c.last_name}`;
    document.getElementById('dRoleCompany').textContent = [c.role, c.company].filter(Boolean).join(' · ');
    document.getElementById('dEmail').textContent       = c.email   || '—';
    document.getElementById('dPhone').textContent       = c.phone   || '—';
    document.getElementById('dCompany').textContent     = c.company || '—';
    document.getElementById('dStatus').innerHTML        = buildStatusPill(c.status);
    document.getElementById('dNotes').textContent       = c.notes   || 'No notes added.';
    document.getElementById('dScheduleBtn').onclick = () => { window.sendQuickAction && sendQuickAction(`Schedule meeting with ${c.first_name}`); closeDrawer(); };
    document.getElementById('dEmailBtn').onclick    = () => { window.location.href = `mailto:${c.email}`; };
    document.getElementById('dCallBtn').onclick     = () => { window.location.href = `tel:${c.phone}`; };
    document.getElementById('dEditBtn').onclick     = () => { closeDrawer(); setTimeout(() => openEditModal(id), 220); };
    document.getElementById('drawerOverlay').classList.add('on');
    document.getElementById('sideDrawer').classList.add('on');
}
function closeDrawer() {
    document.getElementById('drawerOverlay').classList.remove('on');
    document.getElementById('sideDrawer').classList.remove('on');
}

// ═══════════════════════════════════════════
//  CRUD MODAL  (unchanged logic)
// ═══════════════════════════════════════════
function openAddModal() {
    document.getElementById('editId').value = '';
    document.getElementById('modalTitle').textContent = 'New Contact';
    document.getElementById('saveLabel').textContent  = 'Add Contact';
    ['fFirst','fLast','fEmail','fPhone','fCompany2','fNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('fRole2').value    = 'Developer';
    document.getElementById('fStatus2').value  = 'Active';
    document.getElementById('fLastContact').value = new Date().toISOString().split('T')[0];
    updatePreview();
    new bootstrap.Modal(document.getElementById('contactModal')).show();
}

function openEditModal(id) {
    const c = allContacts.find(x => x.id === id);
    if (!c) return;
    document.getElementById('editId').value          = c.id;
    document.getElementById('modalTitle').textContent = 'Edit Contact';
    document.getElementById('saveLabel').textContent  = 'Save Changes';
    document.getElementById('fFirst').value           = c.first_name;
    document.getElementById('fLast').value            = c.last_name;
    document.getElementById('fEmail').value           = c.email     || '';
    document.getElementById('fPhone').value           = c.phone     || '';
    document.getElementById('fRole2').value           = c.role      || 'Developer';
    document.getElementById('fCompany2').value        = c.company   || '';
    document.getElementById('fStatus2').value         = c.status    || 'Active';
    document.getElementById('fLastContact').value     = c.last_contact || '';
    document.getElementById('fNotes').value           = c.notes     || '';
    updatePreview();
    new bootstrap.Modal(document.getElementById('contactModal')).show();
}

function updatePreview() {
    const first = document.getElementById('fFirst').value.trim();
    const last  = document.getElementById('fLast').value.trim();
    const ini   = initials(first, last) || '?';
    const col   = (first || last) ? avatarColor(first + last) : '#6366f1';
    const ring  = document.getElementById('avatarPreview');
    ring.textContent = ini;
    ring.style.background = col;
    document.getElementById('previewName').textContent = (first + ' ' + last).trim() || 'Enter a name';
}

async function saveContact() {
    const id    = document.getElementById('editId').value;
    const first = document.getElementById('fFirst').value.trim();
    const last  = document.getElementById('fLast').value.trim();
    if (!first || !last) { showToast('First and last name required', 'err'); return; }
    const payload = {
        first_name:   first, last_name: last,
        email:        document.getElementById('fEmail').value.trim(),
        phone:        document.getElementById('fPhone').value.trim(),
        role:         document.getElementById('fRole2').value,
        company:      document.getElementById('fCompany2').value.trim(),
        status:       document.getElementById('fStatus2').value,
        last_contact: document.getElementById('fLastContact').value,
        notes:        document.getElementById('fNotes').value.trim(),
    };
    try {
        const isEdit = !!id;
        const res = await fetch(isEdit ? `/api/contacts/${id}` : '/api/contacts', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        bootstrap.Modal.getInstance(document.getElementById('contactModal'))?.hide();
        showToast(isEdit ? 'Contact updated ✓' : 'Contact added ✓', 'ok');
        await loadContacts();
    } catch { showToast('Something went wrong', 'err'); }
}

// ═══════════════════════════════════════════
//  DELETE  (unchanged)
// ═══════════════════════════════════════════
function openDeleteModal(id, name) {
    pendingDel = { type: 'single', id };
    document.getElementById('delDesc').textContent = `"${name}" will be permanently removed from your network.`;
    document.getElementById('confirmDelBtn').onclick = execDelete;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}
async function execDelete() {
    bootstrap.Modal.getInstance(document.getElementById('deleteModal'))?.hide();
    if (!pendingDel) return;
    try {
        if (pendingDel.type === 'single') {
            const r = await fetch(`/api/contacts/${pendingDel.id}`, { method: 'DELETE' });
            if (!r.ok) throw new Error();
            showToast('Contact removed', 'ok');
        } else if (pendingDel.type === 'bulk') {
            await Promise.all([...selectedIds].map(id => fetch(`/api/contacts/${id}`, { method: 'DELETE' })));
            selectedIds.clear(); updateBulk();
            showToast('Contacts removed', 'ok');
        }
        await loadContacts();
    } catch { showToast('Delete failed', 'err'); }
    pendingDel = null;
}
function bulkDelete() {
    if (!selectedIds.size) return;
    pendingDel = { type: 'bulk' };
    document.getElementById('delDesc').textContent = `${selectedIds.size} contact(s) will be permanently removed.`;
    document.getElementById('confirmDelBtn').onclick = execDelete;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}
function confirmClearAll() {
    if (!allContacts.length) { showToast('No contacts to clear', 'err'); return; }
    pendingDel = { type: 'clearAll' };
    document.getElementById('delDesc').textContent = `All ${allContacts.length} contacts will be permanently removed.`;
    document.getElementById('confirmDelBtn').onclick = async () => {
        bootstrap.Modal.getInstance(document.getElementById('deleteModal'))?.hide();
        try {
            const r = await fetch('/api/contacts/all', { method: 'DELETE' });
            if (!r.ok) throw new Error();
            showToast('All contacts cleared', 'ok');
            await loadContacts();
        } catch { showToast('Failed', 'err'); }
    };
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

// ═══════════════════════════════════════════
//  QUICK ACTIONS  (unchanged)
// ═══════════════════════════════════════════
function quickCall(id)  { const c=allContacts.find(x=>x.id===id); if(c?.phone){window.location.href=`tel:${c.phone}`;}else showToast('No phone number on record','err'); }
function quickEmail(id) { const c=allContacts.find(x=>x.id===id); if(c?.email){window.location.href=`mailto:${c.email}`;}else showToast('No email on record','err'); }
function quickMeet(id)  { const c=allContacts.find(x=>x.id===id); if(c&&window.sendQuickAction)sendQuickAction(`Schedule meeting with ${c.first_name} ${c.last_name}`);else showToast('Scheduling from chat','ok'); }
function bulkMeeting()  { showToast(`Scheduling for ${selectedIds.size} contacts`, 'ok'); }
function bulkEmail()    { showToast(`Opening email for ${selectedIds.size} contacts`, 'ok'); }

// ═══════════════════════════════════════════
//  EXPORT  (unchanged)
// ═══════════════════════════════════════════
function exportCSV() {
    if (!allContacts.length) { showToast('No contacts to export', 'err'); return; }
    const cols = ['id','first_name','last_name','email','phone','role','company','status','last_contact'];
    const csv  = [cols.join(','), ...allContacts.map(c => cols.map(k=>`"${String(c[k]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Exported ✓', 'ok');
}

// ═══════════════════════════════════════════
//  TOAST + HELPERS  (updated colors)
// ═══════════════════════════════════════════
function showToast(msg, type='ok') {
    const stack = document.getElementById('tStack');
    const el    = document.createElement('div');
    el.className = `t-item ${type}`;
    el.innerHTML = `<span class="t-ico"><i class="fa-solid ${type==='ok'?'fa-circle-check':'fa-circle-xmark'}"></i></span>${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}
function escH(s) {
    return String(s||'').replace(/[&<>'"]/g,t=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]));
}
