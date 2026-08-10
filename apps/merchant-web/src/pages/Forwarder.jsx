import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, ErrorBanner } from '../components/ui';

export default function Forwarder() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = () => api.get('/api/merchant/forwarder/status').then(setStatus).catch((e) => setError(e.message));
  const loadLogs = () => api.get('/api/merchant/forwarder/logs?limit=20').then((d) => setLogs(d.data)).catch(() => {});

  useEffect(() => {
    load();
    loadLogs();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const connect = async () => {
    setGenerating(true);
    setError('');
    try {
      await api.post('/api/merchant/forwarder/connect');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const disconnect = async (deviceId) => {
    await api.del(`/api/merchant/forwarder/${deviceId}`);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Forwarder</h1>
      <p className="text-sm text-slate-500 max-w-2xl">
        Install the merchant-pay forwarder app on the phone that receives UPI credit SMS/notifications for your
        VPAs, then pair it below. Realtime payment confirmation depends on this device staying online.
      </p>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Pair a new device</h2>
        {status?.hasPendingPairing ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Enter this code in the forwarder app within 8 minutes:</p>
            <p className="text-3xl font-mono font-bold tracking-widest text-brand-700">{status.pairingToken}</p>
          </div>
        ) : (
          <Button onClick={connect} disabled={generating}>
            {generating ? 'Generating…' : 'Generate pairing code'}
          </Button>
        )}
        <ErrorBanner message={error} />
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Paired devices</h2>
        {!status?.devices?.length ? (
          <p className="text-sm text-slate-500">No devices paired yet.</p>
        ) : (
          <div className="space-y-2">
            {status.devices.map((d) => (
              <div key={d._id} className="flex items-center justify-between py-2 border-t border-slate-100 first:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{d.label}</p>
                  <p className="text-xs text-slate-400">
                    {d.lastEventAt ? `Last event ${new Date(d.lastEventAt).toLocaleString()}` : 'No events yet'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={d.isActive ? 'active' : 'suspended'} />
                  {d.isActive && (
                    <Button variant="danger" onClick={() => disconnect(d._id)}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-800 mb-3">Recent forwarder events</h2>
        {!logs.length ? (
          <p className="text-sm text-slate-500">No events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="py-1 font-medium">Type</th>
                <th className="py-1 font-medium">Amount</th>
                <th className="py-1 font-medium">Status</th>
                <th className="py-1 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="py-1.5">{l.type}</td>
                  <td className="py-1.5">{l.parsedData?.amount ? `₹${l.parsedData.amount}` : '—'}</td>
                  <td className="py-1.5">
                    <Badge status={l.matchStatus} />
                  </td>
                  <td className="py-1.5 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
