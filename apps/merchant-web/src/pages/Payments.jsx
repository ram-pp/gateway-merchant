import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Badge, Card, EmptyState, Select } from '../components/ui';

export default function Payments() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const qs = status ? `?status=${status}&limit=50` : '?limit=50';
    api.get(`/api/merchant/payments${qs}`).then(setData).catch(() => setData({ data: [] }));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {!data?.data?.length ? (
          <EmptyState title="No payments yet" description="Take your first payment from the POS page." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">UPI</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/payments/${p.id}`} className="text-brand-700 font-medium hover:underline">
                      {p.id}
                    </Link>
                    {p.merchantOrderRef && <div className="text-xs text-slate-400">{p.merchantOrderRef}</div>}
                  </td>
                  <td className="px-4 py-2 font-medium">₹{p.amount}</td>
                  <td className="px-4 py-2 text-slate-500">{p.upiId}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Badge status={p.status} />
                      {p.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded"
                            onClick={async () => {
                              try {
                                await api.post(`/api/merchant/payments/${p.id}/confirm`, {});
                                window.location.reload();
                              } catch (err) {
                                // eslint-disable-next-line no-alert
                                alert(err.message || 'Could not mark paid');
                              }
                            }}
                          >
                            Mark paid
                          </button>
                          <button
                            className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 rounded"
                            onClick={async () => {
                              try {
                                await api.post(`/api/merchant/payments/${p.id}/cancel`);
                                window.location.reload();
                              } catch (err) {
                                // eslint-disable-next-line no-alert
                                alert(err.message || 'Could not mark failed');
                              }
                            }}
                          >
                            Mark failed
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
