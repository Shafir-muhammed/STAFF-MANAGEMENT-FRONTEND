import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function RequestAccess() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (user.role === 'owner') return <Navigate to="/owner" replace />;
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  }

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const data = await api('/api/auth/request-access', { method: 'POST', body: form });
      setSuccess(data.message || 'Request submitted. Wait for owner approval.');
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="mb-1 text-2xl font-bold text-emerald-700">Request access</h1>
        <p className="mb-6 text-sm text-slate-600">Submit your details to create a restaurant admin account (pending approval). Only authorized admins can manage staff profiles and history.</p>
        {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input className="w-full rounded border px-3 py-2" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" className="w-full rounded border px-3 py-2" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input type="password" className="w-full rounded border px-3 py-2" value={form.password} onChange={(e) => update('password', e.target.value)} required />
          </div>
          <button disabled={loading} className="w-full rounded bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit request'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already approved? <Link to="/login" className="text-emerald-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
