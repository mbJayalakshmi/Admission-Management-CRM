import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button, Card, Modal, Field, Input, Select, Spinner, Empty, Alert, Badge } from '../components/UI';

const CATEGORIES = ['GM', 'SC', 'ST', 'OBC', 'EWS'];
const QUOTAS = ['KCET', 'COMEDK', 'Management'];

export default function Applicants() {
  const [list, setList] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', date_of_birth: '', gender: 'Male',
    category: 'GM', entry_type: 'Regular', quota: 'KCET',
    program_id: '', qualifying_marks: '', allotment_number: '', state: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/applicants'), api.get('/programs')])
      .then(([a, p]) => { setList(a.data); setPrograms(p.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    setDetailId(id);
    const res = await api.get(`/applicants/${id}`);
    setDetail(res.data);
  };

  const updateDoc = async (applicantId, docId, status) => {
    await api.patch(`/applicants/${applicantId}/documents/${docId}`, { status });
    const res = await api.get(`/applicants/${applicantId}`);
    setDetail(res.data);
    load();
  };

  const updateFee = async (id, fee_status) => {
    await api.patch(`/applicants/${id}/fee`, { fee_status });
    load();
    if (detail?.id === id) {
      const res = await api.get(`/applicants/${id}`);
      setDetail(res.data);
    }
  };

  const handleSubmit = async () => {
    const { name, email, mobile, category, quota, program_id } = form;
    if (!name || !email || !mobile || !category || !quota || !program_id)
      return setError('Fill all required (*) fields.');
    setSaving(true); setError('');
    try {
      await api.post('/applicants', form);
      setOpen(false);
      setForm({ name: '', email: '', mobile: '', date_of_birth: '', gender: 'Male', category: 'GM', entry_type: 'Regular', quota: 'KCET', program_id: '', qualifying_marks: '', allotment_number: '', state: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = list.filter(a => {
    if (filter === 'pending_doc') return a.doc_status === 'Pending';
    if (filter === 'fee_pending') return a.fee_status === 'Pending' && a.seat_locked;
    if (filter === 'admitted') return !!a.admission_number;
    if (filter === 'locked') return a.seat_locked && !a.admission_number;
    return true;
  });

  const docStatusColor = { Pending: 'red', Submitted: 'yellow', Verified: 'green' };
  const feeColor = { Pending: 'yellow', Paid: 'green' };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Applicants</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage all applicants and their admission status</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Applicant</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {[['all','All'], ['pending_doc','Pending Docs'], ['fee_pending','Fee Pending'], ['locked','Seat Locked'], ['admitted','Admitted']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {filtered.length === 0 ? <Empty icon="👤" message="No applicants found." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left pb-3 font-semibold">#</th>
                    <th className="text-left pb-3 font-semibold">Applicant</th>
                    <th className="text-left pb-3 font-semibold">Program</th>
                    <th className="text-left pb-3 font-semibold">Quota</th>
                    <th className="text-left pb-3 font-semibold">Category</th>
                    <th className="text-left pb-3 font-semibold">Docs</th>
                    <th className="text-left pb-3 font-semibold">Fee</th>
                    <th className="text-left pb-3 font-semibold">Admission No.</th>
                    <th className="text-right pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="py-3 text-gray-400">{i + 1}</td>
                      <td className="py-3">
                        <p className="font-medium text-gray-800">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.mobile}</p>
                      </td>
                      <td className="py-3 text-gray-600 text-xs max-w-xs truncate">{a.program_name}</td>
                      <td className="py-3"><Badge color="blue">{a.quota}</Badge></td>
                      <td className="py-3"><Badge color="gray">{a.category}</Badge></td>
                      <td className="py-3"><Badge color={docStatusColor[a.doc_status]}>{a.doc_status}</Badge></td>
                      <td className="py-3">
                        <select
                          value={a.fee_status}
                          onChange={e => updateFee(a.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none"
                        >
                          <option>Pending</option>
                          <option>Paid</option>
                        </select>
                      </td>
                      <td className="py-3">
                        {a.admission_number
                          ? <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">{a.admission_number}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openDetail(a.id)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add Applicant Modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setError(''); }}
        title="Add Applicant"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save Applicant'}</Button>
          </>
        }
      >
        {error && <Alert type="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-x-3">
          <Field label="Full Name *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></Field>
          <Field label="Email *"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></Field>
          <Field label="Mobile *"><Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit mobile" /></Field>
          <Field label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
              {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label="Category *">
            <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Entry Type">
            <Select value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}>
              <option>Regular</option><option>Lateral</option>
            </Select>
          </Field>
          <Field label="Quota *">
            <Select value={form.quota} onChange={e => setForm({ ...form, quota: e.target.value })}>
              {QUOTAS.map(q => <option key={q}>{q}</option>)}
            </Select>
          </Field>
          <Field label="Program *">
            <Select value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })}>
              <option value="">Select program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Qualifying Marks (%)">
            <Input type="number" min="0" max="100" value={form.qualifying_marks} onChange={e => setForm({ ...form, qualifying_marks: e.target.value })} placeholder="e.g. 85" />
          </Field>
          <Field label="Allotment No. (Govt)">
            <Input value={form.allotment_number} onChange={e => setForm({ ...form, allotment_number: e.target.value })} placeholder="KCET/COMEDK allotment no." />
          </Field>
          <Field label="State">
            <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="e.g. Karnataka" />
          </Field>
        </div>
      </Modal>

      {/* Applicant Detail / Document Checklist Modal */}
      <Modal
        open={!!detailId}
        onClose={() => { setDetailId(null); setDetail(null); }}
        title={detail ? `${detail.name} — Documents & Status` : 'Loading...'}
        footer={<Button variant="ghost" onClick={() => { setDetailId(null); setDetail(null); }}>Close</Button>}
      >
        {!detail ? <Spinner /> : (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              <div><span className="text-gray-400 text-xs">Email</span><p className="font-medium">{detail.email}</p></div>
              <div><span className="text-gray-400 text-xs">Mobile</span><p className="font-medium">{detail.mobile}</p></div>
              <div><span className="text-gray-400 text-xs">Program</span><p className="font-medium">{detail.program_name}</p></div>
              <div><span className="text-gray-400 text-xs">Quota</span><Badge color="blue">{detail.quota}</Badge></div>
              <div><span className="text-gray-400 text-xs">Category</span><Badge color="gray">{detail.category}</Badge></div>
              <div><span className="text-gray-400 text-xs">Marks</span><p className="font-medium">{detail.qualifying_marks || '—'}%</p></div>
              {detail.allotment_number && (
                <div className="col-span-2"><span className="text-gray-400 text-xs">Allotment No.</span><p className="font-mono text-sm">{detail.allotment_number}</p></div>
              )}
              {detail.admission_number && (
                <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-semibold mb-0.5">Admission Number</p>
                  <p className="font-mono text-green-800 font-bold">{detail.admission_number}</p>
                </div>
              )}
            </div>

            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Document Checklist</p>
            <div className="space-y-2">
              {detail.documents?.map(doc => (
                <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-sm text-gray-700">{doc.document_name}</span>
                  <select
                    value={doc.status}
                    onChange={e => updateDoc(detail.id, doc.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
                  >
                    <option>Pending</option>
                    <option>Submitted</option>
                    <option>Verified</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-gray-600">Fee Status:</span>
              <select
                value={detail.fee_status}
                onChange={e => updateFee(detail.id, e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
              >
                <option>Pending</option>
                <option>Paid</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
