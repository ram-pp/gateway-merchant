const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('merchant_pay_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('merchant_pay_token', token);
  else localStorage.removeItem('merchant_pay_token');
}

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.code = data?.error?.code;
    err.status = res.status;
    err.extra = data?.error;
    throw err;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/** Browser-friendly SSE, scoped by the unguessable publicToken (no custom headers needed). */
export function sseUrl(publicToken) {
  return `${API_URL}/api/public/pay/${publicToken}/events`;
}

export { API_URL };
