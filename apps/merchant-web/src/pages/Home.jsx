import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Card } from '../components/ui';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [forwarder, setForwarder] = useState(null);

  useEffect(() => {
    api.get('/api/merchant/payments/stats').then(setStats).catch(() => setStats(null));
    api.get('/api/merchant/forwarder/status').then(setForwarder).catch(() => setForwarder(null));
  }, []);

  const paymentsToday = stats?.paymentsToday ?? 0;
  const paidTodayCount = stats?.paidTodayCount ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const volumeToday = stats?.paidTodayVolume ?? 0;
  const activeDevice = forwarder?.devices?.find((d) => d.isActive);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Home</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Today's volume</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₹{Number(volumeToday).toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{paidTodayCount} paid</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pending payments</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Payments today</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{paymentsToday}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Forwarder</p>
          <p className={`text-2xl font-bold mt-1 ${activeDevice ? 'text-emerald-600' : 'text-slate-400'}`}>
            {activeDevice ? 'Online' : 'Offline'}
          </p>
          <p className="text-xs text-slate-400 mt-1">{activeDevice ? activeDevice.label : 'No device paired'}</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link to="/pay" className="text-sm font-semibold text-brand-700 hover:underline">
          Take a payment →
        </Link>
        <Link to="/upi" className="text-sm font-semibold text-brand-700 hover:underline">
          Manage UPI accounts →
        </Link>
        <Link to="/forwarder" className="text-sm font-semibold text-brand-700 hover:underline">
          Pair forwarder →
        </Link>
      </div>
    </div>
  );
}
