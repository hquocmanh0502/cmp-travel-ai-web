import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import BookingsManagement from "./pages/Booking/BookingsManagement";
import ToursManagement from "./pages/Tours/ToursManagement";
import UsersManagement from "./pages/Users/UsersManagement";
import Hotels from "./pages/Hotels/Hotels";
import Reviews from "./pages/Reviews/Reviews";
import BlogManagement from "./pages/Blog/BlogManagement";
import TourGuideManagement from "./pages/TourGuides/TourGuideManagement";
import SpamDashboard from "./pages/SpamDashboard";
import BanManagement from "./pages/BanManagement";
import ContactManagement from "./pages/ContactManagement";
import Newsletter from "./pages/Newsletter/Newsletter";
import Revenue from "./pages/Revenue/Revenue";
import Settings from "./pages/Settings/Settings";
import Login from "./pages/Login";
import { Toaster } from 'react-hot-toast';
import { verifyAdminSession, onSessionExpired } from "./utils/auth";

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [admin, setAdmin] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Xác minh phiên với server ở lần tải đầu. Không tin localStorage vì token có
  // thể đã hết hạn hoặc quyền admin đã bị thu hồi.
  useEffect(() => {
    let cancelled = false;

    verifyAdminSession().then((user) => {
      if (cancelled) return;
      setAdmin(user);
      setCheckingSession(false);
    });

    return () => { cancelled = true; };
  }, []);

  // Nếu bất kỳ request nào nhận 401, đưa về màn hình đăng nhập.
  useEffect(() => onSessionExpired(() => setAdmin(null)), []);

  useEffect(() => {
    document.title = "Travelie • " + (active[0].toUpperCase() + active.slice(1));
  }, [active]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  if (!admin) {
    return <Login onSuccess={setAdmin} />;
  }

  const title = active === "dashboard" ? "Dashboard" : active[0].toUpperCase() + active.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 overflow-x-hidden">
      <Toaster position="top-right" />
      <div className="max-w-[1400px] mx-auto flex gap-6 px-4">
        <Sidebar active={active} setActive={setActive} />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <Header title={title} setActive={setActive} admin={admin} />
          <main className="p-6 overflow-x-hidden">
            {active === "dashboard" && <Dashboard />}
            {active === "bookings" && <BookingsManagement />}
            {active === "tours" && <ToursManagement />}
            {active === "users" && <UsersManagement />}
            {active === "hotels" && <Hotels />}
            {active === "reviews" && <Reviews />}
            {active === "blog" && <BlogManagement />}
            {active === "tour-guides" && <TourGuideManagement />}
            {active === "spam-dashboard" && <SpamDashboard />}
            {active === "ban-management" && <BanManagement />}
            {active === "contact-management" && <ContactManagement />}
            {active === "newsletter" && <Newsletter />}
            {active === "revenue" && <Revenue />}
            {active === "settings" && <Settings />}
            {!["dashboard", "bookings", "tours", "users", "hotels", "reviews", "blog", "tour-guides", "spam-dashboard", "ban-management", "contact-management", "newsletter", "revenue", "settings"].includes(active) && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                Coming soon: {active}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
