import type { TimeOfDay } from './board-types';

export const SLOT_MINUTES = 30;
export const PLANNING_WINDOW_START = '06:00';
export const PLANNING_WINDOW_END = '18:00';

const toParts = (time: TimeOfDay): [number, number] => {
  const [hours, minutes] = time.split(':').map(Number);
  return [hours, minutes];
};

export const toMinutesOfDay = (time: TimeOfDay): number => {
  const [hours, minutes] = toParts(time);
  return hours * 60 + minutes;
};

export const toTimeOfDay = (minutesOfDay: number): TimeOfDay => {
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const deriveEndTime = (startTime: TimeOfDay, extentMinutes: number): TimeOfDay =>
  toTimeOfDay(toMinutesOfDay(startTime) + extentMinutes);

export const clampToPlanningWindow = (time: TimeOfDay): TimeOfDay => {
  const candidate = toMinutesOfDay(time);
  const min = toMinutesOfDay(PLANNING_WINDOW_START);
  const max = toMinutesOfDay(PLANNING_WINDOW_END) - SLOT_MINUTES;

  return toTimeOfDay(Math.max(min, Math.min(max, candidate)));
};

export const shiftTimeByMinutes = (time: TimeOfDay, minutes: number): TimeOfDay => toTimeOfDay(toMinutesOfDay(time) + minutes);

export const generatePlanningSlots = (): TimeOfDay[] => {
  const slots: TimeOfDay[] = [];
  const start = toMinutesOfDay(PLANNING_WINDOW_START);
  const end = toMinutesOfDay(PLANNING_WINDOW_END);

  for (let cursor = start; cursor < end; cursor += SLOT_MINUTES) {
    slots.push(toTimeOfDay(cursor));
  }

  return slots;
};

export const isWithinPlanningWindow = (startTime: TimeOfDay, extentMinutes: number): boolean => {
  const start = toMinutesOfDay(startTime);
  const end = start + extentMinutes;
  return start >= toMinutesOfDay(PLANNING_WINDOW_START) && end <= toMinutesOfDay(PLANNING_WINDOW_END);
};
