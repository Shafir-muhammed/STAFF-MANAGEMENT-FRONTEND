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

export default function Advances() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [staff, setStaff] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    staffId: '', amount: '', advanceDate: todayStr(), fromType: 'counter', sourceStaffId: '', note: '',
  });
  const [summary, setSummary] = useState(null);

  const input = 'w-full rounded border px-3 py-2';
  const label = 'mb-1 block text-sm font-medium';

  async function loadStaff() {
    try {
      const res = await api('/api/staff');
      setStaff(res.staff || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAdvances(month) {
    setLoading(true); setError('');
    try {
      const res = await api(`/api/advances?month=${month}`);
      setAdvances(res.advances || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStaff(); }, []);
  useEffect(() => { loadAdvances(selectedMonth); }, [selectedMonth]);

  async function onStaffChange(staffId) {
    setForm((f) => ({ ...f, staffId }));
    setSummary(null);
    if (!staffId) return;
    try {
      const res = await api(`/api/advances/summary?staffId=${staffId}`);
      setSummary(res);
    } catch (err) {
      setError(err.message);
    }
  }

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const canRecord = selectedMonth === currentMonth;

  function openConfirm(e) {
    e.preventDefault();
    setError(''); setMsg('');
    const today = todayStr();
    if (form.advanceDate && form.advanceDate > today) {
      setError('Advance date cannot be a future date.');
      return;
    }
    if (form.advanceDate.slice(0, 7) !== currentMonth) {
      setError('Advances can only be recorded for the current salary month.');
      return;
    }
    const amountNum = Number(form.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Advance amount must be greater than zero.');
      return;
    }
    if (summary && amountNum > (summary.remaining || 0)) {
      setError(`Advance exceeds remaining monthly salary limit (remaining ${summary.remaining}).`);
      return;
    }
    if (form.fromType === 'staff' && !form.sourceStaffId) {
      setError('Select the staff member paying the advance.');
      return;
    }
    if (!form.staffId) {
      setError('Select a staff member.');
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    setConfirmOpen(false);
    setSubmitting(true); setError(''); setMsg('');
    try {
      const amountNum = Number(form.amount);
      const body = {
        staffId: form.staffId,
        amount: amountNum,
        advanceDate: form.advanceDate,
        fromType: form.fromType,
        sourceStaffId: form.fromType === 'staff' ? form.sourceStaffId : undefined,
        note: form.note,
      };
      await api('/api/advances', { method: 'POST', body });
      setMsg('Advance recorded.');
      setForm({ staffId: form.staffId, amount: '', advanceDate: todayStr(), fromType: 'counter', sourceStaffId: '', note: '' });
      if (form.staffId) onStaffChange(form.staffId);
      if (selectedMonth === currentMonth) loadAdvances(currentMonth);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const sourceStaffOptions = useMemo(() => staff.filter((s) => String(s._id) !== String(form.staffId)), [staff, form.staffId]);

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salary advances</h1>
          <p className="text-sm text-slate-600">Admin-only. Advances are capped at daily wage × days in the current month.</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {msg && <div className="mb-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium">View month</label>
        <input type="month" className="rounded border px-3 py-2" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
      </div>

      <div className="mb-6 overflow-x-auto rounded border bg-white">
        {loading ? (
          <div className="p-6 text-slate-500">Loading...</div>
        ) : advances.length === 0 ? (
          <div className="p-6 text-slate-500">No advances for {selectedMonth}.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date given</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Given by</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((a) => (
                <tr key={a._id} className="border-t">
                  <td className="px-4 py-3 font-medium">{a.staff?.fullName || '-'}</td>
                  <td className="px-4 py-3">{a.amount}</td>
                                     <td className="px-4 py-3">{formatDate(a.advanceDate)}</td>
                  <td className="px-4 py-3">{a.sourceName || (a.fromType === 'counter' ? 'Counter' : 'Staff pocket')}</td>
                  <td className="px-4 py-3">{a.givenByName || '-'}</td>
                  <td className="px-4 py-3">{a.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Record advance (current month only: {currentMonth})</h2>
        {!canRecord && <div className="mb-3 text-sm text-amber-700">Switch the view month to the current month to record new advances.</div>}
        <form onSubmit={openConfirm} className="space-y-3 text-sm">
          <div>
            <label className={label}>Staff *</label>
            <select className={input} value={form.staffId} onChange={(e) => onStaffChange(e.target.value)} required>
              <option value="">(select staff)</option>
              {staff.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.phone})</option>)}
            </select>
          </div>
          {summary && (
            <div className="rounded bg-slate-50 p-2 text-sm">
              <div>Daily wage: {summary.dailyWage}/day × {summary.daysInMonth} days = <b>{summary.monthlyCap}</b> max</div>
              <div>Advanced: {summary.totalAdvanced} • Remaining: <b>{summary.remaining}</b></div>
            </div>
          )}
          <div><label className={label}>Amount *</label><input type="number" min="0" step="0.01" className={input} value={form.amount} onChange={(e) => setF('amount', e.target.value)} required /></div>
          <div><label className={label}>Date given *</label><input type="date" className={input} max={todayStr()} value={form.advanceDate} onChange={(e) => setF('advanceDate', e.target.value)} required /></div>
          <div>
            <label className={label}>Source *</label>
            <select className={input} value={form.fromType} onChange={(e) => setF('fromType', e.target.value)}>
              <option value="counter">Counter</option>
              <option value="staff">Staff pocket</option>
            </select>
          </div>
          {form.fromType === 'staff' && (
            <div>
              <label className={label}>Staff paying (pocket) *</label>
              <select className={input} value={form.sourceStaffId} onChange={(e) => setF('sourceStaffId', e.target.value)} required>
                <option value="">(select staff)</option>
                {sourceStaffOptions.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.phone})</option>)}
              </select>
            </div>
          )}
          <div><label className={label}>Note</label><textarea className={input} rows={2} value={form.note} onChange={(e) => setF('note', e.target.value)} /></div>
          <button disabled={submitting || !canRecord} className="w-full rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {submitting ? 'Recording...' : 'Record advance'}
          </button>
        </form>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">Confirm salary advance</h3>
            <div className="mb-4 space-y-1 text-sm">
              <div><span className="text-slate-500">Staff:</span> <b>{staff.find((s) => String(s._id) === String(form.staffId))?.fullName || '-'}</b></div>
              <div><span className="text-slate-500">Amount:</span> <b>{form.amount}</b></div>
                             <div><span className="text-slate-500">Date given:</span> {formatDate(form.advanceDate)}</div>
              <div><span className="text-slate-500">Salary month:</span> {currentMonth}</div>
              <div><span className="text-slate-500">Source:</span> {form.fromType === 'counter' ? 'Counter' : (staff.find((s) => String(s._id) === String(form.sourceStaffId))?.fullName || '-')}</div>
              {form.note && <div><span className="text-slate-500">Note:</span> {form.note}</div>}
              {summary && <div><span className="text-slate-500">Remaining after:</span> {Math.max(0, (summary.remaining || 0) - Number(form.amount))}</div>}
            </div>
            <p className="mb-4 text-xs text-slate-500">The advance will be recorded against the current month only. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-slate-50" disabled={submitting}>Cancel</button>
              <button onClick={confirmSubmit} disabled={submitting} className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
