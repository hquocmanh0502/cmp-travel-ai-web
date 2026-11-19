import { useEffect, useState } from 'react';
import { MdAdd, MdDelete } from 'react-icons/md';
import { toast } from 'react-hot-toast';

const API = 'http://localhost:3000/api/admin/tours';

/**
 * Chuyen khoi hanh cua mot tour - chinh la danh sach "Departure" khach thay o
 * trang chi tiet va SmartTour dung de ghep tour. Ngay ket thuc va gia theo mua
 * do server tinh (cung cong thuc voi web), admin chi nhap ngay di + so ghe.
 */
export default function DeparturesPanel({ tourId }) {
  const [rows, setRows] = useState([]);
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newSlots, setNewSlots] = useState(20);
  const [busy, setBusy] = useState(false);

  const call = async (url, options) => {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await call(`${API}/${tourId}/departures`);
      setRows(data.data);
      setDays(data.durationDays);
    } catch (err) {
      toast.error(`Could not load departures: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tourId]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const data = await fn();
      setRows(data.data);
      if (okMsg) toast.success(okMsg);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    if (!newDate) return;
    run(() => call(`${API}/${tourId}/departures`, {
      method: 'POST', body: JSON.stringify({ startDate: newDate, slots: newSlots })
    }), `Departure ${newDate} added`).then(() => setNewDate(''));
  };

  const saveSlots = (row, value) => {
    const seats = parseInt(value, 10);
    if (seats === row.availableSlots || Number.isNaN(seats)) return;
    run(() => call(`${API}/${tourId}/departures/${row._id}`, {
      method: 'PATCH', body: JSON.stringify({ availableSlots: seats })
    }), 'Seats updated');
  };

  const remove = (row) => {
    if (!window.confirm(`Delete departure ${row.startDate}?`)) return;
    run(() => call(`${API}/${tourId}/departures/${row._id}`, { method: 'DELETE' }), 'Departure deleted');
  };

  const today = new Date().toISOString().slice(0, 10);
  const money = (n) => `$${Math.round(n || 0).toLocaleString('en-US')}`;

  // Enter trong o nhap se submit form tour ben ngoai -> chan, va blur de luu so ghe
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <div className="space-y-6" onKeyDown={onKeyDown}>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        These are the departures customers pick on the tour page and that Smart Tour uses to combine tours.
        End date (start + {days ?? '?'} days − 1) and seasonal price are calculated by the server.
        Departures without a guide can be assigned with <code>scripts/build-guide-schedule.js --no-stagger</code>.
      </div>

      {/* div, khong phai form: panel nam trong <form> cua modal tour (form long nhau khong hop le) */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
          <input type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
          <input type="number" min="1" max="200" value={newSlots} onChange={(e) => setNewSlots(e.target.value)}
            className="w-28 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <button type="button" onClick={add} disabled={busy || !newDate}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <MdAdd /> Add departure
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading departures…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">No departures yet. Customers cannot book this tour until you add one.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Dates</th>
                <th className="px-3 py-2 text-right">Adult price</th>
                <th className="px-3 py-2 text-right">Booked seats</th>
                <th className="px-3 py-2 text-right">Seats left</th>
                <th className="px-3 py-2 text-left">Guide</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const past = row.startDate < today;
                return (
                  <tr key={row._id} className={`border-t ${past ? 'text-gray-400' : ''}`}>
                    <td className="px-3 py-2 whitespace-nowrap">{row.startDate} → {row.endDate}{past ? ' (past)' : ''}</td>
                    <td className="px-3 py-2 text-right">{money(row.price)}</td>
                    <td className="px-3 py-2 text-right">{row.bookedSeats} ({row.bookings} booking{row.bookings === 1 ? '' : 's'})</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min="0" max="200" defaultValue={row.availableSlots} disabled={busy || past}
                        key={`${row._id}-${row.availableSlots}`}
                        onBlur={(e) => saveSlots(row, e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right" />
                    </td>
                    <td className="px-3 py-2">{row.hasGuide ? 'Assigned' : <span className="text-orange-600">None</span>}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => remove(row)} disabled={busy || row.bookings > 0}
                        title={row.bookings > 0 ? 'Has bookings - cancel them first' : 'Delete departure'}
                        className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-30">
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
