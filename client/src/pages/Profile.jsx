import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Shield,
  KeyRound,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Lock,
  Clock,
  Layers,
  FileText
} from 'lucide-react';

const Profile = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Change password form state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/auth/profile');
      setProfileData(response.data?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSuccessMessage('');

    if (!passwords.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await api.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });

      setSuccessMessage(response.data?.message || 'Password updated successfully');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const user = profileData?.user || authUser;
  const stats = profileData?.stats || {};

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            <p className="text-xs text-zinc-500 font-mono">Loading user profile...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notifications */}
            {successMessage && (
              <div className="p-3.5 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Profile Overview Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-100 font-mono">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-semibold text-zinc-100">{user?.name}</h1>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono border bg-zinc-800 text-zinc-300 border-zinc-700">
                        {user?.role}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-zinc-500 font-mono">
                  <div>Enrolled / Created</div>
                  <div className="text-zinc-300 mt-0.5">
                    {new Date(user?.createdAt).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Account Metadata Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Cohort Batch</span>
                  <span className="text-xs font-semibold text-zinc-200 font-mono">
                    {user?.batch || 'General / Faculty'}
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">2FA Protection</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                    <Shield className="w-3 h-3 text-zinc-400" />
                    Email OTP
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Session Protocol</span>
                  <span className="text-xs text-zinc-300 font-mono">
                    JWT + HttpOnly
                  </span>
                </div>
              </div>
            </div>

            {/* Role-Specific Activity Summary Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-400" />
                <span>
                  {user?.role === 'STUDENT'
                    ? 'Student Academic Activity'
                    : user?.role === 'FACULTY'
                    ? 'Faculty Instruction Summary'
                    : 'System Administrator Statistics'}
                </span>
              </h2>

              {user?.role === 'STUDENT' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Assessments Started</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.totalAttempts || 0}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Completed & Graded</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.submittedAttempts || 0}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Flagged for Audit</span>
                    <p className={`text-xl font-bold font-mono mt-0.5 ${stats.flaggedAttempts > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                      {stats.flaggedAttempts || 0}
                    </p>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Average Score</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">
                      {stats.averageScore ? `${stats.averageScore} pts` : '—'}
                    </p>
                  </div>
                </div>
              )}

              {user?.role === 'FACULTY' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Exams Scheduled</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.examsCreated || 0}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Questions in Bank</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.questionsAuthored || 0}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Submissions Evaluated</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.totalSubmissions || 0}</p>
                  </div>
                </div>
              )}

              {user?.role === 'ADMIN' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Total Users</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.totalUsers || 0}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">System Exams</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.totalExams || 0}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Audit Log Entries</span>
                    <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5">{stats.totalLogs || 0}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
                <KeyRound className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Change Password</h2>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="Min 8 chars, uppercase, lowercase, number & symbol"
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
