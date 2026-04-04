/* ═══════════════════════════════════════════════════════
   settings.js  —  Change Details + AI API + Google Cal
   Handles: profile load/save, tab switching, toggles,
            password reveal, provider picker, API stub.
   ═══════════════════════════════════════════════════════ */

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(btn, tabId) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}

// ── Password toggle ────────────────────────────────────────────────────────
function togglePwd(btn) {
    const input = btn.closest('.input-with-icon-wrap').querySelector('input');
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
    }
}

// ── Provider selector ──────────────────────────────────────────────────────
function selectProvider(btn) {
    document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const provider = btn.dataset.provider;
    const modelSelect = document.getElementById('aiModel');
    const models = {
        openai:    ['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'],
        anthropic: ['claude-opus-4-5','claude-sonnet-4-5','claude-haiku-4-5'],
        gemini:    ['gemini-2.0-flash','gemini-1.5-pro','gemini-1.5-flash']
    };
    modelSelect.innerHTML = (models[provider] || []).map(m =>
        `<option value="${m}">${m}</option>`
    ).join('');
}

// ── Toggle switch ──────────────────────────────────────────────────────────
function toggleSwitch(el) {
    el.classList.toggle('active');
}

// ── Test connection (stub) ─────────────────────────────────────────────────
function testApiKey(type) {
    const dotId    = type === 'ai' ? 'aiStatusDot'    : 'gcalStatusDot';
    const textId   = type === 'ai' ? 'aiStatusText'   : 'gcalStatusText';
    const bannerId = type === 'ai' ? 'aiStatusBanner' : 'gcalStatusBanner';
    const dot    = document.getElementById(dotId);
    const text   = document.getElementById(textId);
    const banner = document.getElementById(bannerId);

    text.textContent  = 'Testing connection…';
    dot.className     = 'api-status-dot testing';
    banner.className  = 'api-status-banner testing';

    setTimeout(() => {
        dot.className    = 'api-status-dot connected';
        banner.className = 'api-status-banner connected';
        text.textContent = 'Connected successfully';
        showToast('Connection verified!', 'success');
    }, 1800);
}

// ── AI API form (stub) ─────────────────────────────────────────────────────
function saveAiApi(e) {
    e.preventDefault();
    showToast('AI API key saved', 'success');
}

function clearAiApi() {
    document.getElementById('aiApiKey').value = '';
    document.getElementById('orgId').value    = '';
    showToast('API key removed', 'success');
}

// ── Google Calendar form (stub) ────────────────────────────────────────────
function saveGcal(e) {
    e.preventDefault();
    showToast('Google Calendar integration saved', 'success');
}

function clearGcal() {
    ['gcalApiKey','gcalClientId','gcalClientSecret','gcalCalendarId'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    showToast('Google Calendar disconnected', 'success');
}

// ══════════════════════════════════════════════════════════════════════════
//  CHANGE DETAILS  —  real backend integration
// ══════════════════════════════════════════════════════════════════════════

/**
 * Fetch the saved profile from the server and populate the form.
 * Called once on DOMContentLoaded.
 */
async function loadProfile() {
    try {
        const res  = await fetch('/api/settings/profile');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        _populateForm(data.profile);
    } catch (err) {
        console.warn('Could not load profile:', err);
        // Non-blocking: form retains its HTML default values.
    }
}

/**
 * Fill every form field from the profile object returned by the API.
 */
function _populateForm(profile) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el && val != null) el.value = val;
    };
    set('firstName',   profile.first_name);
    set('lastName',    profile.last_name);
    set('email',       profile.email);
    set('displayName', profile.display_name);
    set('timezone',    profile.timezone);

    // Also refresh the sidebar avatar name + profile card
    _refreshSidebarName(profile);
}

/**
 * Live-update the sidebar user name whenever the profile is saved.
 */
function _refreshSidebarName(profile) {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    // Sidebar user-name span
    const nameEl = document.querySelector('.user-name');
    if (nameEl && fullName) nameEl.textContent = fullName;
    // Avatar preview in the settings card
    const avatarNameEl = document.querySelector('.avatar-name');
    if (avatarNameEl && fullName) avatarNameEl.textContent = fullName;
    // Avatar preview initial letter
    const avatarEl = document.querySelector('.avatar-preview i');
    if (!avatarEl) {
        // Emoji/icon fallback — nothing to update
    }
}

/**
 * Collect form values, PATCH the API, and show feedback.
 * Wired to the Details form's onsubmit.
 */
async function saveDetails(e) {
    e.preventDefault();

    const payload = {
        first_name:   document.getElementById('firstName')?.value.trim()   || undefined,
        last_name:    document.getElementById('lastName')?.value.trim()    || undefined,
        email:        document.getElementById('email')?.value.trim()       || undefined,
        display_name: document.getElementById('displayName')?.value.trim() || undefined,
        timezone:     document.getElementById('timezone')?.value           || undefined,
    };

    // Remove keys that are empty/undefined so they're not sent
    Object.keys(payload).forEach(k => {
        if (!payload[k]) delete payload[k];
    });

    if (Object.keys(payload).length === 0) {
        showToast('Nothing to update — fill in at least one field.', 'error');
        return;
    }

    // Disable button & show loading state
    const saveBtn = document.querySelector('#detailsForm .btn-settings-save');
    const origHTML = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
    }

    try {
        const res = await fetch('/api/settings/profile', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || `HTTP ${res.status}`);
        }

        _populateForm(data.profile);          // re-hydrate form with saved values
        showToast('Profile updated successfully ✓', 'success');

    } catch (err) {
        console.error('saveDetails error:', err);
        showToast(`Save failed: ${err.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = origHTML;
        }
    }
}

/**
 * Reset the form to the last-saved values from the server.
 */
async function discardDetails() {
    try {
        const res  = await fetch('/api/settings/profile');
        const data = await res.json();
        _populateForm(data.profile);
        showToast('Changes discarded', 'success');
    } catch {
        showToast('Could not reload profile', 'error');
    }
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.innerHTML = `<i class="fa-solid ${
        type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'
    } toast-icon"></i> ${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();

    // Wire "Discard Changes" button to reload from server
    const discardBtn = document.querySelector('#detailsForm .btn-settings-cancel');
    if (discardBtn) {
        discardBtn.addEventListener('click', discardDetails);
    }
});