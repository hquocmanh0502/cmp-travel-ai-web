document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Profile page initialized');
    
    // Only run if we're on the profile page
    if (!document.querySelector('.profile-container')) {
        console.log('Not on profile page, skipping profile.js');
        return;
    }
    
    // Check authentication
    if (!checkUserAuth()) return;
    
    // Load user profile data
    loadUserProfile();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize components
    initializeComponents();
});

function checkUserAuth() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('Please login to view profile information', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

async function loadUserProfile() {
    try {
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
            throw new Error('User ID not found');
        }
        
        console.log('🔍 Loading profile for userId:', userId);
        
        // Fetch user data from backend
        const response = await fetch(`http://localhost:3000/api/profile/${userId}`);
        const data = await response.json();
        
        console.log('📥 API Response:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load profile');
        }
        
        const user = data.user;
        
        // Save to localStorage for offline access
        localStorage.setItem('username', user.username);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userFullName', user.fullName);
        localStorage.setItem('userPhone', user.phone || '');
        localStorage.setItem('userAddress', user.address || '');
        localStorage.setItem('userBirthday', user.dateOfBirth || '');
        localStorage.setItem('userGender', user.gender || 'male');
        
        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone || '',
            address: user.address || '',
            birthday: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
            gender: user.gender || 'male',
            memberSince: new Date(user.createdAt).getFullYear(),
            avatar: user.avatar || '' // Add avatar from database
        };
        
        // Populate profile data only if elements exist
        populateProfileData(userData);
        
        // Load user statistics from backend
        loadUserStats();
        
        // Load recent activity
        loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Unable to load user information. Using cached data.', 'warning');
        
        // Fallback to localStorage if API fails
        const userData = {
            id: localStorage.getItem('userId'),
            username: localStorage.getItem('username'),
            email: localStorage.getItem('userEmail'),
            fullName: localStorage.getItem('userFullName') || localStorage.getItem('username'),
            phone: localStorage.getItem('userPhone') || '',
            address: localStorage.getItem('userAddress') || '',
            birthday: localStorage.getItem('userBirthday') || '',
            gender: localStorage.getItem('userGender') || 'male',
            memberSince: localStorage.getItem('userMemberSince') || '2024',
            avatar: localStorage.getItem('userAvatar') || '' // Add avatar fallback
        };
        populateProfileData(userData);
        loadUserStats();
    }
}

function populateProfileData(userData) {
    // Update profile header - check if elements exist first
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const memberSince = document.getElementById('memberSince');
    
    if (userName) userName.textContent = userData.fullName;
    if (userEmail) userEmail.textContent = userData.email;
    if (memberSince) memberSince.textContent = `Member since ${userData.memberSince}`;
    
    // Update avatar - prioritize avatar from userData (database), then localStorage
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
        if (userData.avatar) {
            // Has avatar from database
            avatar.style.backgroundImage = `url(${userData.avatar})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.innerHTML = '';
            // Update localStorage
            localStorage.setItem('userAvatar', userData.avatar);
        } else {
            // No avatar - show initials
            const initials = userData.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
            avatar.style.background = `linear-gradient(135deg, #ff6600, #ff8533)`;
            avatar.style.color = 'white';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.backgroundImage = 'none';
            avatar.innerHTML = `<span style="font-size: 2rem; font-weight: bold;">${initials}</span>`;
        }
    }
    
    // Populate form fields only if they exist
    const formFields = {
        'fullName': userData.fullName,
        'email': userData.email,
        'phone': userData.phone,
        'address': userData.address,
        'birthday': userData.birthday,
        'gender': userData.gender
    };
    
    Object.entries(formFields).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) {
            // Always set value, even if empty
            field.value = value || '';
            console.log(`✅ Set ${fieldId} = "${value}"`);
        }
    });
}

async function loadUserStats() {
    try {
        const userId = localStorage.getItem('userId');
        
        // Fetch stats from backend
        const response = await fetch(`http://localhost:3000/api/profile/${userId}/stats`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Update stats display only if elements exist
            const toursBookedEl = document.getElementById('toursBooked');
            const wishlistItemsEl = document.getElementById('wishlistItems');
            const reviewsWrittenEl = document.getElementById('reviewsWritten');
            
            if (toursBookedEl) toursBookedEl.textContent = stats.totalBookings || 0;
            if (wishlistItemsEl) wishlistItemsEl.textContent = stats.wishlistCount || 0;
            if (reviewsWrittenEl) reviewsWrittenEl.textContent = stats.completedBookings || 0;
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('Error loading stats:', error);
        
        // Fallback to mock data
        const stats = {
            toursBooked: Math.floor(Math.random() * 10) + 1,
            wishlistItems: JSON.parse(localStorage.getItem('wishlist') || '[]').length,
            reviewsWritten: Math.floor(Math.random() * 5) + 1
        };
        
        // Update stats display only if elements exist
        const toursBookedEl = document.getElementById('toursBooked');
        const wishlistItemsEl = document.getElementById('wishlistItems');
        const reviewsWrittenEl = document.getElementById('reviewsWritten');
        
        if (toursBookedEl) toursBookedEl.textContent = stats.toursBooked;
        if (wishlistItemsEl) wishlistItemsEl.textContent = stats.wishlistItems;
        if (reviewsWrittenEl) reviewsWrittenEl.textContent = stats.reviewsWritten;
    }
}

async function loadRecentActivity() {
    const activityContainer = document.getElementById('activityList');
    if (!activityContainer) return; // Exit if element doesn't exist
    
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        
        // Show loading state
        activityContainer.innerHTML = `
            <li class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="activity-content">
                    <p>Loading activities...</p>
                </div>
            </li>
        `;
        
        // Fetch activities from backend
        const response = await fetch(`http://localhost:3000/api/profile/${userId}/recent-activity?limit=10`);
        const data = await response.json();
        
        if (!data.success || !data.activities || data.activities.length === 0) {
            activityContainer.innerHTML = `
                <li class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <p>No recent activities</p>
                    </div>
                </li>
            `;
            return;
        }
        
        // Render activities
        activityContainer.innerHTML = data.activities.map(activity => {
            const iconClass = getActivityIconClass(activity.type, activity.icon);
            const statusBadge = activity.status ? 
                `<span class="status-badge status-${activity.status}">${getStatusText(activity.status)}</span>` : '';
            
            return `
                <li class="activity-item">
                    <div class="activity-icon" style="background: ${getActivityColor(activity.type)}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="activity-content">
                        <h5>${activity.title} ${statusBadge}</h5>
                        <p>${activity.description}</p>
                    </div>
                    <div class="activity-time">${activity.time}</div>
                </li>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        
        // Show error state
        if (activityContainer) {
            activityContainer.innerHTML = `
                <li class="activity-item">
                    <div class="activity-icon" style="background: #e74c3c">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="activity-content">
                        <p>Unable to load activities. Please try again.</p>
                    </div>
                </li>
            `;
        }
    }
}

function getActivityIconClass(type, defaultIcon) {
    const iconMap = {
        'booking': 'fas fa-plane',
        'wishlist': 'fas fa-heart',
        'search': 'fas fa-search',
        'view': 'fas fa-eye',
        'profile_update': 'fas fa-user-edit',
        'review': 'fas fa-star'
    };
    return iconMap[type] || `fas ${defaultIcon}` || 'fas fa-circle';
}

function getActivityColor(type) {
    const colorMap = {
        'booking': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'wishlist': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'search': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'view': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'profile_update': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'review': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    };
    return colorMap[type] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

function getStatusText(status) {
    const statusMap = {
        'confirmed': 'Đã xác nhận',
        'pending': 'Chờ xử lý',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

function setupEventListeners() {
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Password form submission
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Avatar change
    const avatarInput = document.getElementById('avatarInput');
    const avatarUpload = document.getElementById('avatarUpload');
    
    if (avatarUpload && avatarInput) {
        avatarUpload.addEventListener('click', () => {
            avatarInput.click();
        });
    }
    
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarChange);
    }
    
    // Form validation
    setupFormValidation();
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = Object.fromEntries(formData);
    
    try {
        const userId = localStorage.getItem('userId');
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        
        // Call API to update profile
        const response = await fetch(`http://localhost:3000/api/profile/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: profileData.fullName,
                email: profileData.email,
                phone: profileData.phone,
                address: profileData.address,
                gender: profileData.gender,
                dateOfBirth: profileData.birthday
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to update profile');
        }
        
        // Update localStorage with new data
        const user = data.user;
        localStorage.setItem('userFullName', user.fullName);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userPhone', user.phone || '');
        localStorage.setItem('userAddress', user.address || '');
        localStorage.setItem('userBirthday', user.dateOfBirth || '');
        localStorage.setItem('userGender', user.gender || 'male');
        
        // Reset button state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        // Add success state to form
        e.target.querySelectorAll('.form-group').forEach(group => {
            group.classList.add('success');
            setTimeout(() => group.classList.remove('success'), 2000);
        });
        
        showNotification('Profile updated successfully!', 'success');
        
        // Update header info
        setTimeout(() => {
            loadUserProfile();
        }, 500);
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(error.message || 'An error occurred while updating information', 'error');
        
        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
}

// Add form validation visual feedback
function setupFormValidation() {
    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const formGroup = this.closest('.form-group');
            
            formGroup.classList.remove('success', 'error');
            
            if (email && !emailRegex.test(email)) {
                formGroup.classList.add('error');
                showNotification('Invalid email', 'error');
            } else if (email) {
                formGroup.classList.add('success');
            }
        });
    }
    
    // Phone validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', function() {
            const phone = this.value;
            const phoneRegex = /^[0-9]{10,11}$/;
            const formGroup = this.closest('.form-group');
            
            formGroup.classList.remove('success', 'error');
            
            if (phone && !phoneRegex.test(phone)) {
                formGroup.classList.add('error');
                showNotification('Invalid phone number', 'error');
            } else if (phone) {
                formGroup.classList.add('success');
            }
        });
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const passwordData = Object.fromEntries(formData);
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        showNotification('Mật khẩu xác nhận không khớp', 'error');
        return;
    }
    
    if (passwordData.newPassword.length < 6) {
        showNotification('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
        return;
    }
    
    try {
        const userId = localStorage.getItem('userId');
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        submitBtn.disabled = true;
        
        // Call API to change password
        const response = await fetch(`http://localhost:3000/api/profile/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Highlight the problematic field
            if (data.message.includes('Mật khẩu hiện tại không đúng') || 
                data.message.includes('Current password is incorrect')) {
                const currentPasswordField = document.getElementById('currentPassword');
                if (currentPasswordField) {
                    currentPasswordField.style.borderColor = '#e74c3c';
                    currentPasswordField.focus();
                    setTimeout(() => {
                        currentPasswordField.style.borderColor = '';
                    }, 3000);
                }
            }
            
            throw new Error(data.message || 'Failed to change password');
        }
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Clear form
        e.target.reset();
        
        // Clear any field highlighting
        e.target.querySelectorAll('input').forEach(input => {
            input.style.borderColor = '';
        });
        
        showNotification('Mật khẩu đã được thay đổi thành công!', 'success');
        
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification(error.message || 'Đã xảy ra lỗi khi đổi mật khẩu', 'error');
        
        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-key"></i> Đổi mật khẩu';
            submitBtn.disabled = false;
        }
    }
}

function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Image size must not exceed 5MB', 'error');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const avatarBase64 = e.target.result;
        const avatar = document.getElementById('userAvatar');
        
        if (avatar) {
            // Show preview immediately
            avatar.style.backgroundImage = `url(${avatarBase64})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.innerHTML = '';
            
            // Show uploading status
            showNotification('Uploading avatar...', 'info');
            
            try {
                const userId = localStorage.getItem('userId');
                
                // Upload to server
                const response = await fetch(`http://localhost:3000/api/profile/${userId}/avatar`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        avatar: avatarBase64
                    })
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Failed to upload avatar');
                }
                
                // Save to localStorage for offline access
                localStorage.setItem('userAvatar', avatarBase64);
                
                showNotification('Avatar updated successfully!', 'success');
                
            } catch (error) {
                console.error('Error uploading avatar:', error);
                showNotification('Failed to upload avatar: ' + error.message, 'error');
                
                // Revert to old avatar on error
                const oldAvatar = localStorage.getItem('userAvatar');
                if (oldAvatar) {
                    avatar.style.backgroundImage = `url(${oldAvatar})`;
                }
            }
        }
    };
    reader.readAsDataURL(file);
}

function setupFormValidation() {
    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (email && !emailRegex.test(email)) {
                this.style.borderColor = '#e74c3c';
                showNotification('Email không hợp lệ', 'error');
            } else if (email) {
                this.style.borderColor = '#28a745';
            }
        });
    }
    
    // Phone validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', function() {
            const phone = this.value;
            const phoneRegex = /^[0-9]{10,11}$/;
            
            if (phone && !phoneRegex.test(phone)) {
                this.style.borderColor = '#e74c3c';
                showNotification('Số điện thoại không hợp lệ', 'error');
            } else if (phone) {
                this.style.borderColor = '#28a745';
            }
        });
    }
}

function initializeComponents() {
    // Initialize tooltips if Bootstrap is loaded
    if (typeof $ !== 'undefined' && $.fn.tooltip) {
        $('[data-toggle="tooltip"]').tooltip();
    }
    
    // Animate cards on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    });
    
    document.querySelectorAll('.profile-card').forEach(card => {
        observer.observe(card);
    });
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#ff6600'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Add after existing code

// Wallet functionality
let selectedAmount = 0;
let selectedPaymentMethod = '';

function initializeWallet() {
    loadWalletBalance();
    setupWalletEventListeners();
    loadTransactionHistory();
}

async function loadWalletBalance() {
    try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/wallet/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            const balance = data.wallet.balance || 0;
            const balanceElement = document.getElementById('walletBalance');
            if (balanceElement) {
                // Display in VND (1 USD = 1 VND for demo)
                balanceElement.textContent = formatCurrency(balance);
            }
            // Cache in localStorage
            localStorage.setItem('walletBalance', balance.toString());
        }
    } catch (error) {
        console.error('Error loading wallet balance:', error);
        // Fallback to localStorage
        const balance = localStorage.getItem('walletBalance') || '0';
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
            balanceElement.textContent = formatCurrency(balance);
        }
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function setupWalletEventListeners() {
    // Top up button
    const topUpBtn = document.getElementById('topUpBtn');
    const topUpModal = document.getElementById('topUpModal');
    const closeModal = document.getElementById('closeModal');
    const cancelTopUp = document.getElementById('cancelTopUp');
    const topUpForm = document.getElementById('topUpForm');
    const transactionHistoryBtn = document.getElementById('transactionHistoryBtn');
    
    // Auto-select bank transfer (only payment method)
    selectedPaymentMethod = 'bank';
    
    if (topUpBtn) {
        topUpBtn.addEventListener('click', () => {
            topUpModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeTopUpModal);
    }
    
    if (cancelTopUp) {
        cancelTopUp.addEventListener('click', closeTopUpModal);
    }
    
    if (topUpModal) {
        topUpModal.addEventListener('click', (e) => {
            if (e.target === topUpModal) {
                closeTopUpModal();
            }
        });
    }
    
    if (topUpForm) {
        topUpForm.addEventListener('submit', handleTopUp);
    }
    
    if (transactionHistoryBtn) {
        transactionHistoryBtn.addEventListener('click', toggleTransactionHistory);
    }
    
    // Amount selection
    document.querySelectorAll('.amount-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.amount-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedAmount = parseInt(option.dataset.amount);
            
            const customInput = document.getElementById('customAmountInput');
            if (customInput) {
                customInput.value = '';
            }
        });
    });
    
    // Custom amount input
    const customAmountInput = document.getElementById('customAmountInput');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', () => {
            document.querySelectorAll('.amount-option').forEach(opt => opt.classList.remove('selected'));
            selectedAmount = parseInt(customAmountInput.value) || 0;
        });
    }
    
    // Payment method selection
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
            method.classList.add('selected');
            
            const radio = method.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                selectedPaymentMethod = radio.value;
            }
        });
    });
}

function closeTopUpModal() {
    const topUpModal = document.getElementById('topUpModal');
    if (topUpModal) {
        topUpModal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Reset form
        selectedAmount = 0;
        selectedPaymentMethod = '';
        document.querySelectorAll('.amount-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
        
        const customInput = document.getElementById('customAmountInput');
        if (customInput) {
            customInput.value = '';
        }
    }
}

async function handleTopUp(e) {
    e.preventDefault();
    
    if (!selectedAmount || selectedAmount < 10000) {
        showNotification('Minimum amount is $10,000', 'error');
        return;
    }
    
    if (selectedAmount > 50000000) {
        showNotification('Maximum amount is $50,000,000', 'error');
        return;
    }
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        showNotification('Creating payment link...', 'info');
        
        // Call PayOS API to create payment link
        const response = await fetch(`http://localhost:3000/api/wallet/${userId}/topup/payos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: selectedAmount })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to create payment link');
        }
        
        // Close top-up modal
        closeTopUpModal();
        
        // Show QR code modal
        showPaymentQRModal(data.data);
        
    } catch (error) {
        console.error('Top-up error:', error);
        showNotification(error.message || 'Failed to create payment link', 'error');
    }
}

function getPaymentMethodName(method) {
    const methods = {
        'momo': 'MoMo',
        'zalopay': 'ZaloPay',
        'vnpay': 'VNPay',
        'bank': 'Ngân hàng'
    };
    return methods[method] || method;
}

function addTransaction(transaction) {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    transactions.unshift(transaction);
    
    // Keep only last 50 transactions
    if (transactions.length > 50) {
        transactions.splice(50);
    }
    
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

async function loadTransactionHistory() {
    const transactionList = document.getElementById('transactionList');
    
    if (!transactionList) return;
    
    try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/wallet/${userId}/transactions?limit=20`);
        const data = await response.json();
        
        if (!data.success || !data.transactions || data.transactions.length === 0) {
            transactionList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-receipt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }
        
        transactionList.innerHTML = data.transactions.map(transaction => {
            const isIncome = transaction.type === 'topup' || transaction.type === 'deposit' || transaction.type === 'refund' || transaction.type === 'bonus';
            const isPayment = transaction.type === 'payment';
            const amount = Math.abs(transaction.amount);
            
            // Get icon based on type
            let icon = 'fa-exchange-alt';
            if (isIncome) icon = 'fa-plus-circle';
            else if (isPayment) icon = 'fa-shopping-cart';
            
            // Show VIP discount if exists
            let vipBadge = '';
            if (transaction.bookingDetails && transaction.bookingDetails.vipDiscount && transaction.bookingDetails.vipDiscount.discountPercentage > 0) {
                const vipLevel = transaction.bookingDetails.vipDiscount.membershipLevel;
                const vipIcons = {
                    bronze: '🥉',
                    silver: '🥈',
                    gold: '🥇',
                    platinum: '💎',
                    diamond: '💠'
                };
                vipBadge = `<span class="vip-badge" style="font-size: 0.75rem; margin-left: 0.5rem; padding: 2px 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">${vipIcons[vipLevel]} ${transaction.bookingDetails.vipDiscount.discountPercentage}% OFF</span>`;
            }
            
            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <h6>${transaction.description}${vipBadge}</h6>
                        <p>${formatDate(transaction.createdAt)}</p>
                        <span class="transaction-status ${transaction.status}">${getStatusText(transaction.status)}</span>
                    </div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'}$${formatCurrency(amount)}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactionList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #999;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>Unable to load transaction history</p>
            </div>
        `;
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Processing',
        'completed': 'Completed',
        'failed': 'Failed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function toggleTransactionHistory() {
    const transactionCard = document.getElementById('transactionHistoryCard');
    const btn = document.getElementById('transactionHistoryBtn');
    
    if (transactionCard.style.display === 'none') {
        transactionCard.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide History';
        loadTransactionHistory();
        
        // Scroll to transaction card
        setTimeout(() => {
            transactionCard.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else {
        transactionCard.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-history"></i> Transaction History';
    }
}

// Update the main initialization function
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Profile page initialized');
    
    // Only run if we're on the profile page
    if (!document.querySelector('.profile-container')) {
        console.log('Not on profile page, skipping profile.js');
        return;
    }
    
    // Check authentication
    if (!checkUserAuth()) return;
    
    // Load user profile data
    loadUserProfile();
    
    // Initialize wallet
    initializeWallet();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize components
    initializeComponents();
});

// =============================================
// PAYOS PAYMENT QR CODE MODAL
// =============================================
let paymentCheckInterval = null;

function showPaymentQRModal(paymentData) {
    const { checkoutUrl, qrCode, orderCode, amount, amountWallet, description, instructions } = paymentData;
    
    // Create modal HTML
    const modalHTML = `
        <div id="paymentQRModal" class="modal show" style="display: flex;">
            <div class="modal-content payment-modal">
                <div class="modal-header">
                    <h3>💳 Scan QR to Pay</h3>
                    <span class="close-modal" onclick="closePaymentQRModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="payment-info">
                        <div class="amount-display">
                            <div class="amount-label">Amount to pay</div>
                            <div class="amount-value">$${amountWallet.toLocaleString()}</div>
                            <div class="amount-wallet">${amount.toLocaleString()} VND via bank transfer</div>
                        </div>
                        
                        <div class="qr-container">
                            <img src="${checkoutUrl}" alt="QR Code" class="qr-image" 
                                 onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}'">
                            <div class="qr-text">${qrCode}</div>
                        </div>
                        
                        <div class="payment-status">
                            <div class="status-indicator">
                                <div class="spinner"></div>
                                <span>Waiting for payment...</span>
                            </div>
                            <div class="order-code">Order: #${orderCode}</div>
                        </div>
                        
                        <div class="payment-instructions">
                            <h4>📱 How to pay:</h4>
                            <ol>
                                ${instructions.map(inst => `<li>${inst}</li>`).join('')}
                            </ol>
                        </div>
                        
                        <div class="payment-actions">
                            <button onclick="window.open('${checkoutUrl}', '_blank')" class="btn btn-primary">
                                🌐 Open Payment Page
                            </button>
                            <button onclick="closePaymentQRModal()" class="btn btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
    
    // Start checking payment status
    startPaymentStatusCheck(orderCode);
}

function closePaymentQRModal() {
    const modal = document.getElementById('paymentQRModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
    
    // Stop checking payment status
    if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        paymentCheckInterval = null;
    }
}

function startPaymentStatusCheck(orderCode) {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    console.log('🔍 Starting payment status check for order:', orderCode);
    
    // Check immediately
    checkPaymentStatus(orderCode, userId);
    
    // Then check every 3 seconds
    paymentCheckInterval = setInterval(() => {
        checkPaymentStatus(orderCode, userId);
    }, 3000);
    
    // Stop after 5 minutes
    setTimeout(() => {
        if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
            paymentCheckInterval = null;
            showNotification('Payment timeout. Please try again.', 'error');
            closePaymentQRModal();
        }
    }, 300000); // 5 minutes
}

async function checkPaymentStatus(orderCode, userId) {
    try {
        const response = await fetch(
            `http://localhost:3000/api/wallet/${userId}/topup/check-payos/${orderCode}`
        );
        
        const data = await response.json();
        
        if (data.success && data.status === 'completed') {
            console.log('✅ Payment completed!', data);
            
            // Stop checking
            if (paymentCheckInterval) {
                clearInterval(paymentCheckInterval);
                paymentCheckInterval = null;
            }
            
            // Close modal
            closePaymentQRModal();
            
            // Show success notification
            showNotification(
                `Payment successful! $${data.data.balance.toLocaleString()} added to wallet`,
                'success'
            );
            
            // Reload wallet balance
            setTimeout(() => {
                loadUserProfile();
                loadTransactionHistory();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error checking payment status:', error);
    }
}

// Make functions global for onclick handlers
window.closePaymentQRModal = closePaymentQRModal;


// Add some mock transactions on first load for demo
function initializeMockTransactions() {
    const existingTransactions = localStorage.getItem('transactions');
    if (!existingTransactions) {
        const mockTransactions = [
            {
                id: Date.now().toString(),
                type: 'income',
                amount: 500000,
                description: 'Nạp tiền qua MoMo',
                date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                status: 'completed'
            },
            {
                id: (Date.now() - 1).toString(),
                type: 'expense',
                amount: 150000,
                description: 'Thanh toán tour "Hà Nội - Sapa"',
                date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                status: 'completed'
            }
        ];
        localStorage.setItem('transactions', JSON.stringify(mockTransactions));
    }
}

// Initialize mock data on page load
initializeMockTransactions();