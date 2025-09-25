/* import React, { useState, useEffect } from "react";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", date: "", status: "" });

  // 🔹 gọi API khi load trang
  useEffect(() => {
    fetch("http://localhost:5000/api/bookings")
      .then((res) => res.json())
      .then((data) => setBookings(data))
      .catch((err) => console.error(err));
  }, []);

  const handleSave = () => {
    fetch(`http://localhost:5000/api/bookings/${editing}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(() =>
        setBookings(
          bookings.map((b) => (b.id === editing ? { ...form, id: editing } : b))
        )
      )
      .then(() => {
        setEditing(null);
        setForm({ name: "", date: "", status: "" });
      });
  };

  const handleDelete = (id) => {
    fetch(`http://localhost:5000/api/bookings/${id}`, {
      method: "DELETE",
    }).then(() => setBookings(bookings.filter((b) => b.id !== id)));
  };
*/

import React, { useState } from "react";

export default function Bookings({ setActive, setSelectedBooking }) {
  const [bookings, setBookings] = useState([
    { id: 1, name: "John Doe", date: "2025-09-30", status: "Confirmed" },
    { id: 2, name: "Jane Smith", date: "2025-10-02", status: "Pending" },
    { id: 3, name: "Michael Brown", date: "2025-10-05", status: "Cancelled" },
  ]);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", date: "", status: "" });

  // 🔹 State tìm kiếm
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState(bookings);

  const handleEdit = (booking) => {
    setEditing(booking.id);
    setForm(booking);
  };

  const handleSave = () => {
    if (!form.name || !form.date) return alert("Please fill all fields");

    setBookings(
      bookings.map((b) => (b.id === editing ? { ...form, id: editing } : b))
    );
    setFiltered(
      filtered.map((b) => (b.id === editing ? { ...form, id: editing } : b))
    );

    setEditing(null);
    setForm({ name: "", date: "", status: "" });
  };

  const handleDelete = (id) => {
    setBookings(bookings.filter((b) => b.id !== id));
    setFiltered(filtered.filter((b) => b.id !== id));
  };

  const handleSearch = () => {
    if (search.trim() === "") {
      setFiltered(bookings); // reset nếu không nhập gì
    } else {
      setFiltered(
        bookings.filter((b) =>
          b.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  };

  const handleReset = () => {
    setSearch("");
    setFiltered(bookings);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <h2 className="text-xl font-bold mb-4">Bookings</h2>

      {/* 🔹 Thanh tìm kiếm */}
      <div className="mb-4 flex gap-2">
        <input
          className="border p-2 flex-1 rounded"
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="px-3 py-1 bg-blue-500 text-white rounded"
          onClick={handleSearch}
        >
          Search
        </button>
        <button
          className="px-3 py-1 bg-gray-400 text-white rounded"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      {/* 🔹 Form Edit */}
      {editing && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="font-bold mb-2">Edit Booking</h3>
          <div className="flex gap-2">
            <input
              className="border p-2 flex-1"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
            />
            <input
              className="border p-2"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <select
              className="border p-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Confirmed</option>
              <option>Pending</option>
              <option>Cancelled</option>
            </select>
            <button
              className="px-3 py-1 bg-green-500 text-white rounded"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="px-3 py-1 bg-gray-400 text-white rounded"
              onClick={() => {
                setEditing(null);
                setForm({ name: "", date: "", status: "" });
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 🔹 Bảng Booking */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 ? (
            filtered.map((b) => (
              <tr key={b.id} className="text-center">
                <td className="p-2 border">{b.id}</td>
                <td className="p-2 border">{b.name}</td>
                <td className="p-2 border">{b.date}</td>
                <td className="p-2 border">{b.status}</td>
                <td className="p-2 border">
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded mr-2"
                    onClick={() => handleEdit(b)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded mr-2"
                    onClick={() => {
                      setSelectedBooking(b.id);
                      setActive("bookingDetail"); // 👉 chuyển sang trang chi tiết
                    }}
                  >
                    Detail
                  </button>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleDelete(b.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="p-4 text-center text-gray-500">
                No bookings found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
