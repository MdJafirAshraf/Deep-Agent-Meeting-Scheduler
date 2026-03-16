// ── Tab switching ──
function switchTab(btn, tabId) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}

// ── Password toggle ──
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

// ── Provider selector ──
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

// ── Toggle switch ──
function toggleSwitch(el) {
    el.classList.toggle('active');
}

// ── Test connection (stub) ──
function testApiKey(type) {
    const dotId  = type === 'ai' ? 'aiStatusDot'  : 'gcalStatusDot';
    const textId = type === 'ai' ? 'aiStatusText' : 'gcalStatusText';
    const bannerId = type === 'ai' ? 'aiStatusBanner' : 'gcalStatusBanner';
    const dot  = document.getElementById(dotId);
    const text = document.getElementById(textId);
    const banner = document.getElementById(bannerId);

    text.textContent = 'Testing connection…';
    dot.className = 'api-status-dot testing';
    banner.className = 'api-status-banner testing';

    setTimeout(() => {
        dot.className = 'api-status-dot connected';
        banner.className = 'api-status-banner connected';
        text.textContent = 'Connected successfully';
        showToast('Connection verified!', 'success');
    }, 1800);
}

// ── Form save stubs ──
function saveDetails(e) {
    e.preventDefault();
    showToast('Profile updated successfully', 'success');
}
function saveAiApi(e) {
    e.preventDefault();
    showToast('AI API key saved', 'success');
}
function saveGcal(e) {
    e.preventDefault();
    showToast('Google Calendar integration saved', 'success');
}
function clearAiApi() {
    document.getElementById('aiApiKey').value = '';
    document.getElementById('orgId').value = '';
    showToast('API key removed', 'success');
}
function clearGcal() {
    ['gcalApiKey','gcalClientId','gcalClientSecret','gcalCalendarId'].forEach(id => {
        document.getElementById(id).value = '';
    });
    showToast('Google Calendar disconnected', 'success');
}

// ── Toast ──
function showToast(msg, type = 'success') {
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'} toast-icon"></i> ${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}