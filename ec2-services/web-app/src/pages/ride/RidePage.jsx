import { useEffect, useRef, useState } from 'react';
import { ride as rideApi, geocode } from '../../api/index.js';
import { connectRideSocket, disconnectRideSocket } from '../../sockets/rideSocket.js';
import MapView from '../../components/MapView.jsx';
import PlaceSearch from '../../components/PlaceSearch.jsx';

/**
 * Rider experience — one screen with everything:
 *   1. Empty state: search pickup + dropoff, see fare estimate, request ride.
 *   2. Live state: shows the assigned driver, their car icon on the map,
 *      status badge + cancel button. Updates in real time via the socket.
 *   3. Completed state: shows summary + "Pay with Cashfree" button.
 */
const DEFAULT_CENTER = [19.0760, 72.8777];   // Mumbai

export default function RidePage() {
  const [pickup, setPickup]   = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [pickupQ, setPickupQ]   = useState('');
  const [dropoffQ, setDropoffQ] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [driverPos, setDriverPos]   = useState(null);
  const [err, setErr]   = useState(null);
  const [busy, setBusy] = useState(false);
  const socketRef = useRef(null);

  // Try to centre on the user's actual location (free, browser geolocation)
  const [center, setCenter] = useState(DEFAULT_CENTER);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setCenter(c);
        try {
          const r = await geocode.reverse(c[0], c[1]);
          if (r?.display_name) { setPickup({ lat: c[0], lng: c[1], address: r.display_name }); setPickupQ(r.display_name); }
        } catch {}
      },
      () => { /* ignore — user denied geolocation */ },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  // Socket — listen for ride events targeted at this user
  useEffect(() => {
    const s = connectRideSocket();
    socketRef.current = s;

    const onAccepted  = (r) => setActiveRide(r);
    const onArrived   = (r) => setActiveRide(r);
    const onStarted   = (r) => setActiveRide(r);
    const onCompleted = (r) => setActiveRide(r);
    const onCancelled = (r) => setActiveRide(r);
    const onLocation  = ({ rideId, lat, lng }) => {
      if (activeRide && rideId === activeRide.id) setDriverPos([lat, lng]);
    };

    s.on('ride:accepted',  onAccepted);
    s.on('ride:arrived',   onArrived);
    s.on('ride:started',   onStarted);
    s.on('ride:completed', onCompleted);
    s.on('ride:cancelled', onCancelled);
    s.on('ride:location',  onLocation);

    return () => { disconnectRideSocket(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-estimate when both endpoints are set
  useEffect(() => {
    if (!pickup || !dropoff) { setEstimate(null); return; }
    (async () => {
      try {
        const e = await rideApi.estimate({
          pickupLat: pickup.lat, pickupLng: pickup.lng,
          dropoffLat: dropoff.lat, dropoffLng: dropoff.lng,
        });
        setEstimate(e);
      } catch {}
    })();
  }, [pickup, dropoff]);

  const book = async () => {
    if (!pickup || !dropoff) return;
    setErr(null); setBusy(true);
    try {
      const { ride } = await rideApi.request({
        pickupLat: pickup.lat,  pickupLng: pickup.lng,  pickupAddress: pickup.address,
        dropoffLat: dropoff.lat, dropoffLng: dropoff.lng, dropoffAddress: dropoff.address,
      });
      setActiveRide(ride);
      socketRef.current?.emit('ride:watch', { rideId: ride.id });
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!activeRide) return;
    try {
      const r = await rideApi.cancel(activeRide.id, 'Changed my mind');
      setActiveRide(r);
    } catch (e) { setErr(e.response?.data?.message || e.message); }
  };

  const payNow = async () => {
    const { paymentSessionId } = await rideApi.pay(activeRide.id);
    // In a real app: load Cashfree drop-in SDK and pass paymentSessionId.
    // Here we just hint at the next step.
    alert(`Payment session created. Use sessionId in Cashfree drop-in SDK:\n${paymentSessionId}`);
  };

  return (
    <div className="ride-shell">
      <aside className="ride-panel">
        <header className="panel-head">
          <h1>Book a ride</h1>
          <p className="muted">Powered by OpenStreetMap — your location is used only to set the pickup.</p>
        </header>

        {err && <div className="error">{err}</div>}

        {!activeRide && (
          <>
            <PlaceSearch
              label="Pickup"
              placeholder="Where from?"
              value={pickupQ}
              onChange={setPickupQ}
              onPick={(p) => { setPickup(p); setPickupQ(p.address); }}
            />
            <PlaceSearch
              label="Dropoff"
              placeholder="Where to?"
              value={dropoffQ}
              onChange={setDropoffQ}
              onPick={(p) => { setDropoff(p); setDropoffQ(p.address); }}
            />

            {estimate && (
              <div className="fare-card">
                <div className="row-between">
                  <span>{(estimate.distanceMeters / 1000).toFixed(1)} km</span>
                  <span>{Math.round(estimate.durationSeconds / 60)} min</span>
                </div>
                <div className="fare-big">{estimate.currency} {estimate.fare}</div>
                <small className="muted">
                  Base ₹{estimate.breakdown.base} · ₹{estimate.breakdown.perKm}/km · ₹{estimate.breakdown.perMin}/min · min ₹{estimate.breakdown.minimum}
                </small>
              </div>
            )}

            <button className="btn btn-primary btn-block" disabled={!estimate || busy} onClick={book}>
              {busy ? 'Finding drivers…' : 'Book ride'}
            </button>
          </>
        )}

        {activeRide && (
          <div className="ride-status">
            <div className="badge-row">
              <span className={`badge status-${activeRide.status}`}>{activeRide.status.replace('_', ' ')}</span>
              {activeRide.driverId && <span className="badge">Driver assigned</span>}
            </div>
            <div className="kv">
              <div><span className="muted">Pickup</span><div>{activeRide.pickupAddress || `${activeRide.pickupLat.toFixed(4)}, ${activeRide.pickupLng.toFixed(4)}`}</div></div>
              <div><span className="muted">Dropoff</span><div>{activeRide.dropoffAddress || `${activeRide.dropoffLat.toFixed(4)}, ${activeRide.dropoffLng.toFixed(4)}`}</div></div>
              <div><span className="muted">Fare</span><div>{activeRide.currency} {(activeRide.fareCents || 0) / 100}</div></div>
            </div>

            {activeRide.status === 'completed' ? (
              <button className="btn btn-primary btn-block" onClick={payNow}>Pay with Cashfree</button>
            ) : ['requested', 'accepted', 'arrived'].includes(activeRide.status) ? (
              <button className="btn btn-ghost btn-block" onClick={cancel}>Cancel ride</button>
            ) : null}
          </div>
        )}
      </aside>

      <section className="ride-map">
        <MapView
          center={driverPos || (pickup ? [pickup.lat, pickup.lng] : center)}
          pickup={pickup ? [pickup.lat, pickup.lng] : null}
          dropoff={dropoff ? [dropoff.lat, dropoff.lng] : null}
          driver={driverPos}
          height="100%"
        />
      </section>
    </div>
  );
}
