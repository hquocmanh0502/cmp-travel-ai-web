/**
 * api-auth.js - Lớp xác thực phía client.
 *
 * Phải được nạp TRƯỚC mọi script khác có gọi API.
 *
 * Việc nó làm:
 *  1. Tự gắn header `Authorization: Bearer <token>` vào mọi request tới API backend,
 *     nên các file gọi fetch sẵn có không phải sửa từng chỗ.
 *  2. Khi token hết hạn hoặc không hợp lệ (401), tự dọn phiên và đưa về trang đăng nhập.
 *
 * Trước đây frontend chỉ lưu token vào localStorage rồi gần như không gửi đi đâu,
 * vì backend cũng chẳng kiểm tra. Giờ backend đã bắt buộc nên cần lớp này.
 */
(function () {
  'use strict';

  var API_HOSTS = ['localhost:3000', '127.0.0.1:3000'];
  var TOKEN_KEY = 'authToken';

  // Những endpoint không cần token và không được redirect khi trả 401,
  // nếu không trang đăng nhập sẽ tự đá chính nó khi nhập sai mật khẩu.
  var PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register'];

  var SESSION_KEYS = [
    'authToken', 'userId', 'username', 'userEmail', 'userFullName', 'userRole'
  ];

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    try {
      SESSION_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* localStorage có thể bị chặn */ }
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function onLoginPage() {
    return /(login|create_acc)\.html$/i.test(window.location.pathname);
  }

  /** Request này có đi tới API backend của mình không? */
  function isApiRequest(url) {
    try {
      var parsed = new URL(url, window.location.href);
      if (API_HOSTS.indexOf(parsed.host) !== -1) return true;
      // Trường hợp frontend được serve cùng origin với backend.
      return parsed.origin === window.location.origin &&
             parsed.pathname.indexOf('/api/') === 0;
    } catch (e) {
      return false;
    }
  }

  function isPublicPath(url) {
    try {
      var path = new URL(url, window.location.href).pathname;
      return PUBLIC_PATHS.some(function (p) { return path.indexOf(p) !== -1; });
    } catch (e) {
      return false;
    }
  }

  function redirectToLogin() {
    if (onLoginPage()) return;

    // Nhớ trang đang xem để đăng nhập xong quay lại đúng chỗ.
    try {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
    } catch (e) { /* bỏ qua */ }

    if (typeof showError === 'function') {
      showError('Phiên đã hết hạn', 'Vui lòng đăng nhập lại.');
    }
    setTimeout(function () { window.location.href = 'login.html'; }, 800);
  }

  var originalFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url) || '';
    init = init || {};

    if (isApiRequest(url)) {
      var token = getToken();

      if (token) {
        // Headers có thể là object thường, mảng, hoặc instance Headers.
        var headers = new Headers(
          init.headers || (typeof input === 'object' && input.headers) || {}
        );
        if (!headers.has('Authorization')) {
          headers.set('Authorization', 'Bearer ' + token);
        }
        init = Object.assign({}, init, { headers: headers });
      }

      return originalFetch(input, init).then(function (response) {
        if (response.status === 401 && !isPublicPath(url)) {
          clearSession();
          redirectToLogin();
        }
        return response;
      });
    }

    return originalFetch(input, init);
  };

  /**
   * Hỏi server xem token còn hiệu lực không.
   * Dùng ở các trang bắt buộc đăng nhập - đáng tin hơn là chỉ nhìn localStorage,
   * vì token có thể đã hết hạn hoặc tài khoản đã bị khoá.
   */
  function verifySession() {
    if (!getToken()) return Promise.resolve(null);

    return originalFetch('http://localhost:3000/api/auth/me', {
      headers: { Authorization: 'Bearer ' + getToken() }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('invalid session');
        return res.json();
      })
      .then(function (data) {
        if (data && data.user) {
          try {
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userFullName', data.user.fullName || '');
            localStorage.setItem('userRole', data.user.role || 'user');
          } catch (e) { /* bỏ qua */ }
        }
        return data.user;
      })
      .catch(function () {
        clearSession();
        return null;
      });
  }

  /** Gọi ở đầu những trang chỉ dành cho người đã đăng nhập. */
  function requireLogin() {
    return verifySession().then(function (user) {
      if (!user) redirectToLogin();
      return user;
    });
  }

  function logout() {
    clearSession();
    window.location.href = 'index.html';
  }

  window.CMPAuth = {
    getToken: getToken,
    isLoggedIn: isLoggedIn,
    clearSession: clearSession,
    verifySession: verifySession,
    requireLogin: requireLogin,
    logout: logout
  };
})();
