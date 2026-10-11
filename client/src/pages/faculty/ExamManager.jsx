import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronLeft, ChevronRight, FileText, Plus, Search, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { Alert, Button, Dialog, EmptyNotice, Field, Input, PageHeader, Sheet, SheetHeader, Spinner, Stamp, cx } from '../../components/ui';
import { fmtDay, fmtWindow } from '../../utils/format';

const EMPTY_FORM = {
  title: '',
  subject: '',
  targetBatch: '',
  durationMinutes: 45,
  startTime: '',
  endTime: '',
  maxViolations: 3,
  selectedQuestionIds: []
};

const STEPS = ['Details', 'Schedule and rules', 'Questions'];

const facultyStatus = (exam, now = new Date()) => {
  if (!exam.isPublished) return 'DRAFT';
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  if (now < start) return 'UPCOMING';
  if (now <= end) return 'OPEN';
  return 'CLOSED';
};

const STATUS_LABEL = { DRAFT: 'Draft', UPCOMING: 'Scheduled', OPEN: 'Live now', CLOSED: 'Finished' };

const ExamManager = () => {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [questionFilter, setQuestionFilter] = useState('');

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const flash = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const [examsRes, questionsRes] = await Promise.all([api.get('/exams'), api.get('/questions')]);
      setExams(examsRes.data?.data || []);
      setQuestions(questionsRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setCurrentStep(1);
    setFormError('');
    setQuestionFilter('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleToggleQuestion = (id) => {
    setFormData((prev) => {
      const exists = prev.selectedQuestionIds.includes(id);
      return {
        ...prev,
        selectedQuestionIds: exists ? prev.selectedQuestionIds.filter((qId) => qId !== id) : [...prev.selectedQuestionIds, id]
      };
    });
  };

  const handlePublish = async (examId) => {
    setError('');
    try {
      await api.patch(`/exams/${examId}/publish`);
      flash('Exam published. Students in the batch can now see it on their timetable.');
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not publish the exam.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setError('');
    try {
      setIsDeleting(true);
      await api.delete(`/exams/${pendingDelete.id}`);
      flash(`“${pendingDelete.title}” was deleted.`);
      setPendingDelete(null);
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the exam.');
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const validateStep = (step) => {
    if (step === 1 && (!formData.title.trim() || !formData.subject.trim() || !formData.targetBatch.trim())) {
      return 'Fill in the title, subject and batch.';
    }
    if (step === 2) {
      if (!formData.startTime || !formData.endTime) return 'Set when the window opens and closes.';
      if (new Date(formData.endTime) <= new Date(formData.startTime)) return 'The window must close after it opens.';
    }
    if (step === 3 && formData.selectedQuestionIds.length === 0) return 'Pick at least one question.';
    return '';
  };

  const goNext = () => {
    const problem = validateStep(currentStep);
    setFormError(problem);
    if (!problem) setCurrentStep((s) => s + 1);
  };

  const handleCreateExam = async () => {
    const problem = validateStep(1) || validateStep(2) || validateStep(3);
    setFormError(problem);
    if (problem) return;

    try {
      setIsSubmitting(true);
      await api.post('/exams', {
        title: formData.title.trim(),
        subject: formData.subject.trim(),
        targetBatch: formData.targetBatch.trim(),
        durationMinutes: Number(formData.durationMinutes),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        maxViolations: Number(formData.maxViolations),
        questionIds: formData.selectedQuestionIds
      });
      flash('Exam saved as a draft. Publish it when you are ready for students to see it.');
      setIsModalOpen(false);
      resetForm();
      fetchExams();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create the exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedExams = useMemo(() => {
    const now = new Date();
    const rank = { OPEN: 0, DRAFT: 1, UPCOMING: 2, CLOSED: 3 };
    return exams
      .map((exam) => ({ exam, status: facultyStatus(exam, now) }))
      .sort((a, b) => rank[a.status] - rank[b.status] || new Date(a.exam.startTime) - new Date(b.exam.startTime));
  }, [exams]);

  const visibleQuestions = questions.filter((q) => {
    const f = questionFilter.trim().toLowerCase();
    return !f || q.text.toLowerCase().includes(f) || q.subject.toLowerCase().includes(f);
  });
  const selectedMarks = questions
    .filter((q) => formData.selectedQuestionIds.includes(q.id))
    .reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Exams"
        subtitle="Schedule proctored exams for a batch, publish them, and review every submission."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New exam
          </Button>
        }
      />

      <div className="mb-6 space-y-3" aria-live="polite">
        {successMessage && <Alert tone="success">{successMessage}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>

      <Sheet aria-labelledby="exams-heading">
        <SheetHeader title={<span id="exams-heading">Exam schedule</span>} meta={loading ? '' : `${exams.length} exams`} />
        {loading ? (
          <Spinner label="Loading exams" />
        ) : exams.length === 0 ? (
          <EmptyNotice
            title="No exams yet"
            icon={FileText}
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New exam
              </Button>
            }
          >
            Write some questions in the question bank, then schedule your first exam here.
          </EmptyNotice>
        ) : (
          <>
            <div className="caps hidden grid-cols-[9.5rem_minmax(0,1fr)_5rem_6.5rem_6.5rem_16rem] gap-x-4 border-b-2 border-ink px-5 pb-2 pt-4 text-[12px] text-ink-faint lg:grid">
              <span>Day · window</span>
              <span>Paper</span>
              <span>Length</span>
              <span>Limit</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            <ul>
              {sortedExams.map(({ exam, status }) => (
                <li key={exam.id} className="rule-b last:border-b-0">
                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 py-4 sm:px-5 lg:grid-cols-[9.5rem_minmax(0,1fr)_5rem_6.5rem_6.5rem_16rem] lg:items-center">
                    <div className="num text-[15px]">
                      <span className="font-bold text-ink">{fmtDay(exam.startTime)}</span>
                      <span className="block text-sm text-ink-faint">{fmtWindow(exam.startTime, exam.endTime)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[17px] font-bold leading-snug text-ink">{exam.title}</div>
                      <div className="truncate text-sm text-ink-faint">
                        {exam.subject} · Batch {exam.targetBatch} · {exam.questionCount} questions · {exam.totalMarks ?? '—'} marks
                      </div>
                    </div>
                    <div className="num text-[15px] text-ink-soft">{exam.durationMinutes} min</div>
                    <div className="num text-[15px] text-ink-soft">
                      {exam.maxViolations} <span className="text-sm text-ink-faint">violations</span>
                    </div>
                    <div>
                      <Stamp status={status === 'UPCOMING' ? 'UPCOMING' : status}>{STATUS_LABEL[status]}</Stamp>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/faculty/exams/${exam.id}/submissions`)}>
                        Submissions
                        <span className="num rounded-[3px] bg-paper-tint px-1.5 text-ink-soft">{exam.attemptCount ?? 0}</span>
                      </Button>
                      {!exam.isPublished && (
                        <Button size="sm" variant="primary" onClick={() => handlePublish(exam.id)}>
                          Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDelete(exam)}
                        aria-label={`Delete ${exam.title}`}
                        title="Delete exam"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Sheet>

      {/* Create exam */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New exam"
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {currentStep > 1 ? (
              <Button variant="secondary" onClick={() => { setFormError(''); setCurrentStep((s) => s - 1); }}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {currentStep < 3 ? (
              <Button onClick={goNext}>
                Continue
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button loading={isSubmitting} onClick={handleCreateExam}>
                {isSubmitting ? 'Saving…' : 'Save as draft'}
              </Button>
            )}
          </div>
        }
      >
        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n === currentStep ? 'current' : n < currentStep ? 'done' : 'todo';
            return (
              <li
                key={label}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cx(
                  'caps flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1.5 text-[12px]',
                  state === 'current' && 'border-ink bg-hl text-ink',
                  state === 'done' && 'border-paper-rule text-ink-faint line-through',
                  state === 'todo' && 'border-dashed border-ink-faint/60 text-ink-soft'
                )}
              >
                <span className="num">{n}</span> {label}
              </li>
            );
          })}
        </ol>

        {formError && <Alert tone="error" className="mb-5">{formError}</Alert>}

        {currentStep === 1 && (
          <div className="space-y-4">
            <Field label="Title" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Midterm: Data Structures"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subject" required>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Computer Science"
                />
              </Field>
              <Field label="Batch" required hint="Only students in this batch will see the exam.">
                <Input
                  value={formData.targetBatch}
                  onChange={(e) => setFormData({ ...formData, targetBatch: e.target.value })}
                  placeholder="CS-2026-A"
                />
              </Field>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Window opens" required>
                <Input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </Field>
              <Field label="Window closes" required>
                <Input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time allowed (minutes)" hint="Each student's clock starts when they begin.">
                <Input
                  type="number"
                  min="5"
                  max="300"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                  className="num"
                />
              </Field>
              <Field label="Violation limit" hint="At this many violations the exam submits itself and is flagged.">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxViolations}
                  onChange={(e) => setFormData({ ...formData, maxViolations: Number(e.target.value) })}
                  className="num"
                />
              </Field>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <label htmlFor="q-filter" className="sr-only">
                  Filter questions
                </label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                <Input
                  id="q-filter"
                  type="search"
                  className="pl-9"
                  placeholder="Filter by text or subject"
                  value={questionFilter}
                  onChange={(e) => setQuestionFilter(e.target.value)}
                />
              </div>
              <span className="num text-sm font-bold text-ink" aria-live="polite">
                {formData.selectedQuestionIds.length} selected · {selectedMarks} marks
              </span>
            </div>
            {questions.length === 0 ? (
              <EmptyNotice title="Your question bank is empty" icon={CalendarClock}>
                Add questions in the question bank first, then come back to build the exam.
              </EmptyNotice>
            ) : (
              <fieldset>
                <legend className="sr-only">Questions to include</legend>
                <ul className="max-h-[22rem] divide-y divide-paper-line overflow-y-auto rounded-[4px] border border-paper-line">
                  {visibleQuestions.map((q) => {
                    const isSelected = formData.selectedQuestionIds.includes(q.id);
                    return (
                      <li key={q.id}>
                        <label className={cx('flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors', isSelected ? 'bg-paper-tint' : 'hover:bg-paper-tint')}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleQuestion(q.id)}
                            className="mt-1 h-4 w-4 shrink-0 accent-board"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-[15px] text-ink">{q.text}</span>
                            <span className="mt-0.5 block text-sm text-ink-faint">
                              {q.subject} · {q.type === 'MCQ' ? 'Multiple choice' : q.type === 'TRUE_FALSE' ? 'True / false' : 'Short answer'}
                            </span>
                          </span>
                          <span className="num shrink-0 text-sm font-bold text-ink-soft">{q.marks} mk</span>
                        </label>
                      </li>
                    );
                  })}
                  {visibleQuestions.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-faint">No questions match that filter.</li>}
                </ul>
              </fieldset>
            )}
          </div>
        )}
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete this exam?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={isDeleting} onClick={handleConfirmDelete}>
              Delete exam
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink">
          <strong>{pendingDelete?.title}</strong> will be removed for good.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Exams can only be deleted before any student has started them. Started exams keep their record.
        </p>
      </Dialog>
    </div>
  );
};

export default ExamManager;
