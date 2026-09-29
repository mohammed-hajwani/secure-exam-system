import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  X,
  Shield,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  Globe,
  ScrollText
} from 'lucide-react';

const AttemptInspectorModal = ({ examId, attemptId, isOpen = true, onClose }) => {
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('answers'); // 'answers' | 'audit'

  useEffect(() => {
    if (!examId || !attemptId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/exams/${examId}/attempts/${attemptId}`);
        setAttemptDetails(response.data?.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load attempt details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [examId, attemptId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Candidate Audit Inspector
              </span>
              {attemptDetails?.isFlagged && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  FLAGGED FOR VIOLATIONS
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-zinc-100">
              {attemptDetails?.student?.name || 'Student Candidate'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {attemptDetails?.student?.email} • Cohort:{' '}
              <span className="text-zinc-200 font-mono">{attemptDetails?.student?.batch || 'N/A'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-zinc-800 flex items-center gap-2 bg-zinc-950">
          <button
            onClick={() => setActiveTab('answers')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'answers'
                ? 'border-zinc-200 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Responses & Scoring</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-zinc-200 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Proctoring Audit Trail</span>
            {attemptDetails?.auditLogs?.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                {attemptDetails.auditLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
              <p className="text-xs text-zinc-500 font-mono">Loading attempt audit...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div>
              {/* Tab 1: Answers & Scoring */}
              {activeTab === 'answers' && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Total Score</span>
                      <span className="text-sm font-semibold text-zinc-100 font-mono">
                        {attemptDetails?.score !== null && attemptDetails?.score !== undefined ? attemptDetails.score : '—'} / {attemptDetails?.exam?.totalMarks !== undefined ? attemptDetails.exam.totalMarks : '—'}
                      </span>

                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Attempt Status</span>
                      <span className="text-xs font-semibold text-zinc-300 font-mono">
                        {attemptDetails?.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Violations Logged</span>
                      <span className={`text-xs font-semibold font-mono ${attemptDetails?.violationCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                        {attemptDetails?.violationCount} Incidents
                      </span>
                    </div>
                  </div>

                  {/* Question Responses List */}
                  <div className="space-y-3">
                    {(!attemptDetails?.answers || attemptDetails.answers.length === 0) ? (
                      <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                        No responses recorded for this candidate attempt.
                      </div>
                    ) : (
                      attemptDetails.answers.map((ans, idx) => {
                        const q = ans.question || ans || {};
                        const options = q.options || ans.options || [];
                        const selectedOpt = options.find((o) => o.id === ans.selectedOptionId);
                        const correctOpt = options.find((o) => o.isCorrect);
                        const isCorrect =
                          ans.isCorrect !== null && ans.isCorrect !== undefined
                            ? ans.isCorrect
                            : selectedOpt
                            ? selectedOpt.isCorrect
                            : false;
                        const qMarks = q.marks !== undefined ? q.marks : ans.marks || 0;
                        const qType = q.type || ans.type || 'MCQ';
                        const qText = q.text || ans.text || 'Question Prompt';

                        return (
                          <div
                            key={ans.id || ans.questionId || idx}
                            className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 space-y-2.5"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                              <span className="text-xs font-semibold text-zinc-200">
                                Question {idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono uppercase text-zinc-500">
                                  {qType}
                                </span>
                                <span
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium border ${
                                    isCorrect
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  }`}
                                >
                                  {isCorrect ? `+${qMarks} Mark` : '0 Marks'}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                              {qText}
                            </p>

                            {qType === 'SHORT_ANSWER' ? (
                              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300">
                                {ans.textAnswer || <span className="text-zinc-600">No response entered</span>}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                                    Candidate Selected
                                  </span>
                                  <span className={selectedOpt ? (isCorrect ? 'text-zinc-200' : 'text-rose-400') : 'text-zinc-600'}>
                                    {selectedOpt ? selectedOpt.text : 'Unanswered'}
                                  </span>
                                </div>

                                <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                                    Correct Key
                                  </span>
                                  <span className="text-emerald-400">
                                    {correctOpt ? correctOpt.text : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Proctoring Audit Trail */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  {(!attemptDetails?.auditLogs || attemptDetails.auditLogs.length === 0) ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      No security or proctoring incidents recorded for this attempt.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attemptDetails.auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                  (log.eventType || '').includes('SWITCH') || (log.eventType || '').includes('EXIT')
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`}
                              >
                                {log.eventType}
                              </span>
                              <span className="text-zinc-200">
                                {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}
                              </span>
                            </div>


                            {log.ipAddress && (
                              <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                                <Globe className="w-3 h-3 text-zinc-600" />
                                <span>{log.ipAddress}</span>
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttemptInspectorModal;
