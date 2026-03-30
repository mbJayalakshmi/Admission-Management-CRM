import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button, Card, Modal, Field, Input, Spinner, Empty, Badge, Alert } from '../components/UI';

export default function Institutions() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/masters/institutions')
      .then(res => setList(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) return setError('Both fields are required.');
    setSaving(true); setError('');
    try {
      await api.post('/masters/institutions', form);
      setOpen(false);
      setForm({ name: '', code: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this institution? This will also delete related campuses, departments, and programs.')) return;
    await api.delete(`/masters/institutions/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Institutions</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage institutions in the system</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Institution</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {list.length === 0 ? <Empty icon="🏛" message="No institutions yet. Add one to get started." /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-3 font-semibold">#</th>
                  <th className="text-left pb-3 font-semibold">Name</th>
                  <th className="text-left pb-3 font-semibold">Code</th>
                  <th className="text-left pb-3 font-semibold">Created</th>
                  <th className="text-right pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((inst, i) => (
                  <tr key={inst.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-3 text-gray-400">{i + 1}</td>
                    <td className="py-3 font-medium text-gray-800">{inst.name}</td>
                    <td className="py-3"><Badge color="blue">{inst.code}</Badge></td>
                    <td className="py-3 text-gray-400">{new Date(inst.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(inst.id)}>Delete</Button>
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
        title="Add Institution"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        {error && <Alert type="error" className="mb-4">{error}</Alert>}
        <Field label="Institution Name">
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. KLE Institute of Technology" />
        </Field>
        <Field label="Short Code (used in Admission No.)">
          <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. KLEIT" />
        </Field>
      </Modal>
    </div>
  );
}
