import type {
  TimeRegistrationCommittedEntry,
  TimeRegistrationPeriod,
  TimeRegistrationReadUserContext
} from '../../core/domain/time-registration-committed-entry';

export type WorkforceTimesheetReadDataFields = {
  WBSElement?: string;
  InternalOrder?: string;
  ActivityType?: string;
  WorkItem?: string;
  BillingControlCategory?: string;
  TimeSheetTaskType?: string;
  TimeSheetTaskLevel?: string;
  TimeSheetTaskComponent?: string;
  TimeSheetNote?: string;
  RecordedHours?: number;
  RecordedQuantity?: number;
  HoursUnitOfMeasure?: string;
  TimeSheetWrkLocCode?: string;
  TimeSheetOvertimeCategory?: string;
};

export type WorkforceTimesheetReadEntry = {
  PersonWorkAgreementExternalID?: string;
  CompanyCode?: string;
  TimeSheetRecord?: string;
  TimeSheetDate?: string;
  TimeSheetStatus?: string;
  TimeSheetPredecessorRecord?: string;
  TimeSheetDataFields?: WorkforceTimesheetReadDataFields;
};

type ODataV2Collection<T> = {
  d?: {
    results?: T[];
  };
};

type ODataV4Collection<T> = {
  value?: T[];
};

const CANONICAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const assertCanonicalDate = (value: string, label: string): void => {
  if (!CANONICAL_DATE_PATTERN.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD, got: ${value}`);
  }
};

const escapeODataString = (value: string): string => value.replaceAll("'", "''");

const addDaysUtc = (date: string, days: number): string => {
  const base = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    throw new Error(`Invalid canonical date: ${date}`);
  }

  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const toSapDateTimeOffsetStartOfDay = (date: string): string => `${date}T00:00:00Z`;

export const buildWorkforceTimesheetPeriodFilter = (
  period: TimeRegistrationPeriod,
  userContext: TimeRegistrationReadUserContext
): string => {
  assertCanonicalDate(period.startDate, 'startDate');
  assertCanonicalDate(period.endDate, 'endDate');

  if (period.startDate > period.endDate) {
    throw new Error(`Invalid period: startDate (${period.startDate}) is after endDate (${period.endDate})`);
  }

  const startBoundary = toSapDateTimeOffsetStartOfDay(period.startDate);
  const endExclusiveBoundary = toSapDateTimeOffsetStartOfDay(addDaysUtc(period.endDate, 1));

  return [
    `PersonWorkAgreementExternalID eq '${escapeODataString(userContext.userExternalId)}'`,
    `CompanyCode eq '${escapeODataString(userContext.companyCode)}'`,
    `TimeSheetDate ge datetimeoffset'${startBoundary}'`,
    `TimeSheetDate lt datetimeoffset'${endExclusiveBoundary}'`
  ].join(' and ');
};

export const parseSapTimeSheetDateToCanonicalDate = (value: string): string | undefined => {
  if (CANONICAL_DATE_PATTERN.test(value)) {
    return value;
  }

  const microsoftDateMatch = /^\/Date\((\d+)(?:[+-]\d+)?\)\/$/.exec(value);
  if (microsoftDateMatch) {
    const milliseconds = Number(microsoftDateMatch[1]);
    if (!Number.isFinite(milliseconds)) {
      return undefined;
    }
    return new Date(milliseconds).toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
};

const parseReadEntry = (candidate: unknown): WorkforceTimesheetReadEntry | undefined => {
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const asRecord = candidate as Record<string, unknown>;
  const dataFieldsCandidate = asRecord.TimeSheetDataFields;

  const dataFieldsRecord =
    dataFieldsCandidate && typeof dataFieldsCandidate === 'object' ? (dataFieldsCandidate as Record<string, unknown>) : undefined;

  const dataFields: WorkforceTimesheetReadDataFields | undefined =
    dataFieldsRecord
      ? {
          WBSElement: typeof dataFieldsRecord.WBSElement === 'string' ? dataFieldsRecord.WBSElement : undefined,
          InternalOrder: typeof dataFieldsRecord.InternalOrder === 'string' ? dataFieldsRecord.InternalOrder : undefined,
          ActivityType: typeof dataFieldsRecord.ActivityType === 'string' ? dataFieldsRecord.ActivityType : undefined,
          WorkItem: typeof dataFieldsRecord.WorkItem === 'string' ? dataFieldsRecord.WorkItem : undefined,
          BillingControlCategory:
            typeof dataFieldsRecord.BillingControlCategory === 'string' ? dataFieldsRecord.BillingControlCategory : undefined,
          TimeSheetTaskType: typeof dataFieldsRecord.TimeSheetTaskType === 'string' ? dataFieldsRecord.TimeSheetTaskType : undefined,
          TimeSheetTaskLevel: typeof dataFieldsRecord.TimeSheetTaskLevel === 'string' ? dataFieldsRecord.TimeSheetTaskLevel : undefined,
          TimeSheetTaskComponent:
            typeof dataFieldsRecord.TimeSheetTaskComponent === 'string' ? dataFieldsRecord.TimeSheetTaskComponent : undefined,
          TimeSheetNote: typeof dataFieldsRecord.TimeSheetNote === 'string' ? dataFieldsRecord.TimeSheetNote : undefined,
          RecordedHours: typeof dataFieldsRecord.RecordedHours === 'number' ? dataFieldsRecord.RecordedHours : undefined,
          RecordedQuantity: typeof dataFieldsRecord.RecordedQuantity === 'number' ? dataFieldsRecord.RecordedQuantity : undefined,
          HoursUnitOfMeasure:
            typeof dataFieldsRecord.HoursUnitOfMeasure === 'string' ? dataFieldsRecord.HoursUnitOfMeasure : undefined,
          TimeSheetWrkLocCode:
            typeof dataFieldsRecord.TimeSheetWrkLocCode === 'string' ? dataFieldsRecord.TimeSheetWrkLocCode : undefined,
          TimeSheetOvertimeCategory:
            typeof dataFieldsRecord.TimeSheetOvertimeCategory === 'string' ? dataFieldsRecord.TimeSheetOvertimeCategory : undefined
        }
      : undefined;

  return {
    PersonWorkAgreementExternalID:
      typeof asRecord.PersonWorkAgreementExternalID === 'string' ? asRecord.PersonWorkAgreementExternalID : undefined,
    CompanyCode: typeof asRecord.CompanyCode === 'string' ? asRecord.CompanyCode : undefined,
    TimeSheetRecord: typeof asRecord.TimeSheetRecord === 'string' ? asRecord.TimeSheetRecord : undefined,
    TimeSheetDate: typeof asRecord.TimeSheetDate === 'string' ? asRecord.TimeSheetDate : undefined,
    TimeSheetStatus: typeof asRecord.TimeSheetStatus === 'string' ? asRecord.TimeSheetStatus : undefined,
    TimeSheetPredecessorRecord:
      typeof asRecord.TimeSheetPredecessorRecord === 'string' ? asRecord.TimeSheetPredecessorRecord : undefined,
    TimeSheetDataFields: dataFields
  };
};

export const parseWorkforceTimesheetReadResponse = (responseBody: unknown): WorkforceTimesheetReadEntry[] => {
  const body = responseBody as ODataV2Collection<unknown> & ODataV4Collection<unknown>;
  const rawEntries = Array.isArray(body?.value)
    ? body.value
    : Array.isArray(body?.d?.results)
      ? body.d.results
      : [];

  return rawEntries.map((entry) => parseReadEntry(entry)).filter((entry): entry is WorkforceTimesheetReadEntry => Boolean(entry));
};

export const mapSAPTimesheetEntryToCommittedEntry = (
  entry: WorkforceTimesheetReadEntry
): TimeRegistrationCommittedEntry | undefined => {
  const sapTimeSheetRecord = entry.TimeSheetRecord;
  const userExternalId = entry.PersonWorkAgreementExternalID;
  const companyCode = entry.CompanyCode;
  const date = entry.TimeSheetDate ? parseSapTimeSheetDateToCanonicalDate(entry.TimeSheetDate) : undefined;

  if (!sapTimeSheetRecord || !userExternalId || !companyCode || !date) {
    return undefined;
  }

  return {
    sapTimeSheetRecord,
    userExternalId,
    companyCode,
    date,
    hours: entry.TimeSheetDataFields?.RecordedHours,
    quantity: entry.TimeSheetDataFields?.RecordedQuantity,
    wbsElement: entry.TimeSheetDataFields?.WBSElement,
    internalOrder: entry.TimeSheetDataFields?.InternalOrder,
    activityType: entry.TimeSheetDataFields?.ActivityType,
    workItem: entry.TimeSheetDataFields?.WorkItem,
    billingControlCategory: entry.TimeSheetDataFields?.BillingControlCategory,
    taskType: entry.TimeSheetDataFields?.TimeSheetTaskType,
    taskLevel: entry.TimeSheetDataFields?.TimeSheetTaskLevel,
    taskComponent: entry.TimeSheetDataFields?.TimeSheetTaskComponent,
    note: entry.TimeSheetDataFields?.TimeSheetNote,
    hoursUnitOfMeasure: entry.TimeSheetDataFields?.HoursUnitOfMeasure,
    workLocationCode: entry.TimeSheetDataFields?.TimeSheetWrkLocCode,
    overtimeCategory: entry.TimeSheetDataFields?.TimeSheetOvertimeCategory,
    status: entry.TimeSheetStatus,
    predecessorRecord: entry.TimeSheetPredecessorRecord
  };
};

export const mapSAPResponseToCommittedEntries = (responseBody: unknown): TimeRegistrationCommittedEntry[] =>
  parseWorkforceTimesheetReadResponse(responseBody)
    .map((entry) => mapSAPTimesheetEntryToCommittedEntry(entry))
    .filter((entry): entry is TimeRegistrationCommittedEntry => Boolean(entry));

export type WorkforceTimesheetReadServiceDependencies = {
  baseUrl: string;
  entitySetPath?: string;
  fetchImpl?: typeof fetch;
};

export const readWorkforceTimesheetEntriesForPeriod = async (
  period: TimeRegistrationPeriod,
  userContext: TimeRegistrationReadUserContext,
  dependencies: WorkforceTimesheetReadServiceDependencies
): Promise<TimeRegistrationCommittedEntry[]> => {
  const filter = buildWorkforceTimesheetPeriodFilter(period, userContext);
  const baseUrl = dependencies.baseUrl.replace(/\/$/, '');
  const entitySetPath = dependencies.entitySetPath ?? 'A_WorkforceTimeSheetEntry';
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  const requestUrl = `${baseUrl}/${entitySetPath}?$filter=${encodeURIComponent(filter)}`;
  const response = await fetchImpl(requestUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Workforce Timesheet read failed (${response.status})`);
  }

  const responseBody = (await response.json()) as unknown;
  return mapSAPResponseToCommittedEntries(responseBody);
};
