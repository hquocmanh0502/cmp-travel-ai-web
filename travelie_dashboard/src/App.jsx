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

export default function App() {
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    document.title = "Travelie • " + (active[0].toUpperCase() + active.slice(1));
  }, [active]);

  const title = active === "dashboard" ? "Dashboard" : active[0].toUpperCase() + active.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <div className="max-w-[1400px] mx-auto flex gap-6">
        <Sidebar active={active} setActive={setActive} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header title={title} />
          <main className="p-6">
            {active === "dashboard" && <Dashboard />}
            {active === "bookings" && <BookingsManagement />}
            {active === "tours" && <Tours />}
            {active === "users" && <Users />}
            {active === "hotels" && <Hotels />}
            {active === "reviews" && <Reviews />}
            {active === "messages" && <Messages />}
            {!["dashboard", "bookings", "tours", "users", "hotels", "reviews", "messages"].includes(active) && (
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
