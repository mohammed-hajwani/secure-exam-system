import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(initialViolationCount);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);

  const lastViolationTimeRef = useRef(0);
  const isAutoSubmittedRef = useRef(false);

  // Check if currently in fullscreen
  const checkFullscreen = useCallback(() => {
    const fsElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;
    return !!fsElement;
  }, []);

  // Request browser fullscreen mode
  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setIsWarningOpen(false);
    } catch (err) {
      console.warn('Could not enter fullscreen:', err);
    }
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
      }
    },
    [isActive, examId, attemptId, violationCount, maxViolations, onAutoSubmitted]
  );

  // Sync fullscreen state & handle fullscreen change
  useEffect(() => {
    if (!isActive) return;

    const handleFullscreenChange = () => {
      const inFullscreen = checkFullscreen();
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && !isAutoSubmittedRef.current) {
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

  const dismissWarning = () => {
    if (!isAutoSubmitted) {
      enterFullscreen();
      setIsWarningOpen(false);
    }
  };

  return {
    isFullscreen,
    violationCount,
    maxViolations,
    isWarningOpen,
    warningMessage,
    isAutoSubmitted,
    enterFullscreen,
    exitFullscreen,
    dismissWarning
  };
};

export default useProctoring;
