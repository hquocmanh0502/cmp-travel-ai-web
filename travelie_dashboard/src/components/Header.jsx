import React from "react";
import avatar from "../assets/avatar.svg"; // đường dẫn đến ảnh avatar
import Notifications from "./Notifications";
import { logoutAdmin } from "../utils/auth";

function Header({ title, setActive, admin }) {
  return (
    <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-extrabold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <Notifications setActive={setActive} />
        <div className="flex items-center gap-2">
          {/* Dùng ảnh từ assets */}
          <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full" />
          <div className="text-sm">
            <div className="font-medium">{admin?.fullName || admin?.username || "Admin"}</div>
            <div className="text-xs text-gray-500">{admin?.email || "Admin"}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={logoutAdmin}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}

export default Header;

