import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, Spinner, Empty, Alert, Button, Badge } from '../components/UI';

export default function SeatMatrix() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({}); // { [progId]: { KCET, COMEDK, Management } }
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState({});

  const load = () => {
    setLoading(true);
    api.get('/programs')
      .then(res => setPrograms(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getEditing = (prog) => {
    if (editing[prog.id]) return editing[prog.id];
    return {
      KCET: prog.quotas?.KCET?.total ?? 0,
      COMEDK: prog.quotas?.COMEDK?.total ?? 0,
      Management: prog.quotas?.Management?.total ?? 0,
    };
  };

  const handleChange = (progId, quota, val) => {
    setEditing(prev => ({
      ...prev,
      [progId]: { ...getEditingById(progId), [quota]: parseInt(val) || 0 },
    }));
  };

  const getEditingById = (progId) => {
    const prog = programs.find(p => p.id === progId);
    return editing[progId] || {
      KCET: prog?.quotas?.KCET?.total ?? 0,
      COMEDK: prog?.quotas?.COMEDK?.total ?? 0,
      Management: prog?.quotas?.Management?.total ?? 0,
    };
  };

  const handleSave = async (prog) => {
    const quotas = getEditingById(prog.id);
    const sum = Object.values(quotas).reduce((s, v) => s + v, 0);
    if (sum !== prog.total_intake) {
      setMsg(prev => ({ ...prev, [prog.id]: { type: 'error', text: `Quota sum (${sum}) must equal intake (${prog.total_intake})` } }));
      return;
    }
    setSaving(prog.id);
    try {
      await api.put(`/programs/${prog.id}/quotas`, { quotas });
      setMsg(prev => ({ ...prev, [prog.id]: { type: 'success', text: 'Seat matrix saved.' } }));
      load();
    } catch (err) {
      setMsg(prev => ({ ...prev, [prog.id]: { type: 'error', text: err.response?.data?.message || 'Failed.' } }));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900">Seat Matrix & Quota</h2>
        <p className="text-sm text-gray-400 mt-0.5">Configure quota-wise seat distribution per program</p>
      </div>

      {programs.length === 0 ? (
        <Card><Empty icon="🪑" message="No programs configured. Add programs first." /></Card>
      ) : (
        programs.map(prog => {
          const q = getEditingById(prog.id);
          const sum = Object.values(q).reduce((s, v) => s + v, 0);
          const valid = sum === prog.total_intake;
          const feedback = msg[prog.id];

          return (
            <Card key={prog.id} className="mb-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{prog.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{prog.department_name} • {prog.course_type} • {prog.academic_year}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-gray-800">{prog.total_intake}</p>
                  <p className="text-xs text-gray-400">Total Intake</p>
                </div>
              </div>

              {feedback && (
                <Alert type={feedback.type} className="mb-4">{feedback.text}</Alert>
              )}

              <div className="grid grid-cols-3 gap-4 mb-4">
                {['KCET', 'COMEDK', 'Management'].map(quota => {
                  const filled = prog.quotas?.[quota]?.filled ?? 0;
                  const total = q[quota];
                  const isFull = filled >= total && total > 0;
                  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
                  const colors = { KCET: 'bg-blue-500', COMEDK: 'bg-emerald-500', Management: 'bg-amber-500' };

                  return (
                    <div key={quota} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-gray-700">{quota}</span>
                        <Badge color={isFull ? 'red' : 'green'}>{isFull ? 'Full' : 'Open'}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="number" min="0"
                          value={q[quota]}
                          onChange={e => handleChange(prog.id, quota, e.target.value)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <span className="text-xs text-gray-400">seats</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="text-emerald-600 font-semibold">{filled}</span> filled / {total}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${colors[quota]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${valid ? 'text-green-600' : 'text-red-500'}`}>
                  {valid ? `✓ Quota balanced (${sum}/${prog.total_intake})` : `⚠ Quota sum ${sum} ≠ intake ${prog.total_intake}`}
                </p>
                <Button
                  onClick={() => handleSave(prog)}
                  disabled={saving === prog.id || !valid}
                  size="sm"
                >
                  {saving === prog.id ? 'Saving...' : 'Save Matrix'}
                </Button>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
