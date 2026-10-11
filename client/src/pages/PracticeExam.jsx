import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Maximize2, RotateCcw, Send } from 'lucide-react';
import { Wordmark } from '../components/layout/Navbar';
import { Alert, Button, Dialog, Figure, Sheet, Stamp, cx } from '../components/ui';
import OptionList from '../components/exam/OptionList';
import { PRACTICE_EXAM, preparePracticePaper } from '../data/practiceExam';
import { fmtClock } from '../utils/format';

const isFullscreenNow = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

const requestFullscreen = async () => {
  try {
    const el = document.documentElement;
    const request = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
    // Some browsers never settle the fullscreen promise; never let that block the paper
    if (request) await Promise.race([request, new Promise((resolve) => setTimeout(resolve, 1500))]);
  } catch {
    // Not available on this device (e.g. iPhone Safari); focus checks still run
  }
};

const exitFullscreen = async () => {
  try {
    if (isFullscreenNow()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }
  } catch {
    // ignore
  }
};

const VIOLATION_TEXT = {
  TAB_SWITCH: 'You left the exam tab.',
  WINDOW_BLUR: 'The exam window lost focus.',
  FULLSCREEN_EXIT: 'You left fullscreen.'
};

const PracticeExam = () => {
  const [stage, setStage] = useState('intro'); // intro | exam | result
  const [paper, setPaper] = useState(() => preparePracticePaper());
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(PRACTICE_EXAM.durationSeconds);
  const [violations, setViolations] = useState([]);
  const [warning, setWarning] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [endReason, setEndReason] = useState('');
  const lastViolationRef = useRef(0);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const finish = useCallback((reason) => {
    setEndReason(reason);
    setStage('result');
    setConfirmOpen(false);
    setWarning(null);
    exitFullscreen();
  }, []);

  // Local proctoring: the same signals the real exam watches, counted here only
  const record = useCallback(
    (type) => {
      if (stageRef.current !== 'exam') return;
      const now = Date.now();
      if (now - lastViolationRef.current < 2000) return;
      lastViolationRef.current = now;
      setViolations((prev) => {
        const next = [...prev, { type, at: new Date() }];
        if (next.length >= PRACTICE_EXAM.maxViolations) {
          setTimeout(() => finish('limit'), 0);
        } else {
          setWarning({ type, count: next.length });
        }
        return next;
      });
    },
    [finish]
  );

  useEffect(() => {
    if (stage !== 'exam') return undefined;
    const onVisibility = () => document.hidden && record('TAB_SWITCH');
    const onBlur = () => record('WINDOW_BLUR');
    const onFullscreen = () => !isFullscreenNow() && record('FULLSCREEN_EXIT');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
    };
  }, [stage, record]);

  useEffect(() => {
    if (stage !== 'exam') return undefined;
    const t = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish('time');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stage, finish]);

  const start = async () => {
    setPaper(preparePracticePaper());
    setAnswers({});
    setCurrent(0);
    setRemaining(PRACTICE_EXAM.durationSeconds);
    setViolations([]);
    setEndReason('');
    await requestFullscreen();
    setStage('exam');
  };

  const q = paper[current];
  const answered = Object.keys(answers).length;
  const score = paper.filter((p) => answers[p.id] === p.correct).length;
  const lowTime = remaining < 30;

  if (stage === 'intro') {
    return (
      <div className="felt flex min-h-screen flex-col">
        <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Wordmark to="/" />
          <Link to="/login" className="text-sm font-semibold text-board-ink hover:text-white">
            Sign in
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-6">
          <Sheet as="article" className="relative w-full max-w-xl overflow-hidden shadow-lift" aria-labelledby="practice-title">
            <div className="border-b-2 border-ink px-6 pb-6 pt-8 sm:px-9">
              <h1 id="practice-title" className="display text-[3rem] text-ink">
                Practice paper
              </h1>
              <p className="mt-2 text-[15px] text-ink-soft">
                Five questions, three minutes, the same rules as a real exam. It runs only in this browser: nothing is sent or saved.
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-paper-line border-b border-paper-line">
              <Figure className="px-6 py-4" label="Time" value={3} unit="min" />
              <Figure className="px-6 py-4" label="Questions" value={PRACTICE_EXAM.questions.length} />
              <Figure className="px-6 py-4" label="Violations allowed" value={PRACTICE_EXAM.maxViolations} tone="text-stock-salmon-ink" />
            </div>
            <div className="px-6 py-6 sm:px-9">
              <ol className="list-decimal space-y-2 pl-5 text-[15px] text-ink-soft marker:font-bold marker:text-ink">
                <li>The paper opens fullscreen, where your device allows it.</li>
                <li>Try leaving the tab or the window: you will see exactly what a student sees.</li>
                <li>At {PRACTICE_EXAM.maxViolations} violations the paper submits itself, just like the real thing.</li>
              </ol>
              <Button size="lg" variant="ink" className="mt-6 w-full sm:w-auto" onClick={start}>
                Start practice paper
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Sheet>
        </main>
      </div>
    );
  }

  if (stage === 'result') {
    const reasonText = {
      limit: `The paper submitted itself after ${PRACTICE_EXAM.maxViolations} violations. In a real exam it would also be flagged for your instructor.`,
      time: 'Time ran out, so your answers were submitted for you.',
      submit: 'You submitted the paper.'
    }[endReason];
    return (
      <div className="flex min-h-screen flex-col">
        <header className="felt border-b border-board-deep">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
            <Wordmark to="/" />
            <Link to="/login" className="text-sm font-semibold text-board-ink hover:text-white">
              Sign in
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <Sheet as="article" className="overflow-hidden" aria-labelledby="practice-result">
            <div className="border-b-2 border-ink px-6 pb-6 pt-7 sm:px-9">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 id="practice-result" className="display text-[2.6rem] text-ink">
                  Practice result
                </h1>
                <Stamp status={endReason === 'limit' ? 'FLAGGED' : endReason === 'time' ? 'AUTO_SUBMITTED' : 'SUBMITTED'}>
                  {endReason === 'limit' ? 'Flagged' : endReason === 'time' ? 'Auto-submitted' : 'Submitted'}
                </Stamp>
              </div>
              <p className="mt-2 text-[15px] text-ink-soft">{reasonText}</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-paper-line border-b border-paper-line">
              <Figure className="px-6 py-4" label="Score" value={`${score}/${paper.length}`} />
              <Figure className="px-6 py-4" label="Answered" value={`${answered}/${paper.length}`} />
              <Figure className="px-6 py-4" label="Violations" value={violations.length} tone={violations.length ? 'text-stock-salmon-ink' : undefined} />
            </div>
            <ol className="divide-y divide-paper-line">
              {paper.map((p, i) => (
                <li key={p.id} className="px-6 py-5 sm:px-9">
                  <div className="flex items-baseline gap-3">
                    <span className="display num text-xl text-ink">Q{i + 1}</span>
                    <p id={`r-${p.id}`} className="text-[15px] font-semibold text-ink">
                      {p.text}
                    </p>
                  </div>
                  <div className="mt-3">
                    <OptionList options={p.options} selectedId={answers[p.id]} onSelect={() => {}} labelledBy={`r-${p.id}`} size="sm" reveal correctId={p.correct} />
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{p.explain}</p>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2 border-t border-paper-line bg-paper-tint px-6 py-5 sm:px-9">
              <Button variant="ink" onClick={start}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
              <Link to="/" className="inline-flex min-h-11 items-center px-4 text-[15px] font-semibold text-ink underline">
                Back to ExamShield
              </Link>
            </div>
            <p className="px-6 pb-6 text-sm text-ink-faint sm:px-9">
              In a real exam you would not see answers here: the answer key never leaves the server, and marking happens there.
            </p>
          </Sheet>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper-ground">
      <header className="sticky top-0 z-30 border-b border-paper-rule bg-paper">
        <div className="h-1 bg-board" aria-hidden="true" />
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-ink">Practice paper</div>
            <div className="num hidden text-sm text-ink-faint sm:block">
              {answered} of {paper.length} answered
            </div>
          </div>
          <div
            role="timer"
            aria-label={`${fmtClock(remaining)} remaining`}
            className={cx('num flex items-center gap-1.5 rounded-[5px] px-3 py-1.5', lowTime ? 'bg-ink text-white' : 'text-ink')}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span className="text-[1.6rem] font-bold leading-none">{fmtClock(remaining)}</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Stamp status={violations.length ? 'ALERT' : 'NEUTRAL'} className="hidden sm:inline-flex">
              <span className="num">
                {violations.length}/{PRACTICE_EXAM.maxViolations}
              </span>{' '}
              violations
            </Stamp>
            <Button variant="ink" size="sm" onClick={() => setConfirmOpen(true)}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Finish
            </Button>
          </div>
        </div>
        {/* Phones: standing on its own line, so the header never wraps */}
        <div className="num flex items-center justify-between border-t border-paper-line px-4 py-1.5 text-sm sm:hidden">
          <span className="text-ink-soft">
            {answered} of {paper.length} answered
          </span>
          <Stamp status={violations.length ? 'ALERT' : 'NEUTRAL'}>
            <span className="num">
              {violations.length}/{PRACTICE_EXAM.maxViolations}
            </span>{' '}
            violations
          </Stamp>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-10">
        <Sheet as="article" className="px-5 py-6 sm:px-9 sm:py-8" aria-labelledby={`pq-${q.id}`}>
          <div className="flex items-baseline justify-between border-b border-paper-line pb-4">
            <span className="display num text-[2.6rem] text-ink">Q{current + 1}</span>
            <span className="num text-sm text-ink-faint">of {paper.length} · 1 mark</span>
          </div>
          <h2 id={`pq-${q.id}`} className="mt-6 text-[1.2rem] font-semibold leading-relaxed text-ink sm:text-[1.3rem]">
            {q.text}
          </h2>
          <div className="mt-6">
            <OptionList options={q.options} selectedId={answers[q.id]} onSelect={(id) => setAnswers((a) => ({ ...a, [q.id]: id }))} labelledBy={`pq-${q.id}`} />
          </div>
          <div className="mt-8 hidden items-center justify-between border-t border-paper-line pt-5 sm:flex">
            <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            {current === paper.length - 1 ? (
              <Button variant="ink" onClick={() => setConfirmOpen(true)}>
                Review and submit
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={() => setCurrent((c) => c + 1)}>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </Sheet>
        <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Questions">
          {paper.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-current={i === current ? 'step' : undefined}
                aria-label={`Question ${i + 1}${answers[p.id] ? ', answered' : ''}`}
                className={cx(
                  'num h-11 w-11 rounded-[4px] border text-[15px] font-bold',
                  i === current ? 'border-ink bg-hl text-ink' : answers[p.id] ? 'border-ink bg-ink text-white' : 'border-paper-rule bg-paper text-ink-soft'
                )}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      </main>

      <nav
        aria-label="Question navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-rule bg-paper px-3 pt-2.5 sm:hidden"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" className="flex-1" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Prev
          </Button>
          {current === paper.length - 1 ? (
            <Button variant="ink" size="lg" className="flex-1" onClick={() => setConfirmOpen(true)}>
              Submit
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => setCurrent((c) => c + 1)}>
              Next
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </nav>

      <Dialog
        open={!!warning}
        title="Violation recorded"
        dismissible={false}
        size="sm"
        footer={
          <Button
            variant="ink"
            className="w-full"
            onClick={async () => {
              setWarning(null);
              await requestFullscreen();
            }}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Back to my paper
          </Button>
        }
      >
        <div className="flex items-center gap-4">
          <div className="num shrink-0 rounded-[4px] bg-stock-salmon px-3 py-2 text-center text-stock-salmon-ink">
            <div className="text-[2rem] font-bold leading-none">{warning?.count}</div>
            <div className="caps mt-1 text-[11px]">of {PRACTICE_EXAM.maxViolations}</div>
          </div>
          <p className="text-[15px] leading-snug text-ink">
            {VIOLATION_TEXT[warning?.type]} In a real exam this is written to the audit log with the time and your IP address.
          </p>
        </div>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit your practice paper?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep working
            </Button>
            <Button variant="ink" onClick={() => finish('submit')}>
              Submit
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink-soft">
          {answered} of {paper.length} answered.
        </p>
        {answered < paper.length && (
          <Alert tone="warn" className="mt-3">
            {paper.length - answered} question{paper.length - answered > 1 ? 's are' : ' is'} still blank.
          </Alert>
        )}
      </Dialog>
    </div>
  );
};

export default PracticeExam;
