document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Create Account page initialized');
    
    // Initialize page
    initializeCreateAccountPage();
});

function initializeCreateAccountPage() {
    // Setup form handler
    const registerForm = document.querySelector('form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
    
    // Setup password toggle
    initializePasswordToggle();
    
    // Setup password strength checker
    initializePasswordStrength();
    
    // Setup form validation
    initializeFormValidation();
}

function initializePasswordToggle() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const passwordInput = this.parentNode.querySelector('input');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon
            const icon = this.querySelector('svg');
            if (type === 'text') {
                icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        });
    });
}

function initializePasswordStrength() {
    const passwordInput = document.querySelector('#password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
}

function initializeFormValidation() {
    const inputs = document.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

function checkPasswordStrength(password) {
    const strengthIndicator = document.querySelector('.password-strength');
    if (!strengthIndicator) return;
    
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    strength = Object.values(checks).filter(Boolean).length;
    
    const strengthLevels = ['Very weak', 'Weak', 'Medium', 'Strong', 'Very strong'];
    const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
    
    strengthIndicator.textContent = strengthLevels[strength - 1] || '';
    strengthIndicator.style.color = strengthColors[strength - 1] || '#6b7280';
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'Trường này là bắt buộc';
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Email không hợp lệ';
        }
    }
    
    // Password validation
    if (field.name === 'password' && value) {
        if (value.length < 6) {
            isValid = false;
            errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
    }
    
    // Confirm password validation
    if (field.name === 'confirmPassword' && value) {
        const passwordField = document.querySelector('#password');
        if (value !== passwordField.value) {
            isValid = false;
            errorMessage = 'Mật khẩu xác nhận không khớp';
        }
    }
    
    // Phone validation
    if (field.name === 'phone' && value) {
        const phoneRegex = /^(\+84|0)[3-9]\d{8}$/;
        if (!phoneRegex.test(value)) {
            isValid = false;
            errorMessage = 'Số điện thoại không hợp lệ';
        }
    }
    
    showFieldError(field, isValid ? '' : errorMessage);
    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    if (message) {
        field.classList.add('error');
        const errorElement = document.createElement('span');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #ef4444;
            font-size: 12px;
            margin-top: 4px;
            display: block;
        `;
        field.parentNode.appendChild(errorElement);
    }
}

function clearFieldError(field) {
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

async function handleRegistration(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate all fields
    const fields = form.querySelectorAll('input[required]');
    let isFormValid = true;
    
    fields.forEach(field => {
        if (!validateField(field)) {
            isFormValid = false;
        }
    });
    
    if (!isFormValid) {
        showError('Validation Error', 'Please check your information again');
        return;
    }
    
    const registrationData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        fullName: formData.get('fullName'),
        phone: formData.get('phone')
    };
    
    // Additional validation
    if (formData.get('password') !== formData.get('confirmPassword')) {
        showError('Password Mismatch', 'Confirmation password does not match');
        return;
    }
    
    try {
        const loadingToast = showLoading('Creating Account', 'Please wait...');
        
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });
        
        const result = await response.json();
        hideToast(loadingToast);
        
        if (response.ok) {
            showSuccess('Registration Successful!', `Welcome ${registrationData.fullName}! Redirecting to login...`, 2000);
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            showError('Registration Failed', result.error || 'Unable to create account');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showError('Connection Error', 'Unable to connect to server. Please try again.');
    }
}

function showLoading() {
    const submitBtn = document.querySelector('.register-btn, .signup-btn, button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    }
}

function hideLoading() {
    const submitBtn = document.querySelector('.register-btn, .signup-btn, button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Account</span>';
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
        }, 4000);
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
    
    .input-group input.error {
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
`;
document.head.appendChild(style);