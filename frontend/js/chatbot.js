// CMP Travel Chatbot JavaScript
class CMPTravelChatbot {
    constructor() {
        this.apiEndpoint = 'http://localhost:5000/chat';  // Updated to use Flask API
        this.healthEndpoint = 'http://localhost:5000/health';
        this.sessionId = this.generateSessionId();
        this.isOpen = false;
        this.isTyping = false;
        
        this.init();
    }
    
    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.checkAPIHealth();
        this.loadWelcomeMessage();
    }
    
    async checkAPIHealth() {
        try {
            const response = await fetch(this.healthEndpoint);
            const data = await response.json();
            console.log('✅ Chatbot API Health:', data);
            
            if (data.status === 'healthy') {
                this.updateStatus('online', `Ready with ${data.total_documents} documents`);
            } else {
                this.updateStatus('offline', 'Service unavailable');
            }
        } catch (error) {
            console.error('❌ API Health Check Failed:', error);
            this.updateStatus('offline', 'Connecting...');
        }
    }
    
    updateStatus(status, message) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.chatbot-status span:last-child');
        
        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = message;
        }
    }
    
    generateSessionId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chatbot-container" id="chatbot-container">
                <!-- Chatbot Toggle Button -->
                <button class="chatbot-toggle" id="chatbot-toggle" title="Chat with our AI Travel Assistant">
                    <i class="fas fa-comments"></i>
                </button>
                
                <!-- Chatbot Widget -->
                <div class="chatbot-widget" id="chatbot-widget">
                    <!-- Header -->
                    <div class="chatbot-header">
                        <div>
                            <h3>✈️ CMP Travel Assistant</h3>
                            <div class="chatbot-status">
                                <span class="status-dot"></span>
                                <span>Online</span>
                            </div>
                        </div>
                        <button class="chatbot-close" id="chatbot-close" title="Close chat">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Messages Container -->
                    <div class="chatbot-messages" id="chatbot-messages">
                        <!-- Messages will be dynamically added here -->
                    </div>
                    
                    <!-- Suggestions -->
                    <div class="chatbot-suggestions" id="chatbot-suggestions">
                        <!-- Suggestions will be dynamically added here -->
                    </div>
                    
                    <!-- Input Container -->
                    <div class="chatbot-input-container">
                        <div class="chatbot-input-wrapper">
                            <input 
                                type="text" 
                                class="chatbot-input" 
                                id="chatbot-input" 
                                placeholder="Ask about tours, hotels, prices..."
                                maxlength="500"
                            >
                            <button class="chatbot-send" id="chatbot-send" title="Send message">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }
    
    attachEventListeners() {
        const toggleBtn = document.getElementById('chatbot-toggle');
        const closeBtn = document.getElementById('chatbot-close');
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');
        
        // Toggle chatbot
        toggleBtn.addEventListener('click', () => this.toggleChatbot());
        closeBtn.addEventListener('click', () => this.closeChatbot());
        
        // Send message
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Input state management
        input.addEventListener('input', () => {
            const sendBtn = document.getElementById('chatbot-send');
            sendBtn.disabled = input.value.trim().length === 0;
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            const container = document.getElementById('chatbot-container');
            if (this.isOpen && !container.contains(e.target)) {
                this.closeChatbot();
            }
        });
    }
    
    toggleChatbot() {
        const widget = document.getElementById('chatbot-widget');
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            widget.classList.add('active');
            this.focusInput();
            this.trackEvent('chatbot_opened');
        } else {
            widget.classList.remove('active');
        }
    }
    
    closeChatbot() {
        const widget = document.getElementById('chatbot-widget');
        widget.classList.remove('active');
        this.isOpen = false;
        this.trackEvent('chatbot_closed');
    }
    
    focusInput() {
        setTimeout(() => {
            const input = document.getElementById('chatbot-input');
            input.focus();
        }, 300);
    }
    
    loadWelcomeMessage() {
        const welcomeMessage = "🌟 Hello! Welcome to CMP Travel! I'm your AI Travel Assistant powered by OpenAI! I can help you:\\n\\n🏖️ Find amazing tours to Maldives, Vietnam, Switzerland\\n🏨 Recommend hotels with clear USD pricing\\n💰 Check tour prices and deals ($1700-3000+ USD)\\n📅 Plan your dream destinations\\n\\nWhat can I help you with today? 🌍";
        
        this.addMessage(welcomeMessage, 'bot');
        this.updateSuggestions([
            'Tours under $3000 USD',
            'Maldives luxury tours', 
            'Hotels in Vietnam',
            'Tell me about CMP Travel'
        ]);
    }
    
    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId
                })
            });
            
            this.hideTypingIndicator();
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 'success') {
                    this.addMessage(data.response, 'bot');
                    this.updateSuggestions();  // Show default suggestions
                } else {
                    this.addMessage('Sorry, something went wrong. Please try again! 😅', 'bot');
                }
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again or contact our support team. 🙏', 'bot');
                console.error('API Error:', response.status, response.statusText);
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I cannot connect to the AI service right now. Please try again later! 🔌', 'bot');
            console.error('Connection error:', error);
        }
    }
    
    async callChatbotAPI(message) {
        const userId = localStorage.getItem('userId');
        const requestBody = {
            message: message,
            sessionId: this.sessionId,
            userId: userId,
            context: {
                page: window.location.pathname,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };
        
        const response = await fetch(`${this.apiEndpoint}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageId = 'msg_' + Date.now();
        
        const messageHTML = `
            <div class="chatbot-message ${sender}" data-message-id="${messageId}">
                <div class="message-avatar ${sender}">
                    ${sender === 'user' ? 
                        '<i class="fas fa-user"></i>' : 
                        '<i class="fas fa-robot"></i>'
                    }
                </div>
                <div class="message-content ${sender}">
                    ${this.formatMessage(content)}
                </div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
        
        return messageId;
    }
    
    formatMessage(content) {
        // Convert line breaks to HTML breaks
        content = content.replace(/\\n/g, '<br>');
        
        // Convert **bold** to <strong>
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert *italic* to <em>
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert links
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        return content;
    }
    
    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const messagesContainer = document.getElementById('chatbot-messages');
        
        const typingHTML = `
            <div class="chatbot-message bot typing-message">
                <div class="message-avatar bot">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="typing-indicator">
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        const typingMessage = document.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }
    
    updateSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('chatbot-suggestions');
        if (!suggestionsContainer) return;
        
        suggestionsContainer.innerHTML = '';
        
        // Default suggestions if none provided
        if (!suggestions || !Array.isArray(suggestions)) {
            suggestions = [
                'Tours under $3000 USD',
                'Maldives luxury tours', 
                'Hotels in Vietnam',
                'Tell me about CMP Travel'
            ];
        }
        
        suggestions.forEach(suggestion => {
            const chipHTML = `
                <span class="suggestion-chip" onclick="cmpChatbot.selectSuggestion('${suggestion}')">
                    ${suggestion}
                </span>
            `;
            suggestionsContainer.insertAdjacentHTML('beforeend', chipHTML);
        });
    }
    
    selectSuggestion(suggestion) {
        const input = document.getElementById('chatbot-input');
        input.value = suggestion;
        input.focus();
        this.sendMessage();
    }
    
    selectSuggestion(suggestion) {
        // Fill input with suggestion and send
        const input = document.getElementById('chatbot-input');
        if (input) {
            input.value = suggestion;
            this.sendMessage();
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatbot-messages');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
    
    trackEvent(eventName, properties = {}) {
        // Analytics tracking - integrate with your existing analytics
        try {
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, properties);
            }
            
            // Also log to console for debugging
            console.log('Chatbot Event:', eventName, properties);
        } catch (error) {
            console.error('Analytics tracking error:', error);
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if chatbot doesn't already exist
    if (!document.getElementById('chatbot-container')) {
        window.cmpChatbot = new CMPTravelChatbot();
        console.log('✅ CMP Travel Chatbot initialized');
    }
});

// Export for external access
window.CMPTravelChatbot = CMPTravelChatbot;
