// ════════════════════════════════════════
//  STATE
// ════════════════════════════════════════
let calInstance  = null;
let allMeetings  = [];
let activeMeetingId = null;   // for popover actions
let selectedColor   = 'blue'; // color dot picker

// Color → event class + accent color
const COLOR_MAP = {
    blue:   { cls: 'ev-blue',   accent: '#3b82f6', text: '#1d4ed8' },
    green:  { cls: 'ev-green',  accent: '#10b981', text: '#065f46' },
    purple: { cls: 'ev-purple', accent: '#a855f7', text: '#6b21a8' },
    amber:  { cls: 'ev-amber',  accent: '#f59e0b', text: '#92400e' },
};

// Type → color assignment
function typeToColor(type) {
    const map = { Internal:'blue', External:'amber', Recurring:'green', Review:'purple' };
    return map[type] || 'blue';
}

// ════════════════════════════════════════
//  INIT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    await loadMeetings();
    initCalendar();
});

// ════════════════════════════════════════
//  API
// ════════════════════════════════════════
async function loadMeetings() {
    try {
        const res = await fetch('/api/meetings');
        const data = await res.json();
        allMeetings = data.meetings || [];
        updateWeekCount();
    } catch {
        showCalToast('Failed to load meetings', 'error');
    }
}

/* FIX 11: View-aware count — updates when switching Day/Week/Month */
function updateViewCount(viewType, start, end) {
    const startD = start || getWeekStart();
    const endD   = end   || getWeekEnd();

    const count = allMeetings.filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date + 'T00:00:00');
        return d >= startD && d < endD;
    }).length;

    document.getElementById('calEventCount').textContent = count;

    const labelMap = {
        timeGridDay:   'today',
        timeGridWeek:  'this week',
        dayGridMonth:  'this month',
    };
    document.getElementById('calViewLabel').textContent =
        (labelMap[viewType] || 'this week') + (count !== 1 ? '' : '');
}

function updateWeekCount() {
    const start = getWeekStart();
    const end   = getWeekEnd();
    updateViewCount('timeGridWeek', start, end);
}

function getWeekStart() {
    const today = new Date();
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    d.setHours(0,0,0,0);
    return d;
}
function getWeekEnd() {
    const s = getWeekStart();
    s.setDate(s.getDate() + 7);
    return s;
}

function meetingsToEvents(meetings) {
    return meetings.map(m => {
        const color = typeToColor(m.type);
        const c = COLOR_MAP[color];
        const startStr = m.date && m.time ? `${m.date}T${m.time}` : m.date;
        let endStr = startStr;
        if (startStr && m.duration) {
            const start = new Date(startStr);
            start.setMinutes(start.getMinutes() + (parseInt(m.duration) || 30));
            endStr = start.toISOString();
        }
        return {
            id:          String(m.id),
            title:       m.title,
            start:       startStr,
            end:         endStr,
            classNames:  [c.cls],
            extendedProps: {
                meetingId:    m.id,
                type:         m.type,
                platform:     m.platform,
                participants: m.participants,
                link:         m.link,
                duration:     m.duration,
                color,
                accent:       c.accent,
                text:         c.text,
            }
        };
    });
}

// ════════════════════════════════════════
//  CALENDAR INIT
// ════════════════════════════════════════
function initCalendar() {
    const el = document.getElementById('calendar');

    calInstance = new FullCalendar.Calendar(el, {
        initialView:     'timeGridWeek',
        headerToolbar: {
            left:   'title',
            center: 'timeGridDay,timeGridWeek,dayGridMonth',
            right:  'today prev,next'
        },
        slotMinTime:   '07:00:00',
        slotMaxTime:   '20:00:00',
        allDaySlot:    false,
        expandRows:    false,
        nowIndicator:  true,
        scrollTime:    getCurrentScrollTime(),
        slotEventOverlap: false,      /* stack events vertically, not side-by-side */
        dayHeaderFormat: { weekday: 'short', day: 'numeric' },
        events:        meetingsToEvents(allMeetings),
        height:        '100%',

        /* FIX 10: Custom day header with date-number circle */
        dayHeaderContent: function(arg) {
            const isToday = arg.isToday;
            const weekday = arg.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum  = arg.date.getDate();
            return {
                html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 0;">
                    <span style="font-size:0.65rem;font-weight:700;letter-spacing:.6px;color:${isToday ? 'var(--brand-600)' : 'var(--slate-400)'};">${weekday}</span>
                    <span style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                                 font-size:0.85rem;font-weight:800;
                                 background:${isToday ? 'var(--brand-600)' : 'transparent'};
                                 color:${isToday ? 'white' : 'var(--slate-700)'};">${dayNum}</span>
                </div>`
            };
        },

        /* FIX 11: Update count badge when view changes */
        datesSet: function(info) {
            updateViewCount(info.view.type, info.start, info.end);
        },

        /* Click on event → show popover */
        eventClick: function(info) {
            info.jsEvent.stopPropagation();
            showPopover(info.event, info.jsEvent);
        },

        /* Click on empty slot → pre-fill date/time in add modal */
        dateClick: function(info) {
            const d = info.dateStr.split('T');
            openAddModal(d[0], d[1] ? d[1].substring(0,5) : '09:00');
        },

        /* FIX 2+3: Event card — correct layout, bold title, full time range */
        eventContent: function(arg) {
            const ep      = arg.event.extendedProps;
            const textCol = ep.text || '#1d4ed8';

            // FIX 3: Build "9:00 AM – 10:30 AM" from start/end
            const fmt = (d) => d ? d.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', hour12: true
            }) : '';
            const startFmt = fmt(arg.event.start);
            const endFmt   = arg.event.end ? fmt(arg.event.end) : '';
            const timeLabel = endFmt ? `${startFmt} – ${endFmt}` : startFmt;

            const title = arg.event.title || '';
            const plat  = ep.platform
                ? `<div class="ev-platform">${ep.platform}</div>`
                : '';

            return {
                html: `<div class="ev-card-inner" style="color:${textCol};">
                    <div class="ev-time">${timeLabel}</div>
                    <div class="ev-title">${title}</div>
                    ${plat}
                </div>`
            };
        }
    });

    calInstance.render();
}

/* FIX 6: Scroll to near current time on load */
function getCurrentScrollTime() {
    const now = new Date();
    const h = now.getHours();
    const scrollHour = Math.max(7, h - 1);
    return `${String(scrollHour).padStart(2,'0')}:00:00`;
}

function refreshCalendar() {
    if (!calInstance) return;
    calInstance.removeAllEvents();
    calInstance.addEventSource(meetingsToEvents(allMeetings));
    updateWeekCount();
}

// ════════════════════════════════════════
//  EVENT POPOVER
// ════════════════════════════════════════
function showPopover(event, jsEvent) {
    const ep = event.extendedProps;
    activeMeetingId = ep.meetingId;

    // Fill popover content
    document.getElementById('popTitle').textContent = event.title;
    document.getElementById('popColorBar').style.background = ep.accent || '#6366f1';

    const start = event.start;
    const end   = event.end;
    const dateLabel = start ? start.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }) : '—';
    document.getElementById('popDate').textContent = dateLabel;

    let timeLabel = '—';
    if (start) {
        const s = start.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
        const e = end   ? end.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }) : '';
        timeLabel = e ? `${s} – ${e}` : s;
    }
    document.getElementById('popTime').textContent = timeLabel;

    // Platform
    const platRow = document.getElementById('popPlatformRow');
    if (ep.platform) {
        document.getElementById('popPlatform').textContent = ep.platform;
        platRow.style.display = '';
    } else { platRow.style.display = 'none'; }

    // Participants
    const partRow = document.getElementById('popParticipantsRow');
    if (ep.participants) {
        const count = ep.participants.split(',').filter(Boolean).length;
        document.getElementById('popParticipants').textContent = `${count} participant${count !== 1 ? 's' : ''}`;
        partRow.style.display = '';
    } else { partRow.style.display = 'none'; }

    // Link
    const linkRow = document.getElementById('popLinkRow');
    if (ep.link) {
        document.getElementById('popLink').textContent = ep.link.length > 35 ? ep.link.substring(0,35) + '…' : ep.link;
        linkRow.style.display = '';
        document.getElementById('popJoinBtn').style.display = '';
    } else {
        linkRow.style.display = 'none';
        document.getElementById('popJoinBtn').style.display = 'none';
    }

    // Position popover near click
    const pop = document.getElementById('evPopover');
    pop.classList.add('on');
    document.getElementById('popOverlay').classList.add('on');

    const rect = jsEvent.target.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popW = 340, popH = 280;

    let left = rect.right + 12;
    let top  = rect.top;

    if (left + popW > vw - 16) left = rect.left - popW - 12;
    if (left < 8) left = 8;
    if (top + popH > vh - 16) top = vh - popH - 16;
    if (top < 8) top = 8;

    pop.style.left = left + 'px';
    pop.style.top  = top  + 'px';
}

function closePopover() {
    document.getElementById('evPopover').classList.remove('on');
    document.getElementById('popOverlay').classList.remove('on');
    activeMeetingId = null;
}

function joinFromPop() {
    const m = allMeetings.find(x => x.id === activeMeetingId);
    if (m?.link) { window.open(m.link, '_blank'); closePopover(); }
    else showCalToast('No meeting link available', 'error');
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
    document.getElementById('calConfirmDel').onclick = () => execDelete(id);
    new bootstrap.Modal(document.getElementById('calDeleteModal')).show();
}

// ════════════════════════════════════════
//  ADD MODAL
// ════════════════════════════════════════
function openAddModal(date, time) {
    document.getElementById('calEditId').value    = '';
    document.getElementById('calModalTitle').textContent  = 'New Meeting';
    document.getElementById('calSaveLabel').textContent   = 'Create Meeting';
    document.getElementById('calTitle').value             = '';
    document.getElementById('calParticipants').value      = '';
    document.getElementById('calLink').value              = '';
    document.getElementById('calType').value              = 'Internal';
    document.getElementById('calPlatform').value          = 'Google Meet';
    document.getElementById('calDate').value              = date || new Date().toISOString().split('T')[0];
    document.getElementById('calTimeStart').value         = time || '09:00';
    document.getElementById('calTimeEnd').value           = addMinutes(time || '09:00', 60);

    // Reset color dots
    document.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('selected', i === 0));
    selectedColor = 'blue';

    new bootstrap.Modal(document.getElementById('calMeetingModal')).show();
}

function openEditModal(id) {
    const m = allMeetings.find(x => x.id === id);
    if (!m) return;
    document.getElementById('calEditId').value           = m.id;
    document.getElementById('calModalTitle').textContent  = 'Edit Meeting';
    document.getElementById('calSaveLabel').textContent   = 'Save Changes';
    document.getElementById('calTitle').value             = m.title;
    document.getElementById('calType').value              = m.type     || 'Internal';
    document.getElementById('calPlatform').value          = m.platform || 'Google Meet';
    document.getElementById('calDate').value              = m.date;
    document.getElementById('calTimeStart').value         = m.time;
    document.getElementById('calTimeEnd').value           = addMinutes(m.time, m.duration || 30);
    document.getElementById('calParticipants').value      = m.participants || '';
    document.getElementById('calLink').value              = m.link || '';

    // Set color from type
    const col = typeToColor(m.type);
    selectedColor = col;
    document.querySelectorAll('.color-dot').forEach(d => {
        d.classList.toggle('selected', d.dataset.color === col || d.classList.contains(`cd-${col}`));
    });

    new bootstrap.Modal(document.getElementById('calMeetingModal')).show();
}

function selectCalColor(el, color) {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    selectedColor = color;
}

// ════════════════════════════════════════
//  CRUD
// ════════════════════════════════════════
async function saveCalMeeting() {
    const id    = document.getElementById('calEditId').value;
    const title = document.getElementById('calTitle').value.trim();
    if (!title) { showCalToast('Meeting title is required', 'error'); return; }

    const start    = document.getElementById('calTimeStart').value;
    const end      = document.getElementById('calTimeEnd').value;
    const duration = calcDuration(start, end);

    const payload = {
        title,
        type:         document.getElementById('calType').value,
        platform:     document.getElementById('calPlatform').value,
        date:         document.getElementById('calDate').value,
        time:         start,
        duration,
        participants: document.getElementById('calParticipants').value,
        link:         document.getElementById('calLink').value,
    };

    try {
        const isEdit = !!id;
        const res = await fetch(isEdit ? `/api/meetings/${id}` : '/api/meetings', {
            method:  isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        bootstrap.Modal.getInstance(document.getElementById('calMeetingModal'))?.hide();
        showCalToast(isEdit ? 'Meeting updated ✓' : 'Meeting created ✓', 'success');
        await loadMeetings();
        refreshCalendar();
    } catch {
        showCalToast('Something went wrong', 'error');
    }
}

async function execDelete(id) {
    bootstrap.Modal.getInstance(document.getElementById('calDeleteModal'))?.hide();
    try {
        const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showCalToast('Meeting deleted', 'success');
        await loadMeetings();
        refreshCalendar();
    } catch {
        showCalToast('Delete failed', 'error');
    }
}

// ════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════
function addMinutes(timeStr, mins) {
    if (!timeStr) return '10:00';
    const [h, m] = timeStr.split(':').map(Number);
    const total  = h * 60 + m + (parseInt(mins) || 60);
    return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

function calcDuration(start, end) {
    if (!start || !end) return 30;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 30;
}

function showCalToast(msg, type = 'success') {
    const stack = document.getElementById('calToastStack');
    const el = document.createElement('div');
    el.className = `cal-toast ${type}`;
    el.innerHTML = `<span class="t-ico"><i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i></span>${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// Close popover on escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopover(); });
