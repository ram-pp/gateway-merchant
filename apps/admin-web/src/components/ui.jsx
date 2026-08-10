export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-admin-600 text-white hover:bg-admin-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>}
      <input
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-400 focus:border-admin-400 ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>}
      <select
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-400 focus:border-admin-400 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

export function Badge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    expired: 'bg-slate-100 text-slate-500 ring-slate-200',
    cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
    failed: 'bg-red-50 text-red-700 ring-red-200',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    suspended: 'bg-red-50 text-red-700 ring-red-200',
    matched: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    matched_low: 'bg-amber-50 text-amber-700 ring-amber-200',
    unmatched: 'bg-slate-100 text-slate-500 ring-slate-200',
    irrelevant: 'bg-slate-100 text-slate-400 ring-slate-200',
    duplicate: 'bg-slate-100 text-slate-400 ring-slate-200',
    delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    exhausted: 'bg-red-50 text-red-700 ring-red-200',
    pending_parse: 'bg-slate-100 text-slate-500 ring-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${styles[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {status}
    </span>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 border border-red-200">{message}</div>;
}

export function EmptyState({ title, description }) {
  return (
    <div className="text-center py-12 text-slate-500">
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  );
}
