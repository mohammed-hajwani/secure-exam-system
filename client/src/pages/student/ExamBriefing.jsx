import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Maximize2, Wifi, WifiOff } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import api from '../../services/api';
import { Alert, Button, EmptyNotice, Figure, Sheet, Spinner } from '../../components/ui';
import { fmtDay, fmtWindow } from '../../utils/format';

const fullscreenAvailable = () =>
  typeof document !== 'undefined' && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);

const Check = ({ ok, title, detail }) => (
  <li className="flex items-start gap-3 py-3">
    {ok ? (
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-board" aria-hidden="true" />
    ) : (
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-stock-canary-ink" aria-hidden="true" />
    )}
    <div>
      <div className="font-bold text-ink">
        {title}
        <span className="sr-only">{ok ? ' (ready)' : ' (needs attention)'}</span>
      </div>
      <div className="text-sm text-ink-soft">{detail}</div>
    </div>
  </li>
);

const ExamBriefing = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [entering, setEntering] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const canFullscreen = fullscreenAvailable();

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/exams/${id}`);
        setExam(response.data?.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load this exam.');
      } finally {
        setLoading(false);
      }
    };
    fetchExamDetails();
  }, [id]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const handleStartExam = async () => {
    if (!agreed) return;
    try {
      setEntering(true);
      const docEl = document.documentElement;
      const request = docEl.requestFullscreen
        ? docEl.requestFullscreen()
        : docEl.webkitRequestFullscreen
        ? docEl.webkitRequestFullscreen()
        : null;
      // Some browsers never settle the fullscreen promise; never let that block the exam
      if (request) await Promise.race([request, new Promise((resolve) => setTimeout(resolve, 1500))]);
    } catch (err) {
      console.warn('Browser fullscreen blocked or unsupported:', err);
    } finally {
      navigate(`/student/exams/${id}/player`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => navigate('/student')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to timetable
        </Button>

        {loading ? (
          <Spinner label="Loading exam details" />
        ) : error || !exam ? (
          <EmptyNotice
            title="Exam unavailable"
            action={
              <Button variant="secondary" onClick={() => navigate('/student')}>
                Back to timetable
              </Button>
            }
          >
            {error || 'This exam could not be found.'}
          </EmptyNotice>
        ) : (
          <Sheet as="article" className="overflow-hidden" aria-labelledby="paper-title">
            <div className="border-b-2 border-ink px-6 pb-6 pt-7 sm:px-9">
              <h1 id="paper-title" className="display text-[2.6rem] text-ink sm:text-[3.4rem]">
                {exam.title}
              </h1>
              <p className="num mt-3 text-[15px] text-ink-soft">
                {exam.subject} · Batch {exam.targetBatch} · {fmtDay(exam.startTime)}, window {fmtWindow(exam.startTime, exam.endTime)}
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-paper-line border-b border-paper-line">
              <Figure className="px-4 py-4 sm:px-9" label="Time allowed" value={exam.durationMinutes} unit="min" />
              <Figure className="px-4 py-4 sm:px-6" label="Questions" value={exam.questionCount} />
              <Figure className="px-4 py-4 sm:px-6" label="Violations allowed" value={exam.maxViolations} tone="text-stock-salmon-ink" />
            </div>

            <div className="grid gap-8 px-6 py-7 sm:px-9 md:grid-cols-2">
              <section aria-labelledby="instructions-heading">
                <h2 id="instructions-heading" className="caps text-base text-ink">
                  Instructions to candidates
                </h2>
                <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-[15px] leading-snug text-ink-soft marker:font-bold marker:text-ink">
                  <li>The exam opens in fullscreen and stays there until you submit.</li>
                  <li>Switching tabs, leaving the window or exiting fullscreen is recorded as a violation.</li>
                  <li>
                    At <strong className="num text-ink">{exam.maxViolations}</strong> violations the exam submits itself and is flagged for your
                    instructor.
                  </li>
                  <li>Answers save automatically. When time runs out, everything saved is submitted.</li>
                </ol>
              </section>

              <section aria-labelledby="checks-heading">
                <h2 id="checks-heading" className="caps text-base text-ink">
                  This device
                </h2>
                <ul className="mt-1 divide-y divide-paper-line">
                  <Check
                    ok={online}
                    title={online ? 'Connected' : 'You are offline'}
                    detail={online ? 'Answers will save as you go.' : 'Reconnect before you begin, or your answers cannot be saved.'}
                  />
                  <Check
                    ok={canFullscreen}
                    title={canFullscreen ? 'Fullscreen available' : 'Fullscreen not available here'}
                    detail={
                      canFullscreen
                        ? 'The exam will switch to fullscreen when you begin.'
                        : 'This browser cannot go fullscreen. Tab and focus checks still apply.'
                    }
                  />
                </ul>
                <div className="sr-only" aria-live="polite">
                  {online ? '' : 'You are offline.'}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-ink-faint">
                  {online ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  Checked just now on this browser.
                </div>
              </section>
            </div>

            <div className="border-t border-paper-line bg-paper-tint px-6 py-5 sm:px-9">
              {!online && (
                <Alert tone="warn" className="mb-4">
                  You are offline. You can begin, but nothing will save until you reconnect.
                </Alert>
              )}
              <label htmlFor="consent" className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-[3px] border-ink-faint accent-board"
                />
                <span className="text-[15px] leading-snug text-ink">
                  I will work alone, without unauthorised aids, and keep this exam in front of me until I submit.
                </span>
              </label>
              <div className="mt-5 flex justify-end">
                <Button size="lg" variant="ink" className="w-full sm:w-auto" disabled={!agreed} loading={entering} onClick={handleStartExam}>
                  {entering ? 'Opening exam…' : 'Begin exam'}
                  {!entering && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </Sheet>
        )}
      </main>
    </div>
  );
};

export default ExamBriefing;
