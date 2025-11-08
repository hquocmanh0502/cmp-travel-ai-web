// Toast notification system for spam/toxic content warnings
class SpamWarningToast {
    constructor() {
        this.createToastContainer();
    }

    createToastContainer() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
    }

    showWarning(message, warningType, onConfirm, onCancel) {
        const toast = document.createElement('div');
        toast.className = 'spam-warning-toast';
        
        // Determine colors based on warning type
        let iconColor, bgColor, borderColor;
        switch (warningType) {
            case 'spam':
                iconColor = '#f59e0b'; // amber
                bgColor = '#fef3c7'; // amber-100
                borderColor = '#f59e0b'; // amber-500
                break;
            case 'toxic':
                iconColor = '#ef4444'; // red
                bgColor = '#fee2e2'; // red-100
                borderColor = '#ef4444'; // red-500
                break;
            case 'spam_toxic':
                iconColor = '#dc2626'; // red-600
                bgColor = '#fecaca'; // red-200
                borderColor = '#dc2626'; // red-600
                break;
            default:
                iconColor = '#f59e0b';
                bgColor = '#fef3c7';
                borderColor = '#f59e0b';
        }

        toast.style.cssText = `
            background: ${bgColor};
            border: 2px solid ${borderColor};
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
            max-width: 100%;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="flex-shrink: 0;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color: ${iconColor};">
                        <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px;">
                        Content Warning
                    </div>
                    <div style="color: #6b7280; margin-bottom: 16px; font-size: 13px; line-height: 1.4;">
                        ${message}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="toast-btn-proceed" style="
                            background: #ef4444;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            font-size: 12px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        ">
                            Post Anyway
                        </button>
                        <button class="toast-btn-cancel" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            font-size: 12px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        ">
                            Edit Content
                        </button>
                    </div>
                </div>
                <button class="toast-close" style="
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 4px;
                    flex-shrink: 0;
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        // Add animation styles
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
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
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .toast-btn-proceed:hover {
                    background: #dc2626 !important;
                }
                .toast-btn-cancel:hover {
                    background: #4b5563 !important;
                }
                .toast-close:hover {
                    color: #6b7280 !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Add event listeners
        const proceedBtn = toast.querySelector('.toast-btn-proceed');
        const cancelBtn = toast.querySelector('.toast-btn-cancel');
        const closeBtn = toast.querySelector('.toast-close');

        proceedBtn.addEventListener('click', () => {
            this.hideToast(toast);
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            this.hideToast(toast);
            if (onCancel) onCancel();
        });

        closeBtn.addEventListener('click', () => {
            this.hideToast(toast);
            if (onCancel) onCancel();
        });

        // Show toast
        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                this.hideToast(toast);
                if (onCancel) onCancel();
            }
        }, 10000);
    }

    hideToast(toast) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    showInfo(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: #dbeafe;
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 12px;
            color: #1e40af;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
            max-width: 100%;
        `;
        toast.textContent = message;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        setTimeout(() => {
            this.hideToast(toast);
        }, duration);
    }
}

// Global instance
window.spamWarningToast = new SpamWarningToast();