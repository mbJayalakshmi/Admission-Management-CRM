import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button, Card, Modal, Field, Input, Select, Spinner, Empty, Alert } from '../components/UI';

export default function Campuses() {
  const [list, setList] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ institution_id: '', name: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/masters/campuses'),
      api.get('/masters/institutions'),
    ]).then(([c, i]) => {
      setList(c.data);
      setInstitutions(i.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.institution_id || !form.name.trim()) return setError('All fields are required.');
    setSaving(true); setError('');
    try {
      await api.post('/masters/campuses', form);
      setOpen(false);
      setForm({ institution_id: '', name: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campus?')) return;
    await api.delete(`/masters/campuses/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Campuses</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage campuses under institutions</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add Campus</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {list.length === 0 ? <Empty icon="🏫" message="No campuses yet." /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-3 font-semibold">#</th>
                  <th className="text-left pb-3 font-semibold">Campus</th>
                  <th className="text-left pb-3 font-semibold">Institution</th>
                  <th className="text-right pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-3 text-gray-400">{i + 1}</td>
                    <td className="py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="py-3 text-gray-500">{c.institution_name} <span className="text-xs text-gray-400">({c.institution_code})</span></td>
                    <td className="py-3 text-right">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>Delete</Button>
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
        title="Add Campus"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Institution">
          <Select value={form.institution_id} onChange={e => setForm({ ...form, institution_id: e.target.value })}>
            <option value="">Select institution</option>
            {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </Field>
        <Field label="Campus Name">
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Campus" />
        </Field>
      </Modal>
    </div>
  );
}
