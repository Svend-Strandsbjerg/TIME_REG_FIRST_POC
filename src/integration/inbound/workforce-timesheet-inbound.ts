import type { DayKey, TimeBlock } from '../../core/domain/board-types';
import type { TimeRegistrationCommittedEntry } from '../../core/domain/time-registration-committed-entry';

const DAY_KEYS: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toDayKey = (date: string): DayKey => {
  const parsed = new Date(`${date}T00:00:00Z`);
  const dayIndex = parsed.getUTCDay();
  return DAY_KEYS[dayIndex] ?? 'monday';
};

const toLaneId = (dayKey: DayKey): string => `lane-${dayKey}`;

const toExtentMinutes = (hours?: number): number => {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) {
    return 60;
  }

  return Math.max(30, Math.round(hours * 60));
};

export const mapCommittedEntryToTimeBlock = (entry: TimeRegistrationCommittedEntry): TimeBlock => {
  const dayKey = toDayKey(entry.date);
  const extentMinutes = toExtentMinutes(entry.hours);

  return {
    id: `sap-committed-${entry.sapTimeSheetRecord}`,
    title: entry.note?.trim() || entry.wbsElement || `SAP time entry ${entry.sapTimeSheetRecord}`,
    source: 'external-api',
    state: 'committed',
    extentMinutes,
    metadata: {
      sapTimeSheetRecord: entry.sapTimeSheetRecord,
      timeSheetRecord: entry.sapTimeSheetRecord,
      userExternalId: entry.userExternalId,
      companyCode: entry.companyCode,
      timeSheetDate: entry.date,
      recordedHours: entry.hours,
      recordedQuantity: entry.quantity,
      wbsElement: entry.wbsElement,
      internalOrder: entry.internalOrder,
      activityType: entry.activityType,
      workItem: entry.workItem,
      billingControlCategory: entry.billingControlCategory,
      taskType: entry.taskType,
      taskLevel: entry.taskLevel,
      taskComponent: entry.taskComponent,
      description: entry.note,
      hoursUnitOfMeasure: entry.hoursUnitOfMeasure,
      workLocationCode: entry.workLocationCode,
      overtimeCategory: entry.overtimeCategory,
      timeSheetStatus: entry.status,
      timeSheetPredecessorRecord: entry.predecessorRecord,
      committedPlacement: {
        laneId: toLaneId(dayKey),
        startTime: '08:00',
        extentMinutes
      }
    }
  };
};

export const mapCommittedEntriesToTimeBlocks = (entries: TimeRegistrationCommittedEntry[]): TimeBlock[] =>
  entries.map((entry) => mapCommittedEntryToTimeBlock(entry));
