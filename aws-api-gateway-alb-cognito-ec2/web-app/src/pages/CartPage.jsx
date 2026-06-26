import { useEffect, useState } from 'react';
import { ecom } from '../api/index.js';
import { useNavigate } from 'react-router-dom';

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [addresses, setAddresses] = useState([]);
  const [addrId, setAddrId] = useState('');
  const nav = useNavigate();

  const reload = () => ecom.cart.view().then(setCart).catch(() => {});
  useEffect(() => {
    reload();
    ecom.addresses.list().then((a) => { setAddresses(a); setAddrId(a[0]?.id || ''); }).catch(() => {});
  }, []);

  const update = async (id, q) => { await ecom.cart.update(id, { quantity: q }); reload(); };
  const remove = async (id) => { await ecom.cart.remove(id); reload(); };
  const checkout = async () => {
    if (!addrId) return alert('Add a shipping address');
    await ecom.orders.place({ addressId: addrId, paymentProvider: 'cod' });
    nav('/orders');
  };

  return (
    <div className="cart-page">
      <h1>Your cart</h1>
      {cart.items.length === 0 ? <div className="empty">Cart is empty.</div> : (
        <table className="table">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th></th></tr></thead>
          <tbody>
            {cart.items.map((i) => (
              <tr key={i.id}>
                <td>{i.product?.name}</td>
                <td>
                  <button onClick={() => update(i.id, i.quantity - 1)}>−</button> {i.quantity}{' '}
                  <button onClick={() => update(i.id, i.quantity + 1)}>+</button>
                </td>
                <td>₹ {Number(i.unitPrice) * i.quantity}</td>
                <td><button className="link danger" onClick={() => remove(i.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="totals">
        <div>Subtotal: ₹ {cart.subtotal}</div>
        {addresses.length > 0 && (
          <select value={addrId} onChange={(e) => setAddrId(e.target.value)}>
            {addresses.map((a) => <option key={a.id} value={a.id}>{a.label || a.fullName} — {a.city}</option>)}
          </select>
        )}
        <button className="primary" disabled={!cart.items.length || !addrId} onClick={checkout}>Place order (COD)</button>
      </div>
    </div>
  );
}
