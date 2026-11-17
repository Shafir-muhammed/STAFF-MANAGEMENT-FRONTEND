import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, API_BASE } from '../api';
import AppLayout from '../layouts/AppLayout';
import { formatDate } from '../utils/date';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function fmtEvent(e) {
  const labels = {
    joining: 'Joining', leaving: 'Leaving', rejoining: 'Rejoining',
    leave_of_absence: 'Leave of absence', return: 'Return from leave',
    role_change: 'Role change', promotion: 'Promotion', salary_change: 'Salary change',
    warning: 'Warning', termination: 'Termination', employment_note: 'Employment note',
  };
  return labels[e.type] || e.type;
}

export default function StaffView() {
  const { id } = useParams();
  const [staff, setStaff] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [events, setEvents] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [eventForm, setEventForm] = useState({
    type: 'employment_note', eventDate: '', endDate: '', note: '', toRole: '', toSalary: '', doNotRehire: false, doNotRehireReason: '', clearDoNotRehire: false,
  });
  const [rehireForm, setRehireForm] = useState({ startDate: '', roleName: '', basicSalary: '', notes: '', confirmRehire: false, clearDoNotRehire: false });
  const [rehireConfirmInfo, setRehireConfirmInfo] = useState(null);


  async function load() {
    setLoading(true); setError('');
    try {
      const [res, rolesRes] = await Promise.all([
        api(`/api/staff/${id}`),
        api('/api/roles').catch(() => ({ roles: [] })),
      ]);
      setStaff(res.staff);
      setPeriods(res.periods || []);
      setEvents(res.events || []);
      setRoles(rolesRes.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const canRehire = useMemo(() => {
    if (!staff) return false;
    return !['active', 'on_leave'].includes(staff.currentStatus);
  }, [staff]);

  function setEF(k, v) { setEventForm((f) => ({ ...f, [k]: v })); }
  function setRF(k, v) { setRehireForm((f) => ({ ...f, [k]: v })); }

  async function submitEvent(e) {
    e.preventDefault();
    setSubmitting(true); setError(''); setMsg('');
    try {
      const today = todayStr();
      if (eventForm.eventDate && eventForm.eventDate > today) {
        setError('Event date cannot be a future date.');
        setSubmitting(false);
        return;
      }
      if (eventForm.endDate && eventForm.endDate < eventForm.eventDate) {
        setError('End/return date cannot be before the event date.');
        setSubmitting(false);
        return;
      }
      const body = { ...eventForm };
      if (body.toSalary === '') delete body.toSalary; else body.toSalary = Number(body.toSalary);
      if (!body.toRole) delete body.toRole;
      const res = await api(`/api/staff/${id}/events`, { method: 'POST', body });
      setStaff(res.staff); setPeriods(res.periods || []); setEvents(res.events || []);
      setMsg('Event recorded (permanent history).');
      setEventForm({ type: 'employment_note', eventDate: '', endDate: '', note: '', toRole: '', toSalary: '', doNotRehire: false, doNotRehireReason: '', clearDoNotRehire: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRehire(e) {
    e.preventDefault();
    setSubmitting(true); setError(''); setMsg(''); setRehireConfirmInfo(null);
    try {
      if (rehireForm.startDate && rehireForm.startDate > todayStr()) {
        setError('Joining/rehire date cannot be a future date.');
        setSubmitting(false);
        return;
      }
      const body = { ...rehireForm };
      const res = await api(`/api/staff/${id}/rehire`, { method: 'POST', body });
      setStaff(res.staff); setPeriods(res.periods || []); setEvents(res.events || []);
      setMsg('Rehire recorded as a new employment period linked to this profile.');
      setRehireForm({ startDate: '', roleName: '', basicSalary: '', notes: '', confirmRehire: false, clearDoNotRehire: false });
    } catch (err) {
      // confirmation required comes as 409 with details in message? our api helper throws Error(message) but loses details;
      // however we can detect by message text and show manual confirm option. Also handle common case.
      if (err.message && err.message.toLowerCase().includes('confirmation required')) {
        setRehireConfirmInfo({ message: err.message, priorStatus: staff?.currentStatus, doNotRehire: staff?.doNotRehire, doNotRehireReason: staff?.doNotRehireReason });
        setError('Confirmation required: previous employment is left/terminated or marked do not rehire. Tick "Confirm rehire" and submit again.');
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <AppLayout><div className="text-slate-500">Loading...</div></AppLayout>;
  if (error && !staff) return <AppLayout><div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div></AppLayout>;
  if (!staff) return <AppLayout><div>Not found</div></AppLayout>;

  const input = 'w-full rounded border px-3 py-2';
  const label = 'mb-1 block text-sm font-medium';

  return (
    <AppLayout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{staff.fullName}</h1>
          <div className="mt-1 text-sm text-slate-600">
            Status: <b>{staff.currentStatus}</b> {staff.currentRole ? `• Role: ${staff.currentRole}` : ''} {staff.currentSalary != null ? `• Daily wage: ${staff.currentSalary}/day` : ''}
            {staff.doNotRehire && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">DO NOT REHIRE{staff.doNotRehireReason ? `: ${staff.doNotRehireReason}` : ''}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/staff/${id}/edit`} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Edit profile</Link>
          <Link to="/staff" className="rounded border px-4 py-2 text-sm">Back to list</Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {msg && <div className="mb-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded border bg-white p-4">
            <h2 className="mb-3 font-semibold">Profile (stable)</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div><span className="text-slate-500">Full name:</span> {staff.fullName}</div>
              <div><span className="text-slate-500">Phone:</span> {staff.phone}</div>
              <div><span className="text-slate-500">Email:</span> {staff.email || '-'}</div>
                             <div><span className="text-slate-500">Date of birth:</span> {formatDate(staff.dateOfBirth) || '-'}</div>
              <div className="md:col-span-2"><span className="text-slate-500">Address:</span> {staff.address || '-'}</div>
            </div>
            <h3 className="mt-4 mb-2 font-medium">Emergency contact</h3>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div><span className="text-slate-500">Name:</span> {staff.emergencyContact?.name || '-'}</div>
              <div><span className="text-slate-500">Relationship:</span> {staff.emergencyContact?.relationship || '-'}</div>
              <div><span className="text-slate-500">Phone:</span> {staff.emergencyContact?.phone || '-'}</div>
              <div><span className="text-slate-500">Address:</span> {staff.emergencyContact?.address || '-'}</div>
              <div className="md:col-span-2"><span className="text-slate-500">Notes:</span> {staff.emergencyContact?.notes || '-'}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              {staff.photo && <img src={`${API_BASE}/api/staff/${staff._id}/photo`} alt="Profile" className="h-28 w-28 rounded object-cover border" />}
              {staff.idCard && <a href={`${API_BASE}/api/staff/${staff._id}/id-card`} target="_blank" rel="noreferrer" className="inline-flex h-28 w-40 items-center justify-center rounded border bg-slate-50 text-sm text-emerald-700 underline">View ID image</a>}
            </div>
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="mb-3 font-semibold">Employment periods (permanent)</h2>
            {periods.length === 0 ? <div className="text-sm text-slate-500">No periods.</div> : (
              <div className="space-y-2">
                {periods.map((p) => (
                  <div key={p._id} className="rounded border p-3 text-sm">
                                         <div className="font-medium">{formatDate(p.startDate)} {p.endDate ? `→ ${formatDate(p.endDate)}` : '→ present'} <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">{p.status}</span></div>
                    <div className="text-slate-600">Role: {p.roleName || '-'} • Daily wage: {p.basicSalary ?? 0}/day{p.notes ? ` • Notes: ${p.notes}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="mb-3 font-semibold">Work history timeline (append-only, permanent)</h2>
            {events.length === 0 ? <div className="text-sm text-slate-500">No events recorded.</div> : (
              <ol className="space-y-3">
                {events.map((ev) => (
                  <li key={ev._id} className="rounded border-l-4 border-emerald-500 bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{fmtEvent(ev)}</span>
                                             <span className="text-slate-500">{formatDate(ev.eventDate)}{ev.endDate ? ` → ${formatDate(ev.endDate)}` : ''}</span>
                    </div>
                    {ev.payload && Object.keys(ev.payload).length > 0 && (
                      <div className="mt-1 text-slate-700">
                        {ev.payload.fromRole !== undefined && <span>Role: {ev.payload.fromRole || '-'} → {ev.payload.toRole || '-'} </span>}
                        {ev.payload.fromSalary !== undefined && <span>Daily wage: {ev.payload.fromSalary} → {ev.payload.toSalary}/day </span>}
                        {ev.payload.roleName !== undefined && ev.type === 'joining' && <span>Role: {ev.payload.roleName || '-'} </span>}
                        {ev.payload.basicSalary !== undefined && ev.type === 'joining' && <span>Daily wage: {ev.payload.basicSalary}/day</span>}
                      </div>
                    )}
                    {ev.note && <div className="mt-1 text-slate-600">Note: {ev.note}</div>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded border bg-white p-4">
            <h2 className="mb-2 font-semibold">Record event (append-only)</h2>
            <p className="mb-3 text-xs text-slate-500">Events are permanent. Use for leave/return, role or salary changes, warnings, leaving/termination, notes.</p>
            <form onSubmit={submitEvent} className="space-y-3 text-sm">
              <div>
                <label className={label}>Event type</label>
                <select className={input} value={eventForm.type} onChange={(e) => setEF('type', e.target.value)}>
                  <option value="leave_of_absence">Leave of absence</option>
                  <option value="return">Return from leave</option>
                  <option value="role_change">Role change</option>
                  <option value="promotion">Promotion</option>
                  <option value="salary_change">Salary change</option>
                  <option value="warning">Warning</option>
                  <option value="leaving">Leaving</option>
                  <option value="termination">Termination</option>
                  <option value="employment_note">Employment note</option>
                </select>
              </div>
              <div><label className={label}>Event date *</label><input type="date" className={input} max={todayStr()} value={eventForm.eventDate} onChange={(e) => setEF('eventDate', e.target.value)} required /></div>
              {(eventForm.type === 'leave_of_absence') && <div><label className={label}>Expected return/end date</label><input type="date" className={input} min={eventForm.eventDate || undefined} value={eventForm.endDate} onChange={(e) => setEF('endDate', e.target.value)} /></div>}
              {['role_change','promotion'].includes(eventForm.type) && (
                <div>
                  <label className={label}>New role</label>
                  <select className={input} value={eventForm.toRole} onChange={(e) => setEF('toRole', e.target.value)}>
                    <option value="">(select)</option>
                    {roles.map((r) => <option key={r._id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
              )}
              {eventForm.type === 'salary_change' && <div><label className={label}>New daily wage (per day)</label><input type="number" min="0" step="0.01" className={input} value={eventForm.toSalary} onChange={(e) => setEF('toSalary', e.target.value)} placeholder="e.g. 500" /></div>}
              {['leaving','termination'].includes(eventForm.type) && (
                <div className="space-y-2 rounded bg-red-50 p-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={eventForm.doNotRehire} onChange={(e) => setEF('doNotRehire', e.target.checked)} /> Mark as do not rehire</label>
                  {eventForm.doNotRehire && <input className={input} placeholder="Reason (do not rehire)" value={eventForm.doNotRehireReason} onChange={(e) => setEF('doNotRehireReason', e.target.value)} />}
                </div>
              )}
              {staff.doNotRehire && <label className="flex items-center gap-2"><input type="checkbox" checked={eventForm.clearDoNotRehire} onChange={(e) => setEF('clearDoNotRehire', e.target.checked)} /> Clear do-not-rehire flag (admin decision)</label>}
              <div><label className={label}>Note</label><textarea className={input} rows={3} value={eventForm.note} onChange={(e) => setEF('note', e.target.value)} /></div>
              <button disabled={submitting} className="w-full rounded bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900 disabled:opacity-50">Record event</button>
            </form>
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="mb-2 font-semibold">Rehire (new employment period)</h2>
            {!canRehire ? (
              <div className="text-sm text-slate-600">Current period is {staff.currentStatus}. Record leaving/termination/return as needed before rehire.</div>
            ) : (
              <form onSubmit={submitRehire} className="space-y-3 text-sm">
                <p className="text-xs text-slate-500">Creates a new period linked to the same profile (history is preserved). Prior status is shown and confirmation is required if previously left/terminated or marked do not rehire.</p>
                {rehireConfirmInfo && (
                  <div className="rounded bg-amber-50 p-2 text-amber-800">
                    <div className="font-medium">Prior status: {rehireConfirmInfo.priorStatus || staff.currentStatus} {rehireConfirmInfo.doNotRehire ? '• DO NOT REHIRE' : ''}</div>
                    {rehireConfirmInfo.doNotRehireReason && <div>Reason: {rehireConfirmInfo.doNotRehireReason}</div>}
                  </div>
                )}
                <div><label className={label}>Rehire / joining date *</label><input type="date" className={input} max={todayStr()} value={rehireForm.startDate} onChange={(e) => setRF('startDate', e.target.value)} required /></div>
                <div>
                  <label className={label}>Role</label>
                  <select className={input} value={rehireForm.roleName} onChange={(e) => setRF('roleName', e.target.value)}>
                    <option value="">(select)</option>
                    {roles.map((r) => <option key={r._id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
                <div><label className={label}>Daily wage (per day)</label><input type="number" min="0" step="0.01" className={input} value={rehireForm.basicSalary} onChange={(e) => setRF('basicSalary', e.target.value)} placeholder="e.g. 500" /></div>
                <div><label className={label}>Notes</label><textarea className={input} rows={2} value={rehireForm.notes} onChange={(e) => setRF('notes', e.target.value)} /></div>
                {(staff.doNotRehire || ['left','terminated'].includes(staff.currentStatus) || rehireConfirmInfo) && (
                  <label className="flex items-center gap-2 font-medium text-amber-800"><input type="checkbox" checked={rehireForm.confirmRehire} onChange={(e) => setRF('confirmRehire', e.target.checked)} /> I confirm rehire despite prior status / do-not-rehire</label>
                )}
                {staff.doNotRehire && <label className="flex items-center gap-2"><input type="checkbox" checked={rehireForm.clearDoNotRehire} onChange={(e) => setRF('clearDoNotRehire', e.target.checked)} /> Clear do-not-rehire flag on confirmed rehire</label>}
                <button disabled={submitting} className="w-full rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Create rehire period</button>
              </form>
            )}
          </section>
        </div>

      </div>
    </AppLayout>
  );
}
