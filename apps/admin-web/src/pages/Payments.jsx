import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Badge, Card, EmptyState, Input, Select } from '../components/ui';

export default function Payments() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    api.get(`/api/admin/payments?${params.toString()}`).then(setData).catch(() => setData({ data: [] }));
  }, [status, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <div className="flex gap-2">
          <Input placeholder="Search ID or ref…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {!data?.data?.length ? (
          <EmptyState title="No payments found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Merchant</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p._id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/payments/${p._id}`} className="text-admin-700 font-medium hover:underline">
                      {p.publicId}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{p.merchantId?.name}</td>
                  <td className="px-4 py-2 font-medium">₹{p.amount}</td>
                  <td className="px-4 py-2">
                    <Badge status={p.status} />
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
