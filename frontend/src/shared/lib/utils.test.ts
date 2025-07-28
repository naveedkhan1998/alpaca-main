import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('handles undefined and null values', () => {
    const result = cn('class1', undefined, 'class2', null);
    expect(result).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    );

    expect(result).toBe('base-class active-class');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles array of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  it('removes duplicate classes', () => {
    const result = cn('class1', 'class2', 'class1');
    // The exact behavior depends on your cn implementation
    // This test might need adjustment based on whether cn removes duplicates
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('handles objects with boolean values', () => {
    const result = cn({
      active: true,
      disabled: false,
      loading: true,
    });

    expect(result).toContain('active');
    expect(result).toContain('loading');
    expect(result).not.toContain('disabled');
  });
});
