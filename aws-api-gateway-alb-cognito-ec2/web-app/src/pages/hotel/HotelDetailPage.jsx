/**
 * Hotel detail + book. Path can carry the room/date params from the search
 * page so "Book" lands here with everything pre-filled. The booking call
 * returns a pending row; the page then asks payments to create a Cashfree
 * order and would normally hand off to the SDK to complete checkout.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { hotel } from '../../api/index.js';
import { selectIsAuthed } from '../../store/slices/authSlice.js';

export default function HotelDetailPage() {
  const { idOrSlug } = useParams();
  const [search] = useSearchParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const authed = useSelector(selectIsAuthed);

  const [h, setH]     = useState(null);
  const [rooms, setRooms] = useState([]);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const presetRoomId = search.get('roomId') ?? '';
  const checkIn  = search.get('from') ?? '';
  const checkOut = search.get('to')   ?? '';

  const [form, setForm] = useState({
    roomId: presetRoomId,
    checkIn, checkOut,
    rooms:    Number(search.get('rooms')    ?? 1),
    adults:   Number(search.get('adults')   ?? 2),
    children: Number(search.get('children') ?? 0),
    guestFirst: '', guestLast: '', guestEmail: '', guestPhone: '',
  });

  useEffect(() => {
    (async () => {
      try {
        // Looks like a 24-hex Mongo ObjectId? then it's an id; otherwise slug.
        const isId = /^[a-f0-9]{24}$/i.test(idOrSlug);
        const data = isId ? await hotel.byId(idOrSlug) : await hotel.bySlug(idOrSlug);
        setH(data);
        const r = await hotel.rooms.list(data._id || data.id, { page: 1, pageSize: 50 });
        setRooms(r.items ?? []);
      } catch (e) { setErr(e.response?.data?.message || 'Hotel not found'); }
    })();
  }, [idOrSlug]);

  const selectedRoom = useMemo(() => rooms.find((r) => (r._id || r.id) === form.roomId), [rooms, form.roomId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!authed) return nav('/login');
    setErr(null); setBusy(true);
    try {
      const booking = await hotel.bookings.create({
        hotelId: h._id || h.id,
        roomId:  form.roomId,
        checkIn: form.checkIn, checkOut: form.checkOut,
        rooms: form.rooms, adults: form.adults, children: form.children,
        guests: [{ firstName: form.guestFirst, lastName: form.guestLast, email: form.guestEmail, phone: form.guestPhone || undefined }],
      });
      // Kick off Cashfree. In a real flow we'd then mount the Cashfree SDK
      // with the paymentSessionId — for this demo we just navigate to mine.
      try { await hotel.pay(booking._id || booking.id); } catch {}
      nav('/hotels/mine');
    } catch (e2) { setErr(e2.response?.data?.message || 'Could not book'); }
    finally { setBusy(false); }
  };

  if (err && !h) return <div className="page-shell"><p className="error">{err}</p><Link to="/hotels">← back to hotels</Link></div>;
  if (!h) return <div className="page-shell"><p className="muted">{t('common.loading')}</p></div>;

  return (
    <div className="page-shell two-col">
      <section>
        <h1>{h.name}</h1>
        <p className="muted">{h.city}, {h.country} · {'★'.repeat(h.starRating)}</p>
        {h.description && <p>{h.description}</p>}
        <h2>Rooms</h2>
        <ul className="rooms">
          {rooms.map((r) => (
            <li key={r._id || r.id} className={(r._id || r.id) === form.roomId ? 'active' : ''}
                onClick={() => setForm({ ...form, roomId: r._id || r.id })}>
              <strong>{r.name}</strong>
              <small className="muted"> · {r.bedType} · sleeps {r.capacity.adults}+{r.capacity.children}</small>
              <strong className="right">{r.currency} {(r.basePriceCents / 100).toLocaleString()} / night</strong>
            </li>
          ))}
          {rooms.length === 0 && <p className="muted">No rooms listed yet.</p>}
        </ul>
      </section>

      <aside className="book-card">
        <h3>Book this stay</h3>
        {err && <div className="error">{err}</div>}
        <form onSubmit={submit}>
          <label>Room
            <select value={form.roomId} required onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
              <option value="" disabled>Pick a room…</option>
              {rooms.map((r) => <option key={r._id || r.id} value={r._id || r.id}>{r.name}</option>)}
            </select>
          </label>
          <label>Check-in  <input type="date" required value={form.checkIn}  onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></label>
          <label>Check-out <input type="date" required value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></label>
          <div className="row">
            <label>Rooms    <input type="number" min="1" max="10" value={form.rooms}    onChange={(e) => setForm({ ...form, rooms:    Number(e.target.value) })} /></label>
            <label>Adults   <input type="number" min="1" max="20" value={form.adults}   onChange={(e) => setForm({ ...form, adults:   Number(e.target.value) })} /></label>
            <label>Children <input type="number" min="0" max="20" value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} /></label>
          </div>
          <fieldset>
            <legend>Lead guest</legend>
            <label>First name <input required value={form.guestFirst} onChange={(e) => setForm({ ...form, guestFirst: e.target.value })} /></label>
            <label>Last name  <input required value={form.guestLast}  onChange={(e) => setForm({ ...form, guestLast:  e.target.value })} /></label>
            <label>Email      <input type="email" required value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} /></label>
            <label>Phone      <input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} /></label>
          </fieldset>
          {selectedRoom && form.checkIn && form.checkOut && (
            <p className="quote">
              Quote:&nbsp;<strong>{selectedRoom.currency} {(((+new Date(form.checkOut) - +new Date(form.checkIn)) / 86_400_000 | 0) * selectedRoom.basePriceCents * form.rooms / 100).toLocaleString()}</strong>
            </p>
          )}
          <button className="btn btn-primary btn-block" disabled={busy || !form.roomId}>{busy ? '…' : 'Reserve + pay'}</button>
        </form>
      </aside>
    </div>
  );
}
