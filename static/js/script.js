document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatArea = document.getElementById('chatArea');
    const typingIndicator = document.getElementById('typingIndicator');

    function getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (text) handleUserInteraction(text);
    });

    window.sendQuickAction = function(text) {
        handleUserInteraction(text);
    };

    function handleUserInteraction(text) {
        userInput.value = '';
        appendMessage('user', text);
        showTyping();

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        })
        .then(r => r.json())
        .then(data => {
            hideTyping();
            appendMessage('ai', data.response, true);
        })
        .catch(() => {
            hideTyping();
            appendMessage('ai', 'Sorry, something went wrong. Please try again.', false);
        });
    }

    function appendMessage(sender, text, isHtml = false) {
        const row = document.createElement('div');
        row.className = `msg-row msg-${sender}`;

        const time = getCurrentTime();

        if (sender === 'user') {
            row.innerHTML = `
                <div class="msg-avatar user-avatar">
                    <img src="https://i.pravatar.cc/150?img=11" alt="You">
                </div>
                <div class="msg-block">
                    <div class="msg-bubble msg-bubble-user">
                        ${isHtml ? text : escapeHTML(text)}
                    </div>
                    <div class="msg-meta" style="text-align:right;">
                        <span class="msg-seen"><i class="fa-solid fa-check-double me-1"></i>Seen</span>
                        <span class="mx-1">·</span>
                        ${time}
                    </div>
                </div>
            `;
        } else {
            row.innerHTML = `
                <div class="msg-avatar ai-avatar">
                    <i class="fa-solid fa-sparkles"></i>
                </div>
                <div class="msg-block">
                    <div class="msg-bubble msg-bubble-ai">
                        ${isHtml ? text : escapeHTML(text)}
                    </div>
                    <div class="msg-meta">
                        <i class="fa-regular fa-clock me-1"></i> ${time}
                        <span class="mx-1">·</span>
                        <span class="msg-seen"><i class="fa-solid fa-check-double me-1"></i>Seen</span>
                    </div>
                </div>
            `;
        }

        chatArea.appendChild(row);
        scrollToBottom();
    }

    function showTyping() {
        typingIndicator.classList.remove('d-none');
        scrollToBottom();
    }

    function hideTyping() {
        typingIndicator.classList.add('d-none');
    }

    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[tag] || tag)
        );
    }

    // Main sidebar active state is now mostly handled via Jinja classes.
    // However, we don't prevent navigation anymore.
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // e.preventDefault();
            // Server-Side template mapping will assign the proper "active" class upon reload.
            // If they are hash links (#), default click still applies.
        });
    });
});

function saveMeeting() {
    const modalEl = document.getElementById('meetingModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    
    setTimeout(() => {
        window.sendQuickAction("Confirm and schedule the meeting.");
    }, 300);
}
