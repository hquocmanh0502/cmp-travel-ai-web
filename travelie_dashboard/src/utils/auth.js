/**
 * Tầng xác thực cho dashboard quản trị.
 *
 * Dashboard gọi API ở 105 chỗ rải rác trong 26 file, nên thay vì sửa từng lời gọi
 * fetch, ta bọc window.fetch một lần lúc khởi động. Mọi request tới backend sẽ
 * tự động mang theo token.
 */

const API_HOSTS = ['localhost:3000', '127.0.0.1:3000'];
const TOKEN_KEY = 'adminToken';
const USER_KEY = 'adminUser';

export const API_BASE = 'http://localhost:3000/api';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredAdmin() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* bỏ qua */ }
}

function isApiRequest(url) {
  try {
    const parsed = new URL(url, window.location.href);
    return API_HOSTS.includes(parsed.host);
  } catch {
    return false;
  }
}

function isLoginRequest(url) {
  try {
    return new URL(url, window.location.href).pathname.includes('/api/auth/login');
  } catch {
    return false;
  }
}

/** Các subscriber được gọi khi phiên bị mất hiệu lực (401 từ server). */
const sessionExpiredHandlers = new Set();

export function onSessionExpired(handler) {
  sessionExpiredHandlers.add(handler);
  return () => sessionExpiredHandlers.delete(handler);
}

let interceptorInstalled = false;

export function installAuthInterceptor() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';

    if (!isApiRequest(url)) {
      return originalFetch(input, init);
    }

    const token = getToken();
    let options = init;

    if (token) {
      const headers = new Headers(init.headers || (typeof input === 'object' && input.headers) || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      options = { ...init, headers };
    }

    const response = await originalFetch(input, options);

    // 401 = token hỏng/hết hạn -> đăng xuất.
    // 403 = đã đăng nhập nhưng không đủ quyền -> để component tự xử lý,
    // không đá người dùng ra ngoài.
    if (response.status === 401 && !isLoginRequest(url)) {
      clearSession();
      sessionExpiredHandlers.forEach(fn => fn());
    }

    return response;
  };
}

/**
 * Đăng nhập quản trị. Chỉ chấp nhận tài khoản có role admin - tài khoản khách
 * hàng đăng nhập đúng mật khẩu vẫn không vào được dashboard.
 */
export async function loginAdmin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Đăng nhập thất bại');
  }
  if (data.user?.role !== 'admin') {
    throw new Error('Tài khoản này không có quyền quản trị');
  }

  saveSession(data.authToken, data.user);
  return data.user;
}

/**
 * Xác minh token còn hiệu lực với server.
 * Quan trọng: không tin localStorage, vì token có thể đã hết hạn hoặc quyền
 * admin đã bị thu hồi kể từ lần đăng nhập trước.
 */
export async function verifyAdminSession() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`);
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = await res.json();
    if (data.user?.role !== 'admin') {
      clearSession();
      return null;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  } catch {
    return null;
  }
}

export function logoutAdmin() {
  clearSession();
  window.location.reload();
}
