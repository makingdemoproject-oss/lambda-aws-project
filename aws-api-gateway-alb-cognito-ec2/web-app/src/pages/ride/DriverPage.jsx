import { useEffect, useRef, useState } from 'react';
import { ride as rideApi } from '../../api/index.js';
import { connectRideSocket, disconnectRideSocket } from '../../sockets/rideSocket.js';
import MapView from '../../components/MapView.jsx';

/**
 * Driver dashboard — go online, see incoming requests, accept/start/complete.
 *
 *   - When "online" is on, we stream the browser's geolocation to the
 *     server every 8 seconds. The driver's car icon then shows up on
 *     riders' maps via the broadcast.
 *   - Incoming ride requests arrive via the socket (`ride:requested`).
 *   - The driver picks one and walks through the lifecycle:
 *       accept → arrived → start → complete.
 */
const DEFAULT_CENTER = [19.0760, 72.8777];

export default function DriverPage() {
  const [profile, setProfile] = useState(null);
  const [online, setOnline]   = useState(false);
  const [pos, setPos]         = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [active, setActive]   = useState(null);
  const [err, setErr]         = useState(null);
  const socketRef = useRef(null);
  const watchId = useRef(null);

  useEffect(() => {
    rideApi.driver.me()
      .then((p) => { setProfile(p); setOnline(p.isOnline); })
      .catch(() => {});
    const s = connectRideSocket();
    socketRef.current = s;

    s.on('ride:requested', (r) => setIncoming((prev) => [r, ...prev.filter((x) => x.id !== r.id)]));
    s.on('ride:cancelled', (r) => {
      setIncoming((prev) => prev.filter((x) => x.id !== r.id));
      if (active?.id === r.id) setActive(r);
    });

    return () => { disconnectRideSocket(); stopWatch(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopWatch = () => {
    if (watchId.current) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
  };

  const goOnline = async (next) => {
    setErr(null);
    if (next && !navigator.geolocation) { setErr('Geolocation not available'); return; }
    if (next) {
      // Start streaming location
      watchId.current = navigator.geolocation.watchPosition(
        async (p) => {
          const lat = p.coords.latitude, lng = p.coords.longitude;
          setPos([lat, lng]);
          // Throttle DB writes to ~8s via the controller — we just emit each fix
          socketRef.current?.emit('driver:location', {
            rideId: active?.id, lat, lng, bearing: p.coords.heading, speedMps: p.coords.speed,
          });
        },
        (e) => setErr(e.message),
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 },
      );
      const p = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true }));
      await rideApi.driver.online({ isOnline: true, lat: p.coords.latitude, lng: p.coords.longitude });
    } else {
      stopWatch();
      await rideApi.driver.online({ isOnline: false });
    }
    setOnline(next);
  };

  const action = async (fn, ...args) => {
    try {
      const r = await fn(...args);
      setActive(r);
      setIncoming((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) { setErr(e.response?.data?.message || e.message); }
  };

  return (
    <div className="ride-shell">
      <aside className="ride-panel">
        <header className="panel-head">
          <h1>Driver dashboard</h1>
          {profile ? (
            <p className="muted">{profile.vehicleMake} {profile.vehicleModel} · {profile.plate || 'no plate'}</p>
          ) : (
            <p className="muted">Set up your vehicle profile to start driving.</p>
          )}
        </header>

        {err && <div className="error">{err}</div>}

        <div className="online-toggle">
          <label>
            <input type="checkbox" checked={online} onChange={(e) => goOnline(e.target.checked)} />
            <span><strong>{online ? 'Online — looking for rides' : 'Offline'}</strong></span>
          </label>
          {pos && <small className="muted">Location: {pos[0].toFixed(4)}, {pos[1].toFixed(4)}</small>}
        </div>

        {/* Incoming ride requests */}
        <section>
          <div className="section-title">Incoming requests {incoming.length > 0 && <span className="badge">{incoming.length}</span>}</div>
          {incoming.length === 0 && <p className="muted">Waiting for ride requests near you…</p>}
          {incoming.map((r) => (
            <div key={r.id} className="ride-card">
              <div className="row-between">
                <strong>{r.pickupAddress?.split(',')[0] || `(${r.pickupLat.toFixed(3)}, ${r.pickupLng.toFixed(3)})`}</strong>
                <span className="muted">{r.currency} {(r.fareCents || 0) / 100}</span>
              </div>
              <p className="muted ellipsis">{r.dropoffAddress || 'destination'}</p>
              <button className="btn btn-primary btn-block" onClick={() => action(rideApi.driver.accept, r.id)}>Accept</button>
            </div>
          ))}
        </section>

        {/* Active ride controls */}
        {active && (
          <section>
            <div className="section-title">Active ride · <span className={`badge status-${active.status}`}>{active.status.replace('_', ' ')}</span></div>
            <div className="kv">
              <div><span className="muted">From</span><div>{active.pickupAddress}</div></div>
              <div><span className="muted">To</span><div>{active.dropoffAddress}</div></div>
            </div>
            <div className="driver-actions">
              {active.status === 'accepted'    && <button className="btn btn-secondary" onClick={() => action(rideApi.driver.arrived, active.id)}>I&apos;ve arrived</button>}
              {active.status === 'arrived'     && <button className="btn btn-secondary" onClick={() => action(rideApi.driver.start,   active.id)}>Start trip</button>}
              {active.status === 'in_progress' && <button className="btn btn-primary"   onClick={() => action(rideApi.driver.complete, active.id, {})}>Complete</button>}
            </div>
          </section>
        )}
      </aside>

      <section className="ride-map">
        <MapView center={pos || DEFAULT_CENTER} driver={pos} height="100%" />
      </section>
    </div>
  );
}
