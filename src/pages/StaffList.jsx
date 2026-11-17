import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppLayout from '../layouts/AppLayout';

function statusBadge(status, doNotRehire) {
  if (doNotRehire) return <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Do not rehire</span>;
  const map = {
    active: 'bg-emerald-100 text-emerald-700',
    on_leave: 'bg-amber-100 text-amber-700',
    left: 'bg-slate-200 text-slate-700',
    terminated: 'bg-red-100 text-red-700',
    unknown: 'bg-slate-100 text-slate-600',
  };
  const label = {
    active: 'Active',
    on_leave: 'On leave',
    left: 'Left',
    terminated: 'Terminated',
    unknown: 'Unknown',
  }[status] || status;
  return <span className={`rounded px-2 py-1 text-xs font-medium ${map[status] || 'bg-slate-100 text-slate-700'}`}>{label}</span>;
}

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await api('/api/staff');
      setStaff(res.staff || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff profiles</h1>
          <p className="text-sm text-slate-600">Admin-only. Profiles and work history are permanent.</p>
        </div>
        <Link to="/staff/new" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Add staff</Link>
      </div>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded border bg-white">
        {loading ? (
          <div className="p-6 text-slate-500">Loading...</div>
        ) : staff.length === 0 ? (
          <div className="p-6 text-slate-500">No staff profiles yet. <Link to="/staff/new" className="text-emerald-700 underline">Add one</Link>.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Current role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Daily wage (per day)</th>
                <th className="px-4 py-3">Advanced (month)</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/staff/${s._id}`} className="text-emerald-700 hover:underline">{s.fullName}</Link>
                  </td>
                  <td className="px-4 py-3">{s.phone}</td>
                  <td className="px-4 py-3">{s.currentRole || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {statusBadge(s.currentStatus, s.doNotRehire)}
                      {s.doNotRehire && s.currentStatus && s.currentStatus !== 'unknown' && (
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{s.currentStatus}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.currentSalary != null ? s.currentSalary : '-'}</td>
                  <td className="px-4 py-3">{s.monthAdvanced != null ? s.monthAdvanced : '-'}</td>
                  <td className="px-4 py-3 space-x-3">
                    <Link to={`/staff/${s._id}`} className="text-emerald-700 hover:underline">View/History</Link>
                    <Link to={`/staff/${s._id}/edit`} className="text-blue-700 hover:underline">Edit profile</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">Staff records and work history are permanent (no deletion). Use events/rehire to record changes over time.</p>
    </AppLayout>
  );
}
