document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Login page initialized');
    
    // Initialize page
    initializeLoginPage();
});

function initializeLoginPage() {
    // Setup form handler
    const loginForm = document.querySelector('form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup password toggle
    initializePasswordToggle();
    
    // Clear any existing auth data
    // localStorage.removeItem('userId');
    // localStorage.removeItem('username');
    // localStorage.removeItem('userEmail');
    // localStorage.removeItem('userFullName');
}

function initializePasswordToggle() {
    const passwordToggle = document.querySelector('.password-toggle');
    const passwordInput = document.querySelector('#password');
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon
            const icon = passwordToggle.querySelector('svg');
            if (type === 'text') {
                icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        });
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    // Validation
    if (!loginData.email || !loginData.password) {
        showError('Validation Error', 'Please fill in all information');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
        showError('Invalid Email', 'Please enter a valid email address');
        return;
    }
    
    try {
        const loadingToast = showLoading('Logging in...', 'Please wait');
        
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        hideToast(loadingToast);
        
        if (response.ok) {
            // Save user data to localStorage
            localStorage.setItem('authToken', result.authToken);
            localStorage.setItem('userId', result.user.id);
            localStorage.setItem('username', result.user.username);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userFullName', result.user.fullName);
            
            console.log('✅ Login successful - Token saved:', result.authToken?.substring(0, 20) + '...');
            
            showSuccess('Login Successful!', `Welcome back, ${result.user.fullName}!`, 2000);
            
            // Update UI and redirect
            setTimeout(() => {
                if (typeof checkAuthStatus === 'function') {
                    checkAuthStatus();
                }
                window.location.href = 'index.html';
            }, 1000);
            
        } else {
            showError('Login Failed', result.error || 'Invalid email or password');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection Error', 'Unable to connect to server. Please try again.');
    }
}

function showLoading() {
    const submitBtn = document.querySelector('.login-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
}

function hideLoading() {
    const submitBtn = document.querySelector('.login-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Login</span>';
    }
}

// Deprecated - kept for backwards compatibility
function showNotification(message, type = 'info') {
    // Use new toast system if available
    if (typeof showToast !== 'undefined') {
        const titles = {
            success: 'Success!',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        showToast(titles[type] || 'Notification', message, type);
    } else {
        // Fallback to old implementation
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <span style="margin-left: 8px;">${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
}

// Old CSS animations (kept for fallback)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);