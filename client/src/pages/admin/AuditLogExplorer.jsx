import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  ScrollText,
  Search,
  Shield,
  Clock,
  Globe,
  RotateCcw,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const AuditLogExplorer = () => {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 100 };
      if (eventTypeFilter !== 'ALL') {
        params.eventType = eventTypeFilter;
      }
      const response = await api.get('/admin/audit-logs', { params });
      setLogs(response.data?.logs || []);
      setTotalCount(response.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [eventTypeFilter]);

  const toggleExpand = (id) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const filteredLogs = logs.filter((log) => {
    const user = log.user || {};
    const matchesSearch =
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getEventBadge = (type) => {
    switch (type) {
      case 'TAB_SWITCH':
      case 'FULLSCREEN_EXIT':
      case 'WINDOW_BLUR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'AUTO_SUBMIT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'USER_STATUS_CHANGE':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'LOGIN':
      case 'OTP_VERIFY':
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  // Metrics
  const authEventsCount = logs.filter(
    (l) => l.eventType === 'LOGIN' || l.eventType === 'OTP_VERIFY'
  ).length;
  const violationCount = logs.filter(
    (l) => l.eventType === 'TAB_SWITCH' || l.eventType === 'FULLSCREEN_EXIT' || l.eventType === 'WINDOW_BLUR'
  ).length;
  const adminEventsCount = logs.filter((l) => l.eventType === 'USER_STATUS_CHANGE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            System Audit Logs
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable, append-only security and proctoring audit trail
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Events</span>
          <p className="text-xl font-semibold text-zinc-100 font-mono">{totalCount}</p>
        </div>

        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Auth & 2FA</span>
          <p className="text-xl font-semibold text-zinc-100 font-mono">{authEventsCount}</p>
        </div>

        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Proctoring Alerts</span>
          <p className={`text-xl font-semibold font-mono ${violationCount > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
            {violationCount}
          </p>
        </div>

        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Admin Actions</span>
          <p className="text-xl font-semibold text-zinc-100 font-mono">{adminEventsCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by user, event, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'TAB_SWITCH', label: 'Tab Switches' },
            { id: 'FULLSCREEN_EXIT', label: 'Fullscreen Loss' },
            { id: 'OTP_VERIFY', label: '2FA Verifications' },
            { id: 'USER_STATUS_CHANGE', label: 'Status Changes' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setEventTypeFilter(type.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
                eventTypeFilter === type.id
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            <p className="text-xs text-zinc-500 font-mono">Loading audit trail...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-[10px] uppercase font-mono tracking-wider text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 font-medium">Origin IP</th>
                  <th className="px-5 py-3 font-medium text-right">Timestamp</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                      No security audit logs found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => toggleExpand(log.id)}
                          className="hover:bg-zinc-850/40 transition select-none cursor-pointer"
                        >
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${getEventBadge(
                                log.eventType
                              )}`}
                            >
                              {log.eventType}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            {log.user ? (
                              <div>
                                <div className="font-medium text-zinc-200">{log.user.name}</div>
                                <div className="text-[11px] text-zinc-500">{log.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-zinc-500 font-mono text-[11px]">System Process</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 max-w-xs sm:max-w-md">
                            <div className="truncate text-zinc-300">
                              {log.details || '—'}
                            </div>
                            {log.attempt?.exam && (
                              <div className="text-[11px] text-zinc-500 mt-0.5">
                                Exam: {log.attempt.exam.title}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-mono text-zinc-400 text-[11px]">
                            {log.ipAddress || '—'}
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono text-zinc-400 text-[11px]">
                            <div>
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {new Date(log.timestamp).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable JSON Detail Drawer */}
                        {isExpanded && (
                          <tr className="bg-zinc-950/80">
                            <td colSpan={5} className="px-5 py-3 border-t border-zinc-850">
                              <div className="text-[11px] font-mono space-y-1">
                                <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">
                                  Log Event #{log.id} — Raw Details
                                </span>
                                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300">
                                  <div><strong>Event Type:</strong> {log.eventType}</div>
                                  <div><strong>User ID:</strong> {log.userId || 'N/A'}</div>
                                  <div><strong>Attempt ID:</strong> {log.attemptId || 'N/A'}</div>
                                  <div><strong>IP Address:</strong> {log.ipAddress || 'N/A'}</div>
                                  <div><strong>Payload:</strong> {log.details}</div>
                                  <div><strong>ISO Timestamp:</strong> {log.timestamp}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogExplorer;
