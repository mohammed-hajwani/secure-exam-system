import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '../../services/api';
import { Alert, Button, Dialog, EmptyNotice, Field, Input, PageHeader, Select, Sheet, SheetHeader, Spinner, Stamp, Textarea, cx } from '../../components/ui';

const TYPE_LABEL = { MCQ: 'Multiple choice', TRUE_FALSE: 'True / false', SHORT_ANSWER: 'Short answer' };

const blankOptions = () => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false }
];

const EMPTY_FORM = { subject: '', type: 'MCQ', text: '', marks: 1, options: blankOptions() };

/* What a student will see, live while authoring */
const StudentPreview = ({ formData }) => {
  const opts = formData.options.filter((o) => o.text.trim());
  return (
    <div className="rounded-[4px] border border-paper-line bg-paper-tint p-4">
      <div className="flex items-baseline justify-between gap-2 border-b border-paper-line pb-2">
        <span className="display text-2xl text-ink">Q1</span>
        <span className="num text-sm text-ink-faint">
          {formData.marks || 1} mark{Number(formData.marks) === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-ink">
        {formData.text || <span className="font-normal text-ink-faint">Your question appears here.</span>}
      </p>
      <div className="mt-3 space-y-2">
        {formData.type === 'SHORT_ANSWER' ? (
          <div className="h-20 rounded-[4px] border border-paper-rule bg-paper" aria-hidden="true" />
        ) : opts.length === 0 ? (
          <p className="text-sm text-ink-faint">Options appear here.</p>
        ) : (
          opts.map((opt, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[4px] border border-paper-rule bg-paper px-3 py-2">
              <span className="caps flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-ink-faint/60 text-[12px] text-ink-soft">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 text-[15px] text-ink">{opt.text}</span>
              {opt.isCorrect && (
                <span className="caps text-[11px] text-ink" title="Students never see this">
                  Key
                </span>
              )}
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-sm text-ink-faint">
        {formData.type === 'MCQ' ? 'Options are shuffled for each student. ' : formData.type === 'TRUE_FALSE' ? 'True / false keeps its order. ' : ''}
        The answer key is never sent to their browser.
      </p>
    </div>
  );
};

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const flash = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questions');
      setQuestions(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the question bank.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const subjects = ['ALL', ...new Set(questions.map((q) => q.subject).filter(Boolean))];

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM, options: blankOptions() });
    setEditingQuestion(null);
    setFormError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q) => {
    setEditingQuestion(q);
    setFormError('');
    setFormData({
      subject: q.subject,
      type: q.type,
      text: q.text,
      marks: q.marks,
      options:
        q.options && q.options.length > 0
          ? q.options.map((opt) => ({ text: opt.text, isCorrect: opt.isCorrect }))
          : [
              { text: '', isCorrect: true },
              { text: '', isCorrect: false }
            ]
    });
    setIsModalOpen(true);
  };

  const setCorrect = (index) =>
    setFormData((prev) => ({ ...prev, options: prev.options.map((o, i) => ({ ...o, isCorrect: i === index })) }));

  const setOptionText = (index, text) =>
    setFormData((prev) => ({ ...prev, options: prev.options.map((o, i) => (i === index ? { ...o, text } : o)) }));

  const addOption = () => setFormData((prev) => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }));

  const removeOption = (index) =>
    setFormData((prev) => {
      if (prev.options.length <= 2) return prev;
      const next = prev.options.filter((_, i) => i !== index);
      if (!next.some((o) => o.isCorrect)) next[0] = { ...next[0], isCorrect: true };
      return { ...prev, options: next };
    });

  const changeType = (newType) => {
    let opts = formData.options;
    if (newType === 'TRUE_FALSE') {
      opts = [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false }
      ];
    } else if (newType === 'MCQ' && opts.length < 4) {
      opts = blankOptions();
    }
    setFormData({ ...formData, type: newType, options: opts });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.subject.trim() || !formData.text.trim()) {
      setFormError('Add a subject and the question text.');
      return;
    }
    if (formData.type !== 'SHORT_ANSWER') {
      const validOptions = formData.options.filter((o) => o.text.trim() !== '');
      if (validOptions.length < 2) {
        setFormError('Write at least two options.');
        return;
      }
      if (!validOptions.some((o) => o.isCorrect)) {
        setFormError('Mark which option is correct.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        subject: formData.subject.trim(),
        type: formData.type,
        text: formData.text.trim(),
        marks: Number(formData.marks) || 1,
        options: formData.type !== 'SHORT_ANSWER' ? formData.options.filter((o) => o.text.trim() !== '') : []
      };

      if (editingQuestion) {
        await api.patch(`/questions/${editingQuestion.id}`, payload);
        flash('Question updated.');
      } else {
        await api.post('/questions', payload);
        flash('Question added to your bank.');
      }
      setIsModalOpen(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not save the question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setError('');
    try {
      setIsDeleting(true);
      await api.delete(`/questions/${pendingDelete.id}`);
      flash('Question deleted.');
      setPendingDelete(null);
      fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the question.');
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch = q.text.toLowerCase().includes(s) || q.subject.toLowerCase().includes(s);
    const matchesSubject = subjectFilter === 'ALL' || q.subject === subjectFilter;
    const matchesType = typeFilter === 'ALL' || q.type === typeFilter;
    return matchesSearch && matchesSubject && matchesType;
  });
  const filtersActive = searchQuery || subjectFilter !== 'ALL' || typeFilter !== 'ALL';

  return (
    <div>
      <PageHeader
        title="Question bank"
        subtitle="Write questions once and reuse them across exams. Students never receive the answer key."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New question
          </Button>
        }
      />

      <div className="mb-6 space-y-3" aria-live="polite">
        {successMessage && <Alert tone="success">{successMessage}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>

      <Sheet aria-labelledby="bank-heading">
        <SheetHeader
          title={<span id="bank-heading">Questions</span>}
          meta={loading ? '' : `${filteredQuestions.length} of ${questions.length}`}
        />
        <div className="grid gap-3 border-b border-paper-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem] sm:px-5">
          <div className="relative">
            <label htmlFor="bank-search" className="sr-only">
              Search questions
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input
              id="bank-search"
              type="search"
              className="pl-9"
              placeholder="Search text or subject"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="bank-subject" className="sr-only">
              Subject
            </label>
            <Select id="bank-subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub === 'ALL' ? 'All subjects' : sub}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="bank-type" className="sr-only">
              Format
            </label>
            <Select id="bank-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All formats</option>
              <option value="MCQ">Multiple choice</option>
              <option value="TRUE_FALSE">True / false</option>
              <option value="SHORT_ANSWER">Short answer</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading questions" />
        ) : filteredQuestions.length === 0 ? (
          <EmptyNotice
            title={filtersActive ? 'Nothing matches' : 'Your bank is empty'}
            icon={BookOpen}
            action={
              !filtersActive && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New question
                </Button>
              )
            }
          >
            {filtersActive ? 'Try a different search, subject or format.' : 'Add your first question to start building exams.'}
          </EmptyNotice>
        ) : (
          <ol>
            {filteredQuestions.map((q) => (
              <li key={q.id} className="rule-b grid gap-3 px-4 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stamp status="NEUTRAL">{q.subject}</Stamp>
                    <Stamp status="MARK">{TYPE_LABEL[q.type]}</Stamp>
                    <span className="num text-sm font-bold text-ink-soft">
                      {q.marks} mark{q.marks === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 max-w-[75ch] whitespace-pre-wrap text-[16px] font-semibold leading-snug text-ink">{q.text}</p>
                  {q.options && q.options.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[15px]">
                      {q.options.map((opt, i) => (
                        <li key={opt.id || i} className={cx('flex items-center gap-1.5', opt.isCorrect ? 'font-bold text-ink' : 'text-ink-soft')}>
                          <span className="caps text-[12px]">{String.fromCharCode(65 + i)}</span>
                          <span className="max-w-[16rem] truncate">{opt.text}</span>
                          {opt.isCorrect && (
                            <>
                              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                              <span className="sr-only">(correct answer)</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-start gap-1 sm:justify-end">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(q)}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete(q)} aria-label="Delete question" title="Delete question">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Sheet>

      {/* Author / edit */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion ? 'Edit question' : 'New question'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="question-form" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingQuestion ? 'Save changes' : 'Add to bank'}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form id="question-form" onSubmit={handleSaveQuestion} className="space-y-4" noValidate>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_7rem]">
              <Field label="Subject" required>
                <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Algorithms" />
              </Field>
              <Field label="Format">
                <Select value={formData.type} onChange={(e) => changeType(e.target.value)}>
                  <option value="MCQ">Multiple choice</option>
                  <option value="TRUE_FALSE">True / false</option>
                  <option value="SHORT_ANSWER">Short answer</option>
                </Select>
              </Field>
              <Field label="Marks">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  className="num"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Question" required>
              <Textarea rows={4} value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} />
            </Field>

            {formData.type !== 'SHORT_ANSWER' && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink">Options · choose the correct one</legend>
                <div className="space-y-2">
                  {formData.options.map((opt, index) => {
                    const letter = String.fromCharCode(65 + index);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-paper-rule hover:border-ink-faint">
                          <input
                            type="radio"
                            name="correctOption"
                            checked={opt.isCorrect}
                            onChange={() => setCorrect(index)}
                            className="h-4 w-4 accent-board"
                          />
                          <span className="sr-only">Option {letter} is correct</span>
                        </label>
                        <span className="caps w-4 text-center text-sm text-ink-faint" aria-hidden="true">
                          {letter}
                        </span>
                        <label htmlFor={`opt-${index}`} className="sr-only">
                          Option {letter}
                        </label>
                        <Input
                          id={`opt-${index}`}
                          value={opt.text}
                          disabled={formData.type === 'TRUE_FALSE'}
                          onChange={(e) => setOptionText(index, e.target.value)}
                          placeholder={`Option ${letter}`}
                          className={opt.isCorrect ? 'border-ink' : ''}
                        />
                        {formData.type === 'MCQ' && formData.options.length > 2 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(index)} aria-label={`Remove option ${letter}`}>
                            <X className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {formData.type === 'MCQ' && formData.options.length < 6 && (
                  <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addOption}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add option
                  </Button>
                )}
              </fieldset>
            )}
          </form>

          <section aria-labelledby="preview-heading">
            <h3 id="preview-heading" className="caps mb-2 text-sm text-ink-faint">
              What students see
            </h3>
            <StudentPreview formData={formData} />
          </section>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete this question?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={isDeleting} onClick={handleConfirmDelete}>
              Delete question
            </Button>
          </>
        }
      >
        <p className="line-clamp-3 text-[15px] text-ink">{pendingDelete?.text}</p>
        <p className="mt-2 text-sm text-ink-soft">
          Only questions that are not part of any exam can be deleted. Remove it from its exams first if it is in use.
        </p>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
