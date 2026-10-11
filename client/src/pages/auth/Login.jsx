import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { Alert, Button, Field, Input } from '../../components/ui';
import { Wordmark } from '../../components/layout/Navbar';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { login, verifyOtp, resendOtp, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim() || !password) {
      setError('Enter both your email and your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await login(email.trim(), password);
      if (result?.requiresOtp) {
        setTempToken(result.tempToken);
        setStep('otp');
        setInfoMessage(`We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyOtp(tempToken, otp.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'That code did not work. Check it and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setInfoMessage('');
    try {
      setIsResending(true);
      const res = await resendOtp(tempToken);
      if (res?.tempToken) {
        setTempToken(res.tempToken);
      }
      setInfoMessage('A new code is on its way. Earlier codes no longer work.');
    } catch (err) {
      setError(err.message || 'Could not send a new code. Sign in again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="felt flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Wordmark to="/" />
        <Link to="/" className="text-sm font-semibold text-board-ink transition-colors hover:text-white">
          About ExamShield
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-6">
        <div className="grid w-full max-w-4xl items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)] md:gap-10">
          <section className="sheet relative mx-auto w-full max-w-md px-6 pb-7 pt-8 shadow-lift sm:px-8" aria-labelledby="login-title">
            <h1 id="login-title" className="display text-[2.75rem] text-ink">
              {step === 'otp' ? 'Check your email' : 'Sign in'}
            </h1>
            <p className="mt-2 text-[15px] text-ink-soft">
              {step === 'otp'
                ? 'Step 2 of 2: enter the code we just emailed you.'
                : 'Step 1 of 2: your institution email and password.'}
            </p>

            <div className="mt-5 space-y-3" aria-live="polite">
              {sessionExpired && !error && step === 'credentials' && (
                <Alert tone="warn">Your session has ended. Please sign in again.</Alert>
              )}
              {error && <Alert tone="error">{error}</Alert>}
              {infoMessage && <Alert tone="success">{infoMessage}</Alert>}
            </div>

            {step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4" noValidate>
                <Field label="Email address" required>
                  <Input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                  />
                </Field>
                <Field label="Password" required>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
                <Field label="6-digit code" hint="Paste or type the code. Digits only.">
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="num h-16 text-center text-[2rem] font-bold tracking-[0.45em] placeholder:text-paper-rule"
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={otp.length !== 6}>
                  {isSubmitting ? 'Verifying…' : 'Verify and continue'}
                </Button>
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep('credentials');
                      setOtp('');
                      setError('');
                      setInfoMessage('');
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={isResending} onClick={handleResendOtp}>
                    <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Send a new code
                  </Button>
                </div>
              </form>
            )}

            <p className="mt-7 border-t border-paper-line pt-4 text-sm text-ink-faint">
              Accounts are created by your institution. No account yet? Contact your exam administrator.
            </p>
          </section>

          <aside className="relative mx-auto w-full max-w-[260px] rounded-[2px] bg-stock-canary px-5 pb-5 pt-5 text-ink shadow-lift md:mt-10">
            <h2 className="caps text-base">Before you sign in</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
              <li className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-stock-canary-ink" aria-hidden="true" />
                Keep your email open: every sign-in asks for a one-time code.
              </li>
              <li>Exams run fullscreen. Leaving the exam tab or window is recorded.</li>
              <li>
                New here?{' '}
                <Link to="/practice" className="font-semibold text-ink underline">
                  Try a practice exam
                </Link>{' '}
                first. No account needed.
              </li>
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Login;
