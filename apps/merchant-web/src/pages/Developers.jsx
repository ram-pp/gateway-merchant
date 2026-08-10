import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api, API_URL } from '../api';
import { Button, Card, ErrorBanner, Input } from '../components/ui';

export default function Developers() {
  const { session, refresh } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rotated, setRotated] = useState(null);
  const [webhookSecretRotated, setWebhookSecretRotated] = useState(null);

  useEffect(() => {
    api.get('/api/merchant/settings/webhook').then((d) => setWebhookUrl(d.webhookUrl || '')).catch(() => {});
  }, []);

  const saveWebhook = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put('/api/merchant/settings/webhook', { webhookUrl });
      setNotice('Webhook URL saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const rotateCredentials = async (sandbox) => {
    setError('');
    try {
      const data = await api.post('/api/merchant/credentials/rotate', { sandbox });
      setRotated(data);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const rotateWebhookSecret = async () => {
    setError('');
    try {
      const data = await api.post('/api/merchant/credentials/webhook-secret/rotate');
      setWebhookSecretRotated(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const testWebhookViaCurl = `curl -X POST ${API_URL}/api/v1/webhooks/test \\\n  -H "X-Api-Key: $MERCHANT_PAY_API_KEY" \\\n  -H "X-Api-Secret: $MERCHANT_PAY_API_SECRET"`;

  const createPaymentCurl = `curl -X POST ${API_URL}/api/v1/payments \\\n  -H "X-Api-Key: $MERCHANT_PAY_API_KEY" \\\n  -H "X-Api-Secret: $MERCHANT_PAY_API_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 500, "merchantOrderRef": "APP-ORDER-991"}'`;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Developers</h1>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">API keys</h2>
        <dl className="text-sm space-y-2 mb-4">
          <div className="flex justify-between">
            <dt className="text-slate-500">Live key</dt>
            <dd className="font-mono">{session?.merchant?.apiKey}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Sandbox key</dt>
            <dd className="font-mono">{session?.merchant?.sandboxApiKey}</dd>
          </div>
        </dl>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => rotateCredentials(false)}>
            Rotate live secret
          </Button>
          <Button variant="secondary" onClick={() => rotateCredentials(true)}>
            Rotate sandbox secret
          </Button>
        </div>
        {rotated && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-800">New {rotated.sandbox ? 'sandbox' : 'live'} secret — store now, shown once:</p>
            <p className="font-mono break-all mt-1">{rotated.apiSecret}</p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Webhook</h2>
        <form onSubmit={saveWebhook} className="flex gap-2 items-end">
          <Input
            label="Webhook URL"
            className="flex-1"
            placeholder="https://yourapp.com/webhooks/merchant-pay"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <Button type="submit" disabled={saving}>
            Save
          </Button>
        </form>
        {notice && <p className="text-sm text-emerald-600 mt-2">{notice}</p>}
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" onClick={rotateWebhookSecret}>
            Rotate signing secret
          </Button>
        </div>
        {webhookSecretRotated && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-800">New webhook signing secret — store now, shown once:</p>
            <p className="font-mono break-all mt-1">{webhookSecretRotated.webhookSecret}</p>
          </div>
        )}
        <ErrorBanner message={error} />
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Quickstart</h2>
        <p className="text-sm text-slate-500 mb-2">Create a payment:</p>
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto">{createPaymentCurl}</pre>
        <p className="text-sm text-slate-500 mt-4 mb-2">Send a test webhook:</p>
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto">{testWebhookViaCurl}</pre>
        <p className="text-sm text-slate-500 mt-4">
          Full API reference: <code>docs/developer-api.md</code> and <code>GET /api/v1/openapi.json</code>.
        </p>
      </Card>
    </div>
  );
}
