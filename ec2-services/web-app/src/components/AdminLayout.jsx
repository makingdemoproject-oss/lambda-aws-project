import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, logout } from '../store/slices/authSlice.js';
import { selectMenu } from '../store/slices/menuSlice.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const Tree = ({ items }) => (
  <ul>
    {items.map((i) => (
      <li key={i.id || i.key}>
        {i.path ? <NavLink to={i.path}>{i.label}</NavLink> : <span className="group">{i.label}</span>}
        {i.children?.length > 0 && <Tree items={i.children} />}
      </li>
    ))}
  </ul>
);

export default function AdminLayout() {
  const user = useSelector(selectUser);
  const menu = useSelector(selectMenu);
  const dispatch = useDispatch();
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="brand"><Link to="/admin">Admin</Link></div>
        <nav><Tree items={menu} /></nav>
        <div className="who">
          <div>{user?.email}</div>
          <div className="muted">{(user?.roleKeys || []).join(', ')}</div>
          <LanguageSwitcher />
          <button className="link" onClick={() => dispatch(logout())}>Logout</button>
        </div>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}
