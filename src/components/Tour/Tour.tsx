import Joyride, { CallBackProps } from 'react-joyride';
import { tourSteps } from './tourSteps';

interface TourProps {
  isRunning: boolean;
  stepIndex: number;
  onCallback: (data: CallBackProps) => void;
}

export function Tour({ isRunning, stepIndex, onCallback }: TourProps) {
  return (
    <Joyride
      steps={tourSteps}
      run={isRunning}
      stepIndex={stepIndex}
      callback={onCallback}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      spotlightClicks
      styles={{
        options: {
          arrowColor: 'var(--bg-secondary)',
          backgroundColor: 'var(--bg-secondary)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: 'var(--accent)',
          textColor: 'var(--text-primary)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '8px',
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
        },
        buttonNext: {
          backgroundColor: 'var(--accent)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 500,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          marginRight: '8px',
        },
        buttonSkip: {
          color: 'var(--text-muted)',
          fontSize: '13px',
        },
        buttonClose: {
          color: 'var(--text-muted)',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Got it!',
        next: 'Next',
        skip: 'Skip tour',
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
