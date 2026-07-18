import { describe, it, expect } from 'vitest';
import { checkShiftExpiration } from '../lib/shift';

describe('checkShiftExpiration', () => {
  it('returns false if shiftDate matches today', () => {
    expect(checkShiftExpiration('2026-07-15', '2026-07-15')).toBe(false);
  });

  it('returns true if shiftDate is different from today', () => {
    expect(checkShiftExpiration('2026-07-14', '2026-07-15')).toBe(true);
  });

  it('handles missing shiftDate by returning false (auto-fixes backward compatibility)', () => {
    expect(checkShiftExpiration(null, '2026-07-15')).toBe(false);
  });
});
