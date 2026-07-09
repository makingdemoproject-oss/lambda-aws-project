import { useEffect, useState } from 'react';
import { ecom } from '../api/index.js';

export default function OrdersPage() {
  const [data, setData] = useState({ rows: [], count: 0 });
  useEffect(() => { ecom.orders.listMine().then(setData).catch(() => {}); }, []);
  return (
    <div className="cart-page">
      <h1>Your orders</h1>
      {data.count === 0 ? <div className="empty">No orders yet.</div> : (
        <table className="table">
          <thead><tr><th>Order #</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead>
          <tbody>
            {data.rows.map((o) => (
              <tr key={o.id}><td>{o.orderNumber}</td><td>{o.status}</td><td>₹ {o.total}</td><td>{new Date(o.createdAt).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
