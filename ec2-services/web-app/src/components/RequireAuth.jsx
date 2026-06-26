import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthed } from '../store/slices/authSlice.js';

export default function RequireAuth({ children }) {
  const authed = useSelector(selectIsAuthed);
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}
