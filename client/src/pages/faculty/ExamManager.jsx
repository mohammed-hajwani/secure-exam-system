import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Plus,
  Calendar,
  Clock,
  Shield,
  FileText,
  Users,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  ChevronRight,
  Eye,
  Check
} from 'lucide-react';

const ExamManager = () => {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    targetBatch: '',
    durationMinutes: 45,
    startTime: '',
    endTime: '',
    maxViolations: 3,
    selectedQuestionIds: []
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const [examsRes, questionsRes] = await Promise.all([
        api.get('/exams'),
        api.get('/questions')
      ]);
      setExams(examsRes.data?.data || []);
      setQuestions(questionsRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      targetBatch: '',
      durationMinutes: 45,
      startTime: '',
      endTime: '',
      maxViolations: 3,
      selectedQuestionIds: []
    });
    setCurrentStep(1);
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
        selectedQuestionIds: exists
          ? prev.selectedQuestionIds.filter((qId) => qId !== id)
          : [...prev.selectedQuestionIds, id]
      };
    });
  };

  const handlePublish = async (examId) => {
    try {
      await api.patch(`/exams/${examId}/publish`);
      setSuccessMessage('Assessment published to students');
      fetchExams();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish assessment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Delete this assessment and all linked attempt records?')) {
      return;
    }

    try {
      await api.delete(`/exams/${examId}`);
      setSuccessMessage('Assessment deleted');
      fetchExams();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete assessment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateExam = async () => {
    setError('');

    if (!formData.title.trim() || !formData.subject.trim() || !formData.targetBatch.trim()) {
      setError('Please fill in title, subject, and target cohort');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('Please specify start and end schedule');
      return;
    }

    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      setError('End time must be after start time');
      return;
    }

    if (formData.selectedQuestionIds.length === 0) {
      setError('Please attach at least one question from the bank');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        subject: formData.subject.trim(),
        targetBatch: formData.targetBatch.trim(),
        durationMinutes: Number(formData.durationMinutes),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        maxViolations: Number(formData.maxViolations),
        questionIds: formData.selectedQuestionIds
      };

      await api.post('/exams', payload);
      setSuccessMessage('Assessment scheduled successfully');
      setIsModalOpen(false);
      resetForm();
      fetchExams();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);

    if (!exam.isPublished) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
          Draft
        </span>
      );
    }

    if (now >= start && now <= end) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      );
    }

    if (now < start) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
          Scheduled
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-500 border border-zinc-800">
        Concluded
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Assessments
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Schedule proctored examinations and review student submissions
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Assessment</span>
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

      {/* Exam Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          <p className="text-xs text-zinc-500">Loading assessments...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 px-4 border border-zinc-800/80 rounded-xl bg-zinc-900/30">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
          <h3 className="text-sm font-medium text-zinc-200">No assessments scheduled</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Create your first examination to configure test windows and proctoring rules.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition flex flex-col justify-between space-y-5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {exam.subject}
                  </span>
                  {getStatusBadge(exam)}
                </div>

                <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1 mb-2">
                  {exam.title}
                </h3>

                <div className="space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-zinc-500" />
                    <span>Cohort: <strong className="text-zinc-200 font-mono font-normal">{exam.targetBatch}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{exam.durationMinutes} Minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-zinc-500" />
                    <span>{exam.questionCount} Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-zinc-500" />
                    <span>Max Violations: {exam.maxViolations}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span className="text-[11px] truncate">
                      {new Date(exam.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/faculty/exams/${exam.id}/submissions`)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border border-zinc-700"
                >
                  <Eye className="w-3 h-3" />
                  <span>Submissions</span>
                </button>

                <div className="flex items-center gap-2">
                  {!exam.isPublished && (
                    <button
                      onClick={() => handlePublish(exam.id)}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    title="Delete assessment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-Step Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  New Assessment
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                  <span className={currentStep === 1 ? 'text-zinc-100 font-medium' : ''}>1. Details</span>
                  <span>→</span>
                  <span className={currentStep === 2 ? 'text-zinc-100 font-medium' : ''}>2. Schedule</span>
                  <span>→</span>
                  <span className={currentStep === 3 ? 'text-zinc-100 font-medium' : ''}>3. Questions</span>
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

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Assessment Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Midterm Examination — Data Structures"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Subject *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Computer Science"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Target Cohort / Batch *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CS-2026-A"
                        value={formData.targetBatch}
                        onChange={(e) => setFormData({ ...formData, targetBatch: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Window Opens *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Window Closes *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Duration (Minutes) *</label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={formData.durationMinutes}
                        onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Violation Limit *</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.maxViolations}
                        onChange={(e) => setFormData({ ...formData, maxViolations: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Select Questions from Bank</span>
                    <span className="font-mono text-zinc-200">
                      {formData.selectedQuestionIds.length} Attached
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {questions.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-6">
                        No questions in question bank. Create questions first.
                      </p>
                    ) : (
                      questions.map((q) => {
                        const isSelected = formData.selectedQuestionIds.includes(q.id);

                        return (
                          <div
                            key={q.id}
                            onClick={() => handleToggleQuestion(q.id)}
                            className={`p-3 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex-1 truncate">
                              <span className="font-mono text-[10px] uppercase bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 mr-2">
                                {q.subject}
                              </span>
                              <span>{q.text}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-zinc-500 font-mono">{q.marks}m</span>
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center ${
                                  isSelected ? 'bg-zinc-100 text-zinc-950' : 'border border-zinc-700'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCreateExam}
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Create & Schedule</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManager;
