import React from "react";
import avatar from "../assets/avatar.svg"; // đường dẫn đến ảnh avatar
import Notifications from "./Notifications";

function Header({ title, setActive }) {
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
            <div className="font-medium">Nhóm 1</div>
            <div className="text-xs text-gray-500">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

