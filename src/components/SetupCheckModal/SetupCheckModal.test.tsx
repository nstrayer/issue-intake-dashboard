import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SetupCheckModal } from './SetupCheckModal';

describe('SetupCheckModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<SetupCheckModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Setup Check')).not.toBeInTheDocument();
  });

  it('should render loading state initially when opened', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch; // Never resolves
    render(<SetupCheckModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Setup Check')).toBeInTheDocument();
    expect(screen.getByText('Running checks...')).toBeInTheDocument();
  });

  it('should display check results when API returns successfully', async () => {
    const mockResponse = {
      checks: [
        { name: 'Claude Code CLI', status: 'pass', message: 'Installed (1.0.0)' },
        { name: 'GitHub CLI', status: 'pass', message: 'Installed (gh version 2.50.0)' },
        { name: 'GitHub Authentication', status: 'pass', message: 'Authenticated as testuser' },
      ],
      allPassed: true,
      hasWarnings: false,
      hasCriticalFailures: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<SetupCheckModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Claude Code CLI')).toBeInTheDocument();
      expect(screen.getByText('GitHub CLI')).toBeInTheDocument();
      expect(screen.getByText('GitHub Authentication')).toBeInTheDocument();
    });

    expect(screen.getByText('All Passed')).toBeInTheDocument();
  });

  it('should display failed checks with fix commands', async () => {
    const mockResponse = {
      checks: [
        {
          name: 'GitHub Authentication',
          status: 'fail',
          message: 'Not authenticated with GitHub',
          fixCommand: 'gh auth login',
        },
      ],
      allPassed: false,
      hasWarnings: false,
      hasCriticalFailures: true,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<SetupCheckModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Not authenticated with GitHub')).toBeInTheDocument();
      expect(screen.getByText('gh auth login')).toBeInTheDocument();
    });

    expect(screen.getByText('Issues Found')).toBeInTheDocument();
  });

  it('should display warnings badge when there are warnings', async () => {
    const mockResponse = {
      checks: [
        {
          name: 'GitHub Project Scope',
          status: 'warn',
          message: 'Missing read:project scope',
          fixCommand: 'gh auth refresh --scopes read:project',
        },
      ],
      allPassed: false,
      hasWarnings: true,
      hasCriticalFailures: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<SetupCheckModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Warnings')).toBeInTheDocument();
    });
  });

  it('should call onClose when Close button is clicked', async () => {
    const onClose = vi.fn();
    const mockResponse = {
      checks: [],
      allPassed: true,
      hasWarnings: false,
      hasCriticalFailures: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<SetupCheckModal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.queryByText('Running checks...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when clicking backdrop', async () => {
    const onClose = vi.fn();
    const mockResponse = {
      checks: [],
      allPassed: true,
      hasWarnings: false,
      hasCriticalFailures: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<SetupCheckModal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.queryByText('Running checks...')).not.toBeInTheDocument();
    });

    // Click the backdrop (the outer div)
    const backdrop = screen.getByText('Setup Check').closest('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should display error when API call fails', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    render(<SetupCheckModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Check failed')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should re-run checks when Re-run Checks button is clicked', async () => {
    const mockResponse = {
      checks: [{ name: 'Test Check', status: 'pass', message: 'OK' }],
      allPassed: true,
      hasWarnings: false,
      hasCriticalFailures: false,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<SetupCheckModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Re-run Checks')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Re-run Checks'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should copy fix command to clipboard when Copy button is clicked', async () => {
    const mockClipboard = { writeText: vi.fn() };
    Object.assign(navigator, { clipboard: mockClipboard });

    const mockResponse = {
      checks: [
        {
          name: 'GitHub Authentication',
          status: 'fail',
          message: 'Not authenticated',
          fixCommand: 'gh auth login',
        },
      ],
      allPassed: false,
      hasWarnings: false,
      hasCriticalFailures: true,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<SetupCheckModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy'));

    expect(mockClipboard.writeText).toHaveBeenCalledWith('gh auth login');
  });
});
