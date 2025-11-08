// Frontend JavaScript để kiểm tra ban status và hiển thị thông báo

class BanStatusChecker {
    constructor() {
        this.userId = this.getCurrentUserId();
        this.checkInterval = 60000; // Check every minute
        this.lastCheck = 0;
    }

    getCurrentUserId() {
        // Get user ID from localStorage, session, or headers
        return localStorage.getItem('userId') || 
               sessionStorage.getItem('userId') || 
               document.querySelector('meta[name="user-id"]')?.content;
    }

    async checkBanStatus() {
        if (!this.userId) return null;
        
        const now = Date.now();
        if (now - this.lastCheck < this.checkInterval) {
            return this.cachedBanStatus;
        }

        try {
            const response = await fetch('/api/comments/ban-status', {
                headers: {
                    'user-id': this.userId,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.cachedBanStatus = data.banned ? data.banInfo : null;
                this.lastCheck = now;
                return this.cachedBanStatus;
            }
        } catch (error) {
            console.error('Error checking ban status:', error);
        }

        return null;
    }

    async interceptReplySubmission(originalSubmitFunction) {
        const banInfo = await this.checkBanStatus();
        
        if (banInfo) {
            this.showBanNotification(banInfo);
            return false; // Prevent submission
        }

        return originalSubmitFunction();
    }

    showBanNotification(banInfo) {
        // Remove existing notification
        const existing = document.getElementById('ban-notification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.id = 'ban-notification';
        notification.className = 'ban-notification';
        notification.innerHTML = `
            <div class="ban-notification-content">
                <div class="ban-icon">🚫</div>
                <div class="ban-details">
                    <h3>You are temporarily banned from posting replies</h3>
                    <p><strong>Reason:</strong> ${banInfo.reason}</p>
                    <p><strong>Remaining time:</strong> ${banInfo.remainingTime}</p>
                    ${banInfo.appealStatus === 'none' ? 
                        '<button class="appeal-btn" onclick="banStatusChecker.showAppealForm()">Appeal this ban</button>' : 
                        `<p><em>Appeal status: ${banInfo.appealStatus}</em></p>`
                    }
                </div>
                <button class="close-btn" onclick="this.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .ban-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fee2e2;
                border: 1px solid #fecaca;
                border-left: 4px solid #dc2626;
                border-radius: 8px;
                padding: 16px;
                max-width: 400px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
            }
            
            .ban-notification-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .ban-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .ban-details h3 {
                margin: 0 0 8px 0;
                color: #991b1b;
                font-size: 14px;
                font-weight: 600;
            }
            
            .ban-details p {
                margin: 4px 0;
                color: #7f1d1d;
                font-size: 12px;
            }
            
            .appeal-btn {
                background: #dc2626;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                margin-top: 8px;
            }
            
            .appeal-btn:hover {
                background: #b91c1c;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #991b1b;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        
        if (!document.querySelector('#ban-notification-styles')) {
            style.id = 'ban-notification-styles';
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    showAppealForm() {
        // Show appeal form modal
        const modal = document.createElement('div');
        modal.className = 'ban-appeal-modal';
        modal.innerHTML = `
            <div class="ban-appeal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="ban-appeal-content">
                <h3>Appeal Ban</h3>
                <p>Please explain why you believe this ban should be lifted:</p>
                <textarea id="appeal-reason" placeholder="Enter your appeal reason..." rows="4"></textarea>
                <div class="appeal-actions">
                    <button onclick="this.closest('.ban-appeal-modal').remove()">Cancel</button>
                    <button onclick="banStatusChecker.submitAppeal()">Submit Appeal</button>
                </div>
            </div>
        `;

        // Add modal styles
        const modalStyle = document.createElement('style');
        modalStyle.innerHTML = `
            .ban-appeal-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ban-appeal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .ban-appeal-content {
                position: relative;
                background: white;
                padding: 24px;
                border-radius: 8px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .ban-appeal-content h3 {
                margin-top: 0;
                color: #111827;
            }
            
            .ban-appeal-content textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                resize: vertical;
                font-family: inherit;
            }
            
            .appeal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 16px;
            }
            
            .appeal-actions button {
                padding: 8px 16px;
                border-radius: 4px;
                border: 1px solid #d1d5db;
                background: white;
                cursor: pointer;
            }
            
            .appeal-actions button:last-child {
                background: #dc2626;
                color: white;
                border-color: #dc2626;
            }
        `;
        
        document.head.appendChild(modalStyle);
        document.body.appendChild(modal);
    }

    async submitAppeal() {
        const reason = document.getElementById('appeal-reason').value.trim();
        if (!reason) {
            alert('Please enter a reason for your appeal');
            return;
        }

        try {
            const response = await fetch('/api/comments/appeal-ban', {
                method: 'POST',
                headers: {
                    'user-id': this.userId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                alert('Appeal submitted successfully. It will be reviewed by administrators.');
                document.querySelector('.ban-appeal-modal').remove();
            } else {
                const data = await response.json();
                alert(data.message || 'Error submitting appeal');
            }
        } catch (error) {
            console.error('Error submitting appeal:', error);
            alert('Error submitting appeal');
        }
    }

    // Method to integrate with existing reply forms
    integrateWithReplyForms() {
        // Find all reply forms and add event listeners
        const replyForms = document.querySelectorAll('form[action*="reply"], .reply-form');
        
        replyForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const banInfo = await this.checkBanStatus();
                if (banInfo) {
                    this.showBanNotification(banInfo);
                    return;
                }

                // If not banned, proceed with original submission
                form.submit();
            });
        });
    }

    // Check ban status when page loads
    init() {
        this.checkBanStatus();
        this.integrateWithReplyForms();
        
        // Re-check when focus returns to page
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkBanStatus();
            }
        });
    }
}

// Initialize ban status checker
const banStatusChecker = new BanStatusChecker();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => banStatusChecker.init());
} else {
    banStatusChecker.init();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BanStatusChecker;
}