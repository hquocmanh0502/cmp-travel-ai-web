import React from "react";
import { 
  MdDashboard, 
  MdBookOnline, 
  MdTour, 
  MdPeople, 
  MdHotel,
  MdRateReview,
  MdArticle,
  MdChat,
  MdAttachMoney,
  MdSettings,
  MdLogout
} from "react-icons/md";

function Sidebar({ active, setActive }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: MdDashboard },
    { id: "bookings", label: "Bookings", icon: MdBookOnline },
    { id: "tours", label: "Tours", icon: MdTour },
    { id: "users", label: "Users", icon: MdPeople },
    { id: "hotels", label: "Hotels", icon: MdHotel },
    { id: "reviews", label: "Reviews", icon: MdRateReview },
    { id: "blog", label: "Blog", icon: MdArticle },
    { id: "messages", label: "Messages", icon: MdChat },
    { id: "revenue", label: "Revenue", icon: MdAttachMoney },
    { id: "settings", label: "Settings", icon: MdSettings },
  ];

  return (
    <aside className="flex-shrink-0 w-64 bg-white border-r border-gray-200 h-screen flex flex-col sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
          T
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">Travelie</div>
          <div className="text-xs text-gray-500">Admin Dashboard</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left
                ${isActive 
                  ? "bg-orange-500 text-white shadow-md" 
                  : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <Icon className="text-xl" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all">
          <MdLogout className="text-xl" />
          <span className="font-medium text-sm">Logout</span>
        </button>
        <div className="mt-3 text-xs text-gray-400 text-center">
          © 2024 Travelie. v1.0.0
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
