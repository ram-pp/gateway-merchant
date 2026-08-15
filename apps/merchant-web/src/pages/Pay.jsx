import { useEffect, useRef, useState } from 'react';
import { api, sseUrl } from '../api';
import { Badge, Button, Card, ErrorBanner, Input } from '../components/ui';

const PAYTM_STATIC_SIGN = 'AAuN7izDWN5cb8A5scnUiNME+LkZqI2DWgkXlN1McoP6WZABa/KkFTiLvuPRP6/nWK8BPg/rPhb+u4QMrUEX10UsANTDbJaALcSM9b8Wk218X+55T/zOzb7xoiB+BcX8yYuYayELImXJHIgL/c7nkAnHrwUCmbM97nRbCVVRvU0ku3Tr';

function buildAppIntentLinks(payment) {
  if (!payment?.upiIntent) return [];

  const parsed = new URL(payment.upiIntent.replace(/^upi:/, 'https:'));
  const params = new URLSearchParams(parsed.search);
  const pa = params.get('pa');
  const pn = params.get('pn') || 'Merchant';
  const am = params.get('am') || '0';
  const tn = params.get('tn') || '';
  const tr = params.get('tr') || tn || '';

  const common = new URLSearchParams({
    pa,
    pn,
    am,
    cu: 'INR',
    ...(tn ? { tn } : {}),
    ...(tr ? { tr } : {}),
  });

  common.set('mc', '4722');
  common.set('featuretype', 'money_transfer');
  common.set('sign', PAYTM_STATIC_SIGN);

  return [
    {
      label: 'Paytm',
      href: `paytmmp://cash_wallet?${common.toString()}`,
    },
    // PhonePe supports a native JSON payload form which is more reliable than
    // the simple `phonepe://pay?...` query form. Build a base64 JSON `data=` payload
    // matching the working example and include it as `phonepe://native?data=...`.
    (function () {
      try {
        const payload = {
          contact: { cbsName: '', nickName: '', vpa: pa, type: 'VPA' },
          p2pPaymentCheckoutParams: {
            note: tn || tr || '',
            isByDefaultKnownContact: true,
            enableSpeechToText: false,
            allowAmountEdit: false,
            checkoutType: 'DEFAULT',
            transactionContext: 'p2p',
            initialAmount: Math.round(Number(am || '0') * 100),
            disableNotesEdit: true,
            currency: 'INR',
          },
        };
        const json = JSON.stringify(payload);
        const base64 = typeof window !== 'undefined' && window.btoa
          ? window.btoa(unescape(encodeURIComponent(json)))
          : Buffer.from(json).toString('base64');
        return { label: 'PhonePe', href: `phonepe://native?data=${encodeURIComponent(base64)}&id=p2ppayment` };
      } catch (e) {
        return { label: 'PhonePe', href: `phonepe://pay?${common.toString()}` };
      }
    })(),
  ];
}

export default function Pay() {
  const [hasActiveAccount, setHasActiveAccount] = useState(true);
  const [amount, setAmount] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    api
      .get('/api/merchant/upi-accounts')
      .then((d) => setHasActiveAccount(d.data.some((a) => a.isActive)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!payment?.publicToken || payment.status !== 'pending') return;
    const es = new EventSource(sseUrl(payment.publicToken));
    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setPayment((prev) => (prev ? { ...prev, ...data } : prev));
    });
    esRef.current = es;
    return () => es.close();
  }, [payment?.publicToken, payment?.status]);

  const createPayment = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setPayment(null);
    try {
      const data = await api.post('/api/merchant/payments', {
        amount: Number(amount),
        merchantOrderRef: orderRef || undefined,
      });
      setPayment(data);
    } catch (err) {
      if (err.code === 'AMOUNT_ALREADY_PENDING') {
        setError(`${err.message} (pending: ${err.extra?.pendingPaymentId})`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async () => {
    if (!payment) return;
    await api.post(`/api/merchant/payments/${payment.id}/cancel`);
    setPayment((p) => ({ ...p, status: 'cancelled' }));
  };

  const reset = () => {
    setPayment(null);
    setAmount('');
    setOrderRef('');
    setError('');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">New payment</h1>

      {!payment && (
        <Card>
          <form onSubmit={createPayment} className="space-y-4">
            <Input
              label="Amount (INR)"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
            <Input
              label="Order reference (optional)"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="BILL-1042"
            />
            {!hasActiveAccount && (
              <p className="text-sm text-amber-600">
                No active UPI accounts — add one first. The UPI ID to receive payment is picked automatically.
              </p>
            )}
            <ErrorBanner message={error} />
            <Button type="submit" disabled={loading || !hasActiveAccount} className="w-full">
              {loading ? 'Generating QR…' : 'Generate QR'}
            </Button>
          </form>
        </Card>
      )}

      {payment && (
        <Card className="text-center">
          <div className="flex justify-center mb-3">
            <Badge status={payment.status} />
          </div>
          <p className="text-3xl font-bold text-slate-800">₹{payment.amount}</p>
          <p className="text-sm text-slate-500 mb-4">{payment.upiId} · {payment.upiProvider}</p>

          {payment.status === 'pending' && payment.qrPngBase64 && (
            <>
              <img
                src={`data:image/png;base64,${payment.qrPngBase64}`}
                alt="UPI QR code"
                className="mx-auto rounded-lg border border-slate-200 w-56 h-56"
              />

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {buildAppIntentLinks(payment).map((app) => (
                  <a
                    key={app.label}
                    href={app.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    {app.label}
                  </a>
                ))}
              </div>

              {payment.description && (
                <p className="text-xs text-slate-400 mt-2">Note: {payment.description}</p>
              )}
            </>
          )}

          {payment.status === 'paid' && (
            <div className="text-emerald-600 font-semibold py-8">
              ✓ Paid{payment.utr ? ` · UTR ${payment.utr}` : ''}
            </div>
          )}

          {(payment.status === 'expired' || payment.status === 'cancelled') && (
            <div className="text-slate-500 py-8">Payment {payment.status}.</div>
          )}

          <p className="text-xs text-slate-400 mt-3">Waiting for payment updates in realtime…</p>

          <div className="flex gap-2 justify-center mt-5">
            {payment.status === 'pending' && (
              <Button variant="danger" onClick={cancelPayment}>
                Cancel
              </Button>
            )}
            <Button variant="secondary" onClick={reset}>
              New payment
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
