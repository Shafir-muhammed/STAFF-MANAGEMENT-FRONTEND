import { useEffect, useState } from 'react';
import { api } from '../api';
import AppLayout from '../layouts/AppLayout';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api('/api/roles');
      setRoles(res.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addRole(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      await api('/api/roles', { method: 'POST', body: { name } });
      setName('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Remove this role?')) return;
    setError('');
    try {
      await api(`/api/roles/${id}`, { method: 'DELETE' });
      setRoles((r) => r.filter((x) => x._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppLayout>
      <h1 className="mb-4 text-2xl font-bold">Roles</h1>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-6 max-w-lg rounded border bg-white p-4">
        <form onSubmit={addRole} className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2" placeholder="e.g. Manager, Chef, Waiter" value={name} onChange={(e) => setName(e.target.value)} />
          <button disabled={saving} className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50">Add</button>
        </form>
      </div>
      <div className="max-w-lg rounded border bg-white">
        {loading ? (
          <div className="p-4 text-slate-500">Loading...</div>
        ) : roles.length === 0 ? (
          <div className="p-4 text-slate-500">No roles yet.</div>
        ) : (
          <ul className="divide-y">
            {roles.map((r) => (
              <li key={r._id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{r.name}</span>
                <button onClick={() => remove(r._id)} className="text-sm text-red-600 hover:underline">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-4 text-sm text-slate-500">Role names are unique within your restaurant. Removing a role won’t change existing staff records.</p>
    </AppLayout>
  );
}
