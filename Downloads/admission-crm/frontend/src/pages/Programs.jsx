import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button, Card, Modal, Field, Input, Select, Spinner, Empty, Alert, Badge } from '../components/UI';

const YEARS = ['2024-25', '2025-26', '2026-27', '2027-28'];

export default function Programs() {
  const [list, setList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    department_id: '', name: '', course_type: 'UG', entry_type: 'Regular',
    admission_mode: 'Government', academic_year: '2025-26', total_intake: '',
    quotas: { KCET: '', COMEDK: '', Management: '' },
  });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/programs'), api.get('/masters/departments')])
      .then(([p, d]) => { setList(p.data); setDepartments(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const quotaSum = Object.values(form.quotas).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const intakeNum = parseInt(form.total_intake) || 0;
  const quotaValid = quotaSum === intakeNum && intakeNum > 0;

  const handleSubmit = async () => {
    if (!form.department_id || !form.name || !form.total_intake) return setError('Fill all required fields.');
    if (!quotaValid) return setError(`Quota sum (${quotaSum}) must equal total intake (${intakeNum}).`);
    setSaving(true); setError('');
    try {
      await api.post('/programs', {
        ...form,
        quotas: {
          KCET: parseInt(form.quotas.KCET) || 0,
          COMEDK: parseInt(form.quotas.COMEDK) || 0,
          Management: parseInt(form.quotas.Management) || 0,
        },
      });
      setOpen(false);
      setForm({ department_id: '', name: '', course_type: 'UG', entry_type: 'Regular', admission_mode: 'Government', academic_year: '2025-26', total_intake: '', quotas: { KCET: '', COMEDK: '', Management: '' } });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this program and all its seat matrix data?')) return;
    await api.delete(`/programs/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Programs & Branches</h2>
          <p className="text-sm text-gray-400 mt-0.5">Configure academic programs with intake and quotas</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Program</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {list.length === 0 ? <Empty icon="📘" message="No programs configured yet." /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-3 font-semibold">Program</th>
                  <th className="text-left pb-3 font-semibold">Type</th>
                  <th className="text-left pb-3 font-semibold">Mode</th>
                  <th className="text-left pb-3 font-semibold">Year</th>
                  <th className="text-left pb-3 font-semibold">Intake</th>
                  <th className="text-left pb-3 font-semibold">KCET / COMEDK / Mgmt</th>
                  <th className="text-right pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-3">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.department_name}</p>
                    </td>
                    <td className="py-3">
                      <Badge color="blue">{p.course_type}</Badge>{' '}
                      <Badge color="gray">{p.entry_type}</Badge>
                    </td>
                    <td className="py-3"><Badge color="yellow">{p.admission_mode}</Badge></td>
                    <td className="py-3 text-gray-500">{p.academic_year}</td>
                    <td className="py-3 font-bold text-gray-800">{p.total_intake}</td>
                    <td className="py-3 text-xs text-gray-500">
                      {p.quotas ? (
                        <span>
                          {p.quotas.KCET?.total ?? 0} / {p.quotas.COMEDK?.total ?? 0} / {p.quotas.Management?.total ?? 0}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setError(''); }}
        title="Add Program"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !quotaValid}>{saving ? 'Saving...' : 'Save Program'}</Button>
          </>
        }
      >
        {error && <Alert type="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Program Name *">
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. B.E. Computer Science" />
          </Field>
          <Field label="Department *">
            <Select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Course Type">
            <Select value={form.course_type} onChange={e => setForm({ ...form, course_type: e.target.value })}>
              <option>UG</option><option>PG</option>
            </Select>
          </Field>
          <Field label="Entry Type">
            <Select value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}>
              <option>Regular</option><option>Lateral</option>
            </Select>
          </Field>
          <Field label="Admission Mode">
            <Select value={form.admission_mode} onChange={e => setForm({ ...form, admission_mode: e.target.value })}>
              <option>Government</option><option>Management</option>
            </Select>
          </Field>
          <Field label="Academic Year">
            <Select value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}>
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </Select>
          </Field>
          <Field label="Total Intake *">
            <Input type="number" min="1" value={form.total_intake} onChange={e => setForm({ ...form, total_intake: e.target.value })} placeholder="e.g. 60" />
          </Field>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Quota Distribution</p>
          <div className="grid grid-cols-3 gap-3">
            {['KCET', 'COMEDK', 'Management'].map(q => (
              <Field key={q} label={q}>
                <Input
                  type="number" min="0"
                  value={form.quotas[q]}
                  onChange={e => setForm({ ...form, quotas: { ...form.quotas, [q]: e.target.value } })}
                  placeholder="0"
                />
              </Field>
            ))}
          </div>
          <p className={`text-xs mt-1 font-semibold ${quotaValid ? 'text-green-600' : 'text-red-500'}`}>
            {quotaValid
              ? `✓ Quota sum matches intake (${intakeNum})`
              : `Quota sum: ${quotaSum} — must equal intake: ${intakeNum}`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
