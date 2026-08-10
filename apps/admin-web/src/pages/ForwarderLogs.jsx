import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, EmptyState, Select } from '../components/ui';

export default function ForwarderLogs() {
  const [data, setData] = useState(null);
  const [matchStatus, setMatchStatus] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    const params = new URLSearchParams({ limit: '50' });
    if (matchStatus) params.set('matchStatus', matchStatus);
    api.get(`/api/admin/forwarder-logs?${params.toString()}`).then(setData).catch(() => setData({ data: [] }));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchStatus]);

  const reprocess = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/api/admin/forwarder-logs/${id}/reprocess`);
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Forwarder logs</h1>
        <Select value={matchStatus} onChange={(e) => setMatchStatus(e.target.value)} className="w-48">
          <option value="">All statuses</option>
          <option value="matched">Matched</option>
          <option value="matched_low">Matched (low confidence)</option>
          <option value="unmatched">Unmatched</option>
          <option value="irrelevant">Irrelevant</option>
          <option value="duplicate">Duplicate</option>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {!data?.data?.length ? (
          <EmptyState title="No forwarder logs" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Merchant</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Message</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((l) => (
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">{l.merchantId?.name}</td>
                  <td className="px-4 py-2">{l.type}</td>
                  <td className="px-4 py-2 max-w-xs truncate" title={l.message}>
                    {l.message}
                  </td>
                  <td className="px-4 py-2">
                    <Badge status={l.matchStatus} />
                  </td>
                  <td className="px-4 py-2 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Button variant="secondary" onClick={() => reprocess(l._id)} disabled={busyId === l._id}>
                      Reprocess
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
