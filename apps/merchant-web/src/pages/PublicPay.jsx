import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, sseUrl } from '../api';

const PAYTM_STATIC_SIGN = 'AAuN7izDWN5cb8A5scnUiNME+LkZqI2DWgkXlN1McoP6WZABa/KkFTiLvuPRP6/nWK8BPg/rPhb+u4QMrUEX10UsANTDbJaALcSM9b8Wk218X+55T/zOzb7xoiB+BcX8yYuYayELImXJHIgL/c7nkAnHrwUCmbM97nRbCVVRvU0ku3Tr';

const DEFAULT_PAY_PAGE_THEME = {
  mode: 'light',
  brand: {
    merchantName: 'Merchant',
    logoUrl: '',
    accentColor: '#2563eb',
    primaryText: '#0f172a',
    secondaryText: '#475569',
    background: '#f8fafc',
    cardBackground: '#ffffff',
    buttonColor: '#2563eb',
    buttonText: '#ffffff',
    successColor: '#16a34a',
    borderColor: '#e2e8f0',
  },
  layout: {
    showMerchantName: true,
    showAmount: true,
    showNote: true,
    showQr: true,
    showPayButtons: true,
    showPoweredBy: false,
  },
  copy: {
    title: 'Pay now',
    subtitle: 'Secure payment',
    buttonText: 'Pay now',
    noteLabel: 'Note',
  },
};

function resolvePayPageTheme(theme = {}) {
  return {
    ...DEFAULT_PAY_PAGE_THEME,
    ...theme,
    brand: {
      ...DEFAULT_PAY_PAGE_THEME.brand,
      ...(theme.brand || {}),
    },
    layout: {
      ...DEFAULT_PAY_PAGE_THEME.layout,
      ...(theme.layout || {}),
    },
    copy: {
      ...DEFAULT_PAY_PAGE_THEME.copy,
      ...(theme.copy || {}),
    },
  };
}

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
    { label: 'Paytm', href: `paytmmp://cash_wallet?${common.toString()}` },
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

export default function PublicPay() {
  const { token } = useParams();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const esRef = useRef(null);
  const theme = resolvePayPageTheme(payment?.payPageTheme);

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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: theme.brand.background,
        color: theme.brand.primaryText,
      }}
    >
      <div
        className="rounded-2xl shadow-sm border p-8 max-w-sm w-full text-center"
        style={{
          background: theme.brand.cardBackground,
          borderColor: theme.brand.borderColor,
          color: theme.brand.primaryText,
        }}
      >
        {theme.layout.showMerchantName && (
          <div className="mb-3 flex flex-col items-center gap-2">
            {theme.brand.logoUrl && (
              <img
                src={theme.brand.logoUrl}
                alt="Merchant logo"
                className="h-12 w-12 rounded-xl object-cover"
              />
            )}
            <p className="text-sm" style={{ color: theme.brand.secondaryText }}>
              {payment?.merchantName || theme.brand.merchantName}
            </p>
          </div>
        )}

        {error && <p className="text-red-600">{error}</p>}

        {payment && !error && (
          <>
            <p className="text-xs font-medium tracking-[0.2em] uppercase" style={{ color: theme.brand.secondaryText }}>
              {theme.copy.title}
            </p>

            {theme.copy.subtitle && (
              <p className="mt-1 text-xs" style={{ color: theme.brand.secondaryText }}>
                {theme.copy.subtitle}
              </p>
            )}

            {theme.layout.showAmount && (
              <p className="mt-4 text-3xl font-bold" style={{ color: theme.brand.primaryText }}>
                ₹{payment.amount}
              </p>
            )}

            <p className="mt-2 text-sm" style={{ color: theme.brand.secondaryText }}>{payment.upiId}</p>

            {payment.status === 'pending' && payment.qrPngBase64 && (
              <>
                {theme.layout.showQr && (
                  <img
                    src={`data:image/png;base64,${payment.qrPngBase64}`}
                    alt="Scan to pay"
                    className="mx-auto mt-5 rounded-lg border w-56 h-56"
                    style={{
                      borderColor: theme.brand.borderColor,
                      background: '#fff',
                    }}
                  />
                )}

                {buildAppIntentLinks(payment).length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {buildAppIntentLinks(payment).map((app) => (
                      <a
                        key={app.label}
                        href={app.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium"
                        style={{
                          borderColor: theme.brand.borderColor,
                          color: theme.brand.primaryText,
                          background: theme.brand.cardBackground,
                        }}
                      >
                        {app.label}
                      </a>
                    ))}
                  </div>
                )}

                {theme.layout.showPayButtons && (
                  <div className="mt-4 space-y-2">
                    <a
                      href={payment.upiIntent}
                      className="block rounded-xl px-4 py-3 text-sm font-semibold"
                      style={{
                        background: theme.brand.buttonColor,
                        color: theme.brand.buttonText,
                      }}
                    >
                      {theme.copy.buttonText}
                    </a>
                    <a
                      href={payment.upiIntent}
                      className="block rounded-xl border px-4 py-3 text-sm font-semibold"
                      style={{
                        borderColor: theme.brand.borderColor,
                        color: theme.brand.primaryText,
                      }}
                    >
                      Open in app
                    </a>
                  </div>
                )}

                {payment.description && theme.layout.showNote && (
                  <p className="mt-3 text-xs" style={{ color: theme.brand.secondaryText }}>
                    {theme.copy.noteLabel}: {payment.description}
                  </p>
                )}

                <p className="mt-3 text-xs" style={{ color: theme.brand.secondaryText }}>
                  Waiting for payment…
                </p>
              </>
            )}

            {payment.status === 'paid' && (
              <div className="py-8 text-lg font-semibold" style={{ color: theme.brand.successColor }}>
                ✓ Payment received
              </div>
            )}

            {(payment.status === 'expired' || payment.status === 'cancelled') && (
              <div className="py-8" style={{ color: theme.brand.secondaryText }}>
                This payment link is no longer active.
              </div>
            )}

            {theme.layout.showPoweredBy && (
              <p className="mt-4 text-[11px]" style={{ color: theme.brand.secondaryText }}>
                Powered by merchant-pay
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
