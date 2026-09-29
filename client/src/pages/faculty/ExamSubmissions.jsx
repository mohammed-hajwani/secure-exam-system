import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AttemptInspectorModal from '../../components/faculty/AttemptInspectorModal';
import {
  ArrowLeft,
  Search,
  Shield,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

const ExamSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Inspection Drawer
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/exams/${id}/attempts`);
      setData(response.data?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load assessment submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  const exam = data?.exam;
  const metrics = data?.metrics;
  const attempts = data?.attempts || [];

  const filteredAttempts = attempts.filter((att) => {
    const matchesSearch =
      att.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (att.student.batch && att.student.batch.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'FLAGGED' && att.isFlagged) ||
      (statusFilter === 'SUBMITTED' && (att.status === 'SUBMITTED' || att.status === 'AUTO_SUBMITTED')) ||
      (statusFilter === 'IN_PROGRESS' && att.status === 'IN_PROGRESS');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <button
            onClick={() => navigate('/faculty/exams')}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Assessments
          </button>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            {exam?.title || 'Submissions & Proctoring'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Subject: <strong className="text-zinc-200 font-normal">{exam?.subject}</strong> • Cohort:{' '}
            <strong className="text-zinc-200 font-mono font-normal">{exam?.targetBatch}</strong>
          </p>
        </div>

        <button
          onClick={fetchSubmissions}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Attempts</span>
            <p className="text-xl font-semibold text-zinc-100 font-mono">{metrics.totalAttempts}</p>
          </div>

          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Submitted</span>
            <p className="text-xl font-semibold text-zinc-100 font-mono">{metrics.submittedCount}</p>
          </div>

          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Flagged Violations</span>
            <p className={`text-xl font-semibold font-mono ${metrics.flaggedCount > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
              {metrics.flaggedCount}
            </p>
          </div>

          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Average Score</span>
            <p className="text-xl font-semibold text-zinc-100 font-mono">
              {metrics.averageScore} / {metrics.totalMarks}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter by student name, email, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 transition cursor-pointer"
          >
            <option value="ALL">All Submission States</option>
            <option value="SUBMITTED">Submitted Attempts</option>
            <option value="FLAGGED">Flagged for Violations</option>
            <option value="IN_PROGRESS">Active / In-Progress</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            <p className="text-xs text-zinc-500 font-mono">Loading attempt logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-[10px] uppercase font-mono tracking-wider text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Candidate</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Violations</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium text-right">Audit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60">
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                      No candidate submissions matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((att) => (
                    <tr key={att.id} className="hover:bg-zinc-850/40 transition select-none">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-zinc-200">{att.student.name}</div>
                        <div className="text-[11px] text-zinc-500">{att.student.email}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                            att.status === 'SUBMITTED'
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                              : att.status === 'AUTO_SUBMITTED'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono">
                        {att.isFlagged ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium">
                            <Shield className="w-3 h-3" />
                            {att.violationCount} Violations
                          </span>
                        ) : (
                          <span className="text-zinc-500">{att.violationCount}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-mono">
                        {att.score !== null ? (
                          <span className="font-medium text-zinc-100">
                            {att.score} / {exam?.totalMarks || 0}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-zinc-400 font-mono text-[11px]">
                        {att.submittedAt ? (
                          new Date(att.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-zinc-600">Active</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedAttemptId(att.id)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer border border-zinc-700"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attempt Inspector Modal */}
      {selectedAttemptId && (
        <AttemptInspectorModal
          examId={id}
          attemptId={selectedAttemptId}
          onClose={() => setSelectedAttemptId(null)}
        />
      )}
    </div>
  );
};

export default ExamSubmissions;
