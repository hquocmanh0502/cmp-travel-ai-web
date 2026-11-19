// CMP Travel Assistant - khung chat tren moi trang.
//
// Goi POST /api/chatbot/message (backend/routes/chatbot.js), nhan cau tra loi
// dang Server-Sent Events (tung manh chu) + the tour / chuyen khoi hanh lay tu
// du lieu that. sessionId luu trong sessionStorage: chuyen trang van giu cuoc chat,
// lan truy cap moi (tab moi) bat dau trang; log van luu o server de phan tich.
//
// An toan: moi noi dung (cua khach lan cua AI) deu duoc escape truoc khi dua vao
// HTML; chi ho tro **dam**, gach dau dong, xuong dong va link noi bo.
//
// Boc trong IIFE: cac ten esc/money/... khong lo ra pham vi toan cuc (trung ten
// voi script khac tren trang se lam hong ca file).
(function () {
'use strict';

const CHAT_API = '/api/chatbot';
const SESSION_KEY = 'cmpChatSession';

const TOOL_LABELS = {
    search_tours: 'Searching tours…',
    get_tour: 'Reading the tour details…',
    get_departures: 'Checking departures and seats…',
    quote_price: 'Calculating the price…',
    plan_trip: 'Planning your trip…',
    refund_policy: 'Checking the refund policy…',
    my_bookings: 'Looking up your bookings…',
    search_knowledge: 'Looking it up…'
};

const DEFAULT_SUGGESTIONS = [
    'I love Maldives and I have 10 days',
    'Tell me about the Kyoto tour',
    'Price of Paris for 2 adults and a 5-year-old',
    'What is your refund policy?'
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${Math.round(n || 0).toLocaleString('en-US')}`;
const fmtDay = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
// Chi cho link noi bo (trang cua site) hoac http(s)
const safeHref = (u) => (/^(https?:\/\/|[a-z0-9-]+\.html)/i.test(u) ? u : '#');

function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
// Ma cuoc chat o sessionStorage: giu khi chuyen trang trong CUNG lan truy cap (the
// "View tour" / "Book" dua sang trang khac), dong tab / lan sau vao web -> chat moi
// trang. Hoi thoai cu van luu o server (ChatConversation) de phan tich.
function sessionGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
function sessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch { /* private mode */ } }

class CMPTravelChatbot {
    constructor() {
        this.sessionId = sessionGet(SESSION_KEY);
        this.isOpen = false;
        this.isBusy = false;
        this.init();
    }

    async init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.checkStatus();
        const restored = await this.loadHistory();
        if (!restored) this.loadWelcomeMessage();
    }

    async checkStatus() {
        try {
            const data = await (await fetch(`${CHAT_API}/status`)).json();
            if (data.status === 'active') this.updateStatus('online', 'Online');
            else this.updateStatus('offline', 'Not configured yet');
        } catch {
            this.updateStatus('offline', 'Offline');
        }
    }

    updateStatus(status, message) {
        const dot = document.querySelector('.status-dot');
        const text = document.querySelector('.chatbot-status span:last-child');
        if (dot && text) {
            dot.className = `status-dot ${status}`;
            text.textContent = message;
        }
    }

    createChatbotHTML() {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="chatbot-container" id="chatbot-container">
                <button class="chatbot-toggle" id="chatbot-toggle" title="Chat with our travel assistant" aria-label="Open chat">
                    <i class="fas fa-comments"></i>
                </button>
                <div class="chatbot-widget" id="chatbot-widget" role="dialog" aria-label="CMP Travel Assistant">
                    <div class="chatbot-header">
                        <div>
                            <h3>✈️ CMP Travel Assistant</h3>
                            <div class="chatbot-status">
                                <span class="status-dot"></span>
                                <span>Connecting…</span>
                            </div>
                        </div>
                        <button class="chatbot-new" id="chatbot-memory" title="What I remember about you" aria-label="What I remember about you" hidden>
                            <i class="fas fa-brain"></i>
                        </button>
                        <button class="chatbot-new" id="chatbot-new" title="New conversation" aria-label="New conversation">
                            <i class="fas fa-rotate-right"></i>
                        </button>
                        <button class="chatbot-close" id="chatbot-close" title="Close chat" aria-label="Close chat">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="chatbot-messages" id="chatbot-messages" aria-live="polite"></div>
                    <div class="chatbot-suggestions" id="chatbot-suggestions"></div>
                    <div class="chatbot-input-container">
                        <div class="chatbot-input-wrapper">
                            <input type="text" class="chatbot-input" id="chatbot-input"
                                placeholder="Ask about tours, dates, prices…" maxlength="1000" aria-label="Your message">
                            <button class="chatbot-send" id="chatbot-send" title="Send message" aria-label="Send" disabled>
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    attachEventListeners() {
        const input = document.getElementById('chatbot-input');
        const sendBtn = document.getElementById('chatbot-send');
        document.getElementById('chatbot-toggle').addEventListener('click', () => this.toggleChatbot());
        document.getElementById('chatbot-close').addEventListener('click', () => this.closeChatbot());
        document.getElementById('chatbot-new').addEventListener('click', () => this.newConversation());
        // Bo nho so thich chi co khi da dang nhap
        const memBtn = document.getElementById('chatbot-memory');
        memBtn.hidden = !storageGet('authToken');
        memBtn.addEventListener('click', () => this.showMemories());
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        input.addEventListener('input', () => { sendBtn.disabled = !input.value.trim() || this.isBusy; });
        document.getElementById('chatbot-messages').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-book-plan]');
            if (btn) this.bookPlan(btn.dataset.bookPlan);
            const forget = e.target.closest('[data-forget]');
            if (forget) this.forgetMemory(forget.dataset.forget, forget);
            // Nut hoi tiep ngay trong khung chat (vd "Check dates & book" -> lich khoi hanh)
            const ask = e.target.closest('[data-ask]');
            if (ask && !this.isBusy) this.selectSuggestion(ask.dataset.ask);
        });
        document.getElementById('chatbot-suggestions').addEventListener('click', (e) => {
            const chip = e.target.closest('.suggestion-chip');
            if (chip) this.selectSuggestion(chip.dataset.text);
        });
        document.addEventListener('click', (e) => {
            const container = document.getElementById('chatbot-container');
            if (this.isOpen && !container.contains(e.target)) this.closeChatbot();
        });
    }

    toggleChatbot() {
        this.isOpen = !this.isOpen;
        document.getElementById('chatbot-widget').classList.toggle('active', this.isOpen);
        if (this.isOpen) setTimeout(() => document.getElementById('chatbot-input').focus(), 300);
    }

    closeChatbot() {
        document.getElementById('chatbot-widget').classList.remove('active');
        this.isOpen = false;
    }

    newConversation() {
        this.sessionId = null;
        sessionSet(SESSION_KEY, '');
        document.getElementById('chatbot-messages').innerHTML = '';
        this.loadWelcomeMessage();
    }

    loadWelcomeMessage() {
        this.addMessage("Hi! I'm the CMP Travel assistant. I can find tours, check real departures and seats, " +
            'quote exact prices for your group, plan a multi-city trip, and explain our policies. Where would you like to go?', 'bot');
        this.updateSuggestions(DEFAULT_SUGGESTIONS);
    }

    /** Cuoc chat dang do (chuyen trang). @returns {boolean} co khoi phuc duoc khong */
    async loadHistory() {
        if (!this.sessionId) return false;
        try {
            const data = await (await fetch(`${CHAT_API}/history/${encodeURIComponent(this.sessionId)}`, { headers: this.authHeaders() })).json();
            if (!data.messages?.length) return false;
            data.messages.forEach(m => {
                const el = this.addMessage(m.text, m.sender === 'user' ? 'user' : 'bot');
                if (m.cards?.length) this.renderCards(el, m.cards);
            });
            this.updateSuggestions([]);
            return true;
        } catch {
            return false;
        }
    }

    authHeaders() {
        const token = storageGet('authToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        if (!message || this.isBusy) return;

        this.isBusy = true;
        document.getElementById('chatbot-send').disabled = true;
        this.addMessage(message, 'user');
        input.value = '';
        this.updateSuggestions([]);

        const bubble = this.addMessage('', 'bot');
        const content = bubble.querySelector('.message-content');
        content.innerHTML = '<div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        let text = '';
        const render = () => { content.innerHTML = this.formatMessage(text); this.scrollToBottom(); };

        try {
            const res = await fetch(`${CHAT_API}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
                body: JSON.stringify({ message, sessionId: this.sessionId })
            });
            if (!res.ok || !res.body) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split('\n\n');
                buffer = events.pop();
                for (const raw of events) {
                    const event = /^event: (.+)$/m.exec(raw)?.[1];
                    const data = JSON.parse(/^data: (.*)$/m.exec(raw)?.[1] || '{}');
                    if (event === 'session') {
                        this.sessionId = data.sessionId;
                        sessionSet(SESSION_KEY, data.sessionId);
                    } else if (event === 'status') {
                        const label = TOOL_LABELS[data.tools?.[0]] || 'Looking it up…';
                        content.innerHTML = `<span class="chatbot-working"><i class="fas fa-spinner fa-spin"></i> ${esc(label)}</span>`;
                    } else if (event === 'reset') {
                        text = '';
                    } else if (event === 'token') {
                        text += data.text;
                        render();
                    } else if (event === 'done') {
                        text = data.answer || text;
                        render();
                        if (data.cards?.length) this.renderCards(bubble, data.cards);
                    } else if (event === 'error') {
                        throw new Error(data.error);
                    }
                }
            }
            if (!text) content.textContent = 'Sorry, I could not answer that. Please try rephrasing.';
        } catch (error) {
            content.textContent = error.message || 'Sorry, I cannot connect right now. Please try again later.';
            bubble.classList.add('error');
        } finally {
            this.isBusy = false;
            document.getElementById('chatbot-send').disabled = !input.value.trim();
            this.scrollToBottom();
        }
    }

    /** @returns {HTMLElement} the message row */
    addMessage(content, sender) {
        const container = document.getElementById('chatbot-messages');
        const row = document.createElement('div');
        row.className = `chatbot-message ${sender}`;
        row.innerHTML = `
            <div class="message-avatar ${sender}"><i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i></div>
            <div class="message-content ${sender}">${this.formatMessage(content)}</div>`;
        container.appendChild(row);
        this.scrollToBottom();
        return row;
    }

    /** Escape roi moi dinh dang: **dam**, dong bat dau "- ", [chu](link), xuong dong. */
    formatMessage(content) {
        return esc(content)
            // url da duoc esc() o tren (& -> &amp;, khong con dau ") -> khong escape lan 2
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => `<a href="${safeHref(url)}">${label}</a>`)
            // "### Tieu de" -> dong in dam (truoc day hien nguyen ky tu ###)
            .replace(/^\s*#{1,6}\s+(.+)$/gm, '<strong class="cb-heading">$1</strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\s*[-•]\s+/gm, '• ')
            .replace(/\n/g, '<br>');
    }

    /**
     * The tour / chuyen khoi hanh / chuyen ghep - MOI so lieu lay tu ket qua cong
     * cu (server), khong do AI viet. Hien thanh 1 hang rieng rong ca khung, ngay
     * duoi cau tra loi; nhieu the tour/chuyen -> bang chuyen cuon ngang.
     */
    renderCards(row, cards) {
        const plans = cards.filter(c => c.type === 'plan');
        const others = cards.filter(c => c.type !== 'plan');
        let html = plans.map(c => this.planCard(c)).join('');
        if (others.length) {
            const items = others.map(c => (c.type === 'departure' ? this.departureCard(c) : this.tourCard(c))).join('');
            html += others.length > 1 ? `<div class="cb-carousel">${items}</div>` : items;
        }
        row.insertAdjacentHTML('afterend', `<div class="cb-cards">${html}</div>`);
        this.scrollToBottom();
    }

    tourCard(c) {
        const stars = c.rating ? `<span class="cb-rating"><i class="fas fa-star"></i> ${Number(c.rating).toFixed(1)}</span>` : '';
        const gallery = c.gallery?.length
            ? `<div class="cb-gallery">${c.gallery.map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>` : '';
        return `<div class="cb-card">
            <div class="cb-photo">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.name)}" loading="lazy">` : ''}${stars}</div>
            ${gallery}
            <div class="cb-body">
                <div class="cb-title">${esc(c.name)}<small>${esc(c.country || '')}</small></div>
                <div class="cb-meta"><i class="far fa-clock"></i> ${c.days} days · from <b>${money(c.fromPrice)}</b>/adult</div>
                ${c.themes?.length ? `<div class="cb-chips">${c.themes.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
                ${c.highlights?.length ? `<div class="cb-highlights">${c.highlights.map(h => `<span><i class="fas fa-location-dot"></i> ${esc(h)}</span>`).join('')}</div>` : ''}
                <div class="cb-actions">
                    <button type="button" class="cb-btn primary" data-ask="Show me the available dates to book the ${esc(c.name)} tour">Check dates &amp; book</button>
                    <a class="cb-btn" href="${esc(safeHref(c.link))}">View tour</a>
                </div>
            </div>
        </div>`;
    }

    departureCard(c) {
        const price = c.total ? `<b>${money(c.total)}</b> total` : `<b>${money(c.adultPrice)}</b>/adult`;
        const tourOnly = c.link.replace(/&departure=[^&]*/, '');
        return `<div class="cb-card">
            <div class="cb-photo small">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.name)}" loading="lazy">` : ''}
                <span class="cb-seats">${c.seatsLeft} seats left</span></div>
            <div class="cb-body">
                <div class="cb-title">${esc(c.name)}</div>
                <div class="cb-meta"><i class="far fa-calendar"></i> ${fmtDay(c.startDate)} – ${fmtDay(c.endDate)}</div>
                <div class="cb-price">${price}</div>
                <div class="cb-actions">
                    <a class="cb-btn primary" href="${esc(safeHref(c.link))}">Book this date</a>
                    <a class="cb-btn" href="${esc(safeHref(tourOnly))}">View tour</a>
                </div>
            </div>
        </div>`;
    }

    planCard(c) {
        const id = `plan_${this.cardSeq = (this.cardSeq || 0) + 1}`;
        this.plans = this.plans || {};
        this.plans[id] = c;
        const MODE = { flight: 'fa-plane', train: 'fa-train', bus: 'fa-bus', ferry: 'fa-ship' };
        const timeline = c.stops.map((s, i) => {
            const conn = c.connections?.[i];
            return `<a class="cb-stop" href="${esc(safeHref(s.link))}">
                    ${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy">` : ''}
                    <span><b>${esc(s.name)}</b><small>${fmtDay(s.startDay)} – ${fmtDay(s.endDay)}${s.hotel ? ` · ${esc(s.hotel)}` : ''}</small></span>
                    <em>${money(s.cost)}</em>
                </a>${conn ? `<div class="cb-conn"><i class="fas ${MODE[conn.mode] || 'fa-route'}"></i>
                    ${esc(conn.mode)} to ${esc(conn.to)}, arrive ${fmtDay(conn.arriveDay)} ${esc(conn.arriveAt)}${conn.connectionNights ? ` · +${conn.connectionNights} night` : ''}
                    <em>${money(conn.cost)}</em></div>` : ''}`;
        }).join('');
        const multi = c.stops.length > 1;
        const book = multi
            ? `<button type="button" class="cb-btn primary" data-book-plan="${id}"><i class="fas fa-suitcase-rolling"></i> Book this trip</button>`
            : `<a class="cb-btn primary" href="${esc(safeHref(c.stops[0].link))}">Book this tour</a>`;
        return `<div class="cb-plan">
            <div class="cb-plan-head">
                <span class="cb-badge">${multi ? `${c.stops.length}-city trip` : 'Single tour'} · ${c.totalDays} days</span>
                <span class="cb-score" title="Match score">${c.score}</span>
            </div>
            <div class="cb-plan-route">${esc(c.route)}</div>
            ${c.reasons?.length ? `<div class="cb-reason"><i class="fas fa-check"></i> ${esc(c.reasons[0])}</div>` : ''}
            <div class="cb-timeline">${timeline}</div>
            <div class="cb-total"><span>${money(c.costPerPerson)}<small>/person</small></span><small>${money(c.totalCost)} total, before VIP discount</small></div>
            <div class="cb-actions">${book}
                <a class="cb-btn" href="${esc(safeHref(c.smartTourLink))}"><i class="fas fa-wand-magic-sparkles"></i> Compare in Smart Tour</a></div>
        </div>`;
    }

    /** Liet ke so thich tro ly dang nho (GET /api/chatbot/memory), kem nut xoa. */
    async showMemories() {
        const row = this.addMessage('', 'bot');
        const box = row.querySelector('.message-content');
        try {
            const res = await fetch(`${CHAT_API}/memory`, { headers: this.authHeaders() });
            if (!res.ok) throw new Error(res.status === 401 ? 'Please sign in again to see your memories.' : `HTTP ${res.status}`);
            const { memories } = await res.json();
            box.innerHTML = memories.length
                ? `<strong>Here is what I remember about your travel preferences:</strong>
                   <ul class="cb-memories">${memories.map(m => `<li><span>${esc(m.content)}</span>
                     <button type="button" data-forget="${esc(m.key)}" title="Forget this" aria-label="Forget this">&times;</button></li>`).join('')}</ul>
                   <button type="button" class="cb-btn" data-forget="all">Forget everything</button>
                   <small class="cb-memories-note">I learn these from our chats to suggest better trips. Things you don't mention again fade over time.</small>`
                : "I don't remember any preferences yet. As we chat about trips, I'll remember things like who you travel with and what you enjoy.";
        } catch (err) {
            box.textContent = err.message;
        }
        this.scrollToBottom();
    }

    async forgetMemory(key, btn) {
        const all = key === 'all';
        if (all && !confirm('Forget everything I remember about your travel preferences?')) return;
        const res = await fetch(`${CHAT_API}/memory${all ? '' : `/${encodeURIComponent(key)}`}`, { method: 'DELETE', headers: this.authHeaders() });
        if (!res.ok) return;
        if (all) btn.closest('.message-content').textContent = "Done - I've forgotten all your preferences.";
        else btn.closest('li').remove();
    }

    /** "Book this trip": dung chung luong dat ca chuyen voi trang Smart Tour (js/trip-booking.js). */
    async bookPlan(id) {
        const plan = this.plans?.[id];
        if (!plan) return;
        if (!window.CMPTripBooking) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = './js/trip-booking.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        window.CMPTripBooking.toReservation(plan, plan.party);
    }

    updateSuggestions(suggestions) {
        const box = document.getElementById('chatbot-suggestions');
        if (!box) return;
        box.innerHTML = (suggestions || []).map(s => `<button type="button" class="suggestion-chip" data-text="${esc(s)}">${esc(s)}</button>`).join('');
    }

    selectSuggestion(suggestion) {
        const input = document.getElementById('chatbot-input');
        input.value = suggestion;
        this.sendMessage();
    }

    scrollToBottom() {
        const box = document.getElementById('chatbot-messages');
        requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('chatbot-container')) {
        window.cmpChatbot = new CMPTravelChatbot();
    }
});

window.CMPTravelChatbot = CMPTravelChatbot;
})();
