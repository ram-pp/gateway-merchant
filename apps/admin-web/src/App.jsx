import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Merchants from './pages/Merchants';
import MerchantDetail from './pages/MerchantDetail';
import Payments from './pages/Payments';
import PaymentDetail from './pages/PaymentDetail';
import ForwarderLogs from './pages/ForwarderLogs';
import Webhooks from './pages/Webhooks';
import Admins from './pages/Admins';

function ProtectedLayout() {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <Layout />;
}

function SuperadminRoute({ children }) {
  const { session } = useAuth();
  if (session?.admin?.role !== 'superadmin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/merchants" element={<Merchants />} />
        <Route path="/merchants/:id" element={<MerchantDetail />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payments/:id" element={<PaymentDetail />} />
        <Route path="/forwarder-logs" element={<ForwarderLogs />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route
          path="/admins"
          element={
            <SuperadminRoute>
              <Admins />
            </SuperadminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
