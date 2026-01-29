import { useState, useEffect, useCallback } from 'react';
import { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';

const TOUR_STORAGE_KEY = 'triage-sidekick-tour-completed';

interface UseTourOptions {
  /** Callback to open the environment modal (for step 2) */
  onOpenEnvironmentModal?: () => void;
  /** Callback to close the environment modal */
  onCloseEnvironmentModal?: () => void;
  /** Callback to select the first queue item (for step 4) */
  onSelectFirstItem?: () => void;
}

interface UseTourReturn {
  isRunning: boolean;
  stepIndex: number;
  startTour: () => void;
  endTour: () => void;
  resetTour: () => void;
  handleJoyrideCallback: (data: CallBackProps) => void;
}

export function useTour(options: UseTourOptions = {}): UseTourReturn {
  const { onOpenEnvironmentModal, onCloseEnvironmentModal, onSelectFirstItem } = options;

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);

  // Check if tour should auto-start on first visit
  useEffect(() => {
    const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasCompletedTour) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsRunning(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  const endTour = useCallback(() => {
    setIsRunning(false);
    setStepIndex(0);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    // Ensure environment modal is closed when tour ends
    onCloseEnvironmentModal?.();
  }, [onCloseEnvironmentModal]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    // Handle tour completion or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      endTour();
      return;
    }

    // Handle step transitions
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);

      // Step 1 (index 1) is the Environment button - open modal before advancing
      if (index === 1 && action === ACTIONS.NEXT) {
        onOpenEnvironmentModal?.();
        // Small delay to let modal open before advancing
        setTimeout(() => {
          setStepIndex(nextIndex);
        }, 300);
        return;
      }

      // Leaving step 2 (Environment modal) - close the modal
      if (index === 2 && action === ACTIONS.NEXT) {
        onCloseEnvironmentModal?.();
      }
      if (index === 2 && action === ACTIONS.PREV) {
        onCloseEnvironmentModal?.();
      }

      // Step 3 (index 3) is queue item - ensure an item is selected before step 4
      if (index === 3 && action === ACTIONS.NEXT) {
        onSelectFirstItem?.();
      }

      setStepIndex(nextIndex);
    }
  }, [endTour, onOpenEnvironmentModal, onCloseEnvironmentModal, onSelectFirstItem]);

  return {
    isRunning,
    stepIndex,
    startTour,
    endTour,
    resetTour,
    handleJoyrideCallback,
  };
}
