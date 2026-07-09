import { useEffect, useRef, useState } from 'react';
import { geocode } from '../api/index.js';

/**
 * Address auto-suggest using free OpenStreetMap Nominatim.
 *
 * Nominatim usage policy: 1 req/sec, must send a User-Agent. We debounce 400ms
 * which is plenty for a single user — for high-volume production you'd run
 * your own Nominatim instance or switch to a paid geocoder.
 */
export default function PlaceSearch({ label, value, onChange, onPick, placeholder }) {
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState([]);
  const debounce = useRef(null);

  useEffect(() => {
    if (!value || value.length < 3) { setItems([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try { setItems(await geocode.search(value)); } catch { setItems([]); }
    }, 400);
  }, [value]);

  return (
    <div className="place-search">
      {label && <label className="field-label">{label}</label>}
      <input
        className="input"
        placeholder={placeholder || 'Search a place…'}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && items.length > 0 && (
        <ul className="suggestions">
          {items.slice(0, 6).map((it) => (
            <li
              key={it.place_id}
              onMouseDown={() => { onPick({ lat: Number(it.lat), lng: Number(it.lon), address: it.display_name }); setOpen(false); }}
            >
              📍 {it.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
