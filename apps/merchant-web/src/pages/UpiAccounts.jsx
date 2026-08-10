import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, ErrorBanner, Input, Select } from '../components/ui';
import { UPI_PROVIDER_OPTIONS } from '../upiProviders';

const emptyForm = { upiId: '', displayName: '', upiProvider: '', upiType: 'merchant', isDefault: false };

export default function UpiAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/api/merchant/upi-accounts').then((d) => setAccounts(d.data));

  useEffect(() => {
    load();
  }, []);

  const suggest = async (upiId) => {
    if (!upiId.includes('@')) return;
    try {
      const { suggested } = await api.get(`/api/merchant/upi-accounts/suggest-provider?upiId=${encodeURIComponent(upiId)}`);
      if (suggested) setForm((f) => ({ ...f, upiProvider: f.upiProvider || suggested }));
    } catch {
      // best-effort suggestion only
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/api/merchant/upi-accounts', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Deactivate this UPI account?')) return;
    await api.del(`/api/merchant/upi-accounts/${id}`);
    load();
  };

  const setDefault = async (id) => {
    await api.patch(`/api/merchant/upi-accounts/${id}`, { isDefault: true });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">UPI accounts</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Add UPI account'}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="UPI id (VPA)"
              required
              placeholder="shop@okaxis"
              value={form.upiId}
              onChange={(e) => {
                const upiId = e.target.value;
                setForm((f) => ({ ...f, upiId }));
                suggest(upiId);
              }}
            />
            <Input
              label="Display name"
              required
              placeholder="My Shop"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <Select
              label="Which app is this UPI id? (required)"
              required
              value={form.upiProvider}
              onChange={(e) => setForm((f) => ({ ...f, upiProvider: e.target.value }))}
            >
              <option value="">Select the app that sends this VPA's credit notifications…</option>
              {UPI_PROVIDER_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500 -mt-2">
              Forwarder notification matching depends on this being correct — pick the app that actually fires
              credit notifications for this VPA, not just a guess from the handle.
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Set as default
            </label>
            <ErrorBanner message={error} />
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add UPI account'}
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => (
          <Card key={a._id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{a.displayName}</p>
                <p className="text-sm text-slate-500">{a.upiId}</p>
              </div>
              <Badge status={a.isActive ? 'active' : 'suspended'} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-slate-100">{a.upiProvider}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100">{a.upiType}</span>
              {a.isDefault && <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">Default</span>}
            </div>
            <div className="mt-4 flex gap-2">
              {!a.isDefault && (
                <Button variant="secondary" onClick={() => setDefault(a.publicId)}>
                  Make default
                </Button>
              )}
              {a.isActive && (
                <Button variant="danger" onClick={() => remove(a.publicId)}>
                  Deactivate
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
