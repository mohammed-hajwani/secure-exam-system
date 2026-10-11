import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Lock, RotateCcw, ScrollText, Search } from 'lucide-react';
import api from '../../services/api';
import { Alert, Button, EmptyNotice, Input, PageHeader, Sheet, SheetHeader, Spinner, Stamp, cx } from '../../components/ui';
import { describeDetails, eventMeta } from '../../utils/events';
import { fmtDay } from '../../utils/format';

const FILTERS = [
  { id: 'ALL', label: 'Everything' },
  { id: 'TAB_SWITCH', label: 'Tab switches' },
  { id: 'FULLSCREEN_EXIT', label: 'Fullscreen exits' },
  { id: 'WINDOW_BLUR', label: 'Focus lost' },
  { id: 'AUTO_SUBMIT', label: 'Auto-submits' },
  { id: 'OTP_VERIFY', label: 'Sign-ins' },
  { id: 'USER_STATUS_CHANGE', label: 'Account changes' },
  { id: 'REFRESH_TOKEN_REUSE', label: 'Stolen sessions' }
];

const AuditLogExplorer = () => {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 100 };
      if (eventTypeFilter !== 'ALL') params.eventType = eventTypeFilter;
      const response = await api.get('/admin/audit-logs', { params });
      setLogs(response.data?.logs || []);
      setTotalCount(response.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [eventTypeFilter]);

  const filteredLogs = logs.filter((log) => {
    const user = log.user || {};
    const s = searchQuery.toLowerCase();
    return (
      (user.name || '').toLowerCase().includes(s) ||
      (user.email || '').toLowerCase().includes(s) ||
      (log.details || '').toLowerCase().includes(s) ||
      (log.ipAddress || '').toLowerCase().includes(s) ||
      (log.attempt?.exam?.title || '').toLowerCase().includes(s)
    );
  });

  // Group into days, newest first (the API already returns newest first)
  const days = useMemo(() => {
    const groups = [];
    filteredLogs.forEach((log) => {
      const key = new Date(log.timestamp).toDateString();
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(log);
      else groups.push({ key, date: log.timestamp, items: [log] });
    });
    return groups;
  }, [filteredLogs]);

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle={`${totalCount} entries recorded. Showing the latest ${Math.min(100, totalCount)}.`}
        actions={
          <Button variant="secondary" onClick={fetchAuditLogs} loading={loading}>
            {!loading && <RotateCcw className="h-4 w-4" aria-hidden="true" />}
            Refresh
          </Button>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-[4px] border border-paper-rule bg-paper px-4 py-3 text-[15px] text-ink-soft">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-board" aria-hidden="true" />
        <p>
          <strong className="text-ink">Append-only.</strong> Entries can be added and read, never edited or deleted. The database itself refuses
          changes, so not even an administrator can rewrite history.
        </p>
      </div>

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      <Sheet aria-labelledby="log-heading">
        <SheetHeader title={<span id="log-heading">Register</span>} meta={loading ? '' : `${filteredLogs.length} shown`} />
        <div className="space-y-3 border-b border-paper-line px-4 py-4 sm:px-5">
          <div className="relative max-w-md">
            <label htmlFor="log-search" className="sr-only">
              Search the log
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input
              id="log-search"
              type="search"
              className="pl-9"
              placeholder="Person, exam, detail or IP address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by event">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={eventTypeFilter === f.id}
                onClick={() => setEventTypeFilter(f.id)}
                className={cx(
                  'min-h-9 rounded-[4px] border px-3 text-sm font-semibold transition-colors',
                  eventTypeFilter === f.id ? 'border-ink bg-ink text-white' : 'border-paper-rule bg-paper text-ink-soft hover:border-ink-faint hover:text-ink'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading the audit log" />
        ) : filteredLogs.length === 0 ? (
          <EmptyNotice title="No entries" icon={ScrollText}>
            Nothing matches this filter yet.
          </EmptyNotice>
        ) : (
          days.map((day) => (
            <section key={day.key} aria-label={fmtDay(day.date)}>
              <h3 className="caps sticky top-16 z-10 border-b border-paper-line bg-paper-tint px-5 py-2 text-[13px] text-ink-soft">
                {fmtDay(day.date)}
              </h3>
              <ol>
                {day.items.map((log) => {
                  const meta = eventMeta(log.eventType);
                  const text = describeDetails(log.details);
                  return (
                    <li key={log.id} className="rule-b last:border-b-0">
                      <details className="group">
                        <summary className="grid cursor-pointer list-none grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-paper-tint md:grid-cols-[6.5rem_11rem_minmax(0,1fr)_9rem] md:items-center [&::-webkit-details-marker]:hidden">
                          <span className="num text-sm font-bold text-ink">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span>
                            <Stamp status={meta.tone}>{meta.label}</Stamp>
                          </span>
                          <span className="col-span-2 min-w-0 md:col-span-1">
                            <span className="block truncate text-[15px] text-ink">
                              {log.user ? <strong>{log.user.name}</strong> : <span className="text-ink-faint">System</span>}
                              {text && <span className="text-ink-soft"> · {text}</span>}
                            </span>
                            {log.attempt?.exam && <span className="block truncate text-sm text-ink-faint">Exam: {log.attempt.exam.title}</span>}
                          </span>
                          <span className="num col-span-2 flex items-center gap-1.5 text-sm text-ink-faint md:col-span-1 md:justify-end">
                            {log.ipAddress && <Globe className="h-3.5 w-3.5" aria-hidden="true" />}
                            {log.ipAddress || '—'}
                          </span>
                        </summary>
                        <dl className="num grid gap-x-6 gap-y-1 bg-paper-tint px-5 pb-4 pt-1 text-sm text-ink-soft sm:grid-cols-[9rem_minmax(0,1fr)]">
                          <dt className="font-bold text-ink">Entry</dt>
                          <dd className="break-all">{log.id}</dd>
                          <dt className="font-bold text-ink">Event</dt>
                          <dd>{log.eventType}</dd>
                          <dt className="font-bold text-ink">User</dt>
                          <dd className="break-all">{log.user ? `${log.user.email} (${log.userId})` : 'None'}</dd>
                          <dt className="font-bold text-ink">Attempt</dt>
                          <dd className="break-all">{log.attemptId || 'None'}</dd>
                          <dt className="font-bold text-ink">Recorded</dt>
                          <dd>{new Date(log.timestamp).toISOString()}</dd>
                          <dt className="font-bold text-ink">Raw details</dt>
                          <dd className="break-all">{log.details || '—'}</dd>
                        </dl>
                      </details>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </Sheet>
    </div>
  );
};

export default AuditLogExplorer;
