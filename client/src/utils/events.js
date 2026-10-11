// Human-readable names for audit log event types, shared by the attempt
// inspector and the admin audit log. Tone maps onto Stamp statuses.

export const EVENT_META = {
  TAB_SWITCH: { label: 'Left the exam tab', tone: 'ALERT', group: 'proctoring' },
  FULLSCREEN_EXIT: { label: 'Exited fullscreen', tone: 'ALERT', group: 'proctoring' },
  WINDOW_BLUR: { label: 'Window lost focus', tone: 'ALERT', group: 'proctoring' },
  AUTO_SUBMIT: { label: 'Submitted automatically', tone: 'AUTO_SUBMITTED', group: 'exam' },
  OTP_VERIFY: { label: 'Signed in with code', tone: 'MARK', group: 'access' },
  LOGIN: { label: 'Signed in', tone: 'MARK', group: 'access' },
  USER_STATUS_CHANGE: { label: 'Account changed', tone: 'MARK', group: 'admin' },
  REFRESH_TOKEN_REUSE: { label: 'Stolen session blocked', tone: 'ALERT', group: 'access' }
};

export const eventMeta = (type) => EVENT_META[type] || { label: (type || 'Event').replace(/_/g, ' ').toLowerCase(), tone: 'NEUTRAL', group: 'other' };

const pretty = (key) => key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();

// Audit details are stored as JSON strings or plain text. Turn either into a sentence.
export const describeDetails = (details) => {
  if (details === null || details === undefined || details === '') return '';
  let value = details;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (typeof value !== 'object') return String(value);
  if (value.reason) {
    const extra = [];
    if (value.violationCount !== undefined && value.maxAllowed !== undefined) extra.push(`${value.violationCount} of ${value.maxAllowed} violations`);
    if (value.newStatus !== undefined) extra.push(value.newStatus ? 'activated' : 'deactivated');
    return extra.length ? `${value.reason} (${extra.join(', ')})` : value.reason;
  }
  if (value.targetEmail !== undefined) {
    return `${value.targetEmail} ${value.newStatus ? 'activated' : 'deactivated'}`;
  }
  return Object.entries(value)
    .filter(([k]) => k !== 'timestamp')
    .map(([k, v]) => `${pretty(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
};
