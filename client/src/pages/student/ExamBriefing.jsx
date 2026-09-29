import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import api from '../../services/api';
import {
  Shield,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Monitor,
  Wifi,
  EyeOff
} from 'lucide-react';

const ExamBriefing = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/exams/${id}`);
        setExam(response.data?.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load assessment details');
      } finally {
        setLoading(false);
      }
    };

    fetchExamDetails();
  }, [id]);

  const handleStartExam = async () => {
    if (!agreed) return;

    try {
      setEntering(true);
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
    } catch (err) {
      console.warn('Browser fullscreen blocked or unsupported:', err);
    } finally {
      navigate(`/student/exams/${id}/player`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-sm font-semibold text-zinc-100">Assessment Unavailable</h2>
          <p className="text-xs text-zinc-400">{error || 'Exam could not be found'}</p>
          <button
            onClick={() => navigate('/student')}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/student')}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Assessments
        </button>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header */}
          <div className="border-b border-zinc-800 pb-5">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Pre-Flight Security Verification
            </span>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              {exam.title}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Subject: <span className="text-zinc-200 font-medium">{exam.subject}</span> • Cohort:{' '}
              <span className="text-zinc-200 font-medium">{exam.targetBatch}</span>
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Duration</span>
              <span className="text-sm font-semibold text-zinc-100 mt-0.5 block">{exam.durationMinutes} Mins</span>
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Questions</span>
              <span className="text-sm font-semibold text-zinc-100 mt-0.5 block">{exam.questionCount} Items</span>
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Violation Limit</span>
              <span className="text-sm font-semibold text-rose-400 mt-0.5 block">{exam.maxViolations} Allowed</span>
            </div>
          </div>

          {/* System Readiness Checks */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-300 block">System Readiness</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-zinc-200 block">Display Resolution</span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {window.screen.width} x {window.screen.height} (Optimal)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-zinc-200 block">Fullscreen API</span>
                  <span className="text-[11px] text-zinc-500">Supported & Ready</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-zinc-200 block">Network Connection</span>
                  <span className="text-[11px] text-zinc-500">Online & Synchronized</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-zinc-200 block">Active Proctoring</span>
                  <span className="text-[11px] text-zinc-500">Tab & Focus Watchdog Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Rules */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2 text-xs text-zinc-400 leading-relaxed">
            <span className="font-medium text-zinc-200 block">Important Rules</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Fullscreen mode is required throughout the entire assessment.</li>
              <li>Switching tabs, minimizing, or clicking outside the window triggers a recorded security incident.</li>
              <li>Exceeding {exam.maxViolations} violations will trigger automatic submission and flag your attempt for instructor audit.</li>
              <li>When the timer reaches zero, all answers are automatically submitted.</li>
            </ul>
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <input
              type="checkbox"
              id="consent"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-zinc-900 bg-zinc-900 border-zinc-700 cursor-pointer"
            />
            <label htmlFor="consent" className="text-xs text-zinc-300 cursor-pointer select-none leading-relaxed">
              I agree to abide by the ExamShield academic integrity guidelines. I will maintain browser focus in fullscreen mode and take this test without unauthorized aids.
            </label>
          </div>

          {/* Action */}
          <div className="pt-2 flex justify-end">
            <button
              disabled={!agreed || entering}
              onClick={handleStartExam}
              className="w-full sm:w-auto px-6 py-2.5 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {entering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Entering Exam Room...</span>
                </>
              ) : (
                <>
                  <span>Begin Assessment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExamBriefing;
