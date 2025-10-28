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
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(title, message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icon based on type
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            loading: '<i class="fas fa-spinner"></i>'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="toast-progress"></div>
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
