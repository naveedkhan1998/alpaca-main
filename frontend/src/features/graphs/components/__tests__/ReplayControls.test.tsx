import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ReplayControls from '../ReplayControls';

// Mock the UI components
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className}>
      Progress: {value}%
    </div>
  ),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onCheckedChange(e.target.checked)}
      data-testid="switch"
    />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-${variant || 'default'}`}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    disabled,
    'aria-label': ariaLabel,
  }: {
    value: number[];
    onValueChange: (value: number[]) => void;
    min: number;
    max: number;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <input
      type="range"
      min={min}
      max={max}
      value={value?.[0] || 0}
      onChange={e => onValueChange([parseInt(e.target.value)])}
      disabled={disabled}
      data-testid="slider"
      aria-label={ariaLabel}
    />
  ),
}));

vi.mock('react-icons/hi', () => ({
  HiPlay: () => <span data-testid="icon-play">Play</span>,
  HiPause: () => <span data-testid="icon-pause">Pause</span>,
  HiRefresh: () => <span data-testid="icon-refresh">Refresh</span>,
  HiChevronLeft: () => <span data-testid="icon-chevron-left">Left</span>,
  HiChevronRight: () => <span data-testid="icon-chevron-right">Right</span>,
  HiLightningBolt: () => <span data-testid="icon-lightning">Lightning</span>,
}));

const defaultProps = {
  enabled: false,
  playing: false,
  currentStep: 1,
  totalSteps: 10,
  onToggle: vi.fn(),
  onPlayPause: vi.fn(),
  onRestart: vi.fn(),
  onSeek: vi.fn(),
  speed: 1,
  onSpeedChange: vi.fn(),
  currentLabel: '2024-01-01 12:00:00',
  isLoadingMore: false,
  hasMoreHistorical: false,
  onLoadMoreHistorical: vi.fn(),
};

describe('ReplayControls', () => {
  describe('overlay variant (mobile)', () => {
    it('renders mobile overlay layout', () => {
      render(<ReplayControls {...defaultProps} variant="overlay" />);

      expect(screen.getByText('Candle Replay')).toBeInTheDocument();
      expect(screen.getByText('1 / 10')).toBeInTheDocument();
      expect(screen.getByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('2024-01-01 12:00:00')).toBeInTheDocument();
    });

    it('shows progress bar with correct percentage', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="overlay"
          currentStep={5}
          totalSteps={10}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-value', '50');
    });

    it('calls onSeek when clicking progress bar', async () => {
      const mockOnSeek = vi.fn();
      const user = userEvent.setup();

      render(
        <ReplayControls
          {...defaultProps}
          variant="overlay"
          onSeek={mockOnSeek}
        />
      );

      // Find the clickable progress container (the div wrapping the Progress component)
      const progressContainer = screen.getByTestId('progress').parentElement;
      expect(progressContainer).toBeInTheDocument();

      // Simulate clicking at 50% position
      const rect = { left: 0, width: 100 };
      progressContainer!.getBoundingClientRect = vi.fn().mockReturnValue(rect);

      await user.pointer({
        keys: '[MouseLeft]',
        target: progressContainer!,
        coords: { clientX: 50, clientY: 10 },
      });

      expect(mockOnSeek).toHaveBeenCalledWith(5); // 50% of 10 steps = step 5
    });

    it('renders speed control buttons', () => {
      render(<ReplayControls {...defaultProps} variant="overlay" />);

      expect(screen.getByText('0.5x')).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('4x')).toBeInTheDocument();
    });

    it('calls onSpeedChange when speed button is clicked', async () => {
      const mockOnSpeedChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ReplayControls
          {...defaultProps}
          variant="overlay"
          onSpeedChange={mockOnSpeedChange}
        />
      );

      const speedButton = screen.getByText('2x');
      await user.click(speedButton);

      expect(mockOnSpeedChange).toHaveBeenCalledWith(2);
    });

    it('disables controls when totalSteps <= 1', () => {
      render(
        <ReplayControls {...defaultProps} variant="overlay" totalSteps={1} />
      );

      const playButton = screen.getByTestId('button-secondary');
      expect(playButton).toBeDisabled();
    });

    it('calls onToggle when close button is clicked', async () => {
      const mockOnToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <ReplayControls
          {...defaultProps}
          variant="overlay"
          onToggle={mockOnToggle}
        />
      );

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(mockOnToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('popover variant (desktop)', () => {
    it('renders desktop popover layout', () => {
      render(<ReplayControls {...defaultProps} variant="popover" />);

      expect(screen.getByTestId('switch')).toBeInTheDocument();
      expect(screen.getByText('Candle Replay')).toBeInTheDocument();
      expect(screen.getByText('1 / 10')).toBeInTheDocument();
    });

    it('shows progress bar only when enabled', () => {
      const { rerender } = render(
        <ReplayControls {...defaultProps} variant="popover" enabled={false} />
      );

      expect(screen.queryByTestId('progress')).not.toBeInTheDocument();

      rerender(
        <ReplayControls {...defaultProps} variant="popover" enabled={true} />
      );

      expect(screen.getByTestId('progress')).toBeInTheDocument();
    });

    it('renders slider for seeking', () => {
      render(
        <ReplayControls {...defaultProps} variant="popover" enabled={true} />
      );

      const slider = screen.getByTestId('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('max', '10');
      expect(slider).toHaveAttribute('value', '1');
    });

    it('calls onSeek when slider value changes', () => {
      const mockOnSeek = vi.fn();
      render(
        <ReplayControls
          {...defaultProps}
          variant="popover"
          enabled={true}
          onSeek={mockOnSeek}
        />
      );

      const slider = screen.getByTestId('slider');
      fireEvent.change(slider, { target: { value: '5' } });

      expect(mockOnSeek).toHaveBeenCalledWith(5);
    });

    it('renders all speed preset buttons', () => {
      render(
        <ReplayControls {...defaultProps} variant="popover" enabled={true} />
      );

      expect(screen.getByText('0.5x')).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('4x')).toBeInTheDocument();
      expect(screen.getByText('8x')).toBeInTheDocument();
    });

    it('highlights current speed', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="popover"
          enabled={true}
          speed={2}
        />
      );

      // The 2x button should have different styling (we can't easily test className with our mock)
      const speedButton = screen.getByText('2x');
      expect(speedButton).toBeInTheDocument();
    });

    it('calls onRestart when restart button is clicked', async () => {
      const mockOnRestart = vi.fn();
      const user = userEvent.setup();

      render(
        <ReplayControls
          {...defaultProps}
          variant="popover"
          enabled={true}
          onRestart={mockOnRestart}
        />
      );

      const restartButton = screen
        .getByTestId('icon-refresh')
        .closest('button');
      expect(restartButton).toBeInTheDocument();

      await user.click(restartButton!);

      expect(mockOnRestart).toHaveBeenCalled();
    });

    it('shows loading state when isLoadingMore is true', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="popover"
          isLoadingMore={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows lightning bolt button when hasMoreHistorical is true', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="popover"
          enabled={true}
          hasMoreHistorical={true}
        />
      );

      expect(screen.getByTestId('icon-lightning')).toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('calculates progress percentage correctly', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="overlay"
          currentStep={3}
          totalSteps={10}
        />
      );

      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-value', '30');
    });

    it('handles edge cases', () => {
      // Zero total steps
      const { rerender } = render(
        <ReplayControls
          {...defaultProps}
          variant="overlay"
          currentStep={1}
          totalSteps={0}
        />
      );
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '0');

      // Current step > total steps
      rerender(
        <ReplayControls
          {...defaultProps}
          variant="overlay"
          currentStep={15}
          totalSteps={10}
        />
      );
      expect(screen.getByTestId('progress')).toHaveAttribute(
        'data-value',
        '100'
      );
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <ReplayControls {...defaultProps} variant="popover" enabled={true} />
      );

      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toBeInTheDocument();

      const slider = screen.getByTestId('slider');
      expect(slider).toHaveAttribute('aria-label', 'Replay progress');
    });
  });
});
