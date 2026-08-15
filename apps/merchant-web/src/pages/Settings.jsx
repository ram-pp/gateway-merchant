import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Button, Card, ErrorBanner, Input } from '../components/ui';

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

const normalizePayPageTheme = (theme = {}) => ({
  mode: theme.mode || 'light',
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
});

export default function Settings() {
  const { session } = useAuth();
  const [form, setForm] = useState({
    defaultTtlSeconds: 900,
    allowAmountEdit: true,
    successRedirectUrl: '',
    payPageTheme: DEFAULT_PAY_PAGE_THEME,
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.merchant?.settings) {
      setForm((current) => ({
        ...current,
        ...session.merchant.settings,
        successRedirectUrl: session.merchant.settings.successRedirectUrl || '',
        payPageTheme: normalizePayPageTheme(session.merchant.settings.payPageTheme),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const updateThemeField = (path, value) => {
    setForm((current) => {
      const nextTheme = normalizePayPageTheme(current.payPageTheme);
      const segments = path.split('.');
      let ref = nextTheme;
      for (let i = 0; i < segments.length - 1; i += 1) {
        ref = ref[segments[i]];
      }
      ref[segments[segments.length - 1]] = value;
      return { ...current, payPageTheme: nextTheme };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    setNotice('');
    try {
      await api.put('/api/merchant/settings/general', { settings: form });
      setNotice('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Profile</h2>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-slate-500">Merchant</dt>
            <dd className="font-medium">{session?.merchant?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Slug</dt>
            <dd className="font-medium">{session?.merchant?.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Your email</dt>
            <dd className="font-medium">{session?.user?.email}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Payment defaults</h2>
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Default expiry (seconds)"
            type="number"
            min="60"
            max="86400"
            value={form.defaultTtlSeconds}
            onChange={(e) => setForm((f) => ({ ...f, defaultTtlSeconds: Number(e.target.value) }))}
          />
          <Input
            label="Success redirect URL (for hosted pay page)"
            placeholder="https://yourapp.com/thank-you"
            value={form.successRedirectUrl}
            onChange={(e) => setForm((f) => ({ ...f, successRedirectUrl: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.allowAmountEdit}
              onChange={(e) => setForm((f) => ({ ...f, allowAmountEdit: e.target.checked }))}
            />
            Allow amount edit on POS
          </label>
          {notice && <p className="text-sm text-emerald-600">{notice}</p>}
          <ErrorBanner message={error} />
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-4">Pay page branding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Merchant name"
            value={form.payPageTheme.brand.merchantName}
            onChange={(e) => updateThemeField('brand.merchantName', e.target.value)}
          />
          <Input
            label="Logo URL"
            value={form.payPageTheme.brand.logoUrl}
            placeholder="https://example.com/logo.png"
            onChange={(e) => updateThemeField('brand.logoUrl', e.target.value)}
          />
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Accent color
            <input
              type="color"
              value={form.payPageTheme.brand.accentColor}
              onChange={(e) => updateThemeField('brand.accentColor', e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white p-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Primary button color
            <input
              type="color"
              value={form.payPageTheme.brand.buttonColor}
              onChange={(e) => updateThemeField('brand.buttonColor', e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white p-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Page background
            <input
              type="color"
              value={form.payPageTheme.brand.background}
              onChange={(e) => updateThemeField('brand.background', e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white p-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Card background
            <input
              type="color"
              value={form.payPageTheme.brand.cardBackground}
              onChange={(e) => updateThemeField('brand.cardBackground', e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white p-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Primary text
            <input
              type="color"
              value={form.payPageTheme.brand.primaryText}
              onChange={(e) => updateThemeField('brand.primaryText', e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white p-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Secondary text
            <input
              type="color"
              value={form.payPageTheme.brand.secondaryText}
              onChange={(e) => updateThemeField('brand.secondaryText', e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white p-1"
            />
          </label>
        </div>

        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
          <Input
            label="Title"
            value={form.payPageTheme.copy.title}
            onChange={(e) => updateThemeField('copy.title', e.target.value)}
          />
          <Input
            label="Subtitle"
            value={form.payPageTheme.copy.subtitle}
            onChange={(e) => updateThemeField('copy.subtitle', e.target.value)}
          />
          <Input
            label="Button text"
            value={form.payPageTheme.copy.buttonText}
            onChange={(e) => updateThemeField('copy.buttonText', e.target.value)}
          />
          <Input
            label="Note label"
            value={form.payPageTheme.copy.noteLabel}
            onChange={(e) => updateThemeField('copy.noteLabel', e.target.value)}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.payPageTheme.layout.showMerchantName}
              onChange={(e) => updateThemeField('layout.showMerchantName', e.target.checked)}
            />
            Show merchant name
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.payPageTheme.layout.showAmount}
              onChange={(e) => updateThemeField('layout.showAmount', e.target.checked)}
            />
            Show amount
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.payPageTheme.layout.showNote}
              onChange={(e) => updateThemeField('layout.showNote', e.target.checked)}
            />
            Show note
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.payPageTheme.layout.showQr}
              onChange={(e) => updateThemeField('layout.showQr', e.target.checked)}
            />
            Show QR code
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.payPageTheme.layout.showPayButtons}
              onChange={(e) => updateThemeField('layout.showPayButtons', e.target.checked)}
            />
            Show action buttons
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.payPageTheme.layout.showPoweredBy}
              onChange={(e) => updateThemeField('layout.showPoweredBy', e.target.checked)}
            />
            Show powered by label
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-2">Staff</h2>
        <p className="text-sm text-slate-500">Staff invites are coming soon — currently one owner account per merchant.</p>
      </Card>
    </div>
  );
}
