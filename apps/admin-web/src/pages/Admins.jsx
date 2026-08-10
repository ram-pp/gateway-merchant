import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, ErrorBanner, Input, Select } from '../components/ui';

const emptyForm = { name: '', email: '', password: '', role: 'support' };

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/api/admin/admins').then((d) => setAdmins(d.data)).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/api/admin/admins', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (admin) => {
    await api.patch(`/api/admin/admins/${admin._id}`, { isActive: !admin.isActive });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Platform admins</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Add admin'}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="support">Support</option>
              <option value="superadmin">Superadmin</option>
            </Select>
            <div className="sm:col-span-2">
              <ErrorBanner message={error} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create admin'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a._id} className="border-t border-slate-100">
                <td className="px-4 py-2">{a.name}</td>
                <td className="px-4 py-2 text-slate-500">{a.email}</td>
                <td className="px-4 py-2">{a.role}</td>
                <td className="px-4 py-2">
                  <Badge status={a.isActive ? 'active' : 'suspended'} />
                </td>
                <td className="px-4 py-2">
                  <Button variant="secondary" onClick={() => toggleActive(a)}>
                    {a.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
