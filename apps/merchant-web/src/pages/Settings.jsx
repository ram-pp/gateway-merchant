import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Button, Card, ErrorBanner, Input } from '../components/ui';

export default function Settings() {
  const { session } = useAuth();
  const [form, setForm] = useState({ defaultTtlSeconds: 900, allowAmountEdit: true, successRedirectUrl: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.merchant?.settings) {
      setForm({ ...form, ...session.merchant.settings, successRedirectUrl: session.merchant.settings.successRedirectUrl || '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
    <div className="max-w-lg space-y-6">
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
        <h2 className="font-semibold text-slate-800 mb-2">Staff</h2>
        <p className="text-sm text-slate-500">Staff invites are coming soon — currently one owner account per merchant.</p>
      </Card>
    </div>
  );
}
