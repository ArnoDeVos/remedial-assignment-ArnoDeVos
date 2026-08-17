/**
 * Formatting helpers.
 *
 * Presentation-only, and kept out of the components so that "how a date looks"
 * is one decision rather than one decision per component.
 */

/** Locale used throughout the client. */
const LOCALE = 'en-GB';

/**
 * Formats a timestamp as a readable date and time.
 *
 * @param {string|Date|null|undefined} value ISO timestamp or Date.
 * @returns {string} A formatted string, or an em dash when there is no value.
 */
export function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a timestamp as a clock time only.
 *
 * @param {string|Date|null|undefined} value ISO timestamp or Date.
 * @returns {string} A formatted string, or an em dash when there is no value.
 */
export function formatTime(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Describes how long ago something happened.
 *
 * @param {string|Date|null|undefined} value ISO timestamp or Date.
 * @returns {string} Something like "12 min ago", or an em dash.
 */
export function formatRelative(value) {
  if (!value) {
    return '—';
  }

  const seconds = (Date.now() - new Date(value).getTime()) / 1000;

  if (seconds < 60) {
    return 'just now';
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }

  if (seconds < 86_400) {
    return `${Math.floor(seconds / 3600)} h ago`;
  }

  return `${Math.floor(seconds / 86_400)} d ago`;
}

/**
 * Formats a distance in metres, switching to kilometres when it gets long.
 *
 * @param {number|null|undefined} metres Distance in metres.
 * @returns {string} A formatted distance, or an em dash.
 */
export function formatDistance(metres) {
  if (metres === null || metres === undefined) {
    return '—';
  }

  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }

  return `${(metres / 1000).toFixed(1)} km`;
}

/**
 * Formats a duration given in seconds.
 *
 * @param {number|null|undefined} seconds Duration in seconds.
 * @returns {string} A formatted duration, or an em dash.
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return '—';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

/**
 * Converts a Date into the value an `<input type="datetime-local">` expects.
 *
 * That input wants local time without a timezone suffix, which `toISOString`
 * does not produce — it returns UTC, and using it directly shifts the value the
 * resident sees by their offset.
 *
 * @param {Date} date The moment to format.
 * @returns {string} A "YYYY-MM-DDTHH:mm" string in local time.
 */
export function toDateTimeLocalValue(date) {
  const pad = (number) => String(number).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
