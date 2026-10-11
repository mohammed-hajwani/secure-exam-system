import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flag, RotateCcw, Search, Users } from 'lucide-react';
import api from '../../services/api';
import AttemptInspectorModal from '../../components/faculty/AttemptInspectorModal';
import { Alert, Button, EmptyNotice, Figure, Input, PageHeader, Select, Sheet, SheetHeader, Spinner, Stamp } from '../../components/ui';
import { fmtDateTime, fmtScore, pct } from '../../utils/format';

const ExamSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/exams/${id}/attempts`);
      setData(response.data?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  const exam = data?.exam;
  const stats = data?.stats;
  const attempts = data?.attempts || [];

  const filteredAttempts = attempts.filter((att) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      att.student.name.toLowerCase().includes(s) ||
      att.student.email.toLowerCase().includes(s) ||
      (att.student.batch && att.student.batch.toLowerCase().includes(s));
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'FLAGGED' && att.isFlagged) ||
      (statusFilter === 'SUBMITTED' && (att.status === 'SUBMITTED' || att.status === 'AUTO_SUBMITTED')) ||
      (statusFilter === 'IN_PROGRESS' && att.status === 'IN_PROGRESS');
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => navigate('/faculty/exams')}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to exams
      </Button>

      <PageHeader
        title={exam?.title || 'Submissions'}
        subtitle={exam ? `${exam.subject} · Batch ${exam.targetBatch} · ${exam.totalQuestions} questions · ${exam.totalMarks} marks` : undefined}
        actions={
          <Button variant="secondary" onClick={fetchSubmissions} loading={loading}>
            {!loading && <RotateCcw className="h-4 w-4" aria-hidden="true" />}
            Refresh
          </Button>
        }
      />

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      {stats && (
        <Sheet className="mb-6 grid grid-cols-3 divide-paper-line sm:grid-cols-6 sm:divide-x">
          <Figure className="px-5 py-4" label="Attempts" value={stats.totalAttempts} />
          <Figure className="px-5 py-4" label="Submitted" value={stats.submittedCount} />
          <Figure className="px-5 py-4" label="In progress" value={stats.inProgressCount} />
          <Figure className="px-5 py-4" label="Flagged" value={stats.flaggedCount} tone={stats.flaggedCount > 0 ? 'text-stock-salmon-ink' : undefined} />
          <Figure className="px-5 py-4" label="Average" value={stats.averageScore} unit={`/ ${exam?.totalMarks ?? 0}`} />
          <Figure className="px-5 py-4" label="Highest" value={stats.highestScore} unit={`/ ${exam?.totalMarks ?? 0}`} />
        </Sheet>
      )}

      <Sheet aria-labelledby="attempts-heading">
        <SheetHeader title={<span id="attempts-heading">Candidates</span>} meta={loading ? '' : `${filteredAttempts.length} of ${attempts.length}`} />
        <div className="grid gap-3 border-b border-paper-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:px-5">
          <div className="relative">
            <label htmlFor="cand-search" className="sr-only">
              Search candidates
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input
              id="cand-search"
              type="search"
              className="pl-9"
              placeholder="Name, email or batch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cand-status" className="sr-only">
              Status
            </label>
            <Select id="cand-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">Every attempt</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="FLAGGED">Flagged</option>
              <option value="IN_PROGRESS">In progress</option>
            </Select>
          </div>
        </div>

        {loading && !data ? (
          <Spinner label="Loading submissions" />
        ) : attempts.length === 0 ? (
          <EmptyNotice title="No attempts yet" icon={Users}>
            Attempts appear here as soon as a student begins the exam.
          </EmptyNotice>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left">
              <thead>
                <tr className="caps border-b-2 border-ink text-[12px] text-ink-faint">
                  <th scope="col" className="px-5 py-2.5 font-bold">Candidate</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Violations</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Score</th>
                  <th scope="col" className="px-3 py-2.5 font-bold">Submitted</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-bold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[15px] text-ink-faint">
                      No candidates match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((att) => {
                    const done = att.status === 'SUBMITTED' || att.status === 'AUTO_SUBMITTED';
                    return (
                      <tr key={att.id} className="rule-b last:border-b-0">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-ink">{att.student.name}</div>
                          <div className="text-sm text-ink-faint">{att.student.email}</div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            <Stamp status={att.status} />
                            {att.isFlagged && <Stamp status="FLAGGED" icon={Flag} />}
                          </div>
                        </td>
                        <td className={`num px-3 py-3.5 text-[15px] ${att.violationCount > 0 ? 'font-bold text-stock-salmon-ink' : 'text-ink-soft'}`}>
                          {att.violationCount}
                        </td>
                        <td className="num px-3 py-3.5 text-[15px]">
                          {done ? (
                            <>
                              <span className="font-bold text-ink">{fmtScore(att.score, exam?.totalMarks)}</span>
                              <span className="ml-1.5 text-sm text-ink-faint">{pct(att.score, exam?.totalMarks)}%</span>
                            </>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="num px-3 py-3.5 text-sm text-ink-soft">{att.submittedAt ? fmtDateTime(att.submittedAt) : 'Still writing'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedAttemptId(att.id)}>
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Sheet>

      {selectedAttemptId && <AttemptInspectorModal examId={id} attemptId={selectedAttemptId} onClose={() => setSelectedAttemptId(null)} />}
    </div>
  );
};

export default ExamSubmissions;
