import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    const fallback = user.role === 'owner' ? '/owner' : user.role === 'admin' ? '/dashboard' : '/login';
    return <Navigate to={fallback} replace />;
  }
  // Only owner/admin allowed
  if (!['owner', 'admin'].includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}
