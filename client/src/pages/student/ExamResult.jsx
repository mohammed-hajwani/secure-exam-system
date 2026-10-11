import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flag } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import api from '../../services/api';
import { Alert, Button, EmptyNotice, Figure, Sheet, Spinner, Stamp } from '../../components/ui';
import { fmtDateTime, pct } from '../../utils/format';

const round = (n) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? v : v.toFixed(1);
};

const ExamResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyAttempt = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/exams/${id}/my-attempt`);
        setResultData(response.data?.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load your result.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyAttempt();
  }, [id]);

  const attempt = resultData?.attempt;
  const percent = attempt ? pct(attempt.score, attempt.totalMarks) : 0;
  const unanswered = attempt ? attempt.totalQuestions - attempt.answeredCount : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => navigate('/student')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to timetable
        </Button>

        {loading ? (
          <Spinner label="Loading your result" />
        ) : error || !attempt ? (
          <EmptyNotice
            title="No result yet"
            action={
              <Button variant="secondary" onClick={() => navigate('/student')}>
                Back to timetable
              </Button>
            }
          >
            {error || 'There is no submitted attempt for this exam.'}
          </EmptyNotice>
        ) : (
          <Sheet as="article" className="overflow-hidden" aria-labelledby="result-title">
            <div className="border-b-2 border-ink px-6 pb-6 pt-7 sm:px-9">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 id="result-title" className="display text-[2.4rem] text-ink sm:text-[3rem]">
                    {attempt.examTitle}
                  </h1>
                  <p className="mt-2 text-[15px] text-ink-soft">
                    {attempt.subject}
                    {attempt.submittedAt && <span className="num"> · submitted {fmtDateTime(attempt.submittedAt)}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Stamp status={attempt.status === 'AUTO_SUBMITTED' ? 'AUTO_SUBMITTED' : attempt.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'SUBMITTED'} />
                  {attempt.isFlagged && <Stamp status="FLAGGED" icon={Flag} />}
                </div>
              </div>
            </div>

            <div className="px-6 py-8 text-center sm:px-9">
              <div className="caps text-sm text-ink-faint">Your score</div>
              <div className="mt-3 inline-flex items-baseline gap-2">
                <span className="display num hl-mark text-[5.5rem] text-ink">{round(attempt.score)}</span>
                <span className="display num text-[2.25rem] text-ink-faint">/ {round(attempt.totalMarks)}</span>
              </div>
              <div className="num mt-2 text-lg font-bold text-ink">{percent}%</div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-paper-line border-y border-paper-line">
              <Figure className="px-4 py-4 sm:px-6" label="Answered" value={`${attempt.answeredCount}/${attempt.totalQuestions}`} />
              <Figure className="px-4 py-4 sm:px-6" label="Left blank" value={unanswered} tone={unanswered > 0 ? 'text-stock-canary-ink' : 'text-ink'} />
              <Figure className="px-4 py-4 sm:px-6" label="Violations" value={attempt.violationCount} tone={attempt.violationCount > 0 ? 'text-stock-salmon-ink' : 'text-ink'} />
            </div>

            <div className="space-y-4 px-6 py-6 sm:px-9">
              {attempt.isFlagged && (
                <Alert tone="error" title="Flagged for instructor review">
                  This attempt reached its violation limit and was submitted automatically. Your instructor will review the proctoring
                  record before confirming the grade.
                </Alert>
              )}
              {attempt.status === 'AUTO_SUBMITTED' && !attempt.isFlagged && (
                <Alert tone="warn" title="Submitted automatically">
                  Time ran out, so everything you had saved was submitted for you.
                </Alert>
              )}
              <p className="text-sm text-ink-faint">
                Multiple-choice and true/false answers are marked by the server the moment you submit. Short answers are reviewed by your
                instructor and are not included in this score.
              </p>
              <Button variant="primary" onClick={() => navigate('/student')}>
                Back to my timetable
              </Button>
            </div>
          </Sheet>
        )}
      </main>
    </div>
  );
};

export default ExamResult;
