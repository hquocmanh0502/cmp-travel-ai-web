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
        showNotification('Vui lòng đăng nhập để xem thông tin cá nhân', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

function loadUserProfile() {
    try {
        // Get user data from localStorage
        const userData = {
            id: localStorage.getItem('userId'),
            username: localStorage.getItem('username'),
            email: localStorage.getItem('userEmail'),
            fullName: localStorage.getItem('userFullName') || localStorage.getItem('username'),
            phone: localStorage.getItem('userPhone') || '',
            address: localStorage.getItem('userAddress') || '',
            birthday: localStorage.getItem('userBirthday') || '',
            gender: localStorage.getItem('userGender') || 'male',
            memberSince: localStorage.getItem('userMemberSince') || '2024'
        };
        
        // Populate profile data only if elements exist
        populateProfileData(userData);
        
        // Load user statistics
        loadUserStats();
        
        // Load recent activity
        loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Không thể tải thông tin người dùng', 'error');
    }
}

function populateProfileData(userData) {
    // Update profile header - check if elements exist first
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const memberSince = document.getElementById('memberSince');
    
    if (userName) userName.textContent = userData.fullName;
    if (userEmail) userEmail.textContent = userData.email;
    if (memberSince) memberSince.textContent = `Thành viên từ ${userData.memberSince}`;
    
    // Update avatar with initials if no image
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
        const initials = userData.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
        avatar.style.background = `linear-gradient(135deg, #ff6600, #ff8533)`;
        avatar.style.color = 'white';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.innerHTML = `<span style="font-size: 2rem; font-weight: bold;">${initials}</span>`;
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
        if (field && value) {
            field.value = value;
        }
    });
}

async function loadUserStats() {
    try {
        const userId = localStorage.getItem('userId');
        
        // Mock data - replace with actual API calls
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
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function loadRecentActivity() {
    const activityContainer = document.getElementById('activityList');
    if (!activityContainer) return; // Exit if element doesn't exist
    
    // Mock recent activity data
    const activities = [
        {
            icon: 'fas fa-plane',
            title: 'Đặt tour "Tokyo Adventure"',
            description: 'Đã đặt thành công tour du lịch Nhật Bản',
            time: '2 giờ trước'
        },
        {
            icon: 'fas fa-heart',
            title: 'Thêm vào wishlist',
            description: 'Đã thêm "Paris Romance" vào danh sách yêu thích',
            time: '1 ngày trước'
        },
        {
            icon: 'fas fa-star',
            title: 'Đánh giá tour',
            description: 'Đã đánh giá 5 sao cho tour "Venice Explorer"',
            time: '3 ngày trước'
        },
        {
            icon: 'fas fa-user-edit',
            title: 'Cập nhật thông tin',
            description: 'Đã cập nhật thông tin cá nhân',
            time: '1 tuần trước'
        }
    ];
    
    activityContainer.innerHTML = activities.map(activity => `
        <li class="activity-item">
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <h5>${activity.title}</h5>
                <p>${activity.description}</p>
            </div>
            <div class="activity-time">${activity.time}</div>
        </li>
    `).join('');
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
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update localStorage
        Object.entries(profileData).forEach(([key, value]) => {
            if (key === 'fullName') {
                localStorage.setItem('userFullName', value);
            } else {
                localStorage.setItem(`user${key.charAt(0).toUpperCase() + key.slice(1)}`, value);
            }
        });
        
        // Reset button state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        // Add success state to form
        e.target.querySelectorAll('.form-group').forEach(group => {
            group.classList.add('success');
            setTimeout(() => group.classList.remove('success'), 2000);
        });
        
        showNotification('Cập nhật thông tin thành công!', 'success');
        
        // Update header info
        setTimeout(() => {
            loadUserProfile();
        }, 500);
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Có lỗi xảy ra khi cập nhật thông tin', 'error');
        
        // Reset button state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
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
                showNotification('Email không hợp lệ', 'error');
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
                showNotification('Số điện thoại không hợp lệ', 'error');
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
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang thay đổi...';
        submitBtn.disabled = true;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Clear form
        e.target.reset();
        
        showNotification('Đổi mật khẩu thành công!', 'success');
        
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Có lỗi xảy ra khi đổi mật khẩu', 'error');
    }
}

function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Kích thước ảnh không được vượt quá 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.style.backgroundImage = `url(${e.target.result})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.innerHTML = '';
            
            // Store in localStorage (in real app, upload to server)
            localStorage.setItem('userAvatar', e.target.result);
            showNotification('Ảnh đại diện đã được cập nhật!', 'success');
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

function loadWalletBalance() {
    const balance = localStorage.getItem('walletBalance') || '0';
    const balanceElement = document.getElementById('walletBalance');
    if (balanceElement) {
        balanceElement.textContent = formatCurrency(balance);
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
        showNotification('Số tiền nạp tối thiểu là 10,000 VNĐ', 'error');
        return;
    }
    
    if (selectedAmount > 50000000) {
        showNotification('Số tiền nạp tối đa là 50,000,000 VNĐ', 'error');
        return;
    }
    
    if (!selectedPaymentMethod) {
        showNotification('Vui lòng chọn phương thức thanh toán', 'error');
        return;
    }
    
    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Update wallet balance
        const currentBalance = parseInt(localStorage.getItem('walletBalance') || '0');
        const newBalance = currentBalance + selectedAmount;
        localStorage.setItem('walletBalance', newBalance.toString());
        
        // Add transaction record
        addTransaction({
            id: Date.now().toString(),
            type: 'income',
            amount: selectedAmount,
            description: `Nạp tiền qua ${getPaymentMethodName(selectedPaymentMethod)}`,
            date: new Date().toISOString(),
            status: 'completed'
        });
        
        // Reset button state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        // Update UI
        loadWalletBalance();
        loadTransactionHistory();
        
        showNotification(`Nạp tiền thành công ${formatCurrency(selectedAmount)} VNĐ!`, 'success');
        
        // Close modal
        setTimeout(() => {
            closeTopUpModal();
        }, 1500);
        
    } catch (error) {
        console.error('Error processing top-up:', error);
        showNotification('Có lỗi xảy ra khi nạp tiền. Vui lòng thử lại!', 'error');
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
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

function loadTransactionHistory() {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const transactionList = document.getElementById('transactionList');
    
    if (!transactionList) return;
    
    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-receipt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>Chưa có giao dịch nào</p>
            </div>
        `;
        return;
    }
    
    transactionList.innerHTML = transactions.slice(0, 10).map(transaction => `
        <div class="transaction-item">
            <div class="transaction-icon ${transaction.type}">
                <i class="fas ${transaction.type === 'income' ? 'fa-plus' : 'fa-minus'}"></i>
            </div>
            <div class="transaction-details">
                <h6>${transaction.description}</h6>
                <p>${formatDate(transaction.date)}</p>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)} VNĐ
            </div>
        </div>
    `).join('');
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
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Ẩn lịch sử';
        loadTransactionHistory();
        
        // Scroll to transaction card
        setTimeout(() => {
            transactionCard.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else {
        transactionCard.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-history"></i> Lịch sử giao dịch';
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