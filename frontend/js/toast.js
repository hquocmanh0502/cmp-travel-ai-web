// Toast Notification System
// Usage: showToast('Success!', 'Login successful', 'success')

class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            // Force correct positioning
            this.container.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 999999 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                pointer-events: none !important;
                bottom: auto !important;
                left: auto !important;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
            // Ensure existing container has correct position
            this.container.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 999999 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                pointer-events: none !important;
                bottom: auto !important;
                left: auto !important;
            `;
        }
    }

    show(title, message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Force toast styling with inline CSS
        toast.style.cssText = `
            background: white !important;
            padding: 16px 20px !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
            display: flex !important;
            align-items: flex-start !important;
            gap: 12px !important;
            min-width: 320px !important;
            max-width: 400px !important;
            pointer-events: all !important;
            margin-bottom: 12px !important;
            border-left: 4px solid #ccc !important;
            opacity: 1 !important;
            transform: translateX(0) !important;
            position: relative !important;
        `;

        // Icon based on type (using emoji)
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '🔄'
        };

        // Color based on type
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            loading: '#6b7280'
        };

        const color = colors[type] || colors.info;
        toast.style.borderLeftColor = color + ' !important';

        toast.innerHTML = `
            <div style="font-size: 20px; margin-top: 2px; flex-shrink: 0;">${icons[type] || icons.info}</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px; font-size: 14px;">${title}</div>
                ${message ? `<div style="font-size: 13px; color: #6b7280; line-height: 1.4;">${message}</div>` : ''}
            </div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #9ca3af; padding: 0; margin-top: 2px; flex-shrink: 0;">&times;</button>
        `;

        this.container.appendChild(toast);

        // Auto remove after duration
        if (type !== 'loading') {
            setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 400);
            }, duration);
        }

        // Play sound (optional)
        this.playSound(type);

        return toast;
    }

    playSound(type) {
        // Optional: Add sound effects
        // const audio = new Audio(`/sounds/${type}.mp3`);
        // audio.volume = 0.3;
        // audio.play().catch(() => {});
    }

    success(title, message, duration) {
        return this.show(title, message, 'success', duration);
    }

    error(title, message, duration) {
        return this.show(title, message, 'error', duration);
    }

    warning(title, message, duration) {
        return this.show(title, message, 'warning', duration);
    }

    info(title, message, duration) {
        return this.show(title, message, 'info', duration);
    }

    loading(title, message) {
        return this.show(title, message, 'loading', 999999);
    }

    remove(toast) {
        if (toast) {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 400);
        }
    }

    removeAll() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.remove(toast));
    }
}

// Create global instance
const toast = new Toast();

// Global functions for easy access
function showToast(title, message, type = 'info', duration = 3000) {
    return toast.show(title, message, type, duration);
}

function showSuccess(title, message, duration) {
    return toast.success(title, message, duration);
}

function showError(title, message, duration) {
    return toast.error(title, message, duration);
}

function showWarning(title, message, duration) {
    return toast.warning(title, message, duration);
}

function showInfo(title, message, duration) {
    return toast.info(title, message, duration);
}

function showLoading(title, message) {
    return toast.loading(title, message);
}

function hideToast(toastElement) {
    toast.remove(toastElement);
}

function hideAllToasts() {
    toast.removeAll();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        toast, 
        showToast, 
        showSuccess, 
        showError, 
        showWarning, 
        showInfo, 
        showLoading,
        hideToast,
        hideAllToasts
    };
}

// Make available globally
window.toast = toast;
window.showToast = showToast;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showLoading = showLoading;
window.hideToast = hideToast;
window.hideAllToasts = hideAllToasts;

console.log('✅ Toast notification system loaded');
