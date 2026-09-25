/** Pure helpers for merging Set-Cookie headers into a cookie string. */

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const combinedHeader = headers.get('set-cookie');
  return combinedHeader
    ? combinedHeader.split(/,(?=\s*[^;,=\s]+=[^;,]*)/)
    : [];
}

function mergeCookies(currentCookie, setCookieHeaders) {
  const cookies = new Map();

  for (const cookie of (currentCookie || '').split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) continue;

    cookies.set(
      cookie.slice(0, separatorIndex).trim(),
      cookie.slice(separatorIndex + 1).trim(),
    );
  }

  for (const setCookieHeader of setCookieHeaders) {
    const cookiePair = setCookieHeader.split(';', 1)[0];
    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex === -1) continue;

    const name = cookiePair.slice(0, separatorIndex).trim();
    const value = cookiePair.slice(separatorIndex + 1).trim();

    if (value) {
      cookies.set(name, value);
    } else {
      cookies.delete(name);
    }
  }

  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}

function getEarliestCookieExpiry(setCookieHeaders) {
  const expiries = setCookieHeaders
    .map((header) => header.match(/;\s*expires=([^;]+)/i)?.[1])
    .map((value) => (value ? Date.parse(value) : NaN))
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > Date.now());

  return expiries.length ? Math.min(...expiries) : null;
}

module.exports = { getSetCookieHeaders, mergeCookies, getEarliestCookieExpiry };
