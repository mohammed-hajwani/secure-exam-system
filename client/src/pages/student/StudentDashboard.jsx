import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  Calendar,
  FileText,
  Shield,
  ArrowRight,
  AlertCircle,
  Loader2,
  Search,
  BookOpen,
  Award
} from 'lucide-react';


const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'upcoming' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const response = await api.get('/exams');
        setExams(response.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load assessments');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const now = new Date();

  const categorizedExams = {
    // 1. Available: Within exam window AND student has not submitted (either new or in-progress)
    active: exams.filter((e) => {
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      const isSubmitted = e.myAttempt?.status === 'SUBMITTED' || e.myAttempt?.status === 'AUTO_SUBMITTED';
      return !isSubmitted && now >= start && now <= end;
    }),

    // 2. Upcoming: Exam start time is in the future AND not submitted
    upcoming: exams.filter((e) => {
      const start = new Date(e.startTime);
      const isSubmitted = e.myAttempt?.status === 'SUBMITTED' || e.myAttempt?.status === 'AUTO_SUBMITTED';
      return !isSubmitted && now < start;
    }),

    // 3. Completed: Any exam where the student submitted, OR past exams with student attempts
    completed: exams.filter((e) => {
      const isSubmitted = e.myAttempt?.status === 'SUBMITTED' || e.myAttempt?.status === 'AUTO_SUBMITTED';
      const isExpired = now > new Date(e.endTime);
      return isSubmitted || (isExpired && e.myAttempt);
    })
  };


  const filteredExams = (categorizedExams[activeTab] || []).filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-zinc-800/80 pb-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Assessments
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Assigned tests for cohort <span className="text-zinc-200 font-mono font-medium">{user?.batch || 'General'}</span>
            </p>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by subject or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 transition"
            />
          </div>
        </div>

        {/* Minimalist Segmented Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Available</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-950/80 font-mono text-zinc-300">
              {categorizedExams.active.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'upcoming'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Upcoming</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-950/80 font-mono text-zinc-300">
              {categorizedExams.upcoming.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Completed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-950/80 font-mono text-zinc-300">
              {categorizedExams.completed.length}
            </span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            <p className="text-xs text-zinc-500">Checking assessment schedule...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-16 px-4 border border-zinc-800/80 rounded-2xl bg-zinc-900/30">
            <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
            <h3 className="text-sm font-medium text-zinc-200">No assessments found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'active'
                ? 'No active tests right now. Check back when your next assessment window opens.'
                : activeTab === 'upcoming'
                ? 'No upcoming assessments scheduled for your cohort.'
                : 'No completed exams found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition flex flex-col justify-between space-y-5 group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                      {exam.subject}
                    </span>
                    {exam.myAttempt?.status === 'SUBMITTED' ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        COMPLETED
                      </span>
                    ) : exam.myAttempt?.status === 'AUTO_SUBMITTED' ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        AUTO-SUBMITTED
                      </span>
                    ) : exam.myAttempt?.status === 'IN_PROGRESS' ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium animate-pulse">
                        IN PROGRESS
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {exam.durationMinutes}m
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition line-clamp-1 mb-2">
                    {exam.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-zinc-500" />
                      <span>{exam.questionCount} Questions</span>
                    </div>

                    {exam.myAttempt?.score !== null && exam.myAttempt?.score !== undefined ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-mono font-medium">
                        <Award className="w-3 h-3 text-emerald-500" />
                        <span>Score: {exam.myAttempt.score} / {exam.totalMarks || exam.questionCount}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-zinc-500" />
                        <span>Max violations: {exam.maxViolations}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {exam.myAttempt?.submittedAt ? (
                        <span>Submitted {new Date(exam.myAttempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span>Closes {new Date(exam.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {activeTab === 'active' ? (
                    <button
                      onClick={() => navigate(exam.myAttempt?.status === 'IN_PROGRESS' ? `/student/exams/${exam.id}/player` : `/student/exams/${exam.id}/briefing`)}
                      className="w-full py-2 px-3 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>{exam.myAttempt?.status === 'IN_PROGRESS' ? 'Resume Assessment' : 'Enter Assessment'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : activeTab === 'completed' ? (
                    exam.myAttempt ? (
                      <button
                        onClick={() => navigate(`/student/exams/${exam.id}/result`)}
                        className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
                      >
                        <span>View Results</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="text-center py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-600 font-mono">
                        Window Closed • Missed
                      </div>
                    )
                  ) : (
                    <div className="text-center py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-500 font-mono">
                      Opens {new Date(exam.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
