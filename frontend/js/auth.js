// Authentication utilities and form handlers

// Global variables
let currentUser = null;

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupAuthForms();
    setupPasswordToggle();
});

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const loginData = {
        email: formData.get('email')?.trim(),
        password: formData.get('password')
    };
    
    console.log('Login data:', { email: loginData.email, hasPassword: !!loginData.password });
    
    // Validation
    if (!loginData.email || !loginData.password) {
        showError('Validation Error', 'Please enter email and password');
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
        console.log('Sending login request...');
        
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log('Login response status:', response.status);
        
        let result;
        try {
            result = await response.json();
            console.log('Login response:', result);
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            hideToast(loadingToast);
            showError('Server Error', 'Invalid server response');
            return;
        }
        
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
            
            // Update auth status
            checkAuthStatus();
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } else {
            const errorMessage = result.error || `Error ${response.status}: ${response.statusText}`;
            showError('Login Failed', errorMessage);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection Error', 'Unable to connect to server. Please try again.');
    }
}

// Handle register form submission
async function handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const registerData = {
        username: formData.get('username')?.trim(),
        email: formData.get('email')?.trim(),
        password: formData.get('password'),
        confirmPassword: formData.get('confirm-password'),
        fullName: formData.get('fullName')?.trim(),
        phone: formData.get('phone')?.trim()
    };
    
    console.log('Register data:', {
        ...registerData,
        password: '***',
        confirmPassword: '***'
    });
    
    // Validation
    if (!registerData.username || !registerData.email || 
        !registerData.password || !registerData.fullName) {
        showError('Validation Error', 'Please fill in all required information');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
        showError('Invalid Email', 'Please enter a valid email address');
        return;
    }
    
    // Password validation
    if (registerData.password !== registerData.confirmPassword) {
        showError('Password Mismatch', 'Confirmation password does not match');
        return;
    }
    
    if (registerData.password.length < 6) {
        showWarning('Weak Password', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        const loadingToast = showLoading('Creating Account', 'Please wait...');
        console.log('Sending register request...');
        
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(registerData)
        });
        
        console.log('Register response status:', response.status);
        
        let result;
        try {
            result = await response.json();
            console.log('Register response:', result);
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            hideToast(loadingToast);
            showError('Server Error', 'Invalid server response');
            return;
        }
        
        hideToast(loadingToast);
        
        if (response.ok) {
            showSuccess('Registration Successful!', `Welcome ${registerData.fullName}! Redirecting to login...`, 2000);
            
            // Reset form
            form.reset();
            
            // Clear password strength indicator
            const strengthIndicator = document.getElementById('passwordStrength');
            if (strengthIndicator) {
                strengthIndicator.className = 'password-strength';
                strengthIndicator.style.width = '0%';
            }
            
            // Redirect to login
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            const errorMessage = result.error || `Error ${response.status}: ${response.statusText}`;
            showError('Registration Failed', errorMessage);
        }
        
    } catch (error) {
        console.error('Register error:', error);
        showError('Connection Error', 'Unable to connect to server. Please try again.');
    }
}

// ...existing code... (các function khác giữ nguyên)

// Check if user is logged in
function checkAuthStatus() {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const userEmail = localStorage.getItem('userEmail');
    const userFullName = localStorage.getItem('userFullName');
    
    if (userId && username) {
        currentUser = {
            id: userId,
            username: username,
            email: userEmail,
            fullName: userFullName
        };
        updateAuthUI(true);
    } else {
        currentUser = null;
        updateAuthUI(false);
    }
}

// Update UI based on auth status
function updateAuthUI(isLoggedIn) {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (authButtons && userMenu) {
        if (isLoggedIn) {
            authButtons.style.display = 'none';
            userMenu.style.display = 'block';
            
            const usernameElement = userMenu.querySelector('.username');
            if (usernameElement && currentUser) {
                usernameElement.textContent = currentUser.fullName || currentUser.username;
            }
        } else {
            authButtons.style.display = 'block';
            userMenu.style.display = 'none';
        }
    }
}

// Setup form event listeners
function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Setup password show/hide toggle
function setupPasswordToggle() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            // Find the password input in the same container
            const passwordContainer = this.closest('.password-container');
            if (!passwordContainer) return;
            
            const passwordInput = passwordContainer.querySelector('input[type="password"], input[type="text"]');
            if (!passwordInput) return;
            
            const svg = this.querySelector('svg');
            if (!svg) return;
            
            // Toggle password visibility
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                // Change to eye-off icon
                svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                passwordInput.type = 'password';
                // Change to eye icon
                svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        });
    });
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    
    currentUser = null;
    updateAuthUI(false);
    
    showSuccess('Logged Out', 'See you again!', 1500);
    
    // Redirect to home
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// Utility functions - Deprecated (use toast system)
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
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
}

function showLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.classList.add('show');
    }
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.classList.remove('show');
    }
}

// Export functions for global use
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.checkAuthStatus = checkAuthStatus;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;