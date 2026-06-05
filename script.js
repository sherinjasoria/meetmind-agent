const API = "http://localhost:5001/api";
let selectedContact = null;
let memoryEnabled = true;
let practiceHistory = [];
let practiceContactId = null;

// INIT
document.addEventListener("DOMContentLoaded", () => {
    loadContacts();
    loadContactsGrid();
    setupToggle();
});

function setupToggle() {
    const toggle = document.getElementById("memoryToggle");
    toggle.addEventListener("change", () => {
        memoryEnabled = toggle.checked;
        const status = document.querySelector(".memory-status span");
        status.textContent = memoryEnabled ? "Memory: LIVE" : "Memory: OFF";
        document.querySelector(".memory-status").style.color = memoryEnabled ? "#4ade80" : "#f87171";
        document.querySelector(".pulse-dot").style.background = memoryEnabled ? "#4ade80" : "#f87171";
    });
}

// PAGE NAVIGATION
function showPage(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");
    event.target.classList.add("active");
}

// LOAD CONTACTS - LEFT PANEL
async function loadContacts() {
    const res = await fetch(`${API}/contacts`);
    const contacts = await res.json();
    const list = document.getElementById("contacts-list");
    list.innerHTML = "";

    contacts.forEach(c => {
        const moodEmoji = c.mood === "positive" ? "🟢" : c.mood === "neutral" ? "🟡" : "🔴";
        const card = document.createElement("div");
        card.className = "contact-card";
        card.innerHTML = `
            <div class="contact-name">${moodEmoji} ${c.name}</div>
            <div class="contact-role">${c.role} · ${c.company}</div>
            <div class="memory-bar-container">
    <div class="memory-bar">
        <div class="memory-bar-fill" style="width: 0%" data-width="${c.memory_strength}%"></div>
    </div>
    <span class="memory-percent">${c.meeting_count} meetings</span>
</div>
        `;
        card.onclick = () => selectContact(c.id, card);
        list.appendChild(card);

        setTimeout(() => {
            card.querySelector(".memory-bar-fill").style.width = c.memory_strength + "%";
        }, 100);
    });
}

// SELECT CONTACT
async function selectContact(contactId, cardEl) {
    document.querySelectorAll(".contact-card").forEach(c => c.classList.remove("active"));
    cardEl.classList.add("active");
    selectedContact = contactId;

    document.getElementById("chat-messages").innerHTML = "";
    loadBrief(contactId);

    const res = await fetch(`${API}/contact/${contactId}`);
    const contact = await res.json();
    document.getElementById("chat-header").innerHTML = `
        <span>💬 Chatting about <strong>${contact.name}</strong></span>
        <div style="float:right; display:flex; gap:8px;">
            <button onclick="openPractice()" style="background: rgba(96,165,250,0.15); border: 1px solid rgba(96,165,250,0.3); color: #60a5fa; padding: 4px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-family: Inter, sans-serif;">
                🎯 Practice Meeting
            </button>
            <button onclick="openModal()" style="background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3); color: #a78bfa; padding: 4px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-family: Inter, sans-serif;">
                + Post-Meeting Learning
            </button>
        </div>
    `;

    addMessage("agent", `🧠 Memory loaded for **${contact.name}**. I remember everything about your relationship. Ask me anything — "Prep me for tomorrow's meeting", "What did we promise last time?", "What should I NOT say?"`);
}

// LOAD BRIEF
async function loadBrief(contactId) {
    const res = await fetch(`${API}/brief/${contactId}`);
    const brief = await res.json();

    const scorePercent = brief.readiness_score;
    const scoreDeg = (scorePercent / 100) * 360;

    document.getElementById("brief-content").innerHTML = `
        <div class="readiness-score">
            <div class="score-circle" style="--score: ${scoreDeg}deg">
                <div class="score-inner">${scorePercent}%</div>
            </div>
            <div class="score-label">Meeting Readiness</div>
        </div>

        <div class="brief-card">
            <div class="brief-section-title">📊 Memory Stats</div>
            <div style="display:flex; gap:16px; margin-top:8px;">
                <div class="stat">
                    <div class="stat-value">${brief.meeting_count}</div>
                    <div class="stat-label">Meetings</div>
                </div>
                <div class="stat">
                    <div class="stat-value" style="color: ${brief.missed_followups > 0 ? '#f87171' : '#4ade80'}">${brief.missed_followups}</div>
                    <div class="stat-label">Missed</div>
                </div>
                
            </div>
        </div>

        <div class="brief-card">
            <div class="brief-section-title">🚫 Do NOT Say</div>
            ${brief.warnings.map(w => `
                <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:#f87171; margin-bottom:6px; padding:6px 10px; background:rgba(248,113,113,0.08); border-radius:8px;">
                    🚫 ${w}
                </div>
            `).join("")}
        </div>

        <div class="brief-card">
            <div class="brief-section-title">🔮 Predicted Mood</div>
            <div style="font-size: 13px; padding: 10px; background: rgba(167,139,250,0.08); border-radius: 8px; color: #e2e8f0;">
                ${brief.last_meeting && brief.last_meeting.mood === 'positive' ? 
                    '🟢 Confident — Last meeting was positive' : 
                    '🟡 Cautious — Needs careful handling'}
            </div>
        </div>

        <div class="brief-card">
            <div class="brief-section-title">💡 Their Style</div>
            <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">${brief.personality}</div>
        </div>

        ${brief.competitor !== "None" ? `
        <div class="brief-card">
            <div class="brief-section-title">🥊 Competitor Mentioned</div>
            <div style="font-size: 13px; color: #fbbf24; padding: 6px 10px; background: rgba(251,191,36,0.08); border-radius: 8px;">${brief.competitor}</div>
        </div>` : ""}
    `;
}

// CHAT
function addMessage(role, text) {
    const messages = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = `message ${role}`;
    div.innerHTML = `
        <div class="message-label">${role === "user" ? "You" : "🧠 MeetMind"}</div>
        <div class="message-bubble">${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function showTyping() {
    const messages = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "message agent";
    div.id = "typing";
    div.innerHTML = `
        <div class="message-label">🧠 MeetMind</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementById("typing");
    if (typing) typing.remove();
}

async function sendMessage() {
    if (!selectedContact) {
        alert("Please select a contact first!");
        return;
    }
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    addMessage("user", message);
    input.value = "";
    showTyping();

    try {
        const res = await fetch(`${API}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contact_id: selectedContact,
                message: message,
                memory_enabled: memoryEnabled
            })
        });
        const data = await res.json();
        removeTyping();
        addMessage("agent", data.reply);
    } catch (err) {
        removeTyping();
        addMessage("agent", "Error connecting to server. Please try again.");
    }
}

// Enter key to send
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.activeElement.id === "chatInput") {
        sendMessage();
    }
});

// TIMELINE
async function loadTimeline(contactId) {
    document.querySelectorAll(".timeline-contact-btn").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");

    const res = await fetch(`${API}/brief/${contactId}`);
    const brief = await res.json();
    const timeline = brief.timeline;

    const progress = ((timeline.length) / (timeline.length + 1)) * 100;

    document.getElementById("timeline-container").innerHTML = `
        <div class="timeline-track">
            <div class="timeline-line">
                <div class="timeline-progress" style="width: ${progress}%"></div>
            </div>
            <div class="timeline-nodes">
                ${timeline.map((t, i) => `
                    <div class="timeline-node" onclick="showTimelineDetail(${i}, ${JSON.stringify(t).replace(/"/g, '&quot;')})">
                        <div class="timeline-node-title">${t.title}</div>
                        <div class="timeline-dot ${t.mood}"></div>
                        <div class="timeline-node-date">${t.date}</div>
                    </div>
                `).join("")}
                <div class="timeline-node">
                    <div class="timeline-node-title" style="color: #a78bfa">Next Meeting</div>
                    <div class="timeline-dot" style="background: #a78bfa; box-shadow: 0 0 12px rgba(167,139,250,0.6); animation: pulse 2s infinite;"></div>
                    <div class="timeline-node-date">Tomorrow</div>
                </div>
            </div>
        </div>
    `;
}

function showTimelineDetail(index, meeting) {
    document.getElementById("timeline-detail").innerHTML = `
        <div class="timeline-detail-card">
            <h3>${meeting.title} — ${meeting.date}</h3>
            <p>${meeting.summary}</p>
            <span class="promise-tag ${meeting.mood === 'positive' ? 'done' : 'missed'}">
                ${meeting.mood === 'positive' ? '✅ Positive meeting' : '⚠️ Needs attention'}
            </span>
        </div>
    `;
}

// CONTACTS GRID
async function loadContactsGrid() {
    const res = await fetch(`${API}/contacts`);
    const contacts = await res.json();
    const grid = document.getElementById("contacts-grid");
    grid.innerHTML = "";

    contacts.forEach(c => {
        const card = document.createElement("div");
        card.className = "contact-full-card";
        card.innerHTML = `
            <div class="contact-full-name">${c.name}</div>
            <div class="contact-full-role">${c.role} · ${c.company}</div>
            <div class="health-meter">
                <div class="health-label">
                    <span>Memory Strength</span>
                    <span>${c.memory_strength}%</span>
                </div>
                <div class="health-bar">
                    <div class="health-bar-fill" style="width: 0%" data-width="${c.memory_strength}%"></div>
                </div>
            </div>
            <div class="contact-stats">
                <div class="stat">
                    <div class="stat-value">${c.meeting_count}</div>
                    <div class="stat-label">Meetings</div>
                </div>
                <div class="stat">
                    <div class="stat-value" style="color: ${c.missed_followups > 0 ? '#f87171' : '#4ade80'}">${c.missed_followups}</div>
                    <div class="stat-label">Missed Follow-ups</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
        setTimeout(() => {
            card.querySelector(".health-bar-fill").style.width = c.memory_strength + "%";
        }, 200);
    });

    const selector = document.getElementById("timeline-contact-selector");
    selector.innerHTML = "";
    contacts.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "timeline-contact-btn";
        btn.textContent = c.name;
        btn.onclick = () => loadTimeline(c.id);
        selector.appendChild(btn);
    });
}

// MODAL
function openModal() { document.getElementById("modal-overlay").classList.add("active"); }
function closeModal() { document.getElementById("modal-overlay").classList.remove("active"); }

async function submitOutcome() {
    const outcome = document.getElementById("outcomeInput").value.trim();
    if (!outcome || !selectedContact) return;

    await fetch(`${API}/post-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: selectedContact, outcome })
    });

    closeModal();
    addMessage("agent", "🧠 Memory updated! I've learned from this meeting. I'll be even better prepared next time.");
    document.getElementById("outcomeInput").value = "";
}

// PRACTICE MODE
function openPractice() {
    if (!selectedContact) {
        alert("Pehle ek contact select karo!");
        return;
    }
    practiceContactId = selectedContact;
    practiceHistory = [];

    const contact = document.querySelector(".contact-card.active .contact-name");
    const name = contact ? contact.textContent.replace(/🟢|🟡|🔴/g, "").trim() : "Contact";
    document.getElementById("practice-contact-name").textContent = name;
    document.getElementById("practice-messages").innerHTML = "";
    document.getElementById("practice-overlay").classList.add("active");

    addPracticeMessage("agent", `👋 [${name} joins the meeting]\n\n"Thanks for making time. Let's get started — what did you want to discuss today?"`);
    practiceHistory.push({
        role: "assistant",
        content: `Thanks for making time. Let's get started — what did you want to discuss today?`
    });
}

function closePractice() {
    document.getElementById("practice-overlay").classList.remove("active");
    practiceHistory = [];
}

function addPracticeMessage(role, text) {
    const messages = document.getElementById("practice-messages");
    const div = document.createElement("div");
    div.className = `message ${role}`;
    div.innerHTML = `
        <div class="message-label">${role === "user" ? "You" : "🎭 Client"}</div>
        <div class="message-bubble">${text.replace(/\n/g, '<br>')}</div>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

async function sendPracticeMessage() {
    const input = document.getElementById("practiceInput");
    const message = input.value.trim();
    if (!message) return;

    addPracticeMessage("user", message);
    practiceHistory.push({ role: "user", content: message });
    input.value = "";

    const messages = document.getElementById("practice-messages");
    const typing = document.createElement("div");
    typing.className = "message agent";
    typing.id = "practice-typing";
    typing.innerHTML = `
        <div class="message-label">🎭 Client</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
        const res = await fetch(`${API}/practice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contact_id: practiceContactId,
                message: message,
                history: practiceHistory,
                mode: "practice"
            })
        });
        const data = await res.json();
        document.getElementById("practice-typing")?.remove();
        addPracticeMessage("agent", data.reply);
        practiceHistory.push({ role: "assistant", content: data.reply });
    } catch (err) {
        document.getElementById("practice-typing")?.remove();
        addPracticeMessage("agent", "Error — try again!");
    }
}

async function getPracticeScorecard() {
    if (practiceHistory.length < 2) {
        alert("Pehle thodi practice karo! Kam se kam 2-3 messages bhejo.");
        return;
    }

    const messages = document.getElementById("practice-messages");
    const divider = document.createElement("div");
    divider.style.cssText = "text-align:center; color:#475569; font-size:12px; padding:16px 0; border-top: 1px solid rgba(255,255,255,0.06);";
    divider.textContent = "━━━ Generating your scorecard... ━━━";
    messages.appendChild(divider);
    messages.scrollTop = messages.scrollHeight;

    try {
        const res = await fetch(`${API}/practice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contact_id: practiceContactId,
                message: "",
                history: practiceHistory,
                mode: "feedback"
            })
        });
        const data = await res.json();

        const scorecardDiv = document.createElement("div");
        scorecardDiv.className = "message agent";
        scorecardDiv.innerHTML = `
            <div class="message-label">📊 MeetMind Coach</div>
            <div class="scorecard">${data.reply.replace(/\n/g, '<br>')}</div>
        `;
        messages.appendChild(scorecardDiv);
        messages.scrollTop = messages.scrollHeight;
    } catch (err) {
        addPracticeMessage("agent", "Error generating scorecard — try again!");
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.activeElement.id === "practiceInput") {
        sendPracticeMessage();
    }
});

// PARTICLES
function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({length: 60}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? '167,139,250' : '96,165,250'
    }));

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
            ctx.fill();
        });

        particles.forEach((p, i) => {
            particles.slice(i+1).forEach(p2 => {
                const dist = Math.hypot(p.x-p2.x, p.y-p2.y);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(167,139,250,${0.06 * (1-dist/120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            });
        });

        requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

initParticles();