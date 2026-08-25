import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, EmptyState, Modal, Select, Toast } from '../components/ui';

const PAGE_SIZE = 20;

export default function Payments() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [updatePayment, setUpdatePayment] = useState(null);
  const [viewPayment, setViewPayment] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (status) params.set('status', status);
    api.get(`/api/merchant/payments?${params.toString()}`).then(setData).catch(() => setData({ data: [] }));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3500);
  };

  const handleMarkPaid = async (paymentId) => {
    setUpdating(true);
    try {
      await api.post(`/api/merchant/payments/${paymentId}/confirm`, {});
      showToast('success', 'Payment updated', 'Payment marked as paid.');
      setUpdatePayment(null);
      load();
    } catch (err) {
      showToast('error', 'Could not mark paid', err.message || 'Something went wrong.');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkFailed = async (paymentId) => {
    setUpdating(true);
    try {
      await api.post(`/api/merchant/payments/${paymentId}/cancel`);
      showToast('success', 'Payment updated', 'Payment marked as failed.');
      setUpdatePayment(null);
      load();
    } catch (err) {
      showToast('error', 'Could not mark failed', err.message || 'Something went wrong.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async (paymentId) => {
    try {
      await api.post(`/api/merchant/payments/${paymentId}/cancel`);
      showToast('success', 'Payment updated', 'Payment cancelled.');
      setViewPayment(null);
      load();
    } catch (err) {
      showToast('error', 'Could not cancel payment', err.message || 'Something went wrong.');
    }
  };

  const pages = data?.pages || 1;

  return (
    <div className="space-y-6">
      <Toast {...(toast || {})} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <Select value={status} onChange={handleStatusChange} className="w-40">
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
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Order ID</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Customer Mobile</th>
                  <th className="px-4 py-2 font-medium">Transaction Id</th>
                  <th className="px-4 py-2 font-medium">UTR Number</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Payment Status</th>
                  <th className="px-4 py-2 font-medium">View</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{p.id}</span>
                      {p.merchantOrderRef && <div className="text-xs text-slate-400 mt-1">{p.merchantOrderRef}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{p.customerMobile || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.transactionId || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.utr || '—'}</td>
                    <td className="px-4 py-3 font-medium">₹{p.amount}</td>
                    <td className="px-4 py-3">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewPayment(p)}
                        className="text-brand-700 font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'pending' || p.status === 'expired' ? (
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1.5 !rounded-full"
                          onClick={() => setUpdatePayment(p)}
                        >
                          Update
                        </Button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>
                Page {data.page || page} of {pages} · {data.total} total
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal open={Boolean(updatePayment)} onClose={() => setUpdatePayment(null)} title="Update payment status">
        {updatePayment && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Mark order <span className="font-medium text-slate-800">{updatePayment.id}</span> (₹{updatePayment.amount},
              currently <span className="font-medium">{updatePayment.status}</span>) as:
            </p>
            <div className="flex gap-3">
              <Button
                variant="primary"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={updating}
                onClick={() => handleMarkPaid(updatePayment.id)}
              >
                Success
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={updating}
                onClick={() => handleMarkFailed(updatePayment.id)}
              >
                Failed
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(viewPayment)} onClose={() => setViewPayment(null)} title="Payment details">
        {viewPayment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">{viewPayment.id}</p>
              <Badge status={viewPayment.status} />
            </div>
            <dl className="text-sm space-y-2">
              <DetailRow label="Amount" value={`₹${viewPayment.amount}`} />
              <DetailRow label="Order ref" value={viewPayment.merchantOrderRef || '—'} />
              <DetailRow label="Customer mobile" value={viewPayment.customerMobile || '—'} />
              <DetailRow label="Transaction Id" value={viewPayment.transactionId || '—'} />
              <DetailRow label="UTR" value={viewPayment.utr || '—'} />
              <DetailRow label="UPI" value={viewPayment.upiId ? `${viewPayment.upiId} (${viewPayment.upiProvider})` : '—'} />
              <DetailRow label="Confirmation" value={viewPayment.confirmationSource || '—'} />
              <DetailRow label="Created" value={new Date(viewPayment.createdAt).toLocaleString()} />
              <DetailRow label="Expires" value={new Date(viewPayment.expiresAt).toLocaleString()} />
            </dl>
            {viewPayment.status === 'pending' && (
              <Button variant="danger" className="w-full" onClick={() => handleCancel(viewPayment.id)}>
                Cancel payment
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 font-medium text-right">{value}</dd>
    </div>
  );
}
