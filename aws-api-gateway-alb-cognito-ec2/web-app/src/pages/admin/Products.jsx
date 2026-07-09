import { useEffect, useState } from 'react';
import { ecom } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminProducts() {
  const { can } = useAuth();
  const [data, setData] = useState({ rows: [], count: 0 });
  const reload = () => ecom.products.list({ limit: 100 }).then(setData).catch(() => {});
  useEffect(() => { reload(); }, []);

  const create = async () => {
    const name = prompt('Product name?'); if (!name) return;
    const price = Number(prompt('Price?') || '0');
    const sku = `SKU-${Date.now().toString(36).toUpperCase()}`;
    await ecom.products.create({ name, price, sku, stock: 100 });
    reload();
  };

  return (
    <div className="page">
      <header className="page-head"><h1>Products</h1>
        {can('product:create') && <button className="primary" onClick={create}>+ New</button>}
      </header>
      <table className="table">
        <thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th></tr></thead>
        <tbody>{data.rows.map((p) => <tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>₹ {p.price}</td><td>{p.stock}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
