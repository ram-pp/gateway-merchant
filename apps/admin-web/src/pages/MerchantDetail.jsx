import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Badge, Button, Card } from '../components/ui';

export default function MerchantDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  const load = () => api.get(`/api/admin/merchants/${id}`).then(setData);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleStatus = async () => {
    const next = data.merchant.status === 'active' ? 'suspended' : 'active';
    await api.patch(`/api/admin/merchants/${id}`, { status: next });
    load();
  };

  if (!data) return <p className="text-slate-500">Loading…</p>;
  const { merchant, upiAccounts, users, recentPayments, paymentCount } = data;

  return (
    <div className="space-y-6">
      <Link to="/merchants" className="text-sm text-admin-700 hover:underline">
        ← Back to merchants
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{merchant.name}</h1>
          <p className="text-sm text-slate-500">{merchant.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge status={merchant.status} />
          <Button variant={merchant.status === 'active' ? 'danger' : 'primary'} onClick={toggleStatus}>
            {merchant.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Total payments</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{paymentCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">UPI accounts</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{upiAccounts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Staff users</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{users.length}</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">UPI accounts</h2>
        {upiAccounts.length === 0 ? (
          <p className="text-sm text-slate-500">No UPI accounts added.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="py-1 font-medium">UPI id</th>
                <th className="py-1 font-medium">Provider</th>
                <th className="py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {upiAccounts.map((a) => (
                <tr key={a._id} className="border-t border-slate-100">
                  <td className="py-1.5">{a.upiId}</td>
                  <td className="py-1.5">{a.upiProvider}</td>
                  <td className="py-1.5">
                    <Badge status={a.isActive ? 'active' : 'suspended'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Staff</h2>
        {users.map((u) => (
          <div key={u._id} className="text-sm py-1">
            {u.email} <span className="text-slate-400">({u.role})</span>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Recent payments</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="py-1 font-medium">ID</th>
                <th className="py-1 font-medium">Amount</th>
                <th className="py-1 font-medium">Status</th>
                <th className="py-1 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p._id} className="border-t border-slate-100">
                  <td className="py-1.5">
                    <Link to={`/payments/${p._id}`} className="text-admin-700 hover:underline">
                      {p.publicId}
                    </Link>
                  </td>
                  <td className="py-1.5">₹{p.amount}</td>
                  <td className="py-1.5">
                    <Badge status={p.status} />
                  </td>
                  <td className="py-1.5 text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
