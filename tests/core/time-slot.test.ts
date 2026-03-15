import { describe, expect, it } from 'vitest';
import { generatePlanningSlots, isWithinPlanningWindow } from '../../src/core/domain/time-slot';

describe('time slots', () => {
  it('generates deterministic 30-minute slots from 06:00 to 17:30', () => {
    const slots = generatePlanningSlots();

    expect(slots[0]).toBe('06:00');
    expect(slots[1]).toBe('06:30');
    expect(slots.at(-1)).toBe('17:30');
    expect(slots).toHaveLength(24);
  });

  it('validates placement stays in 06:00-18:00 window', () => {
    expect(isWithinPlanningWindow('08:30', 90)).toBe(true);
    expect(isWithinPlanningWindow('17:30', 60)).toBe(false);
  });
});
