import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, sseUrl } from '../api';

export default function PublicPay() {
  const { token } = useParams();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const esRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/api/public/pay/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error.message);
        else setPayment(d);
      })
      .catch(() => setError('Could not load this payment.'));
  }, [token]);

  useEffect(() => {
    if (!payment || payment.status !== 'pending') return;
    const es = new EventSource(sseUrl(token));
    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setPayment((prev) => (prev ? { ...prev, ...data } : prev));
      if (data.status === 'paid' && payment.successRedirectUrl) {
        setTimeout(() => window.location.assign(payment.successRedirectUrl), 1500);
      }
    });
    esRef.current = es;
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.status, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
        <p className="text-sm text-slate-400 mb-1">{payment?.merchantName || 'merchant-pay'}</p>

        {error && <p className="text-red-600">{error}</p>}

        {payment && !error && (
          <>
            <p className="text-3xl font-bold text-slate-800">₹{payment.amount}</p>
            <p className="text-sm text-slate-500 mb-4">{payment.upiId}</p>

            {payment.status === 'pending' && payment.qrPngBase64 && (
              <>
                <img
                  src={`data:image/png;base64,${payment.qrPngBase64}`}
                  alt="Scan to pay"
                  className="mx-auto rounded-lg border border-slate-200 w-56 h-56"
                />
                <a
                  href={payment.upiIntent}
                  className="block mt-4 text-sm font-semibold text-brand-700 hover:underline"
                >
                  Open in UPI app
                </a>
                {payment.description && (
                  <p className="text-xs text-slate-400 mt-2">Note: {payment.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-3">Waiting for payment…</p>
              </>
            )}

            {payment.status === 'paid' && (
              <div className="text-emerald-600 font-semibold py-8 text-lg">✓ Payment received</div>
            )}

            {(payment.status === 'expired' || payment.status === 'cancelled') && (
              <div className="text-slate-500 py-8">This payment link is no longer active.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
