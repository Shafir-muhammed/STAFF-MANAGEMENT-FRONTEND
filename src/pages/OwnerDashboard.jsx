import { useEffect, useState } from 'react';
import { api } from '../api';
import AppLayout from '../layouts/AppLayout';

export default function OwnerDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');

  async function load() {
    try {
      const data = await api('/api/owner/requests');
      setUsers(data.users || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(id, action) {
    setActionId(id + action);
    setError('');
    try {
      await api(`/api/owner/requests/${id}`, { method: 'PATCH', body: { action } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId('');
    }
  }

  const badge = (status) => {
    const m = { pending: 'bg-amber-100 text-amber-800', active: 'bg-emerald-100 text-emerald-800', declined: 'bg-red-100 text-red-800' };
    return <span className={`rounded px-2 py-1 text-xs font-medium ${m[status] || 'bg-slate-100'}`}>{status}</span>;
  };

  return (
    <AppLayout>
      <h1 className="mb-2 text-2xl font-bold">Owner dashboard</h1>
      <p className="mb-4 text-sm text-slate-600">Approve/decline restaurant admin (manager) access requests. Only authorized admins can manage staff profiles, history, and rehire actions.</p>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Total', stats.total],
            ['Pending', stats.pending],
            ['Active', stats.active],
            ['Declined', stats.declined],
          ].map(([label, val]) => (
            <div key={label} className="rounded border bg-white p-4">
              <div className="text-xs uppercase text-slate-500">{label}</div>
              <div className="text-2xl font-semibold">{val}</div>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto rounded border bg-white">
        {loading ? (
          <div className="p-6 text-slate-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-slate-500">No admin access requests yet.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{badge(u.status)}</td>
                  <td className="px-4 py-3 space-x-2">
                    {u.status !== 'active' && (
                      <button disabled={!!actionId} onClick={() => act(u._id, 'approve')} className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                    )}
                    {u.status === 'pending' && (
                      <button disabled={!!actionId} onClick={() => act(u._id, 'decline')} className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-50">Decline</button>
                    )}
                    {u.status === 'active' && (
                      <button disabled={!!actionId} onClick={() => act(u._id, 'revoke')} className="rounded bg-slate-600 px-3 py-1 text-white hover:bg-slate-700 disabled:opacity-50">Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
