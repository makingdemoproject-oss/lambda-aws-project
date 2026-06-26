import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hotel } from '../../api/index.js';

export default function MyHotelBookingsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [err, setErr]   = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void load(1); }, []);

  const load = async (page) => {
    setBusy(true); setErr(null);
    try { setData(await hotel.bookings.listMine({ page, pageSize: 20 })); }
    catch (e) { setErr(e.response?.data?.message || t('errors.generic')); }
    finally { setBusy(false); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this booking? Refunds are processed if eligible.')) return;
    try { await hotel.bookings.cancel(id, 'Cancelled from dashboard'); await load(data.page); }
    catch (e) { setErr(e.response?.data?.message || 'Cancel failed'); }
  };

  return (
    <div className="page-shell">
      <h1>My hotel bookings</h1>
      {err && <div className="error">{err}</div>}
      {busy && <p className="muted">{t('common.loading')}</p>}

      <table className="table">
        <thead><tr><th>Hotel</th><th>Window</th><th>Rooms / guests</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {data.items.map((b) => (
            <tr key={b._id || b.id}>
              <td>{b.hotelId?.toString().slice(0, 8) || '—'}</td>
              <td>{new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}</td>
              <td>{b.rooms} room · {b.adults}+{b.children} guests</td>
              <td>{b.currency} {(b.totalCents / 100).toLocaleString()}</td>
              <td><span className={`badge status-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
              <td>
                {['pending_payment', 'confirmed'].includes(b.status) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => cancel(b._id || b.id)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
          {data.items.length === 0 && !busy && (
            <tr><td colSpan="6" className="muted center">
              No bookings yet — <Link to="/hotels">browse hotels</Link>
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
