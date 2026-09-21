import React, { useState } from 'react';
import { loginAdmin } from '../utils/auth';

/**
 * Màn hình đăng nhập của dashboard quản trị.
 *
 * Trước đây dashboard không có bước này - mở URL là vào thẳng, và backend cũng
 * không kiểm tra gì.
 */
export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const user = await loginAdmin(email.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">CMP Travel</h1>
          <p className="text-slate-500 mt-1">Bảng điều khiển quản trị</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Đăng nhập</h2>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <label className="block mb-4">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={loading}
              placeholder="admin@cmptravel.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </label>

          <label className="block mb-6">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-16 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <p className="mt-5 text-center text-xs text-slate-400">
            Chỉ tài khoản có quyền quản trị mới truy cập được khu vực này.
          </p>
        </form>
      </div>
    </div>
  );
}
