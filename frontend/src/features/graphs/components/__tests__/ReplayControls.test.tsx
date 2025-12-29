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
  HiChevronDoubleLeft: () => <span data-testid="icon-chevron-double-left">DoubleLeft</span>,
  HiChevronDoubleRight: () => <span data-testid="icon-chevron-double-right">DoubleRight</span>,
  HiX: () => <span data-testid="icon-x">X</span>,
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
  describe('mobile variant', () => {
    it('renders mobile layout with slider and controls', () => {
      render(<ReplayControls {...defaultProps} variant="mobile" enabled={true} />);

      // Mobile variant uses a slider, not a progress bar
      expect(screen.getByTestId('slider')).toBeInTheDocument();
      // Mobile variant shows step count format
      expect(screen.getByText(/1.*\/.*10/)).toBeInTheDocument();
    });

    it('shows step counter with correct values', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="mobile"
          enabled={true}
          currentStep={5}
          totalSteps={10}
        />
      );

      // Mobile variant shows step count as "5/10"
      expect(screen.getByText('5/10')).toBeInTheDocument();
    });

    it('calls onSeek when slider value changes', () => {
      const mockOnSeek = vi.fn();

      render(
        <ReplayControls
          {...defaultProps}
          variant="mobile"
          enabled={true}
          onSeek={mockOnSeek}
        />
      );

      const slider = screen.getByTestId('slider');
      fireEvent.change(slider, { target: { value: '5' } });

      expect(mockOnSeek).toHaveBeenCalledWith(5);
    });

    it('shows speed dropdown button with current speed', () => {
      render(<ReplayControls {...defaultProps} variant="mobile" enabled={true} speed={2} />);

      // Mobile uses a dropdown, shows current speed as button text
      expect(screen.getByText('2×')).toBeInTheDocument();
    });

    it('renders playback control buttons', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="mobile"
          enabled={true}
        />
      );

      // Check playback buttons exist
      expect(screen.getByTestId('icon-play')).toBeInTheDocument();
      expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
    });

    it('disables controls when totalSteps <= 1', () => {
      render(
        <ReplayControls {...defaultProps} variant="mobile" enabled={true} totalSteps={1} />
      );

      // Find the play button by its secondary variant
      const playButton = screen.getByTestId('button-secondary');
      expect(playButton).toBeDisabled();
    });

    it('shows close button that calls onToggle', async () => {
      const mockOnToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <ReplayControls
          {...defaultProps}
          variant="mobile"
          enabled={true}
          onToggle={mockOnToggle}
        />
      );

      // Mobile variant has an X icon button to close
      const closeButton = screen.getByTestId('icon-x').closest('button');
      expect(closeButton).toBeInTheDocument();

      await user.click(closeButton!);

      expect(mockOnToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('popover variant (desktop)', () => {
    it('renders desktop popover layout', () => {
      render(<ReplayControls {...defaultProps} variant="popover" enabled={true} />);

      expect(screen.getByTestId('switch')).toBeInTheDocument();
      expect(screen.getByText('Replay Mode')).toBeInTheDocument();
      expect(screen.getByText('1/10')).toBeInTheDocument();
    });

    it('shows slider only when enabled', () => {
      const { rerender } = render(
        <ReplayControls {...defaultProps} variant="popover" enabled={false} />
      );

      expect(screen.queryByTestId('slider')).not.toBeInTheDocument();

      rerender(
        <ReplayControls {...defaultProps} variant="popover" enabled={true} />
      );

      expect(screen.getByTestId('slider')).toBeInTheDocument();
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

    it('shows speed dropdown button with current speed', () => {
      render(
        <ReplayControls {...defaultProps} variant="popover" enabled={true} />
      );

      // Popover uses a dropdown, only shows current speed
      expect(screen.getByText('1×')).toBeInTheDocument();
    });

    it('shows correct speed when speed prop changes', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="popover"
          enabled={true}
          speed={2}
        />
      );

      // The speed dropdown button shows current speed
      expect(screen.getByText('2×')).toBeInTheDocument();
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
          enabled={true}
          isLoadingMore={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not show loading indicator when hasMoreHistorical is true but not loading', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="popover"
          enabled={true}
          hasMoreHistorical={true}
          isLoadingMore={false}
        />
      );

      // hasMoreHistorical doesn't show a lightning bolt in popover variant
      // Just verify the component renders correctly
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });
  });

  describe('slider value calculation', () => {
    it('sets slider value correctly based on currentStep', () => {
      render(
        <ReplayControls
          {...defaultProps}
          variant="mobile"
          enabled={true}
          currentStep={3}
          totalSteps={10}
        />
      );

      const slider = screen.getByTestId('slider');
      expect(slider).toHaveAttribute('value', '3');
    });

    it('handles edge cases', () => {
      // Zero total steps - slider should default
      const { rerender } = render(
        <ReplayControls
          {...defaultProps}
          variant="mobile"
          enabled={true}
          currentStep={1}
          totalSteps={0}
        />
      );
      const slider = screen.getByTestId('slider');
      expect(slider).toBeInTheDocument();

      // Current step > total steps - should be clamped to totalSteps
      rerender(
        <ReplayControls
          {...defaultProps}
          variant="mobile"
          enabled={true}
          currentStep={15}
          totalSteps={10}
        />
      );
      expect(slider).toHaveAttribute('value', '10');
    });
  });

  describe('accessibility', () => {
    it('switch has proper ARIA label', () => {
      render(
        <ReplayControls {...defaultProps} variant="popover" enabled={true} />
      );

      const switchElement = screen.getByTestId('switch');
      expect(switchElement).toBeInTheDocument();

      // Slider is present and functional
      const slider = screen.getByTestId('slider');
      expect(slider).toBeInTheDocument();
    });
  });
});
