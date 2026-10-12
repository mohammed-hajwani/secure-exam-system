import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { fullscreenSupported, useProctoring } from '../../hooks/useProctoring';
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Maximize2,
  RotateCcw,
  Send
} from 'lucide-react';
import { Alert, Button, Dialog, EmptyNotice, Field, Figure, Sheet, Spinner, Stamp, Textarea, cx } from '../../components/ui';

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

  // Auto-submitted callback (exitFullscreen comes from the hook below, so go through a ref)
  const exitFullscreenRef = useRef(null);
  const handleAutoSubmitted = useCallback(() => {
    setTimeout(async () => {
      if (exitFullscreenRef.current) await exitFullscreenRef.current();
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
    isReportingViolation,
    fullscreenError,
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
  exitFullscreenRef.current = exitFullscreen;

  // Leaving the player some other way (back button, link) should not strand the student in fullscreen.
  // attemptIdRef guards against React StrictMode's test unmount, which runs before the attempt loads.
  useEffect(
    () => () => {
      if (attemptIdRef.current && (document.fullscreenElement || document.webkitFullscreenElement)) {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
      }
    },
    []
  );

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
        // No fullscreen request here: browsers refuse it outside a click. The briefing's
        // Begin button enters fullscreen; if that did not happen, the page asks below.
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
  }, [id, navigate]);

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

  // Out of fullscreen with no warning on screen (page reloaded, fullscreen refused at the start,
  // or an exit inside the violation cooldown): block the paper until the student returns
  const needsFullscreen =
    fullscreenSupported() &&
    attempt?.status === 'IN_PROGRESS' &&
    !isFullscreen &&
    !isWarningOpen &&
    !isReportingViolation &&
    !isSubmitting &&
    !isAutoSubmitted;

  // A proctoring prompt must never sit underneath the submit dialog
  useEffect(() => {
    if ((isWarningOpen || needsFullscreen) && !isSubmitting) setIsSubmitModalOpen(false);
  }, [isWarningOpen, needsFullscreen, isSubmitting]);

  const isLastQuestion = currentIndex === questions.length - 1;
  const lowTime = remainingSeconds > 0 && remainingSeconds < 120;
  const hasAnswer = !!(currentAnswer && (currentAnswer.selectedOptionId || currentAnswer.textAnswer));
  const questionHeadingId = currentQuestion ? `q-${currentQuestion.id}` : undefined;

  const saveLabel = {
    saving: { text: 'Saving…', cls: 'text-ink-faint' },
    saved: { text: 'Saved', cls: 'text-stock-mint-ink' },
    retrying: { text: 'Not saved yet, retrying…', cls: 'text-stock-canary-ink font-bold' },
    error: { text: 'Not saved', cls: 'text-alarm font-bold' }
  }[saveStatus];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Preparing your exam paper" />
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <EmptyNotice
          title="Cannot open this exam"
          action={
            <Button variant="secondary" onClick={() => navigate('/student')}>
              Back to timetable
            </Button>
          }
        >
          {error}
        </EmptyNotice>
      </div>
    );
  }

  const QuestionGrid = () => (
    <div>
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Questions">
        {questions.map((q, idx) => {
          const ans = answers[q.id];
          const isAnswered = !!(ans && (ans.selectedOptionId || ans.textAnswer));
          const isFlagged = flaggedQuestions.has(q.id);
          const isCurrent = idx === currentIndex;
          const state = isCurrent ? 'current' : isAnswered ? 'answered' : 'unanswered';
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Question ${idx + 1}, ${isAnswered ? 'answered' : 'not answered'}${isFlagged ? ', marked for review' : ''}`}
                className={cx(
                  'num relative flex h-11 w-full items-center justify-center rounded-[4px] border text-[15px] font-bold transition-[background-color,border-color,scale] duration-150 active:scale-[0.96]',
                  state === 'current' && 'border-ink bg-hl text-ink',
                  state === 'answered' && 'border-ink bg-ink text-white',
                  state === 'unanswered' && 'border-paper-rule bg-paper text-ink-soft hover:border-ink-faint'
                )}
              >
                {idx + 1}
                {isFlagged && (
                  <Bookmark className="absolute -right-1 -top-1.5 h-4 w-4 fill-stock-canary text-stock-canary-ink" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-[3px] border border-ink bg-ink" aria-hidden="true" />
          Answered
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-[3px] border border-paper-rule bg-paper" aria-hidden="true" />
          Not answered
        </li>
        <li className="flex items-center gap-2">
          <Bookmark className="h-3.5 w-3.5 fill-stock-canary text-stock-canary-ink" aria-hidden="true" />
          Marked for review
        </li>
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper-ground">
      {/* Exam header: title, the clock, standing */}
      <header className="sticky top-0 z-30 border-b border-paper-rule bg-paper">
        <div className="h-1 bg-board" aria-hidden="true" />
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-ink">{attempt?.examTitle || 'Exam in progress'}</div>
            <div className="num hidden text-sm text-ink-faint sm:block">
              {answeredCount} of {questions.length} answered
            </div>
          </div>

          <div
            className={cx(
              'num flex shrink-0 items-baseline gap-1.5 rounded-[5px] px-3 py-1.5',
              lowTime ? 'bg-ink text-white' : 'text-ink'
            )}
            role="timer"
            aria-live={lowTime ? 'assertive' : 'off'}
            aria-label={`${formatTime(remainingSeconds)} remaining`}
          >
            <Clock className="h-4 w-4 self-center" aria-hidden="true" />
            <span className="text-[1.6rem] font-bold leading-none sm:text-[1.9rem]">{formatTime(remainingSeconds)}</span>
            <span className="hidden text-sm font-semibold sm:inline">{lowTime ? 'left, finish up' : 'left'}</span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <Stamp status={violationCount > 0 ? 'ALERT' : 'NEUTRAL'} className="hidden sm:inline-flex">
              <span className="num">
                {violationCount}/{maxViolations}
              </span>{' '}
              violations
            </Stamp>
            <Button variant="ink" size="sm" onClick={() => setIsSubmitModalOpen(true)}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Finish
            </Button>
          </div>
        </div>
        {/* Phones: standing on its own line, so the header never wraps */}
        <div className="num flex items-center justify-between border-t border-paper-line px-4 py-1.5 text-sm sm:hidden">
          <span className="text-ink-soft">
            {answeredCount} of {questions.length} answered
          </span>
          <Stamp status={violationCount > 0 ? 'ALERT' : 'NEUTRAL'}>
            <span className="num">
              {violationCount}/{maxViolations}
            </span>{' '}
            violations
          </Stamp>
        </div>
        <div className="h-[3px] bg-paper-line" aria-hidden="true">
          <div className="h-full bg-board transition-[width] duration-500 ease-out-expo" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-28 pt-6 sm:px-6 lg:flex-row lg:pb-10">
        {/* The question sheet */}
        <main className="min-w-0 flex-1">
          {currentQuestion && (
            <Sheet as="article" className="px-5 py-6 sm:px-9 sm:py-8" aria-labelledby={questionHeadingId}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line pb-4">
                <div className="flex items-baseline gap-3">
                  <span className="display num text-[2.6rem] text-ink">Q{currentIndex + 1}</span>
                  <span className="num text-sm text-ink-faint">
                    of {questions.length} · {currentQuestion.marks} mark{currentQuestion.marks === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cx('flex items-center gap-1.5 text-sm', saveLabel.cls)} aria-live="polite">
                    {saveStatus === 'saved' && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {(saveStatus === 'retrying' || saveStatus === 'error') && <AlertCircle className="h-4 w-4" aria-hidden="true" />}
                    {saveLabel.text}
                  </span>
                  <Button
                    variant={flaggedQuestions.has(currentQuestion.id) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => toggleFlag(currentQuestion.id)}
                    aria-pressed={flaggedQuestions.has(currentQuestion.id)}
                    className={flaggedQuestions.has(currentQuestion.id) ? 'border-stock-canary-ink/40 bg-stock-canary' : ''}
                  >
                    <Bookmark
                      className={cx('h-4 w-4', flaggedQuestions.has(currentQuestion.id) && 'fill-stock-canary-ink text-stock-canary-ink')}
                      aria-hidden="true"
                    />
                    {flaggedQuestions.has(currentQuestion.id) ? 'Marked for review' : 'Mark for review'}
                  </Button>
                </div>
              </div>

              <h2 id={questionHeadingId} className="mt-6 max-w-[70ch] whitespace-pre-wrap text-[1.2rem] font-semibold leading-relaxed text-ink sm:text-[1.3rem]">
                {currentQuestion.text}
              </h2>

              <div className="mt-6">
                {currentQuestion.type === 'SHORT_ANSWER' ? (
                  <Field label="Your answer" hint="Your answer saves a moment after you stop typing.">
                    <Textarea
                      rows={6}
                      value={currentAnswer?.textAnswer || ''}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, null, e.target.value)}
                      className="text-[17px]"
                    />
                  </Field>
                ) : (
                  <div role="radiogroup" aria-labelledby={questionHeadingId} className="space-y-2.5">
                    {currentQuestion.options?.map((option, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = currentAnswer?.selectedOptionId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleAnswerSelect(currentQuestion.id, option.id, null)}
                          className={cx(
                            'flex min-h-[3.5rem] w-full items-center gap-4 rounded-[5px] border px-4 py-3 text-left',
                            'transition-[border-color,background-color,scale] duration-150 active:scale-[0.99]',
                            isSelected ? 'border-ink bg-paper' : 'border-paper-rule bg-paper hover:border-ink-faint hover:bg-paper-tint'
                          )}
                        >
                          <span
                            className={cx(
                              'caps flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border text-[15px]',
                              isSelected ? 'border-ink bg-ink text-white' : 'border-ink-faint/60 text-ink-soft'
                            )}
                            aria-hidden="true"
                          >
                            {letter}
                          </span>
                          <span className={cx('text-[17px] leading-snug text-ink', isSelected && 'hl-mark font-semibold')}>{option.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop navigation */}
              <div className="mt-8 hidden items-center justify-between border-t border-paper-line pt-5 lg:flex">
                <Button variant="secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex((prev) => prev - 1)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                {hasAnswer && (
                  <Button variant="ghost" size="sm" onClick={() => handleAnswerSelect(currentQuestion.id, null, null)}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Clear answer
                  </Button>
                )}
                {isLastQuestion ? (
                  <Button variant="ink" onClick={() => setIsSubmitModalOpen(true)}>
                    Review and submit
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setCurrentIndex((prev) => prev + 1)}>
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="mt-4 hidden text-sm text-ink-faint lg:block">
                Keys: ← → move between questions · A–E choose an option · F marks for review
              </p>
            </Sheet>
          )}

          {/* Mobile: all questions in a collapsible list */}
          <details className="sheet mt-4 px-5 py-4 lg:hidden">
            <summary className="flex cursor-pointer items-center justify-between text-[15px] font-bold text-ink">
              All questions
              <span className="num text-sm font-normal text-ink-faint">
                {answeredCount}/{questions.length} answered
              </span>
            </summary>
            <div className="mt-4">
              <QuestionGrid />
            </div>
          </details>
        </main>

        {/* Desktop question index */}
        <aside className="hidden w-72 shrink-0 lg:block" aria-label="Question index">
          <Sheet className="sticky top-28 px-5 py-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="caps text-[15px] text-ink">Questions</h2>
              <span className="num text-sm text-ink-faint">
                {answeredCount}/{questions.length}
              </span>
            </div>
            <QuestionGrid />
            <div className="mt-5 border-t border-paper-line pt-4">
              <Button variant="ink" className="w-full" onClick={() => setIsSubmitModalOpen(true)}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Submit exam
              </Button>
            </div>
          </Sheet>
        </aside>
      </div>

      {/* Mobile: navigation in thumb reach */}
      {currentQuestion && (
        <nav
          aria-label="Question navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-rule bg-paper px-3 pt-2.5 shadow-[0_-6px_16px_-10px_rgba(20,33,61,0.3)] lg:hidden"
          style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="lg" className="flex-1" disabled={currentIndex === 0} onClick={() => setCurrentIndex((prev) => prev - 1)}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              Prev
            </Button>
            {isLastQuestion ? (
              <Button variant="ink" size="lg" className="flex-1" onClick={() => setIsSubmitModalOpen(true)}>
                Submit
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button variant="primary" size="lg" className="flex-1" onClick={() => setCurrentIndex((prev) => prev + 1)}>
                Next
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
          </div>
          {hasAnswer && (
            <button
              type="button"
              onClick={() => handleAnswerSelect(currentQuestion.id, null, null)}
              className="mx-auto mt-1 flex min-h-9 items-center gap-1.5 px-3 text-sm text-ink-faint"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear answer
            </button>
          )}
        </nav>
      )}

      {/* Violation notice */}
      <Dialog
        open={isWarningOpen}
        title={isAutoSubmitted ? 'Exam submitted' : 'Violation recorded'}
        dismissible={false}
        size="sm"
        footer={
          !isAutoSubmitted && (
            <Button variant="ink" className="w-full" onClick={dismissWarning}>
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              Back to my exam
            </Button>
          )
        }
      >
        <div className="flex items-center gap-4">
          <div className="num shrink-0 rounded-[4px] bg-stock-salmon px-3 py-2 text-center text-stock-salmon-ink">
            <div className="text-[2rem] font-bold leading-none">{violationCount}</div>
            <div className="caps mt-1 text-[11px]">of {maxViolations}</div>
          </div>
          <p className="text-[15px] leading-snug text-ink">{warningMessage}</p>
        </div>
        {isAutoSubmitted && <p className="mt-4 text-sm text-ink-soft">Taking you to your result…</p>}
      </Dialog>

      {/* Fullscreen required */}
      <Dialog
        open={needsFullscreen}
        title="Return to fullscreen"
        dismissible={false}
        size="sm"
        footer={
          <Button variant="ink" className="w-full" onClick={enterFullscreen}>
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Return to fullscreen
          </Button>
        }
      >
        <p className="text-[15px] leading-snug text-ink">
          This exam runs in fullscreen. Your answers are saved and the clock is still running.
        </p>
        {fullscreenError && (
          <Alert tone="error" className="mt-4">
            {fullscreenError}
          </Alert>
        )}
      </Dialog>

      {/* Submit confirmation */}
      <Dialog
        open={isSubmitModalOpen}
        title="Submit your exam?"
        size="sm"
        onClose={
          isSubmitting
            ? undefined
            : () => {
                setIsSubmitModalOpen(false);
                setSubmitError('');
              }
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => {
                setIsSubmitModalOpen(false);
                setSubmitError('');
              }}
            >
              Keep working
            </Button>
            <Button variant="ink" loading={isSubmitting} onClick={handleSubmitExam}>
              {isSubmitting ? 'Submitting…' : 'Submit exam'}
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink-soft">You cannot change your answers after submitting.</p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-paper-line rounded-[4px] border border-paper-line">
          <Figure className="px-4 py-3" label="Answered" value={`${answeredCount}/${questions.length}`} />
          <Figure
            className="px-4 py-3"
            label="Not answered"
            value={questions.length - answeredCount}
            tone={questions.length - answeredCount > 0 ? 'text-stock-canary-ink' : 'text-ink'}
          />
        </div>
        {flaggedQuestions.size > 0 && (
          <Alert tone="warn" className="mt-4">
            {flaggedQuestions.size} question{flaggedQuestions.size > 1 ? 's are' : ' is'} still marked for review.
          </Alert>
        )}
        {submitError && (
          <Alert tone="error" className="mt-4">
            {submitError}
          </Alert>
        )}
      </Dialog>
    </div>
  );
};

export default ExamPlayer;
