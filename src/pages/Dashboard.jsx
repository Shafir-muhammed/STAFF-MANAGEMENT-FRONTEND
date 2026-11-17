import { useEffect, useState } from 'react';
import { api } from '../api';
import AppLayout from '../layouts/AppLayout';
import { formatDate } from '../utils/date';

const empty = { name: '', cuisine: '', phone: '', address: '', description: '' };
const BIRTHDAY_WINDOW_DAYS = 20;

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextBirthday(dob) {
  const m = String(dob || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const offset of [0, 1]) {
    const date = new Date(today.getFullYear() + offset, month - 1, day);
    date.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((date - today) / 86400000);
    if (daysUntil >= 0) return { date, daysUntil, age: date.getFullYear() - Number(m[1]) };
  }
  return null;
}

function upcomingBirthdays(staff) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  for (const s of staff) {
    if (!['active', 'on_leave', 'unknown'].includes(s.currentStatus)) continue;
    const next = nextBirthday(s.dateOfBirth);
    if (!next || next.daysUntil > BIRTHDAY_WINDOW_DAYS) continue;
    rows.push({ id: s._id, name: s.fullName, ymd: toYMD(next.date), daysUntil: next.daysUntil, age: next.age });
  }
  return rows.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
}

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [birthdays, setBirthdays] = useState([]);

  async function load() {
    try {
      const [res, staffRes] = await Promise.all([
        api('/api/restaurants/mine'),
        api('/api/staff').catch(() => ({ staff: [] })),
      ]);
      setBirthdays(upcomingBirthdays(staffRes.staff || []));
      setRestaurant(res.restaurant);
      if (res.restaurant) {
        setForm({
          name: res.restaurant.name || '',
          cuisine: res.restaurant.cuisine || '',
          phone: res.restaurant.phone || '',
          address: res.restaurant.address || '',
          description: res.restaurant.description || '',
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const res = await api('/api/restaurants', { method: 'POST', body: form });
      setRestaurant(res.restaurant);
      setSuccess('Restaurant created.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const res = await api('/api/restaurants', { method: 'PUT', body: form });
      setRestaurant(res.restaurant);
      setSuccess('Restaurant updated.');
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Name *</label>
          <input className="w-full rounded border px-3 py-2" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Cuisine</label>
          <input className="w-full rounded border px-3 py-2" value={form.cuisine} onChange={(e) => update('cuisine', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input className="w-full rounded border px-3 py-2" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <input className="w-full rounded border px-3 py-2" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea className="w-full rounded border px-3 py-2" rows="3" value={form.description} onChange={(e) => update('description', e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button disabled={saving} className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving...' : submitLabel}</button>
        {editing && <button type="button" onClick={() => { setEditing(false); setForm({ name: restaurant.name||'', cuisine: restaurant.cuisine||'', phone: restaurant.phone||'', address: restaurant.address||'', description: restaurant.description||'' }); }} className="rounded border px-4 py-2">Cancel</button>}
      </div>
    </form>
  );

  return (
    <AppLayout>
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : !restaurant ? (
        <div className="max-w-2xl rounded border bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">Create your restaurant</h2>
          <p className="mb-4 text-sm text-slate-600">Each staff account can manage one restaurant.</p>
          {renderForm(handleCreate, 'Create restaurant')}
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          <div className="rounded border bg-white p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upcoming birthdays</h2>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">Next {BIRTHDAY_WINDOW_DAYS} days</span>
            </div>
            <p className="mb-3 text-sm text-slate-600">Employees whose birthday falls in the next {BIRTHDAY_WINDOW_DAYS} days.</p>
            {birthdays.length === 0 ? (
              <p className="text-sm text-slate-500">No birthdays in the next {BIRTHDAY_WINDOW_DAYS} days.</p>
            ) : (
              <ul className="divide-y">
                {birthdays.map((b) => (
                  <li
                    key={b.id}
                    className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${b.daysUntil === 0 ? 'rounded bg-amber-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${b.daysUntil === 0 ? 'text-amber-900' : ''}`}>{b.name}</span>
                      {b.daysUntil === 0 && (
                        <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">Today</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-800">{formatDate(b.ymd)}</span>
                      {b.age > 0 && <span className="ml-2 text-xs text-slate-500">turns {b.age}</span>}
                      {b.daysUntil > 0 && <span className="ml-2 text-xs text-slate-500">in {b.daysUntil} {b.daysUntil === 1 ? 'day' : 'days'}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!editing ? (
            <div className="rounded border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{restaurant.name}</h2>
                <button onClick={() => setEditing(true)} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">Edit</button>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div><dt className="text-slate-500">Cuisine</dt><dd>{restaurant.cuisine || '-'}</dd></div>
                <div><dt className="text-slate-500">Phone</dt><dd>{restaurant.phone || '-'}</dd></div>
                <div><dt className="text-slate-500">Address</dt><dd>{restaurant.address || '-'}</dd></div>
                <div className="md:col-span-2"><dt className="text-slate-500">Description</dt><dd>{restaurant.description || '-'}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="rounded border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Edit restaurant</h2>
              {renderForm(handleUpdate, 'Save changes')}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
