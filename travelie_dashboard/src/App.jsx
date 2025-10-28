import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import BookingsManagement from "./pages/Booking/BookingsManagement";
import Messages from "./pages/Messages/Messages";
import Tours from "./pages/Tours/Tours";
import Users from "./pages/Users/Users";
import Hotels from "./pages/Hotels/Hotels";
import Reviews from "./pages/Reviews/Reviews";
import BlogManagement from "./pages/Blog/BlogManagement";
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    document.title = "Travelie • " + (active[0].toUpperCase() + active.slice(1));
  }, [active]);

  const title = active === "dashboard" ? "Dashboard" : active[0].toUpperCase() + active.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 overflow-x-hidden">
      <Toaster position="top-right" />
      <div className="max-w-[1400px] mx-auto flex gap-6 px-4">
        <Sidebar active={active} setActive={setActive} />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <Header title={title} />
          <main className="p-6 overflow-x-hidden">
            {active === "dashboard" && <Dashboard />}
            {active === "bookings" && <BookingsManagement />}
            {active === "tours" && <Tours />}
            {active === "users" && <Users />}
            {active === "hotels" && <Hotels />}
            {active === "reviews" && <Reviews />}
            {active === "blog" && <BlogManagement />}
            {active === "messages" && <Messages />}
            {!["dashboard", "bookings", "tours", "users", "hotels", "reviews", "blog", "messages"].includes(active) && (
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
