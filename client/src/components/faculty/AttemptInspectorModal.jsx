import React, { useEffect, useRef, useState } from 'react';
import { Check, Flag, Globe, X } from 'lucide-react';
import api from '../../services/api';
import { Alert, Dialog, Figure, Spinner, Stamp, cx } from '../ui';
import { fmtScore, fmtTime } from '../../utils/format';
import { describeDetails, eventMeta } from '../../utils/events';

const TYPE_LABEL = { MCQ: 'Multiple choice', TRUE_FALSE: 'True / false', SHORT_ANSWER: 'Short answer' };

const Answers = ({ details }) => {
  if (!details?.answers || details.answers.length === 0) {
    return <p className="py-10 text-center text-[15px] text-ink-faint">No answers were recorded for this attempt.</p>;
  }
  return (
    <ol className="space-y-4">
      {details.answers.map((ans, idx) => {
        const q = ans.question || ans || {};
        const options = q.options || ans.options || [];
        const selected = options.find((o) => o.id === ans.selectedOptionId);
        const correct = options.find((o) => o.isCorrect);
        const isCorrect = ans.isCorrect !== null && ans.isCorrect !== undefined ? ans.isCorrect : selected ? selected.isCorrect : false;
        const type = q.type || ans.type || 'MCQ';
        const marks = q.marks !== undefined ? q.marks : ans.marks || 0;
        const isShort = type === 'SHORT_ANSWER';

        return (
          <li key={ans.id || ans.questionId || idx} className="rounded-[4px] border border-paper-line">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-line bg-paper-tint px-4 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="display num text-xl text-ink">Q{idx + 1}</span>
                <span className="text-sm text-ink-faint">{TYPE_LABEL[type] || type}</span>
              </div>
              {isShort ? (
                <Stamp status="NEUTRAL">For you to mark · {marks} mk</Stamp>
              ) : (
                <Stamp status={isCorrect ? 'MARK' : 'NEUTRAL'}>
                  {isCorrect ? `+${marks} mark${marks === 1 ? '' : 's'}` : selected ? 'Incorrect · 0' : 'Left blank · 0'}
                </Stamp>
              )}
            </div>
            <div className="px-4 py-3">
              <p className="whitespace-pre-wrap text-[15px] font-semibold leading-snug text-ink">{q.text || ans.text}</p>
              {isShort ? (
                <div className="mt-3 rounded-[4px] border border-paper-rule bg-paper-tint px-3 py-2.5 text-[15px] text-ink">
                  {ans.textAnswer || <span className="text-ink-faint">No answer written</span>}
                </div>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {options.map((opt, i) => {
                    const isSel = opt.id === ans.selectedOptionId;
                    return (
                      <li
                        key={opt.id}
                        className={cx(
                          'flex items-center gap-2.5 rounded-[4px] border px-3 py-2 text-[15px]',
                          opt.isCorrect ? 'border-ink' : 'border-paper-line'
                        )}
                      >
                        <span className="caps w-4 text-[12px] text-ink-faint">{String.fromCharCode(65 + i)}</span>
                        <span className={cx('flex-1 text-ink', isSel && !opt.isCorrect && 'line-through decoration-ink-faint', opt.isCorrect && 'font-bold')}>{opt.text}</span>
                        {isSel && <span className="caps text-[11px] text-ink">Chosen</span>}
                        {opt.isCorrect && <Check className="h-4 w-4 text-ink" strokeWidth={3} aria-label="Correct answer" />}
                        {isSel && !opt.isCorrect && <X className="h-4 w-4 text-ink-faint" strokeWidth={3} aria-label="Wrong choice" />}
                      </li>
                    );
                  })}
                  {!selected && <li className="text-sm text-ink-faint">No option chosen.</li>}
                  {!correct && <li className="text-sm text-ink-faint">No answer key set for this question.</li>}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const Timeline = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return <p className="py-10 text-center text-[15px] text-ink-faint">Nothing was recorded during this attempt. No tab switches, focus loss or fullscreen exits.</p>;
  }
  return (
    <ol className="relative ml-2 border-l-2 border-paper-rule pl-6">
      {logs.map((log) => {
        const meta = eventMeta(log.eventType);
        const text = describeDetails(log.details);
        return (
          <li key={log.id} className="relative pb-5 last:pb-0">
            <span
              className={cx(
                'absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-paper',
                meta.tone === 'ALERT' ? 'bg-alarm' : meta.tone === 'WARN' ? 'bg-stock-canary-ink' : 'bg-ink-faint'
              )}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-sm font-bold text-ink">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <Stamp status={meta.tone}>{meta.label}</Stamp>
            </div>
            {text && <p className="mt-1 text-[15px] text-ink-soft">{text}</p>}
            {log.ipAddress && (
              <p className="num mt-1 flex items-center gap-1.5 text-sm text-ink-faint">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                {log.ipAddress}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
};

const AttemptInspectorModal = ({ examId, attemptId, isOpen = true, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('answers');
  const tabsRef = useRef(null);

  useEffect(() => {
    if (!examId || !attemptId) return;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/exams/${examId}/attempts/${attemptId}`);
        setDetails(response.data?.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load this attempt.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [examId, attemptId]);

  const tabs = [
    { id: 'answers', label: 'Answers' },
    { id: 'timeline', label: `Proctoring record${details?.auditLogs?.length ? ` (${details.auditLogs.length})` : ''}` }
  ];

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const idx = tabs.findIndex((t) => t.id === activeTab);
    const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setActiveTab(next.id);
    tabsRef.current?.querySelector(`#tab-${next.id}`)?.focus();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={details?.student?.name || 'Attempt'} size="xl">
      {loading ? (
        <Spinner label="Loading attempt" />
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2 text-[15px] text-ink-soft">
            <span>{details?.student?.email}</span>
            {details?.student?.batch && <span>· Batch {details.student.batch}</span>}
            <Stamp status={details?.status} />
            {details?.isFlagged && <Stamp status="FLAGGED" icon={Flag} />}
          </div>

          <div className="mb-5 grid grid-cols-3 divide-x divide-paper-line rounded-[4px] border border-paper-line">
            <Figure className="px-4 py-3" label="Score" value={fmtScore(details?.score, details?.exam?.totalMarks)} />
            <Figure
              className="px-4 py-3"
              label="Violations"
              value={details?.violationCount ?? 0}
              tone={details?.violationCount > 0 ? 'text-stock-salmon-ink' : undefined}
            />
            <Figure className="px-4 py-3" label="Submitted" value={details?.submittedAt ? fmtTime(details.submittedAt) : '—'} />
          </div>

          <div ref={tabsRef} role="tablist" aria-label="Attempt sections" className="mb-5 flex gap-1 border-b border-paper-line" onKeyDown={onTabKey}>
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={activeTab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={activeTab === t.id ? 0 : -1}
                onClick={() => setActiveTab(t.id)}
                className={cx(
                  'relative min-h-11 px-3 text-[15px] font-bold transition-colors',
                  activeTab === t.id ? 'text-ink' : 'text-ink-faint hover:text-ink'
                )}
              >
                {t.label}
                {activeTab === t.id && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-t-[2px] bg-ink" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'answers' ? <Answers details={details} /> : <Timeline logs={details?.auditLogs} />}
          </div>
        </>
      )}
    </Dialog>
  );
};

export default AttemptInspectorModal;
