import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useProctoring } from '../../hooks/useProctoring';
import {
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  RotateCcw,
  Maximize2,
  HelpCircle
} from 'lucide-react';

const ExamPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Exam attempt state
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Local answer tracking & flags
  const [answers, setAnswers] = useState({}); // { [questionId]: { selectedOptionId, textAnswer } }
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'retrying' | 'error'

  // Answer save queue (see queueSave / flushSave below)
  const pendingSavesRef = useRef(new Map()); // questionId -> latest payload not yet sent
  const inFlightSavesRef = useRef(new Set()); // questionIds with a request in progress
  const saveTimersRef = useRef(new Map()); // questionId -> debounce or retry timer
  const retryCountsRef = useRef(new Map()); // questionId -> consecutive failed attempts
  const failedSavesRef = useRef(new Set()); // questionIds whose last save failed
  // Refs, not state, because timers and the unmount cleanup run with stale closures
  const attemptIdRef = useRef(null);
  const isUnmountedRef = useRef(false);

  // Time tracking
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef(null);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-submitted callback
  const handleAutoSubmitted = useCallback(() => {
    setTimeout(() => {
      navigate(`/student/exams/${id}/result`);
    }, 2000);
  }, [id, navigate]);

  // Active proctoring hook
  const {
    isFullscreen,
    violationCount,
    maxViolations,
    isWarningOpen,
    warningMessage,
    isAutoSubmitted,
    enterFullscreen,
    exitFullscreen,
    dismissWarning
  } = useProctoring({
    examId: id,
    attemptId: attempt?.attemptId,
    maxViolations: attempt?.maxViolations || 3,
    initialViolationCount: attempt?.violationCount || 0,
    isActive: !!attempt && attempt.status === 'IN_PROGRESS' && !isSubmitting,
    onAutoSubmitted: handleAutoSubmitted
  });

  // Start or resume exam attempt on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAttempt = async () => {
      try {
        setLoading(true);
        const response = await api.post(`/exams/${id}/start`);
        const data = response.data?.data;

        if (!isMounted) return;

        attemptIdRef.current = data.attemptId;
        setAttempt(data);
        setQuestions(data.questions || []);
        setRemainingSeconds(data.remainingSeconds || 0);

        const initialAnswers = {};
        (data.questions || []).forEach((q) => {
          if (q.selectedOptionId || q.textAnswer) {
            initialAnswers[q.id] = {
              selectedOptionId: q.selectedOptionId || null,
              textAnswer: q.textAnswer || null
            };
          }
        });
        setAnswers(initialAnswers);

        enterFullscreen();
      } catch (err) {
        if (!isMounted) return;
        const msg = err.response?.data?.error || 'Failed to start examination';
        setError(msg);

        if (msg.toLowerCase().includes('already been submitted') || msg.toLowerCase().includes('time expired')) {
          setTimeout(() => navigate(`/student/exams/${id}/result`), 1500);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAttempt();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, navigate, enterFullscreen]);

  // Countdown timer ticker
  useEffect(() => {
    if (loading || remainingSeconds <= 0 || !attempt) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpiredSubmission();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, attempt]);

  const handleTimeExpiredSubmission = async () => {
    try {
      setIsSubmitting(true);
      // Best effort: send queued answers before the server finalizes the attempt
      await flushAllSaves();
      await api.post(`/exams/${id}/attempts/${attempt.attemptId}/submit`);
    } catch (err) {
      console.warn('Timer submit response:', err.message);
    } finally {
      await exitFullscreen();
      navigate(`/student/exams/${id}/result`);
    }
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const TEXT_SAVE_DEBOUNCE_MS = 600;
  const MAX_RETRY_DELAY_MS = 15000;

  const refreshSaveStatus = () => {
    if (failedSavesRef.current.size > 0) {
      setSaveStatus(pendingSavesRef.current.size > 0 ? 'retrying' : 'error');
    } else if (pendingSavesRef.current.size > 0 || inFlightSavesRef.current.size > 0) {
      setSaveStatus('saving');
    } else {
      setSaveStatus('saved');
    }
  };

  // Send the latest queued value for a question. Only one request per question is
  // in flight at a time, so responses can never arrive out of order and overwrite
  // a newer answer with an older one.
  const flushSave = async (questionId) => {
    clearTimeout(saveTimersRef.current.get(questionId));
    saveTimersRef.current.delete(questionId);

    // Already saving: the finally block below sends the newest value afterwards
    if (inFlightSavesRef.current.has(questionId)) return;

    const payload = pendingSavesRef.current.get(questionId);
    if (!payload) return;

    pendingSavesRef.current.delete(questionId);
    inFlightSavesRef.current.add(questionId);
    refreshSaveStatus();

    try {
      await api.patch(`/exams/${id}/attempts/${attemptIdRef.current}/answer`, {
        questionId,
        ...payload
      });
      failedSavesRef.current.delete(questionId);
      retryCountsRef.current.delete(questionId);
    } catch (err) {
      console.error('Auto-save error:', err);
      failedSavesRef.current.add(questionId);

      // Retry network errors, server errors and rate limiting; a 4xx such as
      // "exam already submitted" will not succeed by retrying
      const status = err.response?.status;
      const isRetryable = !err.response || status >= 500 || status === 429;

      if (isRetryable && !isUnmountedRef.current) {
        if (!pendingSavesRef.current.has(questionId)) {
          pendingSavesRef.current.set(questionId, payload);
        }
        const attemptNumber = (retryCountsRef.current.get(questionId) || 0) + 1;
        retryCountsRef.current.set(questionId, attemptNumber);
        const delay = Math.min(1000 * 2 ** attemptNumber, MAX_RETRY_DELAY_MS);
        saveTimersRef.current.set(questionId, setTimeout(() => flushSave(questionId), delay));
      }
    } finally {
      inFlightSavesRef.current.delete(questionId);
      // A newer value arrived while saving and its timer has already fired
      if (pendingSavesRef.current.has(questionId) && !saveTimersRef.current.has(questionId)) {
        flushSave(questionId);
      }
      if (!isUnmountedRef.current) refreshSaveStatus();
    }
  };

  const queueSave = (questionId, payload, delayMs) => {
    pendingSavesRef.current.set(questionId, payload);
    retryCountsRef.current.delete(questionId);
    clearTimeout(saveTimersRef.current.get(questionId));
    saveTimersRef.current.set(questionId, setTimeout(() => flushSave(questionId), delayMs));
    refreshSaveStatus();
  };

  // Send every queued answer now and wait for in-flight requests (up to 10s).
  // Returns true when nothing is left unsaved.
  const flushAllSaves = async () => {
    [...pendingSavesRef.current.keys()].forEach((questionId) => flushSave(questionId));

    const deadline = Date.now() + 10000;
    while (inFlightSavesRef.current.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return pendingSavesRef.current.size === 0 && inFlightSavesRef.current.size === 0;
  };

  // On leaving the page, cancel timers and send anything still queued (no retries)
  useEffect(() => {
    isUnmountedRef.current = false;
    const timers = saveTimersRef.current;
    const pending = pendingSavesRef.current;
    return () => {
      isUnmountedRef.current = true;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      [...pending.keys()].forEach((questionId) => flushSave(questionId));
    };
  }, []);

  // Auto-save student answer: option clicks save immediately, typing is debounced
  const handleAnswerSelect = (questionId, selectedOptionId, textAnswer = null) => {
    const updated = {
      selectedOptionId,
      textAnswer
    };

    setAnswers((prev) => ({
      ...prev,
      [questionId]: updated
    }));

    queueSave(questionId, updated, textAnswer !== null ? TEXT_SAVE_DEBOUNCE_MS : 0);
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleSubmitExam = async () => {
    setSubmitError('');
    setIsSubmitting(true);

    // Never submit while answers are still unsaved; the student can retry
    const allSaved = await flushAllSaves();
    if (!allSaved) {
      const unsaved = pendingSavesRef.current.size + inFlightSavesRef.current.size;
      setSubmitError(
        `${unsaved} answer${unsaved === 1 ? '' : 's'} could not be saved yet. Check your connection and try again.`
      );
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post(`/exams/${id}/attempts/${attempt.attemptId}/submit`);
      await exitFullscreen();
      navigate(`/student/exams/${id}/result`);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit exam. Please try again.');
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const answeredCount = Object.values(answers).filter((a) => a.selectedOptionId || a.textAnswer).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSubmitModalOpen || isWarningOpen || !currentQuestion) return;

      // Disable shortcuts when student is typing in textarea
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFlag(currentQuestion.id);
      } else if (currentQuestion.type !== 'SHORT_ANSWER') {
        const optionKeys = ['a', 'b', 'c', 'd', 'e', 'f'];
        const numKeys = ['1', '2', '3', '4', '5', '6'];
        const key = e.key.toLowerCase();

        let optIndex = optionKeys.indexOf(key);
        if (optIndex === -1) optIndex = numKeys.indexOf(key);

        if (optIndex !== -1 && currentQuestion.options && currentQuestion.options[optIndex]) {
          handleAnswerSelect(currentQuestion.id, currentQuestion.options[optIndex].id, null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions, currentQuestion, isSubmitModalOpen, isWarningOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-2.5">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        <p className="text-xs text-zinc-500 font-mono">ExamShield Proctor initializing...</p>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-sm w-full p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-sm font-semibold text-zinc-100">Access Denied</h2>
          <p className="text-xs text-zinc-400">{error}</p>
          <button
            onClick={() => navigate('/student')}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg text-xs font-medium transition"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none">
      {/* Top Header */}
      <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-zinc-200 tracking-tight">
            ExamShield Proctor
          </span>
        </div>

        {/* Minimalist Centered Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-medium ${
              remainingSeconds < 120
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>
        </div>

        {/* Right Status & Submit */}
        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium font-mono ${
              violationCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            <span>
              {violationCount} / {maxViolations} Violations
            </span>
          </div>

          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:border-zinc-700 transition cursor-pointer"
              title="Return to Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer shadow-sm flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">Finish</span>
          </button>
        </div>
      </header>

      {/* Thin Progress Indicator Line */}
      <div className="h-0.5 w-full bg-zinc-900">
        <div
          className="h-full bg-zinc-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Examination Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Question Area */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto flex flex-col justify-between">
          {currentQuestion && (
            <div className="max-w-2xl mx-auto w-full space-y-6">
              {/* Question Meta Bar */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500">
                    {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {saveStatus === 'saving' ? (
                      'Saving...'
                    ) : saveStatus === 'saved' ? (
                      'Saved'
                    ) : saveStatus === 'retrying' ? (
                      <span className="text-amber-400">Not saved, retrying...</span>
                    ) : (
                      <span className="text-rose-400">Save error</span>
                    )}
                  </span>

                  <button
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      flaggedQuestions.has(currentQuestion.id)
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>{flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Review [F]'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="py-1">
                <h2 className="text-base font-medium text-zinc-100 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.text}
                </h2>
              </div>

              {/* Options Selection */}
              <div className="space-y-2.5 pt-1">
                {currentQuestion.type === 'SHORT_ANSWER' ? (
                  <div>
                    <textarea
                      rows={5}
                      value={currentAnswer?.textAnswer || ''}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, null, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition leading-relaxed"
                    />
                  </div>
                ) : (
                  currentQuestion.options?.map((option, idx) => {
                    const optionLetter = String.fromCharCode(65 + idx);
                    const isSelected = currentAnswer?.selectedOptionId === option.id;

                    return (
                      <div
                        key={option.id}
                        onClick={() => handleAnswerSelect(currentQuestion.id, option.id, null)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                          isSelected
                            ? 'bg-zinc-800/90 border-zinc-600 text-zinc-100 shadow-sm'
                            : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-medium shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-zinc-100 text-zinc-950 font-bold'
                              : 'border border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {optionLetter}
                        </div>
                        <span className="text-xs leading-relaxed mt-0.5">{option.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls Bar */}
          <div className="max-w-2xl mx-auto w-full pt-6 flex items-center justify-between border-t border-zinc-800/80">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 rounded-lg text-xs font-medium border border-zinc-800 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentAnswer && (currentAnswer.selectedOptionId || currentAnswer.textAnswer) && (
              <button
                onClick={() => handleAnswerSelect(currentQuestion.id, null, null)}
                className="text-[11px] text-zinc-500 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            )}

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                <span>Review & Submit</span>
                <Send className="w-3 h-3" />
              </button>
            )}
          </div>
        </main>

        {/* Question Palette Sidebar */}
        <aside className="w-full lg:w-72 bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800/80 p-5 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-zinc-200">
                Question Index
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {answeredCount}/{questions.length} Answered
              </span>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-1.5 max-h-72 lg:max-h-96 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = ans && (ans.selectedOptionId || ans.textAnswer);
                const isFlagged = flaggedQuestions.has(q.id);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center relative cursor-pointer ${
                      isCurrent ? 'ring-1 ring-zinc-300 ring-offset-2 ring-offset-zinc-950' : ''
                    } ${
                      isFlagged
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : isAnswered
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                        : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-1.5 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-700 shrink-0" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40 shrink-0" />
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-800 shrink-0" />
                <span>Unanswered</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Violation Alert Modal */}
      {isWarningOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Shield className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-100">
                {isAutoSubmitted ? 'Assessment Terminated' : 'Security Alert'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{warningMessage}</p>
            </div>

            <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-400 font-mono">
              Recorded: <span className="text-rose-400 font-semibold">{violationCount}</span> of{' '}
              <span className="text-zinc-200">{maxViolations}</span> allowed
            </div>

            {!isAutoSubmitted && (
              <button
                onClick={dismissWarning}
                className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                Return to Fullscreen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
              <HelpCircle className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Confirm Submission</h3>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300">
              <p className="text-zinc-400">Are you sure you want to finish your assessment?</p>

              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Answered</span>
                  <span className="text-sm font-semibold text-zinc-100 font-mono">
                    {answeredCount}/{questions.length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Unanswered</span>
                  <span className="text-sm font-semibold text-zinc-400 font-mono">
                    {questions.length - answeredCount}
                  </span>
                </div>
              </div>

              {flaggedQuestions.size > 0 && (
                <p className="text-amber-400/90 text-[11px]">
                  Notice: You have {flaggedQuestions.size} question{flaggedQuestions.size > 1 ? 's' : ''} marked for review.
                </p>
              )}

              {submitError && (
                <p className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{submitError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setSubmitError('');
                }}
                className="px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitExam}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Exam</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPlayer;
