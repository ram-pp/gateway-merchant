import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/merchants', label: 'Merchants' },
  { to: '/payments', label: 'Payments' },
  { to: '/forwarder-logs', label: 'Forwarder logs' },
  { to: '/webhooks', label: 'Webhooks' },
  { to: '/admins', label: 'Admins', superadminOnly: true },
];

export default function Layout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = NAV.filter((item) => !item.superadminOnly || session?.admin?.role === 'superadmin');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-admin-700">merchant-pay admin</span>
            <nav className="hidden md:flex gap-1">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium ${
                      isActive ? 'bg-admin-50 text-admin-700' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{session?.admin?.email}</span>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium">
              Log out
            </button>
          </div>
        </div>
        <nav className="md:hidden flex gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                  isActive ? 'bg-admin-50 text-admin-700' : 'text-slate-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
