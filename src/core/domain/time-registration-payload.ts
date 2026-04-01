import type { DayKey, TimeBlock, TimeOfDay } from './board-types';

export type TimeRegistrationAction = 'create' | 'update' | 'delete';

export type TimeRegistrationPayload = {
  userExternalId: string;
  companyCode: string;
  date: string;
  action: TimeRegistrationAction;
  hours?: number;
  wbsElement?: string;
  note?: string;
  sapTimeSheetRecord?: string;
  internalOrder?: string;
  activityType?: string;
  workItem?: string;
  billingControlCategory?: string;
  taskType?: string;
  taskLevel?: string;
  taskComponent?: string;
  quantity?: number;
  hoursUnitOfMeasure?: string;
  workLocationCode?: string;
  overtimeCategory?: string;
  releaseOnSave?: boolean;
  testRun?: boolean;
  blockId: string;
  title: string;
  startTime: TimeOfDay;
  endTime: TimeOfDay;
  source: TimeBlock['source'];
};

export type TimeRegistrationUserContext = {
  userExternalId: string;
  companyCode: string;
  weekStartDate: string;
  releaseOnSave?: boolean;
  testRun?: boolean;
};

/**
 * POC-default classification for time when no explicit block metadata is provided.
 * Keeps classification visible in the canonical payload instead of leaving SAP
 * payload semantics implicit.
 */
export const DEFAULT_TIME_REGISTRATION_TASK_COMPONENT = 'NORMAL';

const DAY_OFFSET: Record<DayKey, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6
};

const readString = (source: Record<string, unknown> | undefined, key: string): string | undefined => {
  const value = source?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const readNumber = (source: Record<string, unknown> | undefined, key: string): number | undefined => {
  const value = source?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const readBoolean = (source: Record<string, unknown> | undefined, key: string): boolean | undefined => {
  const value = source?.[key];
  return typeof value === 'boolean' ? value : undefined;
};

const addDaysUtc = (isoDate: string, days: number): string => {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid weekStartDate: ${isoDate}`);
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

export const mapBlockToTimeRegistrationPayload = (
  block: TimeBlock,
  placement: { dayKey: DayKey; startTime: TimeOfDay; endTime: TimeOfDay },
  options: { action: TimeRegistrationAction; userContext: TimeRegistrationUserContext }
): TimeRegistrationPayload => {
  const metadata = block.metadata as Record<string, unknown> | undefined;
  const hours = readNumber(metadata, 'recordedHours') ?? block.extentMinutes / 60;

  return {
    userExternalId: options.userContext.userExternalId,
    companyCode: options.userContext.companyCode,
    date: addDaysUtc(options.userContext.weekStartDate, DAY_OFFSET[placement.dayKey]),
    action: options.action,
    hours,
    wbsElement: readString(metadata, 'wbsElement') ?? readString(metadata, 'pspElement'),
    note: readString(metadata, 'description'),
    sapTimeSheetRecord: readString(metadata, 'sapTimeSheetRecord') ?? readString(metadata, 'timeSheetRecord'),
    internalOrder: readString(metadata, 'internalOrder'),
    activityType: readString(metadata, 'activityType'),
    workItem: readString(metadata, 'workItem'),
    billingControlCategory: readString(metadata, 'billingControlCategory'),
    taskType: readString(metadata, 'taskType'),
    taskLevel: readString(metadata, 'taskLevel'),
    taskComponent:
      readString(metadata, 'taskComponent') ??
      readString(metadata, 'timeCategory') ??
      DEFAULT_TIME_REGISTRATION_TASK_COMPONENT,
    quantity: readNumber(metadata, 'quantity'),
    hoursUnitOfMeasure: readString(metadata, 'hoursUnitOfMeasure'),
    workLocationCode: readString(metadata, 'workLocationCode'),
    overtimeCategory: readString(metadata, 'overtimeCategory'),
    releaseOnSave: readBoolean(metadata, 'releaseOnSave') ?? options.userContext.releaseOnSave,
    testRun: readBoolean(metadata, 'testRun') ?? options.userContext.testRun,
    blockId: block.id,
    title: block.title,
    startTime: placement.startTime,
    endTime: placement.endTime,
    source: block.source
  };
};
