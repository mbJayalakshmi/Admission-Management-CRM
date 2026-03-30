import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button, Card, Modal, Field, Input, Select, Spinner, Empty, Alert } from '../components/UI';

export default function Departments() {
  const [list, setList] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ campus_id: '', name: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/masters/departments'),
      api.get('/masters/campuses'),
    ]).then(([d, c]) => {
      setList(d.data);
      setCampuses(c.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.campus_id || !form.name.trim()) return setError('All fields are required.');
    setSaving(true); setError('');
    try {
      await api.post('/masters/departments', form);
      setOpen(false);
      setForm({ campus_id: '', name: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    await api.delete(`/masters/departments/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Departments</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage departments under campuses</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Department</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {list.length === 0 ? <Empty icon="📂" message="No departments yet." /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-3 font-semibold">#</th>
                  <th className="text-left pb-3 font-semibold">Department</th>
                  <th className="text-left pb-3 font-semibold">Campus</th>
                  <th className="text-left pb-3 font-semibold">Institution</th>
                  <th className="text-right pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d, i) => (
                  <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-3 text-gray-400">{i + 1}</td>
                    <td className="py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="py-3 text-gray-500">{d.campus_name}</td>
                    <td className="py-3 text-gray-400 text-xs">{d.institution_name}</td>
                    <td className="py-3 text-right">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(d.id)}>Delete</Button>
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
        title="Add Department"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Campus">
          <Select value={form.campus_id} onChange={e => setForm({ ...form, campus_id: e.target.value })}>
            <option value="">Select campus</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.name} — {c.institution_name}</option>)}
          </Select>
        </Field>
        <Field label="Department Name">
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Computer Science" />
        </Field>
      </Modal>
    </div>
  );
}
