// frontend/js/auth.js

// Password visibility toggle
function togglePassword(inputId, toggleButton) {
    const input = document.querySelector(inputId);
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    
    const svg = toggleButton.querySelector('svg');
    if (isPassword) {
        // Show eye-off icon when password is visible
        svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        // Show eye icon when password is hidden
        svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}

// Login and Register functionality
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');
    const registerForm = document.querySelector('#registerForm');
    
    // Setup password toggle for all password fields
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.closest('.input-group').querySelector('input');
            togglePassword(`#${input.id}`, toggle);
        });
    });
    
    // Login form handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.querySelector('#email').value;
            const password = document.querySelector('#password').value;
            
            if (!email || !password) {
                alert('Vui lòng điền đầy đủ thông tin!');
                return;
            }
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('userId', data.user.id);
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userFullName', data.user.fullName);
                    
                    alert('Đăng nhập thành công!');
                    window.location.href = 'index.html';
                } else {
                    alert(data.error || 'Đăng nhập thất bại!');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Lỗi kết nối. Vui lòng thử lại!');
            }
        });
    }
    
    // Register form handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.querySelector('#username').value;
            const fullName = document.querySelector('#fullName').value;
            const email = document.querySelector('#email').value;
            const phone = document.querySelector('#phone').value;
            const password = document.querySelector('#password').value;
            const confirmPassword = document.querySelector('#confirm-password').value;
            
            // Validation
            if (!username || !fullName || !email || !password) {
                alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Mật khẩu xác nhận không khớp!');
                return;
            }
            
            if (password.length < 6) {
                alert('Mật khẩu phải có ít nhất 6 ký tự!');
                return;
            }
            
            const formData = {
                username,
                email,
                password,
                fullName,
                phone
            };
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Đăng ký thành công! Vui lòng đăng nhập.');
                    window.location.href = 'login.html';
                } else {
                    alert(data.error || 'Đăng ký thất bại!');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('Lỗi kết nối. Vui lòng thử lại!');
            }
        });
    }
});