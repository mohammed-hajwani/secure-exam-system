import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const isFullscreenNow = () =>
  typeof document !== 'undefined' &&
  !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

export const FULLSCREEN_REFUSED =
  'This browser did not switch to fullscreen. Try again, or open the exam in Chrome, Edge, Firefox or Safari.';

// False on iPhone Safari and in frames that are not allowed to go fullscreen
export const fullscreenSupported = () =>
  typeof document !== 'undefined' && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);

/**
 * Custom hook for active proctoring during an online examination
 *
 * @param {Object} params
 * @param {string} params.examId
 * @param {string} params.attemptId
 * @param {number} params.maxViolations
 * @param {number} params.initialViolationCount
 * @param {boolean} params.isActive - Whether proctoring should be actively listening
 * @param {Function} params.onAutoSubmitted - Callback when max violations reached
 */
export const useProctoring = ({
  examId,
  attemptId,
  maxViolations = 3,
  initialViolationCount = 0,
  isActive = false,
  onAutoSubmitted
}) => {
  // Read the real state on mount: the briefing page usually entered fullscreen already
  const [isFullscreen, setIsFullscreen] = useState(isFullscreenNow);
  const [violationCount, setViolationCount] = useState(initialViolationCount);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);
  // True while a violation is being sent, so the page can wait for the warning instead of flashing other prompts
  const [isReportingViolation, setIsReportingViolation] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');

  const lastViolationTimeRef = useRef(0);
  const isAutoSubmittedRef = useRef(false);

  // The attempt loads after the first render; a resumed attempt brings its earlier violations
  useEffect(() => {
    setViolationCount((count) => Math.max(count, initialViolationCount));
  }, [initialViolationCount]);

  const checkFullscreen = useCallback(() => isFullscreenNow(), []);

  // Request browser fullscreen mode. Browsers only allow this straight after a
  // click or key press, so call it from an event handler. Resolves to true on success.
  const enterFullscreen = useCallback(async () => {
    if (isFullscreenNow()) {
      setIsFullscreen(true);
      return true;
    }
    try {
      setFullscreenError('');
      const el = document.documentElement;
      const request = el.requestFullscreen
        ? el.requestFullscreen()
        : el.webkitRequestFullscreen
        ? el.webkitRequestFullscreen()
        : el.msRequestFullscreen
        ? el.msRequestFullscreen()
        : null;
      // Some browsers never settle the promise; older Safari returns none and switches a moment later
      if (request && request.then) {
        await Promise.race([request, new Promise((resolve) => setTimeout(resolve, 1500))]);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (err) {
      console.warn('Could not enter fullscreen:', err);
    }
    // Trust the document, not the promise: some browsers ignore the request without an error
    const ok = isFullscreenNow();
    setIsFullscreen(ok);
    if (!ok) setFullscreenError(FULLSCREEN_REFUSED);
    return ok;
  }, []);

  // Exit fullscreen mode (e.g. on clean submission)
  const exitFullscreen = useCallback(async () => {
    try {
      if (checkFullscreen()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Could not exit fullscreen cleanly:', err);
    }
  }, [checkFullscreen]);

  // Report violation to backend
  const reportViolation = useCallback(
    async (type, details = {}) => {
      if (!isActive || !examId || !attemptId || isAutoSubmittedRef.current) {
        return;
      }

      // 2-second cooldown to prevent multi-event storms (e.g. alt-tab triggers blur + visibility + fullscreen loss)
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 2000) {
        return;
      }
      lastViolationTimeRef.current = now;

      try {
        setIsReportingViolation(true);
        const response = await api.post(
          `/exams/${examId}/attempts/${attemptId}/violation`,
          {
            type,
            details: {
              timestamp: new Date().toISOString(),
              ...details
            }
          }
        );

        const data = response.data?.data;
        const newCount = data?.violationCount ?? (violationCount + 1);
        setViolationCount(newCount);

        let desc = 'Proctoring violation detected.';
        if (type === 'TAB_SWITCH') desc = 'Tab switch or background window detected.';
        if (type === 'FULLSCREEN_EXIT') desc = 'You exited fullscreen mode.';
        if (type === 'WINDOW_BLUR') desc = 'Window lost focus.';

        if (data?.autoSubmitted) {
          isAutoSubmittedRef.current = true;
          setIsAutoSubmitted(true);
          setWarningMessage(
            `Violation limit reached (${newCount}/${maxViolations}). Your exam has been automatically submitted.`
          );
          setIsWarningOpen(true);
          if (onAutoSubmitted) {
            onAutoSubmitted(data);
          }
        } else {
          setWarningMessage(
            `${desc} (Violation ${newCount} of ${maxViolations}). Please remain in fullscreen and focused on your exam.`
          );
          setIsWarningOpen(true);
        }
      } catch (err) {
        console.error('Failed to report violation:', err);
      } finally {
        setIsReportingViolation(false);
      }
    },
    [isActive, examId, attemptId, violationCount, maxViolations, onAutoSubmitted]
  );

  // Keep fullscreen state in sync at all times; only count exits while the exam is active
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = checkFullscreen();
      setIsFullscreen(inFullscreen);
      if (inFullscreen) setFullscreenError('');

      if (isActive && !inFullscreen && !isAutoSubmittedRef.current) {
        reportViolation('FULLSCREEN_EXIT', { reason: 'Student exited browser fullscreen' });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isActive, checkFullscreen, reportViolation]);

  // Handle visibility change (tab switch / minimizing)
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isAutoSubmittedRef.current) {
        reportViolation('TAB_SWITCH', { reason: 'Page hidden or tab switched' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, reportViolation]);

  // Handle window blur (clicking outside or switching windows)
  useEffect(() => {
    if (!isActive) return;

    const handleBlur = () => {
      if (!isAutoSubmittedRef.current) {
        reportViolation('WINDOW_BLUR', { reason: 'Browser window lost focus' });
      }
    };

    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, reportViolation]);

  // Called from the warning's button click, which allows the fullscreen request
  const dismissWarning = async () => {
    if (isAutoSubmitted) return;
    if (fullscreenSupported()) await enterFullscreen();
    setIsWarningOpen(false);
  };

  return {
    isFullscreen,
    violationCount,
    maxViolations,
    isWarningOpen,
    warningMessage,
    isAutoSubmitted,
    isReportingViolation,
    fullscreenError,
    enterFullscreen,
    exitFullscreen,
    dismissWarning
  };
};

export default useProctoring;
