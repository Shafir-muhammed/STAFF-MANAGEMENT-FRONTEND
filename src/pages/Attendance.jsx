import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import AppLayout from '../layouts/AppLayout';
import { formatDate } from '../utils/date';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function isEditableDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return false;
  const today = todayStr();
  if (String(dateStr) > today) return false;
  const d = new Date(String(dateStr) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  const deadline = new Date(d.getFullYear(), d.getMonth() + 1, 5);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t <= deadline;
}

function deadlineFor(dateStr) {
  const d = new Date(String(dateStr) + 'T00:00:00');
  const deadline = new Date(d.getFullYear(), d.getMonth() + 1, 5);
  return deadline.toISOString().slice(0, 10);
}

export default function Attendance() {
  const [date, setDate] = useState(todayStr());
  const [staff, setStaff] = useState([]);
  const [records, setRecords] = useState({});
  const [recordDetails, setRecordDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [savingOt, setSavingOt] = useState('');
  const [otDrafts, setOtDrafts] = useState({});
  const [leaveModal, setLeaveModal] = useState(null);
  const [missing, setMissing] = useState([]);

  async function loadMissing() {
    try {
      const res = await api('/api/attendance/missing');
      setMissing(res.missing || []);
    } catch (_) {
      setMissing([]);
    }
  }

  async function load(selectedDate = date) {
    setLoading(true); setError('');
    try {
      const [staffRes, attRes] = await Promise.all([
        api('/api/staff'),
        api(`/api/attendance?date=${encodeURIComponent(selectedDate)}`),
      ]);
      const all = staffRes.staff || [];
      // show currently active or on-leave staff for attendance (hide clearly left/terminated by default)
      setStaff(all.filter((s) => ['active', 'on_leave', 'unknown'].includes(s.currentStatus)));
      const map = {};
      const details = {};
      const drafts = {};
      (attRes.records || []).forEach((r) => {
        map[r.staff] = r.status;
        const ot = Number(r.overtimeAmount) || 0;
        details[r.staff] = { notes: r.notes || '', paidLeave: r.paidLeave, overtimeAmount: ot };
        drafts[r.staff] = ot ? String(ot) : '';
      });
      setRecords(map);
      setRecordDetails(details);
      setOtDrafts(drafts);
      loadMissing();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function changeDate(d) {
    if (d > todayStr()) {
      setError('Attendance cannot be marked for a future date.');
      return;
    }
    setDate(d);
    await load(d);
  }

  async function saveLeave() {
    if (!leaveModal) return;
    if (!isEditableDate(date)) {
      setError(`Attendance editing deadline has passed for this month (editable through ${formatDate(deadlineFor(date))}).`);
      return;
    }
    const staffId = leaveModal.staffId;
    setSaving(staffId);
    setError('');
    try {
      const res = await api('/api/attendance', { method: 'POST', body: { staffId, date, status: 'leave', paidLeave: leaveModal.paidLeave, notes: leaveModal.notes } });
      setRecords((prev) => ({ ...prev, [staffId]: 'leave' }));
      setRecordDetails((prev) => ({ ...prev, [staffId]: { notes: (leaveModal.notes || '').trim(), paidLeave: leaveModal.paidLeave, overtimeAmount: 0 } }));
      setOtDrafts((prev) => ({ ...prev, [staffId]: '' }));
      setLeaveModal(null);
      loadMissing();
      window.dispatchEvent(new Event('attendance-updated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  }

  async function setStatus(staffId, status) {
    if (!isEditableDate(date)) {
      setError(`Attendance editing deadline has passed for this month (editable through ${formatDate(deadlineFor(date))}).`);
      return;
    }
    const current = records[staffId];
    const next = current === status ? '' : status; // toggle/clear
    setSaving(staffId);
    setError('');
    try {
      await api('/api/attendance', { method: 'POST', body: { staffId, date, status: next } });
      setRecords((prev) => {
        const copy = { ...prev };
        if (next) copy[staffId] = next; else delete copy[staffId];
        return copy;
      });
      // a new mark starts with no overtime; switching away from full clears it
      setRecordDetails((prev) => ({ ...prev, [staffId]: { notes: '', paidLeave: null, overtimeAmount: 0 } }));
      setOtDrafts((prev) => ({ ...prev, [staffId]: '' }));
      loadMissing();
      window.dispatchEvent(new Event('attendance-updated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  }

  async function saveOvertime(staffId) {
    const raw = otDrafts[staffId];
    const entered = raw === '' || raw === undefined ? 0 : Number(raw);
    const existing = Number(recordDetails[staffId]?.overtimeAmount) || 0;
    if (!Number.isFinite(entered) || entered < 0) {
      setError('Overtime amount must be a number of 0 or more');
      setOtDrafts((prev) => ({ ...prev, [staffId]: existing ? String(existing) : '' }));
      return;
    }
    const value = Math.round(entered * 100) / 100;
    if (value === existing) return;
    setSavingOt(staffId);
    setError('');
    try {
      const res = await api('/api/attendance', { method: 'POST', body: { staffId, date, status: 'full', overtimeAmount: value } });
      const saved = Number(res.record?.overtimeAmount) || 0;
      setRecordDetails((prev) => ({ ...prev, [staffId]: { notes: '', paidLeave: null, overtimeAmount: saved } }));
      setOtDrafts((prev) => ({ ...prev, [staffId]: saved ? String(saved) : '' }));
    } catch (err) {
      setError(err.message);
      setOtDrafts((prev) => ({ ...prev, [staffId]: existing ? String(existing) : '' }));
    } finally {
      setSavingOt('');
    }
  }

  const options = [
    { key: 'full', label: 'Full' },
    { key: 'half', label: 'Half' },
    { key: 'leave', label: 'Leave' },
  ];

  const editable = isEditableDate(date);

  const summary = useMemo(() => {
    const vals = Object.values(records);
    return {
      full: vals.filter((v) => v === 'full').length,
      half: vals.filter((v) => v === 'half').length,
      leave: vals.filter((v) => v === 'leave').length,
    };
  }, [records]);

  return (
    <AppLayout>
      <h1 className="mb-2 text-2xl font-bold">Daily attendance</h1>
      <p className="mb-4 text-sm text-slate-600">Admin-only. Mark Full/Half/Leave per staff for a date. Click an active selection to clear it. On a full day you can add an optional overtime amount, which is paid on top of the daily wage.</p>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {!editable && (
        <div className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
          Attendance for this month is locked (read-only). Editing was allowed through {formatDate(deadlineFor(date))}.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded border bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input type="date" className="rounded border px-3 py-2" max={todayStr()} value={date} onChange={(e) => changeDate(e.target.value)} />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="rounded bg-emerald-50 px-3 py-1 text-emerald-700">Full: {summary.full}</span>
          <span className="rounded bg-amber-50 px-3 py-1 text-amber-700">Half: {summary.half}</span>
          <span className="rounded bg-rose-50 px-3 py-1 text-rose-700">Leave: {summary.leave}</span>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="mb-1 font-medium">Missing attendance for previous working days</div>
          <ul className="list-disc pl-5">
            {missing.map((m) => (
              <li key={m.staffId}>{m.staffName}: {m.dates.map(formatDate).join(', ')}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded border bg-white">
        {loading ? (
          <div className="p-6 text-slate-500">Loading...</div>
        ) : staff.length === 0 ? (
          <div className="p-6 text-slate-500">No active/on-leave staff to mark for this day.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id} className="border-t">
                  <td className="px-4 py-3 font-medium">{s.fullName}</td>
                  <td className="px-4 py-3">{s.currentRole || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {options.map((o) => {
                        const active = records[s._id] === o.key;
                        return (
                          <button
                            key={o.key}
                            disabled={!editable || saving === s._id}
                            onClick={() => {
                              if (o.key === 'leave' && records[s._id] !== 'leave') {
                                setLeaveModal({ staffId: s._id, paidLeave: recordDetails[s._id]?.paidLeave ?? true, notes: recordDetails[s._id]?.notes || '' });
                              } else {
                                setStatus(s._id, o.key);
                              }
                            }}
                            className={`rounded px-3 py-1.5 text-sm font-medium border ${
                              active
                                ? o.key === 'full' ? 'bg-emerald-600 text-white border-emerald-600'
                                : o.key === 'half' ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white hover:bg-slate-50'
                            } disabled:opacity-50`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                      {saving === s._id && <span className="text-xs text-slate-500">saving...</span>}
                    </div>
                    {records[s._id] === 'leave' && recordDetails[s._id] && (
                      <div className="mt-1 text-xs text-slate-500">
                        {recordDetails[s._id].paidLeave ? 'Paid leave' : 'Unpaid leave'}
                        {recordDetails[s._id].notes ? ` • ${recordDetails[s._id].notes}` : ''}
                      </div>
                    )}
                    {records[s._id] === 'full' && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="text-xs font-medium text-slate-600" htmlFor={`ot-${s._id}`}>Overtime amount</label>
                        <input
                          id={`ot-${s._id}`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          placeholder="0"
                          className="w-28 rounded border px-2 py-1 text-sm"
                          value={otDrafts[s._id] ?? ''}
                          disabled={!editable || savingOt === s._id}
                          onChange={(e) => setOtDrafts((prev) => ({ ...prev, [s._id]: e.target.value }))}
                          onBlur={() => saveOvertime(s._id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                        <span className="text-xs text-slate-500">
                          {(() => {
                            const ot = Number(recordDetails[s._id]?.overtimeAmount) || 0;
                            if (savingOt === s._id) return 'Saving...';
                            if (!ot) return 'Optional — paid on top of the daily wage';
                            const wage = Number(s.currentSalary) || 0;
                            return `Day pay: ${wage} + ${ot} overtime = ${wage + ot}`;
                          })()}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h2 className="mb-3 text-lg font-semibold">Mark leave</h2>
            <p className="mb-4 text-sm text-slate-600">Optional notes and paid/unpaid selection for this leave record.</p>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium">Paid leave?</label>
              <select className="w-full rounded border px-3 py-2" value={leaveModal.paidLeave ? 'yes' : 'no'} onChange={(e) => setLeaveModal((m) => ({ ...m, paidLeave: e.target.value === 'yes' }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
              <textarea className="w-full rounded border px-3 py-2" rows={3} value={leaveModal.notes} onChange={(e) => setLeaveModal((m) => ({ ...m, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded border px-4 py-2 text-sm" onClick={() => setLeaveModal(null)} disabled={saving === leaveModal.staffId}>Cancel</button>
              <button className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={saveLeave} disabled={saving === leaveModal.staffId}>
                {saving === leaveModal.staffId ? 'Saving...' : 'Save leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
