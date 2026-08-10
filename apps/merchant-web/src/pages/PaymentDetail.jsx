import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Badge, Button, Card, ErrorBanner, Input } from '../components/ui';

export default function PaymentDetail() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [utr, setUtr] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get(`/api/merchant/payments/${id}`).then(setPayment).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  const confirm = async () => {
    setError('');
    try {
      await api.post(`/api/merchant/payments/${id}/confirm`, { utr });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const cancel = async () => {
    setError('');
    try {
      await api.post(`/api/merchant/payments/${id}/cancel`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!payment) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link to="/payments" className="text-sm text-brand-700 hover:underline">
        ← Back to payments
      </Link>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-800">{payment.id}</h1>
          <Badge status={payment.status} />
        </div>
        <dl className="text-sm space-y-2">
          <Row label="Amount" value={`₹${payment.amount}`} />
          <Row label="Order ref" value={payment.merchantOrderRef || '—'} />
          <Row label="Description" value={payment.description || '—'} />
          <Row label="UPI" value={`${payment.upiId} (${payment.upiProvider})`} />
          <Row label="UTR" value={payment.utr || '—'} />
          <Row label="Confirmation" value={payment.confirmationSource || '—'} />
          <Row label="Created" value={new Date(payment.createdAt).toLocaleString()} />
          <Row label="Expires" value={new Date(payment.expiresAt).toLocaleString()} />
        </dl>

        <ErrorBanner message={error} />

        {payment.status === 'pending' && (
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">Manual UTR fallback</p>
            <div className="flex gap-2">
              <Input placeholder="UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} />
              <Button onClick={confirm} disabled={!utr}>
                Confirm
              </Button>
            </div>
            <Button variant="danger" onClick={cancel}>
              Cancel payment
            </Button>
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
