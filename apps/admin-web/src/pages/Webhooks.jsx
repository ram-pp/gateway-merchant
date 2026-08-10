import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, EmptyState, Select } from '../components/ui';

export default function Webhooks() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    const params = new URLSearchParams({ limit: '50' });
    if (status) params.set('status', status);
    api.get(`/api/admin/webhook-deliveries?${params.toString()}`).then(setData).catch(() => setData({ data: [] }));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const retry = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/api/admin/webhook-deliveries/${id}/retry`);
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Webhook deliveries</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="exhausted">Exhausted</option>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {!data?.data?.length ? (
          <EmptyState title="No webhook deliveries" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Merchant</th>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Attempt</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Last error</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((d) => (
                <tr key={d._id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">{d.merchantId?.name}</td>
                  <td className="px-4 py-2">{d.event}</td>
                  <td className="px-4 py-2">{d.attempt}/{d.maxAttempts}</td>
                  <td className="px-4 py-2">
                    <Badge status={d.status} />
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate text-slate-500" title={d.lastError}>
                    {d.lastError || '—'}
                  </td>
                  <td className="px-4 py-2">
                    {d.status !== 'delivered' && (
                      <Button variant="secondary" onClick={() => retry(d._id)} disabled={busyId === d._id}>
                        Retry
                      </Button>
                    )}
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
