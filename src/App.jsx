import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import RequestAccess from './pages/RequestAccess';
import OwnerDashboard from './pages/OwnerDashboard';
import Dashboard from './pages/Dashboard';
import Roles from './pages/Roles';
import StaffList from './pages/StaffList';
import StaffForm from './pages/StaffForm';
import StaffView from './pages/StaffView';
import Advances from './pages/Advances';
import Attendance from './pages/Attendance';
import Payslip from './pages/Payslip';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'owner') return <Navigate to="/owner" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/request-access" element={<RequestAccess />} />

          <Route path="/owner" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />

          {/* Admin-only restaurant/staff management */}
          <Route path="/dashboard" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
          <Route path="/roles" element={<ProtectedRoute role="admin"><Roles /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute role="admin"><StaffList /></ProtectedRoute>} />
          <Route path="/staff/new" element={<ProtectedRoute role="admin"><StaffForm mode="create" /></ProtectedRoute>} />
          <Route path="/staff/:id" element={<ProtectedRoute role="admin"><StaffView /></ProtectedRoute>} />
          <Route path="/staff/:id/edit" element={<ProtectedRoute role="admin"><StaffForm mode="edit" /></ProtectedRoute>} />
          <Route path="/advances" element={<ProtectedRoute role="admin"><Advances /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute role="admin"><Attendance /></ProtectedRoute>} />
          <Route path="/payslip" element={<ProtectedRoute role="admin"><Payslip /></ProtectedRoute>} />

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
