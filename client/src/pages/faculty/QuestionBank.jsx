import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Plus,
  BookOpen,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  X,
  Eye,
  FileText
} from 'lucide-react';

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    type: 'MCQ',
    text: '',
    marks: 1,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questions');
      setQuestions(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const subjects = ['ALL', ...new Set(questions.map((q) => q.subject).filter(Boolean))];

  const resetForm = () => {
    setFormData({
      subject: '',
      type: 'MCQ',
      text: '',
      marks: 1,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
    setEditingQuestion(null);
    setPreviewMode(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q) => {
    setEditingQuestion(q);
    setPreviewMode(false);
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

  const handleOptionChange = (index, field, value) => {
    const next = [...formData.options];
    if (field === 'isCorrect') {
      next.forEach((opt, idx) => {
        opt.isCorrect = idx === index;
      });
    } else {
      next[index][field] = value;
    }
    setFormData({ ...formData, options: next });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '', isCorrect: false }]
    });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) return;
    const next = formData.options.filter((_, idx) => idx !== index);
    if (!next.some((o) => o.isCorrect)) {
      next[0].isCorrect = true;
    }
    setFormData({ ...formData, options: next });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.subject.trim() || !formData.text.trim()) {
      setError('Please provide both subject and question prompt');
      return;
    }

    if (formData.type !== 'SHORT_ANSWER') {
      const validOptions = formData.options.filter((o) => o.text.trim() !== '');
      if (validOptions.length < 2) {
        setError('Please provide at least 2 valid option choices');
        return;
      }
      if (!validOptions.some((o) => o.isCorrect)) {
        setError('Please designate one option as the correct answer key');
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
        options:
          formData.type !== 'SHORT_ANSWER'
            ? formData.options.filter((o) => o.text.trim() !== '')
            : []
      };

      if (editingQuestion) {
        await api.put(`/questions/${editingQuestion.id}`, payload);
        setSuccessMessage('Question updated successfully');
      } else {
        await api.post('/questions', payload);
        setSuccessMessage('Question authored and saved to bank');
      }

      setIsModalOpen(false);
      resetForm();
      fetchQuestions();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question permanently from the question bank?')) {
      return;
    }

    try {
      await api.delete(`/questions/${id}`);
      setSuccessMessage('Question deleted successfully');
      fetchQuestions();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete question');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'ALL' || q.subject === subjectFilter;
    const matchesType = typeFilter === 'ALL' || q.type === typeFilter;
    return matchesSearch && matchesSubject && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Question Bank
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create and maintain your reusable question repository
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Question</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search questions by text or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
          />
        </div>

        <div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 transition cursor-pointer"
          >
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub === 'ALL' ? 'All Subjects' : sub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 transition cursor-pointer"
          >
            <option value="ALL">All Formats</option>
            <option value="MCQ">Multiple Choice (MCQ)</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          <p className="text-xs text-zinc-500">Loading question repository...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-16 px-4 border border-zinc-800/80 rounded-xl bg-zinc-900/30">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
          <h3 className="text-sm font-medium text-zinc-200">No questions found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery || subjectFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'Try adjusting your filters.'
              : 'Add your first question to start building your examination bank.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <div
              key={q.id}
              className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-4 sm:p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {q.subject}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {q.type}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400">
                    {q.marks} Mark{q.marks > 1 ? 's' : ''}
                  </span>
                </div>

                <p className="text-xs text-zinc-200 leading-relaxed font-medium line-clamp-2">
                  {q.text}
                </p>

                {q.options && q.options.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    {q.options.map((opt, i) => (
                      <span
                        key={opt.id || i}
                        className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${
                          opt.isCorrect
                            ? 'bg-zinc-800 border-zinc-600 text-zinc-200 font-medium'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-500'
                        }`}
                      >
                        <span className="font-mono text-[9px] uppercase">
                          {String.fromCharCode(65 + i)}:
                        </span>
                        <span className="truncate max-w-[120px]">{opt.text}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleOpenEdit(q)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  title="Edit question"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                  title="Delete question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Authoring & Live Preview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {editingQuestion ? 'Edit Question' : 'Author New Question'}
                </h2>

                <div className="flex items-center p-0.5 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition ${
                      !previewMode ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition flex items-center gap-1 ${
                      previewMode ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Student Preview</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {previewMode ? (
                /* Student Live Preview Card */
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      Sample Question • {formData.marks} Mark{formData.marks > 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">
                      {formData.subject || 'Subject'}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-zinc-100 leading-relaxed whitespace-pre-wrap">
                    {formData.text || 'Enter a question prompt in editor to preview...'}
                  </p>

                  <div className="space-y-2 pt-1">
                    {formData.type === 'SHORT_ANSWER' ? (
                      <textarea
                        disabled
                        rows={3}
                        placeholder="Student text response box..."
                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-500"
                      />
                    ) : (
                      formData.options
                        .filter((o) => o.text.trim())
                        .map((opt, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                              opt.isCorrect
                                ? 'bg-zinc-800/80 border-zinc-600 text-zinc-100'
                                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-1">{opt.text}</span>
                            {opt.isCorrect && (
                              <span className="text-[10px] font-mono text-emerald-400">
                                (Correct Key)
                              </span>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ) : (
                /* Editor Form */
                <form id="question-form" onSubmit={handleSaveQuestion} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Subject *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Algorithms"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Format</label>
                      <select
                        value={formData.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          let opts = formData.options;
                          if (newType === 'TRUE_FALSE') {
                            opts = [
                              { text: 'True', isCorrect: true },
                              { text: 'False', isCorrect: false }
                            ];
                          } else if (newType === 'MCQ' && opts.length < 4) {
                            opts = [
                              { text: '', isCorrect: true },
                              { text: '', isCorrect: false },
                              { text: '', isCorrect: false },
                              { text: '', isCorrect: false }
                            ];
                          }
                          setFormData({ ...formData, type: newType, options: opts });
                        }}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="MCQ">Multiple Choice</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Marks</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.marks}
                        onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Question Prompt *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Write your question statement here..."
                      value={formData.text}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 leading-relaxed"
                    />
                  </div>

                  {formData.type !== 'SHORT_ANSWER' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300">
                          Answer Options (Select the correct key)
                        </label>
                        {formData.type === 'MCQ' && formData.options.length < 6 && (
                          <button
                            type="button"
                            onClick={addOption}
                            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Add Option
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {formData.options.map((opt, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={opt.isCorrect}
                              onChange={() => handleOptionChange(index, 'isCorrect', true)}
                              className="w-4 h-4 text-zinc-900 bg-zinc-950 border-zinc-700 cursor-pointer"
                              title="Set as correct answer"
                            />

                            <span className="w-5 text-center font-mono text-[10px] text-zinc-500">
                              {String.fromCharCode(65 + index)}
                            </span>

                            <input
                              type="text"
                              required
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                              value={opt.text}
                              onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                            />

                            {formData.type === 'MCQ' && formData.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(index)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                form="question-form"
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingQuestion ? 'Update Question' : 'Save to Bank'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
