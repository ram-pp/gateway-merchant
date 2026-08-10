import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Badge, Button, Card, ErrorBanner, Input } from '../components/ui';

const emptyForm = { name: '', slug: '', ownerEmail: '', ownerPassword: '', ownerName: '' };

export default function Merchants() {
  const [merchants, setMerchants] = useState([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const load = () => api.get(`/api/admin/merchants?q=${encodeURIComponent(q)}&limit=50`).then((d) => setMerchants(d.data));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.ownerName) delete payload.ownerName;
      const data = await api.post('/api/admin/merchants', payload);
      setCreated(data);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Merchants</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Create merchant'}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Merchant name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
            />
            <Input label="Slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            <Input
              label="Owner email"
              type="email"
              required
              value={form.ownerEmail}
              onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
            />
            <Input
              label="Owner password"
              type="password"
              required
              minLength={8}
              value={form.ownerPassword}
              onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <ErrorBanner message={error} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create merchant'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {created && (
        <Card className="bg-amber-50 border-amber-200">
          <p className="font-medium text-amber-800 mb-2">
            Merchant "{created.merchant.name}" created — credentials shown once, share securely:
          </p>
          <dl className="text-sm space-y-1 font-mono">
            <div>apiKey: {created.credentials.apiKey}</div>
            <div>apiSecret: {created.credentials.apiSecret}</div>
            <div>sandboxApiKey: {created.credentials.sandboxApiKey}</div>
            <div>sandboxApiSecret: {created.credentials.sandboxApiSecret}</div>
          </dl>
        </Card>
      )}

      <Input placeholder="Search merchants…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((m) => (
              <tr key={m._id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/merchants/${m._id}`} className="text-admin-700 font-medium hover:underline">
                    {m.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-500">{m.slug}</td>
                <td className="px-4 py-2">
                  <Badge status={m.status} />
                </td>
                <td className="px-4 py-2 text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
