import React from "react";

const BookingTable = ({ bookings, onEdit, onDelete }) => (
  <table className="table-auto w-full border border-gray-300">
    <thead className="bg-gray-100">
      <tr>
        <th className="border px-4 py-2">#</th>
        <th className="border px-4 py-2">Name</th>
        <th className="border px-4 py-2">Date</th>
        <th className="border px-4 py-2">Status</th>
        <th className="border px-4 py-2">Actions</th>
      </tr>
    </thead>
    <tbody>
      {bookings.map((b, i) => (
        <tr key={b.id}>
          <td className="border px-4 py-2">{i + 1}</td>
          <td className="border px-4 py-2">{b.name}</td>
          <td className="border px-4 py-2">{b.date}</td>
          <td className="border px-4 py-2">{b.status}</td>
          <td className="border px-4 py-2">
            <button onClick={() => onEdit(b.id)} className="bg-blue-500 text-white px-2 py-1 mr-2 rounded">Edit</button>
            <button onClick={() => onDelete(b.id)} className="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default BookingTable;
