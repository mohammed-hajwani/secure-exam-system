import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Flag, Search } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, Button, EmptyNotice, Input, PageHeader, Sheet, SheetHeader, Spinner, Stamp, cx } from '../../components/ui';
import { fmtDay, fmtRelative, fmtScore, fmtTime, fmtWindow, studentExamStatus } from '../../utils/format';

const ORDER = { IN_PROGRESS: 0, OPEN: 1, UPCOMING: 2 };

const ExamAction = ({ exam, status, navigate, emphasis }) => {
  if (status === 'IN_PROGRESS') {
    return (
      <Button size="md" variant="ink" onClick={() => navigate(`/student/exams/${exam.id}/player`)}>
        Resume exam
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    );
  }
  if (status === 'OPEN') {
    return (
      <Button size="md" variant={emphasis ? 'ink' : 'primary'} onClick={() => navigate(`/student/exams/${exam.id}/briefing`)}>
        Start
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    );
  }
  if (status === 'UPCOMING') {
    return <span className="num text-sm text-ink-faint">Opens {fmtRelative(exam.startTime)}</span>;
  }
  if (exam.myAttempt) {
    return (
      <Button size="sm" variant="secondary" onClick={() => navigate(`/student/exams/${exam.id}/result`)}>
        View result
      </Button>
    );
  }
  return <span className="text-sm text-ink-faint">Window closed</span>;
};

const TimetableRow = ({ exam, status, highlighted, navigate }) => {
  const past = !(status in ORDER);
  return (
    <li className={cx('rule-b last:border-b-0', highlighted && 'hl-row')}>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 px-4 py-4 sm:px-5 md:grid-cols-[8.5rem_minmax(0,1fr)_4.75rem_7rem_10.5rem] md:items-center">
        <div className="col-span-2 flex flex-wrap items-baseline gap-x-2 md:col-span-1 md:block">
          <span className={cx('num text-[15px] font-bold', past ? 'text-ink-soft' : 'text-ink')}>{fmtDay(exam.startTime)}</span>
          <span className="num block text-sm text-ink-faint">{fmtWindow(exam.startTime, exam.endTime)}</span>
        </div>
        <div className="col-span-2 min-w-0 md:col-span-1">
          <div className={cx('text-[17px] font-bold leading-snug [text-wrap:balance]', past ? 'text-ink-soft' : 'text-ink')}>{exam.title}</div>
          <div className="truncate text-sm text-ink-faint">
            {exam.subject}
            <span className="md:hidden">
              {' '}
              · {exam.durationMinutes} min · {exam.questionCount} questions
            </span>
          </div>
        </div>
        <div className="num hidden text-[15px] text-ink-soft md:block">
          {exam.durationMinutes} min
          <div className="text-sm text-ink-faint">{exam.questionCount} questions</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Stamp status={status} />
          {exam.myAttempt?.isFlagged && <Stamp status="FLAGGED" icon={Flag} />}
          {past && exam.myAttempt && (exam.myAttempt.status === 'SUBMITTED' || exam.myAttempt.status === 'AUTO_SUBMITTED') && (
            <span className="num text-sm font-bold text-ink">{fmtScore(exam.myAttempt.score, exam.totalMarks || exam.questionCount)}</span>
          )}
        </div>
        <div className="flex justify-end md:justify-end">
          <ExamAction exam={exam} status={status} navigate={navigate} emphasis={highlighted} />
        </div>
      </div>
    </li>
  );
};

const ColumnHeads = () => (
  <div className="caps hidden grid-cols-[8.5rem_minmax(0,1fr)_4.75rem_7rem_10.5rem] gap-x-4 border-b-2 border-ink px-5 pb-2 pt-4 text-[12px] text-ink-faint md:grid">
    <span>Day · window</span>
    <span>Paper</span>
    <span>Length</span>
    <span>Status</span>
    <span className="text-right">Action</span>
  </div>
);

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const response = await api.get('/exams');
        setExams(response.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load your timetable.');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const { current, past, nowRowId, counts, nextOpening } = useMemo(() => {
    const now = new Date();
    const q = searchQuery.trim().toLowerCase();
    const withStatus = exams
      .map((exam) => ({ exam, status: studentExamStatus(exam, now) }))
      .filter(({ exam }) => !q || exam.title.toLowerCase().includes(q) || exam.subject.toLowerCase().includes(q));

    const cur = withStatus
      .filter(({ status }) => status in ORDER)
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || new Date(a.exam.startTime) - new Date(b.exam.startTime));
    const pst = withStatus
      .filter(({ status }) => !(status in ORDER))
      .sort((a, b) => new Date(b.exam.endTime) - new Date(a.exam.endTime));

    const nowRow = cur.find(({ status }) => status === 'IN_PROGRESS' || status === 'OPEN');
    const allStatuses = exams.map((e) => studentExamStatus(e, now));
    const upcoming = exams
      .filter((e) => studentExamStatus(e, now) === 'UPCOMING')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

    return {
      current: cur,
      past: pst,
      nowRowId: nowRow?.exam.id,
      nextOpening: upcoming,
      counts: {
        open: allStatuses.filter((s) => s === 'OPEN' || s === 'IN_PROGRESS').length,
        upcoming: allStatuses.filter((s) => s === 'UPCOMING').length
      }
    };
  }, [exams, searchQuery]);

  const summary = loading
    ? 'Checking your timetable…'
    : `${user?.batch ? `Batch ${user.batch} · ` : ''}${counts.open} open now · ${counts.upcoming} upcoming${
        nextOpening ? ` · next opens ${fmtDay(nextOpening.startTime)} at ${fmtTime(nextOpening.startTime)}` : ''
      }`;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PageHeader
          title="My exam timetable"
          subtitle={summary}
          actions={
            <div className="relative w-full sm:w-72">
              <label htmlFor="exam-search" className="sr-only">
                Search exams
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <Input
                id="exam-search"
                type="search"
                placeholder="Search by paper or subject"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          }
        />

        {error && <Alert tone="error" className="mb-6">{error}</Alert>}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="min-w-0 space-y-6">
            <Sheet aria-labelledby="timetable-heading">
              <SheetHeader title={<span id="timetable-heading">Timetable</span>} meta={loading ? '' : `${current.length} papers`} />
              {loading ? (
                <Spinner label="Loading your timetable" />
              ) : current.length === 0 ? (
                <EmptyNotice title={searchQuery ? 'No matching papers' : 'Nothing scheduled'} icon={BookOpen}>
                  {searchQuery
                    ? 'No open or upcoming exam matches your search.'
                    : 'When your faculty publishes an exam for your batch, it appears here with its date and window.'}
                </EmptyNotice>
              ) : (
                <>
                  <ColumnHeads />
                  <ul>
                    {current.map(({ exam, status }) => (
                      <TimetableRow key={exam.id} exam={exam} status={status} highlighted={exam.id === nowRowId} navigate={navigate} />
                    ))}
                  </ul>
                </>
              )}
            </Sheet>

            {!loading && past.length > 0 && (
              <Sheet aria-labelledby="past-heading">
                <SheetHeader title={<span id="past-heading">Past papers</span>} meta={`${past.length}`} />
                <ColumnHeads />
                <ul>
                  {past.map(({ exam, status }) => (
                    <TimetableRow key={exam.id} exam={exam} status={status} navigate={navigate} />
                  ))}
                </ul>
              </Sheet>
            )}
          </div>

          <aside className="relative rotate-[0.6deg] rounded-[2px] bg-stock-canary px-5 pb-5 pt-6 shadow-pinned lg:sticky lg:top-24" aria-labelledby="rules-heading">
            <span className="pin" aria-hidden="true" />
            <h2 id="rules-heading" className="caps text-base text-ink">
              Exam rules
            </h2>
            <ul className="mt-3 space-y-3 text-sm leading-snug text-ink-soft">
              <li>The exam runs fullscreen. Leaving the tab, window or fullscreen counts as a violation.</li>
              <li>Each paper sets its own violation limit. Reach it and the exam submits itself.</li>
              <li>Answers save as you go. You will see “Saved” beside each question.</li>
              <li>The clock belongs to the server, so refreshing never buys extra time.</li>
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
