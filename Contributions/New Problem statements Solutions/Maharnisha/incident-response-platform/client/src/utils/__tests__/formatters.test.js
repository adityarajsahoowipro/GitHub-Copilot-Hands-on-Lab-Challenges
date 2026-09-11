import { formatDuration } from '../formatters.js';

describe('formatDuration', () => {
  it('formats minutes only when under an hour', () => {
    expect(formatDuration(25 * 60000)).toBe('25m');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration((60 + 20) * 60000)).toBe('1h 20m');
  });

  it('handles negative durations with a minus sign', () => {
    expect(formatDuration(-30 * 60000)).toBe('-30m');
  });
});
