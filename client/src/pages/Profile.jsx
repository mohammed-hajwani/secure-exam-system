import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Circle } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Field, Figure, Input, PageHeader, Sheet, SheetHeader, Spinner, Stamp, cx } from '../components/ui';
import { fmtDate } from '../utils/format';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /[0-9]/.test(p) },
  { label: 'A symbol', test: (p) => /[^A-Za-z0-9]/.test(p) }
];

const ROLE_LABEL = { STUDENT: 'Student', FACULTY: 'Faculty', ADMIN: 'Administrator' };

const StatsFor = ({ role, stats }) => {
  const sets = {
    STUDENT: [
      { label: 'Exams started', value: stats.totalAttempts || 0 },
      { label: 'Submitted', value: stats.submittedAttempts || 0 },
      { label: 'Flagged', value: stats.flaggedAttempts || 0, tone: stats.flaggedAttempts > 0 ? 'text-stock-salmon-ink' : undefined },
      { label: 'Average score', value: stats.averageScore ?? '—', unit: stats.averageScore ? 'marks' : undefined }
    ],
    FACULTY: [
      { label: 'Exams created', value: stats.examsCreated || 0 },
      { label: 'Questions written', value: stats.questionsAuthored || 0 },
      { label: 'Submissions received', value: stats.totalSubmissions || 0 }
    ],
    ADMIN: [
      { label: 'Accounts', value: stats.totalUsers || 0 },
      { label: 'Exams', value: stats.totalExams || 0 },
      { label: 'Audit entries', value: stats.totalLogs || 0 }
    ]
  };
  const items = sets[role] || [];
  return (
    <div className={cx('grid divide-paper-line', items.length === 4 ? 'grid-cols-2 sm:grid-cols-4 sm:divide-x' : 'grid-cols-3 divide-x')}>
      {items.map((it) => (
        <Figure key={it.label} className="px-5 py-4" label={it.label} value={it.value} unit={it.unit} tone={it.tone} />
      ))}
    </div>
  );
};

const Profile = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/auth/profile');
      setProfileData(response.data?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const rulesMet = PASSWORD_RULES.map((r) => r.test(passwords.newPassword));
  const allRulesMet = rulesMet.every(Boolean);
  const mismatch = passwords.confirmPassword.length > 0 && passwords.newPassword !== passwords.confirmPassword;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSuccessMessage('');

    if (!passwords.currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!allRulesMet) {
      setPasswordError('Your new password does not meet every rule yet.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('The two new passwords do not match.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await api.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setSuccessMessage(response.data?.message || 'Password updated.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Could not update your password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const user = profileData?.user || authUser;
  const stats = profileData?.stats || {};

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        {loading ? (
          <Spinner label="Loading your profile" />
        ) : error ? (
          <Alert tone="error">{error}</Alert>
        ) : (
          <>
            <PageHeader
              title={user?.name}
              subtitle={`${user?.email} · ${ROLE_LABEL[user?.role] || user?.role}${user?.batch ? ` · Batch ${user.batch}` : ''}${
                user?.createdAt ? ` · since ${fmtDate(user.createdAt)}` : ''
              }`}
              actions={<Stamp status="ACTIVE" />}
            />

            <div className="space-y-6">
              <Sheet aria-labelledby="activity-heading">
                <SheetHeader title={<span id="activity-heading">Activity</span>} />
                <StatsFor role={user?.role} stats={stats} />
              </Sheet>

              <Sheet aria-labelledby="security-heading">
                <SheetHeader title={<span id="security-heading">Sign-in security</span>} />
                <dl className="grid gap-x-8 gap-y-4 px-5 py-5 text-[15px] sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-ink">Two-step sign-in</dt>
                    <dd className="text-ink-soft">On. Every sign-in asks for a code sent to your email.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-ink">Sessions</dt>
                    <dd className="text-ink-soft">Renewed every 15 minutes. A stolen session key is detected and every session ends.</dd>
                  </div>
                </dl>
              </Sheet>

              <Sheet aria-labelledby="password-heading">
                <SheetHeader title={<span id="password-heading">Change password</span>} />
                <div className="grid gap-8 px-5 py-6 md:grid-cols-[minmax(0,1fr)_14rem]">
                  <form onSubmit={handleChangePassword} className="max-w-md space-y-4" noValidate>
                    <div aria-live="polite" className="space-y-3">
                      {passwordError && <Alert tone="error">{passwordError}</Alert>}
                      {successMessage && (
                        <Alert tone="success" title={successMessage}>
                          Every signed-in session, including this one, ends within 15 minutes. Sign in again with your new password.
                        </Alert>
                      )}
                    </div>
                    <Field label="Current password" required>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      />
                    </Field>
                    <Field label="New password" required>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      />
                    </Field>
                    <Field label="Confirm new password" required error={mismatch ? 'Does not match the new password.' : undefined}>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      />
                    </Field>
                    <Button type="submit" loading={isChangingPassword}>
                      {isChangingPassword ? 'Updating…' : 'Update password'}
                    </Button>
                  </form>

                  <div>
                    <h3 className="caps text-sm text-ink-faint">Your new password needs</h3>
                    <ul className="mt-3 space-y-2 text-[15px]">
                      {PASSWORD_RULES.map((rule, i) => (
                        <li key={rule.label} className={cx('flex items-center gap-2', rulesMet[i] ? 'text-ink' : 'text-ink-soft')}>
                          {rulesMet[i] ? (
                            <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                          )}
                          {rule.label}
                          <span className="sr-only">{rulesMet[i] ? '(done)' : '(not yet)'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Sheet>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
