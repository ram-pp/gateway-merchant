import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Pay from './pages/Pay';
import Payments from './pages/Payments';
import PaymentDetail from './pages/PaymentDetail';
import UpiAccounts from './pages/UpiAccounts';
import Forwarder from './pages/Forwarder';
import Developers from './pages/Developers';
import Settings from './pages/Settings';
import PublicPay from './pages/PublicPay';

function ProtectedLayout() {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pay/:token" element={<PublicPay />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pay" element={<Pay />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payments/:id" element={<PaymentDetail />} />
        <Route path="/upi" element={<UpiAccounts />} />
        <Route path="/forwarder" element={<Forwarder />} />
        <Route path="/developers" element={<Developers />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
