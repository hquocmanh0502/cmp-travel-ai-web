// Authentication utilities and form handlers

// Global variables
let currentUser = null;

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupAuthForms();
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
        showNotification('⚠️ Please enter email and password', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
        showNotification('📧 Invalid email format', 'error');
        return;
    }
    
    try {
        showLoading();
        console.log('Sending login request...');
        
        const response = await fetch('/api/auth/login', {
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
            throw new Error('Server response không hợp lệ');
        }
        
        hideLoading();
        
        if (response.ok) {
            // Save user data to localStorage
            localStorage.setItem('userId', result.user.id);
            localStorage.setItem('username', result.user.username);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userFullName', result.user.fullName);

            localStorage.setItem('authToken', result.token || result.user.id);
            
            showNotification('🎉 Login successful! Welcome back!', 'success');
            
            // Update auth status
            checkAuthStatus();
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } else {
            const errorMessage = result.error || `Error ${response.status}: ${response.statusText}`;
            showNotification('❌ ' + errorMessage, 'error');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showNotification('🚫 Connection error: ' + error.message, 'error');
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
        showNotification('⚠️ Please fill in all required information', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
        showNotification('📧 Invalid email format', 'error');
        return;
    }
    
    // Password validation
    if (registerData.password !== registerData.confirmPassword) {
        showNotification('🔒 Confirmation password does not match', 'error');
        return;
    }
    
    if (registerData.password.length < 6) {
        showNotification('🔑 Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        showLoading();
        console.log('Sending register request...');
        
        const response = await fetch('/api/auth/register', {
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
            throw new Error('Server response không hợp lệ');
        }
        
        hideLoading();
        
        if (response.ok) {
            showNotification('🎉 Registration successful! Please login to continue.', 'success');
            
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
            showNotification('❌ ' + errorMessage, 'error');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Register error:', error);
        showNotification('🚫 Connection error: ' + error.message, 'error');
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

// Handle logout
function handleLogout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    
    currentUser = null;
    updateAuthUI(false);
    
    showNotification('👋 Logged out successfully. See you again!', 'success');
    
    // Redirect to home
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Utility functions
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 4000);
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