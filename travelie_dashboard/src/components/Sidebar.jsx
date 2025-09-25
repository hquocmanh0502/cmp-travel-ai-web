import React from "react";

function Sidebar({ active, setActive }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "packages", label: "Packages", icon: "📦" },
    { id: "bookings", label: "Bookings", icon: "🧾" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "travelers", label: "Travelers", icon: "🧑‍🤝‍🧑" },
    { id: "messages", label: "Messages", icon: "✉️" },
    { id: "gallery", label: "Gallery", icon: "🖼️" },
    { id: "feedback", label: "Feedback", icon: "👍" },
  ];

  return (
    <aside className="flex-shrink-0 w-72 bg-white/70 backdrop-blur-lg border-r border-gray-100 h-screen p-6 sticky top-0">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-white font-bold">
          T
        </div>
        <div>
          <div className="text-lg font-semibold">Travelie</div>
          <div className="text-xs text-gray-500">v1.0</div>
        </div>
      </div>

      <nav className="space-y-1">
        {items.map((it) => {
          const isActive = active === it.id;
          const base =
            "w-full flex items-center gap-3 text-sm px-3 py-2 rounded-lg transition-all text-left";
          const activeClass = isActive
            ? "bg-blue-500 text-white shadow-lg"
            : "text-gray-600 hover:bg-gray-100";
          return (
            <button
              key={it.id}
              onClick={() => setActive(it.id)}
              className={`${base} ${activeClass}`}
            >
              <span className="w-6">{it.icon}</span>
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="text-xs text-gray-400">© Travelie</div>
      </div>
    </aside>
  );
}

export default Sidebar;
