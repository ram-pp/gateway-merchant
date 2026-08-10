import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Card } from '../components/ui';

export default function Home() {
  const [payments, setPayments] = useState(null);
  const [forwarder, setForwarder] = useState(null);

  useEffect(() => {
    api.get('/api/merchant/payments?limit=100').then((d) => setPayments(d.data)).catch(() => setPayments([]));
    api.get('/api/merchant/forwarder/status').then(setForwarder).catch(() => setForwarder(null));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todays = (payments || []).filter((p) => new Date(p.createdAt) >= today);
  const paidToday = todays.filter((p) => p.status === 'paid');
  const pendingCount = (payments || []).filter((p) => p.status === 'pending').length;
  const volumeToday = paidToday.reduce((sum, p) => sum + p.amount, 0);
  const activeDevice = forwarder?.devices?.find((d) => d.isActive);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Home</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Today's volume</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₹{volumeToday.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{paidToday.length} paid</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pending payments</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Payments today</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{todays.length}</p>
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
