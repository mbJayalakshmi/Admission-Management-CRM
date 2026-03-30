import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api/axios';
import { StatCard, Card, Spinner, Badge } from '../components/UI';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admissions/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  const remaining = data.total_intake - data.total_admitted;
  const fillPct = data.total_intake ? Math.round((data.total_admitted / data.total_intake) * 100) : 0;

  const quotaColors = { KCET: '#3b82f6', COMEDK: '#10b981', Management: '#f59e0b' };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5">Admission overview at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Intake"    value={data.total_intake}    sub={`${data.program_stats.length} program(s)`} color="blue"   icon="🎓" />
        <StatCard label="Admitted"        value={data.total_admitted}  sub={`${remaining} seats remaining`}            color="green"  icon="✅" />
        <StatCard label="Pending Docs"    value={data.pending_docs}    sub="Awaiting verification"                     color="yellow" icon="📄" />
        <StatCard label="Fee Pending"     value={data.fee_pending}     sub="Seat locked, unpaid"                       color="red"    icon="⚠️" />
      </div>

      {/* Fill progress */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Overall Seat Fill Rate</p>
          <span className="text-sm font-bold text-blue-600">{fillPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{data.total_admitted} admitted / {data.total_intake} total intake</p>
      </Card>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Quota-wise chart */}
        <Card>
          <p className="text-sm font-bold text-gray-800 mb-4">Quota-wise Seat Fill</p>
          {data.quota_stats.length === 0 ? (
            <p className="text-xs text-gray-400">No quota data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.quota_stats} barCategoryGap="30%">
                <XAxis dataKey="quota" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill="#e5e7eb" radius={[4,4,0,0]} />
                <Bar dataKey="filled" name="Filled" radius={[4,4,0,0]}>
                  {data.quota_stats.map((entry) => (
                    <Cell key={entry.quota} fill={quotaColors[entry.quota] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Program-wise table */}
        <Card>
          <p className="text-sm font-bold text-gray-800 mb-4">Program-wise Status</p>
          {data.program_stats.length === 0 ? (
            <p className="text-xs text-gray-400">No programs configured.</p>
          ) : (
            <div className="space-y-3">
              {data.program_stats.map(p => {
                const pct = p.total_intake ? Math.round((p.seated / p.total_intake) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate max-w-xs">{p.name}</span>
                      <span className="text-gray-400 text-xs ml-2">{p.seated}/{p.total_intake}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-400' : 'bg-blue-400'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Fee pending list */}
      {data.fee_pending_list.length > 0 && (
        <Card>
          <p className="text-sm font-bold text-gray-800 mb-4">⚠️ Fee Pending — Seats at Risk</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-semibold">Applicant</th>
                  <th className="text-left pb-2 font-semibold">Program</th>
                  <th className="text-left pb-2 font-semibold">Quota</th>
                  <th className="text-left pb-2 font-semibold">Fee</th>
                </tr>
              </thead>
              <tbody>
                {data.fee_pending_list.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 font-medium text-gray-700">{row.name}</td>
                    <td className="py-2 text-gray-500">{row.program_name}</td>
                    <td className="py-2"><Badge color="blue">{row.quota}</Badge></td>
                    <td className="py-2"><Badge color="red">Pending</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
