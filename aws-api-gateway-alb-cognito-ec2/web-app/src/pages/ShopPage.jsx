import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ecom } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ShopPage() {
  const { user, logout, can } = useAuth();
  const [data, setData] = useState({ rows: [], count: 0 });
  const [q, setQ] = useState('');
  useEffect(() => { ecom.products.list({ q, limit: 24 }).then(d => setData(d || { rows: [], count: 0 })).catch(() => {}); }, [q]);

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
            <Link to="/aws-demo">AWS Demo</Link>
            <Link to="/s3-demo">S3 Demo</Link>
            <button className="link" onClick={logout}>Logout ({user.firstName || user.email})</button>
          </>) : (<>
            <Link to="/aws-demo">AWS Demo</Link>
            <Link to="/s3-demo">S3 Demo</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </>)}
        </nav>
      </header>
      <div style={{ display:'flex', gap:12, padding:'12px 16px', background:'#1e293b', borderBottom:'1px solid #334155' }}>
        <Link to="/aws-demo" style={{ flex:1, display:'block', background:'#4f46e5', color:'#fff', textAlign:'center', padding:'12px', borderRadius:8, textDecoration:'none', fontWeight:600, fontSize:14 }}>
          Lambda Authorizer + RDS Demo
        </Link>
        <Link to="/s3-demo" style={{ flex:1, display:'block', background:'#0ea5e9', color:'#fff', textAlign:'center', padding:'12px', borderRadius:8, textDecoration:'none', fontWeight:600, fontSize:14 }}>
          S3 → SQS → Lambda → DynamoDB
        </Link>
        <Link to="/eventbridge" style={{ flex:1, display:'block', background:'#7c3aed', color:'#fff', textAlign:'center', padding:'12px', borderRadius:8, textDecoration:'none', fontWeight:600, fontSize:14 }}>
          EventBridge → Lambda / SQS / SNS / ECS
        </Link>
      </div>
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
