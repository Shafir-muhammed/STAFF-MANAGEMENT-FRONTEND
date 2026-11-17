import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppLayout from '../layouts/AppLayout';

const empty = {
  fullName: '', phone: '', email: '', dateOfBirth: '', address: '',
  emergencyName: '', emergencyRelationship: '', emergencyPhone: '', emergencyAddress: '', emergencyNotes: '',
  joiningDate: '', roleName: '', basicSalary: '',
  photo: null, idCard: null,
};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

export default function StaffForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    api('/api/roles').then((r) => setRoles(r.roles || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await api(`/api/staff/${id}`);
        const s = res.staff;
        setForm({
          fullName: s.fullName || '',
          phone: s.phone || '',
          email: s.email || '',
          dateOfBirth: s.dateOfBirth || '',
          address: s.address || '',
          emergencyName: s.emergencyContact?.name || '',
          emergencyRelationship: s.emergencyContact?.relationship || '',
          emergencyPhone: s.emergencyContact?.phone || '',
          emergencyAddress: s.emergencyContact?.address || '',
          emergencyNotes: s.emergencyContact?.notes || '',
          joiningDate: '', roleName: '', basicSalary: '',
          photo: null, idCard: null,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function runSearch() {
    const q = searchQ.trim();
    if (!q) { setSearchResults([]); return; }
    setSearching(true); setError('');
    try {
      const res = await api(`/api/staff/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isEdit) {
      const today = todayStr();
      if (!form.fullName.trim() || !form.phone.trim() || !form.joiningDate) {
        setError('Full name, phone and joining date are required.');
        return;
      }
      if (form.joiningDate > today) {
        setError('Joining date cannot be a future date.');
        return;
      }
      if (form.basicSalary === '' || Number.isNaN(Number(form.basicSalary)) || Number(form.basicSalary) < 0) {
        setError('Daily wage (per day) is required.');
        return;
      }
      if (searchResults.length > 0 && !confirmNew) {
        setError('Existing staff matches found. Review them and confirm you want to create a new profile, or open the existing profile to rehire/edit.');
        return;
      }
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const fields = isEdit
        ? ['fullName','phone','email','dateOfBirth','address','emergencyName','emergencyRelationship','emergencyPhone','emergencyAddress','emergencyNotes']
        : ['fullName','phone','email','dateOfBirth','address','emergencyName','emergencyRelationship','emergencyPhone','emergencyAddress','emergencyNotes','joiningDate','roleName','basicSalary'];
      fields.forEach((k) => { if (form[k] !== undefined && form[k] !== null) fd.append(k, form[k]); });
      if (form.photo) fd.append('photo', form.photo);
      if (form.idCard) fd.append('idCard', form.idCard);

      if (isEdit) {
        await api(`/api/staff/${id}`, { method: 'PUT', body: fd, isForm: true });
        navigate(`/staff/${id}`);
      } else {
        const res = await api('/api/staff', { method: 'POST', body: fd, isForm: true });
        navigate(`/staff/${res.staff._id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const input = 'w-full rounded border px-3 py-2';
  const label = 'mb-1 block text-sm font-medium';

  if (loading) return <AppLayout><div className="text-slate-500">Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit staff profile' : 'Add staff member'}</h1>
          <p className="text-sm text-slate-600">{isEdit ? 'Update profile/contact details only. Employment terms and history are recorded as events.' : 'Search existing staff before creating a profile to avoid duplicates. Initial joining details create a permanent history record.'}</p>
        </div>
        <Link to={isEdit ? `/staff/${id}` : '/staff'} className="text-sm text-emerald-700 hover:underline">Back</Link>
      </div>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!isEdit && (
        <div className="mb-6 rounded border bg-white p-4">
          <h2 className="font-semibold">Search existing staff (prevent duplicates)</h2>
          <p className="mb-2 text-sm text-slate-600">Search by name, phone, or email to see prior employment status (including left, terminated, or do not rehire) before confirming a new hire/profile.</p>
          <div className="flex gap-2">
            <input className={input} placeholder="Name, phone, or email" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            <button type="button" onClick={runSearch} className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900" disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="rounded bg-amber-50 p-2 text-sm text-amber-800">Matches found. Review prior status before creating a duplicate profile.</div>
              {searchResults.map((r) => (
                <div key={r._id} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{r.fullName} {r.phone ? `• ${r.phone}` : ''} {r.email ? `• ${r.email}` : ''}</div>
                      <div className="text-slate-600">Status: <b>{r.currentStatus}</b>{r.currentRole ? ` • Role: ${r.currentRole}` : ''}{r.latestPeriodStart ? ` • Period: ${r.latestPeriodStart}${r.latestPeriodEnd ? ` to ${r.latestPeriodEnd}` : ''}` : ''}</div>
                      {r.doNotRehire && <div className="font-medium text-red-700">Do not rehire{r.doNotRehireReason ? `: ${r.doNotRehireReason}` : ''}</div>}
                    </div>
                    <Link to={`/staff/${r._id}`} className="rounded border px-3 py-1.5 text-emerald-700 hover:bg-emerald-50">Open profile / Rehire</Link>
                  </div>
                </div>
              ))}
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmNew} onChange={(e) => setConfirmNew(e.target.checked)} />
                I reviewed existing matches and want to create a new profile anyway.
              </label>
            </div>
          )}
          {searchQ && !searching && searchResults.length === 0 && (
            <div className="mt-2 text-sm text-slate-600">No matching existing staff found.</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded border bg-white p-4">
        <section>
          <h2 className="mb-3 font-semibold">Profile & contact</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={label}>Full name *</label><input className={input} value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} required /></div>
            <div><label className={label}>Phone *</label><input className={input} value={form.phone} onChange={(e) => setField('phone', e.target.value)} required /></div>
            <div><label className={label}>Email</label><input type="email" className={input} value={form.email} onChange={(e) => setField('email', e.target.value)} /></div>
            <div><label className={label}>Date of birth</label><input type="date" className={input} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} /></div>
            <div className="md:col-span-2"><label className={label}>Address</label><input className={input} value={form.address} onChange={(e) => setField('address', e.target.value)} /></div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Emergency contact</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={label}>Name</label><input className={input} value={form.emergencyName} onChange={(e) => setField('emergencyName', e.target.value)} /></div>
            <div><label className={label}>Relationship</label><input className={input} value={form.emergencyRelationship} onChange={(e) => setField('emergencyRelationship', e.target.value)} /></div>
            <div><label className={label}>Phone</label><input className={input} value={form.emergencyPhone} onChange={(e) => setField('emergencyPhone', e.target.value)} /></div>
            <div><label className={label}>Address</label><input className={input} value={form.emergencyAddress} onChange={(e) => setField('emergencyAddress', e.target.value)} /></div>
            <div className="md:col-span-2"><label className={label}>Notes</label><input className={input} value={form.emergencyNotes} onChange={(e) => setField('emergencyNotes', e.target.value)} /></div>
          </div>
        </section>

        {!isEdit && (
          <section>
            <h2 className="mb-1 font-semibold">Initial employment (recorded in permanent history)</h2>
            <p className="mb-3 text-sm text-slate-600">Role/salary/period changes are tracked later as dated events (not by overwriting).</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className={label}>Joining date *</label><input type="date" className={input} max={todayStr()} value={form.joiningDate} onChange={(e) => setField('joiningDate', e.target.value)} required /></div>
              <div><label className={label}>Daily wage (per day) *</label><input type="number" min="0" step="0.01" className={input} value={form.basicSalary} onChange={(e) => setField('basicSalary', e.target.value)} placeholder="e.g. 500" /></div>
              <div>
                <label className={label}>Role</label>
                <select className={input} value={form.roleName} onChange={(e) => setField('roleName', e.target.value)}>
                  <option value="">(none / assign later)</option>
                  {roles.map((r) => <option key={r._id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-semibold">Documents (images)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={label}>Profile photo</label><input type="file" accept="image/*" onChange={(e) => setField('photo', e.target.files?.[0] || null)} /></div>
            <div><label className={label}>ID image</label><input type="file" accept="image/*" onChange={(e) => setField('idCard', e.target.files?.[0] || null)} /></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Images are served only via authenticated, scoped admin routes.</p>
        </section>

        <div className="flex gap-3">
          <button disabled={saving} className="rounded bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Save profile' : 'Create profile & join record')}</button>
          <Link to={isEdit ? `/staff/${id}` : '/staff'} className="rounded border px-5 py-2">Cancel</Link>
        </div>
      </form>
    </AppLayout>
  );
}
