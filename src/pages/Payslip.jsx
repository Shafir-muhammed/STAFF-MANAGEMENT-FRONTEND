import { useEffect, useState } from 'react';
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

export default function Payslip() {
  const [staffList, setStaffList] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDownload, setConfirmDownload] = useState(null); // 'excel' | 'pdf' | null
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api('/api/staff')
      .then((r) => setStaffList(r.staff || []))
      .catch((e) => setError(e.message));
  }, []);

  async function generate() {
    if (!staffId || !fromDate || !toDate) {
      setError('Select an employee and date range.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api(`/api/payslip?staffId=${encodeURIComponent(staffId)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function doDownload(kind) {
    setDownloading(true);
    setError('');
    try {
      const url = `/api/payslip/${kind}?staffId=${encodeURIComponent(staffId)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try { const j = await res.json(); if (j && j.message) msg = j.message; } catch (_) {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const ext = kind === 'excel' ? 'xlsx' : 'pdf';
      a.download = `payslip_${(data?.employee?.fullName || 'employee').replace(/[^a-z0-9]+/gi, '_')}_${fromDate}_to_${toDate}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
      setConfirmDownload(null);
    }
  }

  const selectedStaff = staffList.find((s) => String(s._id) === String(staffId));

  return (
    <AppLayout>
      <style>{`
        @media print {
          .no-print, aside, .md\\:hidden { display: none !important; }
          body { background: #fff; }
          main { padding: 0 !important; }
        }
      `}</style>
      <h1 className="mb-2 text-2xl font-bold">Payslip</h1>
      <p className="mb-4 text-sm text-slate-600">Admin-only. Calculate earnings from attendance through the selected date.</p>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="no-print mb-4 flex flex-wrap items-end gap-4 rounded border bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Employee</label>
          <select className="rounded border px-3 py-2" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Select employee</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">From date</label>
          <input type="date" className="rounded border px-3 py-2" max={todayStr()} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">To date</label>
          <input type="date" className="rounded border px-3 py-2" max={todayStr()} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
                  <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={generate} disabled={loading || !staffId || !fromDate || !toDate}>
          {loading ? 'Generating...' : 'Generate payslip'}
        </button>
      </div>

      {data && (
        <div id="payslip" className="rounded border bg-white p-6">
          <div className="mb-4 flex items-center gap-4">
            {data.employee.photo ? (
              <img src={`${API_BASE}/api/staff/${data.employee.id}/photo`} alt={data.employee.fullName} className="h-20 w-20 rounded object-cover border" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded border bg-slate-100 text-slate-500">No photo</div>
            )}
            <div>
              <div className="text-xl font-bold">{data.employee.fullName}</div>
              <div className="text-sm text-slate-600">{data.employee.currentRole || '-'}</div>
              <div className="text-sm text-slate-600">{data.employee.phone || '-'}</div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <div><span className="font-medium">From date:</span> {formatDate(data.fromDate)}</div>
            <div><span className="font-medium">To date:</span> {formatDate(data.toDate)}</div>
            <div><span className="font-medium">Daily wage:</span> {data.dailyWage}</div>
          </div>

          <h2 className="mb-2 text-lg font-semibold">Attendance & leave breakdown</h2>
          <table className="mb-4 min-w-full text-left text-sm">
            <tbody>
              <tr className="border-t"><td className="px-3 py-2">Full days</td><td className="px-3 py-2">{data.attendance.fullDays}</td></tr>
              <tr className="border-t"><td className="px-3 py-2">Half days</td><td className="px-3 py-2">{data.attendance.halfDays}</td></tr>
              <tr className="border-t"><td className="px-3 py-2">Paid leave days</td><td className="px-3 py-2">{data.attendance.paidLeaveDays}</td></tr>
              <tr className="border-t"><td className="px-3 py-2">Unpaid leave days</td><td className="px-3 py-2">{data.attendance.unpaidLeaveDays}</td></tr>
            </tbody>
          </table>

          <h2 className="mb-2 text-lg font-semibold">Overtime payments</h2>
          {data.overtime.length === 0 ? (
            <p className="mb-2 text-sm text-slate-500">No overtime recorded.</p>
          ) : (
            <table className="mb-2 min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.overtime.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2">{formatDate(o.date)}</td>
                    <td className="px-3 py-2">{o.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mb-4 text-sm"><span className="font-medium">Total overtime:</span> {data.overtimeTotal}</div>

          <div className="mb-4 text-sm">
            <div><span className="font-medium">Wage earnings:</span> {data.wageEarnings}</div>
            <div><span className="font-medium">Overtime payments:</span> {data.overtimeTotal}</div>
            <div><span className="font-medium">Total earnings:</span> {data.earnings}</div>
            <div className="text-xs text-slate-500">Daily wage × (full days + 0.5 × half days + paid leave days) + overtime payments</div>
          </div>

          <h2 className="mb-2 text-lg font-semibold">Advances deducted</h2>
          {data.advances.length === 0 ? (
            <p className="mb-2 text-sm text-slate-500">No advances.</p>
          ) : (
            <table className="mb-2 min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Given by</th>
                </tr>
              </thead>
              <tbody>
                {data.advances.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2">{formatDate(a.date)}</td>
                    <td className="px-3 py-2">{a.amount}</td>
                    <td className="px-3 py-2">{a.source || '-'}</td>
                    <td className="px-3 py-2">{a.givenBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mb-4 text-sm"><span className="font-medium">Total advances:</span> {data.advancesTotal}</div>

          <div className="mb-4 text-lg font-bold">Net payable: {data.netPayable}</div>
          <div className="text-xs text-slate-500">Net Payable = Total Earnings − Total Advances</div>

          <div className="no-print mt-4 flex gap-2">
            <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={() => setConfirmDownload('excel')} disabled={downloading}>
              Download Excel
            </button>
            <button className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={() => setConfirmDownload('pdf')} disabled={downloading}>
              Download PDF
            </button>
          </div>
        </div>
      )}

      {confirmDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h2 className="mb-3 text-lg font-semibold">Confirm download</h2>
            <p className="mb-4 text-sm text-slate-600">
              Download payslip as {confirmDownload === 'excel' ? 'Excel' : 'PDF'}?
            </p>
            <div className="flex justify-end gap-2">
              <button className="rounded border px-4 py-2 text-sm" onClick={() => setConfirmDownload(null)} disabled={downloading}>Cancel</button>
              <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={() => doDownload(confirmDownload)} disabled={downloading}>
                {downloading ? 'Downloading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
