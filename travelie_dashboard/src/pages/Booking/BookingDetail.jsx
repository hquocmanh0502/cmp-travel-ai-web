import React, { useEffect, useState } from "react";

export default function BookingDetail({ bookingId, setActive }) {
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    // 🔹 Nếu có API thì gọi thật:
    // fetch(`http://localhost:5000/api/bookings/${bookingId}`)
    //   .then((res) => res.json())
    //   .then((data) => setBooking(data));

    // 👉 Tạm mock data cho dễ test
    setBooking({
      id: bookingId,
      name: "John Doe",
      date: "2025-09-30",
      status: "Confirmed",
      location: "Hà Nội",
      email: "john@example.com",
      phone: "+84 123 456 789",
    });
  }, [bookingId]);

  if (!booking) return <p>Loading...</p>;

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <h2 className="text-xl font-bold mb-4">Booking Detail</h2>
      <p><b>ID:</b> {booking.id}</p>
      <p><b>Name:</b> {booking.name}</p>
      <p><b>Date:</b> {booking.date}</p>
      <p><b>Status:</b> {booking.status}</p>
      <p><b>Location:</b> {booking.location}</p>
      <p><b>Email:</b> {booking.email}</p>
      <p><b>Phone:</b> {booking.phone}</p>

      <button
        className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
        onClick={() => setActive("bookings")}
      >
        ← Back to Bookings
      </button>
    </div>
  );
}
