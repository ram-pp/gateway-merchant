// The API has no TZ configured (the Docker image defaults to UTC), but this
// is an India/IST business — merchants think in IST calendar days. Day
// boundaries must therefore be computed against a fixed IST offset instead
// of the server's local time, otherwise "today" silently shifts by 5:30
// depending on where the process happens to be deployed.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** UTC instant for 00:00:00.000 IST on the IST calendar day `date` falls in. */
function istDayStart(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);
}

/** UTC instant for 23:59:59.999 IST on the IST calendar day `date` falls in. */
function istDayEnd(date = new Date()) {
  return new Date(istDayStart(date).getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Parses a date-only `YYYY-MM-DD` value (e.g. from a <input type="date">
 * filter) as IST midnight rather than UTC midnight. Values that already
 * carry a time/offset are passed through unchanged.
 */
function parseIstDateStart(value) {
  const str = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00.000+05:30`) : new Date(str);
}

/** Same as parseIstDateStart, but anchored to the end of the IST day. */
function parseIstDateEnd(value) {
  const str = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T23:59:59.999+05:30`) : new Date(str);
}

module.exports = { istDayStart, istDayEnd, parseIstDateStart, parseIstDateEnd };
