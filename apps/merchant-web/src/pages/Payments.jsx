import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Badge, Button, Card, EmptyState, Select, Toast } from '../components/ui';

export default function Payments() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const qs = status ? `?status=${status}&limit=50` : '?limit=50';
    api.get(`/api/merchant/payments${qs}`).then(setData).catch(() => setData({ data: [] }));
  }, [status]);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3500);
  };

  const handleMarkPaid = async (paymentId) => {
    try {
      await api.post(`/api/merchant/payments/${paymentId}/confirm`, {});
      showToast('success', 'Payment updated', 'Payment marked as paid.');
      setTimeout(() => window.location.reload(), 350);
    } catch (err) {
      showToast('error', 'Could not mark paid', err.message || 'Something went wrong.');
    }
  };

  const handleMarkFailed = async (paymentId) => {
    try {
      await api.post(`/api/merchant/payments/${paymentId}/cancel`);
      showToast('success', 'Payment updated', 'Payment marked as failed.');
      setTimeout(() => window.location.reload(), 350);
    } catch (err) {
      showToast('error', 'Could not mark failed', err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="space-y-6">
      <Toast {...(toast || {})} onClose={() => setToast(null)} />

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

      {toast && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm text-slate-700">
          <span className="font-medium">{toast.title}:</span> {toast.message}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {!data?.data?.length ? (
          <EmptyState title="No payments yet" description="Take your first payment from the POS page." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Message</th>
                <th className="px-4 py-2 font-medium">UPI</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                  <td className="px-4 py-3">
                    <Link to={`/payments/${p.id}`} className="text-brand-700 font-medium hover:underline">
                      {p.id}
                    </Link>
                    {p.merchantOrderRef && <div className="text-xs text-slate-400 mt-1">{p.merchantOrderRef}</div>}
                  </td>
                  <td className="px-4 py-3 font-medium">₹{p.amount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="font-medium text-slate-700">{p.description || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.upiId}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Badge status={p.status} />
                      {p.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            className="text-xs px-3 py-1.5 !rounded-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleMarkPaid(p.id)}
                          >
                            Success
                          </Button>
                          <Button
                            variant="danger"
                            className="text-xs px-3 py-1.5 !rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200"
                            onClick={() => handleMarkFailed(p.id)}
                          >
                            Failed
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
