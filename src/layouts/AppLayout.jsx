import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function NavItem({ to, label, onClick, badge }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center justify-between rounded px-3 py-2 text-sm font-medium ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`
      }
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [missingCount, setMissingCount] = useState(0);
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    async function loadMissing() {
      try {
        const res = await api('/api/attendance/missing');
        if (active) setMissingCount((res.missing || []).reduce((s, m) => s + (m.dates || []).length, 0));
      } catch (_) {
        if (active) setMissingCount(0);
      }
    }
    loadMissing();
    const handler = () => loadMissing();
    window.addEventListener('attendance-updated', handler);
    return () => {
      active = false;
      window.removeEventListener('attendance-updated', handler);
    };
  }, [isAdmin, location.pathname]);

  const links = isOwner
    ? [{ to: '/owner', label: 'Access requests' }]
    : isAdmin
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/roles', label: 'Roles' },
        { to: '/staff', label: 'Staff' },
        { to: '/advances', label: 'Advances' },
        { to: '/attendance', label: 'Attendance', badge: missingCount },
        { to: '/payslip', label: 'Payslip' },
      ]
    : [];

  const Sidebar = ({ mobile }) => (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4">
        <Link to={isOwner ? '/owner' : '/dashboard'} className="text-lg font-bold text-emerald-700">Resto Staff</Link>
        <div className="mt-1 text-xs text-slate-500">{user?.name} ({user?.role})</div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((l) => (
          <NavItem key={l.to} to={l.to} label={l.label} badge={l.badge} onClick={() => mobile && setOpen(false)} />
        ))}
      </nav>
      <div className="border-t p-3">
        <button onClick={handleLogout} className="w-full rounded bg-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-300">Log out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <button onClick={() => setOpen(true)} className="rounded border px-3 py-1.5 text-sm">Menu</button>
        <span className="font-semibold text-emerald-700">Resto Staff</span>
        <div className="w-14" />
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 bg-white shadow-xl"><Sidebar mobile /></div>
          <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="mx-auto flex max-w-6xl">
        <aside className="hidden w-60 shrink-0 border-r bg-white md:block md:min-h-screen">
          <Sidebar />
        </aside>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
