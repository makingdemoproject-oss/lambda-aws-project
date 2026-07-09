/**
 * Hotel search + catalog. Two modes:
 *   - Browse: simple list filtered by city/stars (no date window)
 *   - Search: enter check-in/out + guests → /bookings/availability returns
 *     only hotels with rooms free for the window, with priced totals.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hotel } from '../../api/index.js';

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export default function HotelsPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState('browse');
  const [filters, setFilters] = useState({ city: '', minStars: '' });
  const [search, setSearch] = useState({ city: '', checkIn: addDays(todayISO(), 7), checkOut: addDays(todayISO(), 9), adults: 2, children: 0, rooms: 1 });
  const [results, setResults] = useState({ items: [], total: 0 });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [mode]);

  const load = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode === 'browse') {
        const r = await hotel.list({ page: 1, pageSize: 20, city: filters.city || undefined, minStars: filters.minStars || undefined });
        setResults(r);
      } else {
        const r = await hotel.availability({ ...search });
        setResults(r);
      }
    } catch (e) { setErr(e.response?.data?.message || 'Could not load hotels'); }
    finally { setBusy(false); }
  };

  const items = useMemo(() => results.items ?? [], [results]);

  return (
    <div className="page-shell">
      <header className="page-head">
        <h1>{t('nav.hotels')}</h1>
        <div className="tabs">
          <button className={mode === 'browse' ? 'active' : ''} onClick={() => setMode('browse')}>Browse</button>
          <button className={mode === 'search' ? 'active' : ''} onClick={() => setMode('search')}>Find rooms by date</button>
        </div>
      </header>

      {mode === 'browse' ? (
        <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); void load(); }}>
          <label>City <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="Mumbai" /></label>
          <label>Min stars
            <select value={filters.minStars} onChange={(e) => setFilters({ ...filters, minStars: e.target.value })}>
              <option value="">Any</option><option value="3">3+</option><option value="4">4+</option><option value="5">5</option>
            </select>
          </label>
          <button className="btn btn-primary">Search</button>
        </form>
      ) : (
        <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); void load(); }}>
          <label>City <input value={search.city} onChange={(e) => setSearch({ ...search, city: e.target.value })} placeholder="Bengaluru" /></label>
          <label>Check-in  <input type="date" value={search.checkIn}  onChange={(e) => setSearch({ ...search, checkIn: e.target.value })} /></label>
          <label>Check-out <input type="date" value={search.checkOut} onChange={(e) => setSearch({ ...search, checkOut: e.target.value })} /></label>
          <label>Adults    <input type="number" min="1" max="20" value={search.adults}   onChange={(e) => setSearch({ ...search, adults:   Number(e.target.value) })} /></label>
          <label>Rooms     <input type="number" min="1" max="10" value={search.rooms}    onChange={(e) => setSearch({ ...search, rooms:    Number(e.target.value) })} /></label>
          <button className="btn btn-primary" disabled={!search.city}>Find rooms</button>
        </form>
      )}

      {err && <div className="error">{err}</div>}
      {busy && <p className="muted">{t('common.loading')}</p>}

      <div className="grid">
        {items.length === 0 && !busy && <p className="muted">No hotels match your filters yet.</p>}

        {mode === 'browse' && items.map((h) => (
          <Link key={h._id || h.id} to={`/hotels/${h.slug}`} className="card">
            {h.images?.[0] && <img src={h.images[0]} alt={h.name} loading="lazy" />}
            <div className="card-body">
              <h3>{h.name}</h3>
              <p className="muted">{h.city}, {h.country} · {'★'.repeat(h.starRating)}</p>
              <p className="ellipsis">{h.description?.slice(0, 120)}</p>
            </div>
          </Link>
        ))}

        {mode === 'search' && items.map((h) => (
          <article key={h.hotelId} className="card">
            <div className="card-body">
              <h3>{h.hotelName}</h3>
              <p className="muted">{h.city} · {'★'.repeat(h.starRating)}</p>
              <ul className="rooms">
                {h.rooms.map((r) => (
                  <li key={r.roomId} className="row-between">
                    <div>
                      <strong>{r.name}</strong>
                      <small className="muted"> · {r.bedType} · sleeps {r.capacity.adults}+{r.capacity.children}</small>
                    </div>
                    <div className="right">
                      <strong>{r.currency} {(r.totalCents / 100).toLocaleString()}</strong>
                      <small className="muted"> for {r.nights} night{r.nights > 1 ? 's' : ''}</small>
                      <Link to={`/hotels/${h.hotelId}?roomId=${r.roomId}&from=${search.checkIn}&to=${search.checkOut}&rooms=${search.rooms}&adults=${search.adults}&children=${search.children}`}
                            className="btn btn-primary btn-sm">Book</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
