import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card } from '../components/ui';

export default function Overview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/api/admin/overview').then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat label="Merchants" value={stats?.merchantCount ?? '—'} sub={`${stats?.activeMerchantCount ?? 0} active`} />
        <Stat label="Payments today" value={stats?.paymentsToday ?? '—'} />
        <Stat
          label="Paid today"
          value={stats ? `₹${stats.paidTodayAmount.toFixed(2)}` : '—'}
          sub={stats ? `${stats.paidTodayCount} payments` : ''}
        />
        <Stat label="Unmatched forwarder logs (today)" value={stats?.unmatchedLogsToday ?? '—'} warn={stats?.unmatchedLogsToday > 0} />
        <Stat label="Failed webhook deliveries" value={stats?.failedWebhooks ?? '—'} warn={stats?.failedWebhooks > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, warn }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${warn ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </Card>
  );
}
