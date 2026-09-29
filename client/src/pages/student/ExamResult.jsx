import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import api from '../../services/api';
import {
  CheckCircle2,
  AlertCircle,
  Award,
  Clock,
  Shield,
  ArrowLeft,
  FileText,
  Loader2
} from 'lucide-react';

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
        setError(err.response?.data?.error || 'Failed to load assessment results');
      } finally {
        setLoading(false);
      }
    };

    fetchMyAttempt();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-2.5">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        <p className="text-xs text-zinc-500 font-mono">Fetching score report...</p>
      </div>
    );
  }

  const attempt = resultData?.attempt;

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-3 shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-sm font-semibold text-zinc-100">No Results Found</h2>
          <p className="text-xs text-zinc-400">{error || 'No submitted attempt record exists for this exam.'}</p>
          <button
            onClick={() => navigate('/student')}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const percentage = attempt.totalMarks > 0 ? ((attempt.score / attempt.totalMarks) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate('/student')}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Assessments
        </button>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header */}
          <div className="text-center space-y-2 pb-6 border-b border-zinc-800/80">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center mx-auto mb-3">
              <Award className="w-5 h-5 text-zinc-200" />
            </div>

            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Assessment Completed
            </h1>
            <p className="text-xs text-zinc-400">
              {attempt.examTitle} ({attempt.subject})
            </p>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 mt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Status: {attempt.status}</span>
            </div>
          </div>

          {/* Flagged Alert if Cheating Suspected */}
          {attempt.isFlagged && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-start gap-2.5">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Attempt Under Proctor Review</strong>
                This attempt was flagged by the automated anti-cheat supervision system due to multiple policy infractions. Final grading will be finalized after instructor review.
              </div>
            </div>
          )}

          {/* Score Display Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-mono text-zinc-500">
              Score Achieved
            </span>
            <div className="text-4xl font-bold text-zinc-100 tracking-tight font-mono">
              {attempt.score}{' '}
              <span className="text-lg font-normal text-zinc-500">
                / {attempt.totalMarks}
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono pt-1">
              {percentage}% Final Grade
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <FileText className="w-3 h-3 text-zinc-400" />
                <span>Answered</span>
              </div>
              <p className="text-sm font-semibold text-zinc-100 font-mono">
                {attempt.answeredCount} / {attempt.totalQuestions}
              </p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <Shield className="w-3 h-3 text-zinc-400" />
                <span>Violations</span>
              </div>
              <p className={`text-sm font-semibold font-mono ${attempt.violationCount > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                {attempt.violationCount}
              </p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>Submitted</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200 truncate font-mono">
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-zinc-800/80 text-center">
            <button
              onClick={() => navigate('/student')}
              className="w-full sm:w-auto px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition cursor-pointer shadow-sm"
            >
              Return to Assessments
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExamResult;
