import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Badge, Button, Card, ErrorBanner, Input } from '../components/ui';

export default function PaymentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [utr, setUtr] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get(`/api/admin/payments/${id}`).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const confirm = async () => {
    setError('');
    try {
      await api.post(`/api/admin/payments/${id}/confirm`, { utr });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const expire = async () => {
    setError('');
    try {
      await api.post(`/api/admin/payments/${id}/expire`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!data) return <p className="text-slate-500">Loading…</p>;
  const { payment, upiAccount, forwarderTrail } = data;

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/payments" className="text-sm text-admin-700 hover:underline">
        ← Back to payments
      </Link>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-800">{payment.publicId}</h1>
          <Badge status={payment.status} />
        </div>
        <dl className="text-sm space-y-2">
          <Row label="Merchant" value={payment.merchantId?.name} />
          <Row label="Amount" value={`₹${payment.amount}`} />
          <Row label="Order ref" value={payment.merchantOrderRef || '—'} />
          <Row label="Description" value={payment.transactionNote || '—'} />
          <Row label="UPI account" value={upiAccount ? `${upiAccount.upiId} (${upiAccount.upiProvider})` : '—'} />
          <Row label="UTR" value={payment.utr || '—'} />
          <Row label="Confirmation source" value={payment.confirmationSource || '—'} />
          <Row label="Match reason" value={payment.matchReason || '—'} />
          <Row label="Created" value={new Date(payment.createdAt).toLocaleString()} />
          <Row label="Expires" value={new Date(payment.expiresAt).toLocaleString()} />
        </dl>

        <ErrorBanner message={error} />

        {payment.status === 'pending' && (
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">Support actions</p>
            <div className="flex gap-2">
              <Input placeholder="UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} />
              <Button onClick={confirm} disabled={!utr}>
                Manual confirm
              </Button>
            </div>
            <Button variant="danger" onClick={expire}>
              Force expire
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Forwarder trail</h2>
        {!forwarderTrail?.length ? (
          <p className="text-sm text-slate-500">No forwarder logs matched this payment.</p>
        ) : (
          <div className="space-y-3">
            {forwarderTrail.map((l) => (
              <div key={l._id} className="text-sm border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <Badge status={l.matchStatus} />
                  <span className="text-slate-400 text-xs">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-600 mt-1">{l.message}</p>
                {l.matchReason && <p className="text-slate-400 text-xs mt-0.5">{l.matchReason}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 font-medium">{value}</dd>
    </div>
  );
}
