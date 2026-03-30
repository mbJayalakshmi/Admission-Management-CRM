import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button, Card, Spinner, Empty, Alert, Badge } from '../components/UI';

export default function Allocate() {
  const [applicants, setApplicants] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [availability, setAvailability] = useState(null);
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [working, setWorking] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/applicants'), api.get('/programs')])
      .then(([a, p]) => { setApplicants(a.data); setPrograms(p.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const unallocated = applicants.filter(a => !a.seat_locked);
  const allocated = applicants.filter(a => a.seat_locked);

  const selectedApplicant = applicants.find(a => a.id === parseInt(selected));

  useEffect(() => {
    if (!selectedApplicant) { setAvailability(null); return; }
    const prog = programs.find(p => p.id === selectedApplicant.program_id);
    if (!prog) return;
    const q = prog.quotas?.[selectedApplicant.quota];
    setAvailability({
      quota: selectedApplicant.quota,
      total: q?.total ?? 0,
      filled: q?.filled ?? 0,
      available: q?.available ?? 0,
    });
  }, [selected, programs]);

  const handleAllocate = async () => {
    if (!selected) return;
    setWorking(true); setActionMsg(''); setActionErr('');
    try {
      const res = await api.post('/admissions/allocate', { applicant_id: parseInt(selected) });
      setActionMsg(`✅ Seat locked. ${res.data.remaining} seats remaining in this quota.`);
      setSelected('');
      load();
    } catch (err) {
      setActionErr(err.response?.data?.message || 'Allocation failed.');
    } finally {
      setWorking(false);
    }
  };

  const handleConfirm = async (id) => {
    setWorking(true); setActionMsg(''); setActionErr('');
    try {
      const res = await api.post('/admissions/confirm', { applicant_id: id });
      setActionMsg(`🎉 Admission confirmed! Number: ${res.data.admission_number}`);
      load();
    } catch (err) {
      setActionErr(err.response?.data?.message || 'Confirmation failed.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Spinner />;

  const prog = selectedApplicant ? programs.find(p => p.id === selectedApplicant.program_id) : null;
  const isGovt = selectedApplicant?.quota === 'KCET' || selectedApplicant?.quota === 'COMEDK';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900">Seat Allocation</h2>
        <p className="text-sm text-gray-400 mt-0.5">Lock seats and confirm admissions</p>
      </div>

      {actionMsg && <Alert type="success" className="mb-4">{actionMsg}</Alert>}
      {actionErr && <Alert type="error" className="mb-4">{actionErr}</Alert>}

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Allocate panel */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">Lock a Seat</h3>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Select Applicant</label>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setActionMsg(''); setActionErr(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— choose unallocated applicant —</option>
              {unallocated.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.quota} — {a.program_name})
                </option>
              ))}
            </select>
          </div>

          {selectedApplicant && (
            <div className="space-y-3 mb-4">
              {/* Applicant info */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Program</span>
                  <span className="font-medium text-gray-800 text-right max-w-xs">{prog?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quota</span>
                  <Badge color="blue">{selectedApplicant.quota}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <Badge color="gray">{selectedApplicant.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Marks</span>
                  <span className="font-medium">{selectedApplicant.qualifying_marks || '—'}%</span>
                </div>
                {isGovt && selectedApplicant.allotment_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Allotment No.</span>
                    <span className="font-mono text-xs">{selectedApplicant.allotment_number}</span>
                  </div>
                )}
              </div>

              {/* Quota availability */}
              {availability && (
                <Alert type={availability.available > 0 ? 'info' : 'error'}>
                  <strong>{availability.quota}</strong>: {availability.filled} filled / {availability.total} total —{' '}
                  {availability.available > 0
                    ? <strong>{availability.available} seats available</strong>
                    : <strong>⛔ Quota full — cannot allocate</strong>}
                </Alert>
              )}

              {/* Flow label */}
              <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${isGovt ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                {isGovt ? '🏛 Government Flow (KCET/COMEDK)' : '🏢 Management Flow'}
              </div>
            </div>
          )}

          <Button
            onClick={handleAllocate}
            disabled={!selected || working || (availability && availability.available <= 0)}
            className="w-full justify-center"
          >
            {working ? 'Processing...' : 'Lock Seat'}
          </Button>

          {unallocated.length === 0 && (
            <Alert type="success" className="mt-3">All applicants have seats allocated.</Alert>
          )}
        </Card>

        {/* Quota availability overview */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">Quota Availability</h3>
          {programs.length === 0 ? <Empty icon="🪑" message="No programs configured." /> : (
            <div className="space-y-4">
              {programs.map(p => (
                <div key={p.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="font-semibold text-sm text-gray-700 mb-2">{p.name}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['KCET', 'COMEDK', 'Management'].map(q => {
                      const qd = p.quotas?.[q];
                      const full = qd && qd.filled >= qd.total;
                      return (
                        <div key={q} className={`rounded-lg p-2 text-center ${full ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'}`}>
                          <p className="text-xs font-bold text-gray-500">{q}</p>
                          <p className={`text-sm font-extrabold ${full ? 'text-red-500' : 'text-emerald-600'}`}>
                            {qd ? `${qd.available}` : '—'}
                          </p>
                          <p className="text-xs text-gray-400">{qd ? `${qd.filled}/${qd.total}` : '0/0'}</p>
                          {full && <p className="text-xs text-red-400 font-bold">FULL</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Allocated seats — confirm admission */}
      <Card>
        <h3 className="font-bold text-gray-800 mb-4">Allocated Seats — Pending Confirmation</h3>
        {allocated.length === 0 ? (
          <Empty icon="🪑" message="No seats locked yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-3 font-semibold">Applicant</th>
                  <th className="text-left pb-3 font-semibold">Program</th>
                  <th className="text-left pb-3 font-semibold">Quota</th>
                  <th className="text-left pb-3 font-semibold">Docs</th>
                  <th className="text-left pb-3 font-semibold">Fee</th>
                  <th className="text-left pb-3 font-semibold">Admission No.</th>
                  <th className="text-right pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {allocated.map(a => {
                  const canConfirm = !a.admission_number && a.fee_status === 'Paid';
                  const docColor = { Pending: 'red', Submitted: 'yellow', Verified: 'green' };
                  return (
                    <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{a.name}</td>
                      <td className="py-3 text-gray-500 text-xs max-w-xs truncate">{a.program_name}</td>
                      <td className="py-3"><Badge color="blue">{a.quota}</Badge></td>
                      <td className="py-3"><Badge color={docColor[a.doc_status]}>{a.doc_status}</Badge></td>
                      <td className="py-3">
                        <Badge color={a.fee_status === 'Paid' ? 'green' : 'yellow'}>{a.fee_status}</Badge>
                      </td>
                      <td className="py-3">
                        {a.admission_number
                          ? <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">{a.admission_number}</span>
                          : <span className="text-gray-300 text-xs">Not confirmed</span>}
                      </td>
                      <td className="py-3 text-right">
                        {a.admission_number ? (
                          <Badge color="green">✓ Admitted</Badge>
                        ) : canConfirm ? (
                          <Button size="sm" variant="success" onClick={() => handleConfirm(a.id)} disabled={working}>
                            Confirm Admission
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {a.fee_status !== 'Paid' ? 'Awaiting fee' : 'Awaiting docs'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
