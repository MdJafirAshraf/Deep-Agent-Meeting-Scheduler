// ════════════════════════════════════════
//  STATE
// ════════════════════════════════════════
let calInstance     = null;
let allMeetings     = [];
let allContacts     = [];
let activeMeetingId = null;
let selectedColor   = 'blue';
let calTagify       = null;   // Tagify on #calParticipants
let calFpDate       = null;   // Flatpickr date
let calFpStart      = null;   // Flatpickr start time
let calFpEnd        = null;   // Flatpickr end time

// Color map for event cards
const COLOR_MAP = {
    blue:   { cls: 'ev-blue',   accent: '#3b82f6', text: '#1d4ed8' },
    green:  { cls: 'ev-green',  accent: '#10b981', text: '#065f46' },
    purple: { cls: 'ev-purple', accent: '#a855f7', text: '#6b21a8' },
    amber:  { cls: 'ev-amber',  accent: '#f59e0b', text: '#92400e' },
};
const COLOR_CYCLE = ['blue', 'green', 'purple', 'amber'];

// Derive a stable color from title
function colorForMeeting(m) {
    let h = 0;
    for (const c of (m.title || '')) h = (h * 31 + c.charCodeAt(0)) % COLOR_CYCLE.length;
    return COLOR_CYCLE[h];
}

// ════════════════════════════════════════
//  INIT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    initCalFlatpickr();
    initCalTagify();
    await loadContacts();
    await loadMeetings();   // loads data then calls initCalendar()
});

// ════════════════════════════════════════
//  FLATPICKR
// ════════════════════════════════════════
function initCalFlatpickr() {
    calFpDate = flatpickr('#calDate', {
        dateFormat:    'Y-m-d',
        altInput:      true,
        altFormat:     'F j, Y',
        allowInput:    false,
        disableMobile: true,
    });

    calFpStart = flatpickr('#calTimeStart', {
        enableTime:      true,
        noCalendar:      true,
        dateFormat:      'H:i',
        time_24hr:       true,
        minuteIncrement: 15,
        disableMobile:   true,
        onClose(selectedDates) {
            if (selectedDates[0] && calFpEnd) {
                const start = selectedDates[0];
                const end   = calFpEnd.selectedDates[0];
                if (!end || end <= start) {
                    calFpEnd.setDate(new Date(start.getTime() + 60 * 60 * 1000), true);
                }
            }
        }
    });

    calFpEnd = flatpickr('#calTimeEnd', {
        enableTime:      true,
        noCalendar:      true,
        dateFormat:      'H:i',
        time_24hr:       true,
        minuteIncrement: 15,
        disableMobile:   true,
    });
}

// ════════════════════════════════════════
//  TAGIFY
// ════════════════════════════════════════
function initCalTagify() {
    const el = document.getElementById('calParticipants');
    if (!el) return;
    calTagify = new Tagify(el, {
        whitelist:        [],
        enforceWhitelist: false,
        delimiters:       ',',
        dropdown: {
            enabled:       1,
            maxItems:      20,
            closeOnSelect: true,
            searchKeys:    ['value', 'email', 'name'],
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

function updateCalTagifyWhitelist() {
    if (!calTagify) return;
    calTagify.settings.whitelist = allContacts.map(c => ({
        value: c.email || `${c.first_name} ${c.last_name}`,
        name:  `${c.first_name} ${c.last_name}`,
        email: c.email,
    }));
}

// ════════════════════════════════════════
//  API: LOAD CONTACTS
// ════════════════════════════════════════
async function loadContacts() {
    try {
        const res   = await fetch('/api/contacts');
        const data  = await res.json();
        allContacts = data.contacts || [];
        updateCalTagifyWhitelist();
    } catch { /* silent */ }
}

// ════════════════════════════════════════
//  API: LOAD MEETINGS
// ════════════════════════════════════════
async function loadMeetings() {
    try {
        const res   = await fetch('/api/meetings');
        const data  = await res.json();
        allMeetings = data.meetings || [];
        updateWeekCount();

        if (calInstance) {
            // Refresh events in existing calendar
            calInstance.removeAllEvents();
            calInstance.addEventSource(meetingsToEvents(allMeetings));
        } else {
            initCalendar();
        }
    } catch {
        showCalToast('Failed to load meetings', 'error');
    }
}

// ════════════════════════════════════════
//  MEETINGS → FULLCALENDAR EVENTS
// ════════════════════════════════════════
function meetingsToEvents(meetings) {
    return meetings.map(m => {
        const color    = colorForMeeting(m);
        const c        = COLOR_MAP[color];
        const startStr = m.date && m.time ? `${m.date}T${m.time}` : m.date;
        let   endStr   = startStr;
        if (startStr && m.duration) {
            const s = new Date(startStr);
            s.setMinutes(s.getMinutes() + (parseInt(m.duration) || 30));
            endStr = s.toISOString();
        }
        return {
            id:          String(m.id),
            title:       m.title,
            start:       startStr,
            end:         endStr,
            classNames:  [c.cls],
            extendedProps: {
                meetingId:    m.id,
                description:  m.description,
                participants: m.participants,
                duration:     m.duration,
                timezone:     m.timezone,
                color,
                accent:       c.accent,
                text:         c.text,
            }
        };
    });
}

// ════════════════════════════════════════
//  WEEK / VIEW COUNT BADGE
// ════════════════════════════════════════
function updateWeekCount() {
    updateViewCount('timeGridWeek', getWeekStart(), getWeekEnd());
}

function updateViewCount(viewType, start, end) {
    const count = allMeetings.filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date + 'T00:00:00');
        return d >= start && d < end;
    }).length;
    const countEl = document.getElementById('calEventCount');
    const labelEl = document.getElementById('calViewLabel');
    if (countEl) countEl.textContent = count;
    if (labelEl) labelEl.textContent = (
        { timeGridDay: 'today', timeGridWeek: 'this week', dayGridMonth: 'this month' }[viewType] || 'this week'
    );
}

function getWeekStart() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
}
function getWeekEnd() {
    const s = getWeekStart();
    s.setDate(s.getDate() + 7);
    return s;
}

// ════════════════════════════════════════
//  FULLCALENDAR INIT
// ════════════════════════════════════════
function initCalendar() {
    const el = document.getElementById('calendar');
    if (!el) return;

    calInstance = new FullCalendar.Calendar(el, {
        initialView:  'timeGridWeek',
        headerToolbar: {
            left:   'title',
            center: 'timeGridDay,timeGridWeek,dayGridMonth',
            right:  'today prev,next'
        },
        slotMinTime:      '07:00:00',
        slotMaxTime:      '20:00:00',
        allDaySlot:       false,
        expandRows:       false,
        nowIndicator:     true,
        scrollTime:       getCurrentScrollTime(),
        slotEventOverlap: false,
        dayHeaderFormat:  { weekday: 'short', day: 'numeric' },
        events:           meetingsToEvents(allMeetings),
        height:           '100%',

        // Custom day header with circle for today
        dayHeaderContent(arg) {
            const isToday = arg.isToday;
            const weekday = arg.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum  = arg.date.getDate();
            return {
                html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 0;">
                    <span style="font-size:0.65rem;font-weight:700;letter-spacing:.6px;
                                 color:${isToday ? 'var(--brand-600)' : 'var(--slate-400)'};">${weekday}</span>
                    <span style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
                                 justify-content:center;font-size:0.85rem;font-weight:800;
                                 background:${isToday ? 'var(--brand-600)' : 'transparent'};
                                 color:${isToday ? 'white' : 'var(--slate-700)'};">${dayNum}</span>
                </div>`
            };
        },

        // Update count badge when view / date range changes
        datesSet(info) {
            updateViewCount(info.view.type, info.start, info.end);
        },

        // Click event → show popover
        eventClick(info) {
            info.jsEvent.stopPropagation();
            showPopover(info.event, info.jsEvent);
        },

        // Click empty slot → pre-fill date/time in add modal
        dateClick(info) {
            const d = info.dateStr.split('T');
            openAddModal(d[0], d[1] ? d[1].substring(0, 5) : '09:00');
        },

        // Event card content
        eventContent(arg) {
            const ep       = arg.event.extendedProps;
            const textCol  = ep.text || '#1d4ed8';
            const fmt      = d => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            const startFmt = fmt(arg.event.start);
            const endFmt   = arg.event.end ? fmt(arg.event.end) : '';
            const timeLabel = endFmt ? `${startFmt} – ${endFmt}` : startFmt;
            const desc     = ep.description
                ? `<div class="ev-platform" style="color:${textCol};opacity:.72;">${ep.description.slice(0, 40)}${ep.description.length > 40 ? '…' : ''}</div>`
                : '';
            return {
                html: `<div class="ev-card-inner" style="color:${textCol};">
                    <div class="ev-time">${timeLabel}</div>
                    <div class="ev-title">${arg.event.title}</div>
                    ${desc}
                </div>`
            };
        }
    });

    calInstance.render();
}

function getCurrentScrollTime() {
    const h = new Date().getHours();
    return `${String(Math.max(7, h - 1)).padStart(2, '0')}:00:00`;
}

// ════════════════════════════════════════
//  EVENT POPOVER
// ════════════════════════════════════════
function showPopover(event, jsEvent) {
    const ep = event.extendedProps;
    activeMeetingId = ep.meetingId;

    document.getElementById('popTitle').textContent          = event.title;
    document.getElementById('popColorBar').style.background  = ep.accent || '#6366f1';

    const start = event.start;
    const end   = event.end;
    document.getElementById('popDate').textContent = start
        ? start.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })
        : '—';

    let timeLabel = '—';
    if (start) {
        const s = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const e = end ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
        timeLabel = e ? `${s} – ${e}` : s;
    }
    document.getElementById('popTime').textContent = timeLabel;

    // Description row (replaces platform row since we removed platform)
    const descRow = document.getElementById('popDescRow');
    if (descRow) {
        if (ep.description) {
            document.getElementById('popDesc').textContent = ep.description;
            descRow.style.display = '';
        } else {
            descRow.style.display = 'none';
        }
    }

    // Participants row
    const partRow = document.getElementById('popParticipantsRow');
    if (partRow) {
        if (ep.participants) {
            const count = ep.participants.split(',').filter(Boolean).length;
            document.getElementById('popParticipants').textContent = `${count} participant${count !== 1 ? 's' : ''}`;
            partRow.style.display = '';
        } else {
            partRow.style.display = 'none';
        }
    }

    // Hide link row (field removed)
    const linkRow = document.getElementById('popLinkRow');
    if (linkRow)  linkRow.style.display  = 'none';
    const joinBtn = document.getElementById('popJoinBtn');
    if (joinBtn)  joinBtn.style.display  = 'none';

    // Position
    const pop  = document.getElementById('evPopover');
    pop.classList.add('on');
    document.getElementById('popOverlay').classList.add('on');

    const rect = jsEvent.target.getBoundingClientRect();
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const popW = 340, popH = 240;
    let left   = rect.right + 12;
    let top    = rect.top;
    if (left + popW > vw - 16) left = rect.left - popW - 12;
    if (left < 8)  left = 8;
    if (top + popH > vh - 16) top = vh - popH - 16;
    if (top < 8)   top  = 8;
    pop.style.left = `${left}px`;
    pop.style.top  = `${top}px`;
}

function closePopover() {
    document.getElementById('evPopover').classList.remove('on');
    document.getElementById('popOverlay').classList.remove('on');
    activeMeetingId = null;
}

function editFromPop() {
    const id = activeMeetingId;
    closePopover();
    setTimeout(() => openEditModal(id), 150);
}

function deleteFromPop() {
    const id = activeMeetingId;
    const m  = allMeetings.find(x => x.id === id);
    closePopover();
    if (!m) return;
    document.getElementById('calDelDesc').textContent = `"${m.title}" will be permanently removed.`;
    document.getElementById('calConfirmDel').onclick  = () => execCalDelete(id);
    new bootstrap.Modal(document.getElementById('calDeleteModal')).show();
}

async function execCalDelete(id) {
    bootstrap.Modal.getInstance(document.getElementById('calDeleteModal'))?.hide();
    try {
        const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showCalToast('Meeting deleted ✓', 'success');
        await loadMeetings();
    } catch {
        showCalToast('Delete failed. Try again.', 'error');
    }
}

// ════════════════════════════════════════
//  ADD MODAL
// ════════════════════════════════════════
function openAddModal(date, time) {
    document.getElementById('calEditId').value           = '';
    document.getElementById('calModalTitle').textContent = 'New Meeting';
    document.getElementById('calSaveLabel').textContent  = 'Create Meeting';
    document.getElementById('calTitle').value            = '';
    document.getElementById('calDescription').value      = '';
    document.getElementById('calTimezone').value         = 'UTC';

    // Flatpickr
    calFpDate.setDate(date || new Date(), true);
    calFpStart.setDate(time || '09:00', true);
    calFpEnd.setDate(addMinutes(time || '09:00', 60), true);

    // Tagify
    if (calTagify) calTagify.removeAllTags();

    // Color dots
    document.querySelectorAll('#calMeetingModal .color-dot').forEach((d, i) => d.classList.toggle('selected', i === 0));
    selectedColor = 'blue';

    new bootstrap.Modal(document.getElementById('calMeetingModal')).show();
}

// ════════════════════════════════════════
//  EDIT MODAL
// ════════════════════════════════════════
function openEditModal(id) {
    const m = allMeetings.find(x => x.id === id);
    if (!m) return;

    document.getElementById('calEditId').value           = m.id;
    document.getElementById('calModalTitle').textContent = 'Edit Meeting';
    document.getElementById('calSaveLabel').textContent  = 'Save Changes';
    document.getElementById('calTitle').value            = m.title;
    document.getElementById('calDescription').value      = m.description || '';
    document.getElementById('calTimezone').value         = m.timezone    || 'UTC';

    // Flatpickr
    calFpDate.setDate(m.date, true);
    calFpStart.setDate(m.time || '09:00', true);
    calFpEnd.setDate(addMinutes(m.time || '09:00', m.duration || 60), true);

    // Tagify
    if (calTagify) {
        calTagify.removeAllTags();
        if (m.participants) {
            const tags = m.participants.split(',').map(e => e.trim()).filter(Boolean).map(email => {
                const c = allContacts.find(x => x.email === email);
                return c ? { value: email, name: `${c.first_name} ${c.last_name}` } : { value: email };
            });
            calTagify.addTags(tags);
        }
    }

    // Color dots
    document.querySelectorAll('#calMeetingModal .color-dot').forEach((d, i) => d.classList.toggle('selected', i === 0));
    selectedColor = colorForMeeting(m);

    new bootstrap.Modal(document.getElementById('calMeetingModal')).show();
}

function selectCalColor(el, color) {
    document.querySelectorAll('#calMeetingModal .color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    selectedColor = color;
}

// ════════════════════════════════════════
//  SAVE
// ════════════════════════════════════════
async function saveCalMeeting() {
    const id    = document.getElementById('calEditId').value;
    const title = document.getElementById('calTitle').value.trim();
    if (!title) { showCalToast('Meeting title is required', 'error'); return; }

    const date  = document.getElementById('calDate').value;
    const start = document.getElementById('calTimeStart').value;
    const end   = document.getElementById('calTimeEnd').value;
    if (!date)  { showCalToast('Please pick a date', 'error'); return; }

    const duration     = calcDuration(start, end);
    const participants = calTagify ? calTagify.value.map(t => t.value).join(', ') : '';

    const payload = {
        title,
        description:  document.getElementById('calDescription').value,
        date,
        time:         start,
        timezone:     document.getElementById('calTimezone').value,
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
        bootstrap.Modal.getInstance(document.getElementById('calMeetingModal'))?.hide();
        showCalToast(isEdit ? 'Meeting updated ✓' : 'Meeting created ✓', 'success');
        await loadMeetings();
    } catch {
        showCalToast('Something went wrong. Please try again.', 'error');
    }
}

// ════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════
function addMinutes(time, mins) {
    if (!time) return '10:00';
    const [h, m] = time.split(':').map(Number);
    const total  = h * 60 + m + mins;
    return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

function calcDuration(start, end) {
    if (!start || !end) return 60;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 60;
}

// ════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════
function showCalToast(msg, type = 'success') {
    const stack = document.getElementById('calToastStack') || document.body;
    const el    = document.createElement('div');
    el.className = `cal-toast ${type}`;
    el.innerHTML = `<span class="t-ico"><i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i></span>${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// Close popover on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopover(); });