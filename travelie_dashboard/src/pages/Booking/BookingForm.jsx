import React, { useState } from "react";

const BookingForm = ({ onAdd }) => {
  const [form, setForm] = useState({ name: "", date: "", status: "Pending" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ ...form, id: Date.now() });
    setForm({ name: "", date: "", status: "Pending" });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 shadow rounded">
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
        className="border p-2 mr-2"
        required
      />
      <input
        type="date"
        name="date"
        value={form.date}
        onChange={handleChange}
        className="border p-2 mr-2"
        required
      />
      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className="border p-2 mr-2"
      >
        <option value="Pending">Pending</option>
        <option value="Confirmed">Confirmed</option>
      </select>
      <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded">
        Add
      </button>
    </form>
  );
};

export default BookingForm;
