import type { DayLane } from './board-types';

export const WEEK_LANES: DayLane[] = [
  { id: 'lane-monday', dayKey: 'monday', label: 'Monday', order: 1 },
  { id: 'lane-tuesday', dayKey: 'tuesday', label: 'Tuesday', order: 2 },
  { id: 'lane-wednesday', dayKey: 'wednesday', label: 'Wednesday', order: 3 },
  { id: 'lane-thursday', dayKey: 'thursday', label: 'Thursday', order: 4 },
  { id: 'lane-friday', dayKey: 'friday', label: 'Friday', order: 5 },
  { id: 'lane-saturday', dayKey: 'saturday', label: 'Saturday', order: 6 },
  { id: 'lane-sunday', dayKey: 'sunday', label: 'Sunday', order: 7 }
];
