import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ecom } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ShopPage() {
  const { user, logout, can } = useAuth();
  const [data, setData] = useState({ rows: [], count: 0 });
  const [q, setQ] = useState('');
  useEffect(() => { ecom.products.list({ q, limit: 24 }).then(setData).catch(() => {}); }, [q]);

  const add = async (id) => { try { await ecom.cart.add({ productId: id, quantity: 1 }); alert('Added'); } catch (e) { alert(e.response?.data?.message); } };

  return (
    <div className="shop">
      <header className="shop-head">
        <Link to="/" className="brand">ShopSphere</Link>
        <input className="search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        <nav>
          {user ? (<>
            <Link to="/cart">Cart</Link>
            <Link to="/orders">Orders</Link>
            {can('chat:use') && <Link to="/chat">Messages</Link>}
            {can('product:read') && <Link to="/admin">Admin</Link>}
            <button className="link" onClick={logout}>Logout ({user.firstName || user.email})</button>
          </>) : (<>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </>)}
        </nav>
      </header>
      <main className="grid">
        {(data.rows || []).map((p) => (
          <div key={p.id} className="card">
            <div className="thumb">{p.images?.[0] && <img src={p.images[0]} alt={p.name} />}</div>
            <div className="name">{p.name}</div>
            <div className="price">{p.currency} {p.price}</div>
            {user && <button className="primary" onClick={() => add(p.id)}>Add to cart</button>}
          </div>
        ))}
        {data.count === 0 && <div className="empty">No products yet.</div>}
      </main>
    </div>
  );
}
