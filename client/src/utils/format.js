// Shared, locale-aware formatting so every quantity reads the same everywhere.

export const fmtDay = (d) =>
  new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const fmtDateTime = (d) => `${fmtDay(d)}, ${fmtTime(d)}`;

export const fmtWindow = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay ? `${fmtTime(s)}–${fmtTime(e)}` : `${fmtTime(s)} → ${fmtDay(e)} ${fmtTime(e)}`;
};

// "in 2 d 4 h", "in 35 min", "in 40 s"
export const fmtRelative = (target, now = new Date()) => {
  let ms = new Date(target).getTime() - now.getTime();
  const past = ms < 0;
  ms = Math.abs(ms);
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  let text;
  if (d >= 1) text = `${d} d ${h % 24} h`;
  else if (h >= 1) text = `${h} h ${min % 60} min`;
  else if (min >= 1) text = `${min} min`;
  else text = 'less than a minute';
  return past ? `${text} ago` : `in ${text}`;
};

// 01:05:09 or 05:09
export const fmtClock = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const fmtScore = (score, total) => {
  const sc = Number(score || 0);
  const t = Number(total || 0);
  const round = (n) => (Number.isInteger(n) ? n : n.toFixed(1));
  return `${round(sc)} / ${round(t)}`;
};

export const pct = (score, total) => (total > 0 ? Math.round((Number(score || 0) / Number(total)) * 100) : 0);

// Status of an exam from the student's point of view
export const studentExamStatus = (exam, now = new Date()) => {
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  const status = exam.myAttempt?.status;
  if (status === 'SUBMITTED') return 'SUBMITTED';
  if (status === 'AUTO_SUBMITTED') return 'AUTO_SUBMITTED';
  if (now > end) return exam.myAttempt ? 'CLOSED' : 'MISSED';
  if (now < start) return 'UPCOMING';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'OPEN';
};
