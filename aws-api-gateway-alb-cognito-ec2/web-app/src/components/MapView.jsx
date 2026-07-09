import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix the default marker icon that Webpack/Vite strips from the leaflet CSS
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl, shadowUrl });

const carIcon = new L.DivIcon({
  className: 'driver-pin',
  html: '<div class="pin-body">🚗</div>',
  iconSize: [32, 32], iconAnchor: [16, 16],
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom(), { animate: true }); }, [center, map]);
  return null;
}

/**
 * Generic map view. `center` is required. `pickup`, `dropoff`, `driver` and
 * `polyline` are optional — pass what you have.
 *
 * Tiles: free OpenStreetMap (attribution required by their TOS — already
 * baked into TileLayer's default `attribution` if you don't override).
 */
export default function MapView({ center, pickup, dropoff, driver, polyline, height = 380 }) {
  return (
    <div className="map-shell" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        {pickup  && <Marker position={pickup}  />}
        {dropoff && <Marker position={dropoff} />}
        {driver  && <Marker position={driver}  icon={carIcon} />}
        {polyline?.length > 1 && <Polyline positions={polyline} weight={4} />}
      </MapContainer>
    </div>
  );
}
