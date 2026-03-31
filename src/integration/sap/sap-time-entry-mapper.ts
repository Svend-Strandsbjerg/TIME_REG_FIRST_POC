import type { TimeRegistrationPayload } from '../../core/domain/time-registration-payload';

export type WorkforceTimesheetOperation = 'C' | 'U' | 'D';

export type WorkforceTimesheetDataFields = {
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

export type WorkforceTimesheetRequest = {
  PersonWorkAgreementExternalID: string;
  CompanyCode: string;
  TimeSheetRecord?: string;
  TimeSheetDate: string;
  TimeSheetOperation: WorkforceTimesheetOperation;
  TimeSheetIsReleasedOnSave?: boolean;
  TimeSheetIsExecutedInTestRun?: boolean;
  TimeSheetDataFields: WorkforceTimesheetDataFields;
};

const toOperation = (action: TimeRegistrationPayload['action']): WorkforceTimesheetOperation => {
  if (action === 'create') {
    return 'C';
  }

  if (action === 'update') {
    return 'U';
  }

  return 'D';
};

export const mapTimeRegistrationPayloadToWorkforceTimesheetRequest = (
  payload: TimeRegistrationPayload
): WorkforceTimesheetRequest => ({
  PersonWorkAgreementExternalID: payload.userExternalId,
  CompanyCode: payload.companyCode,
  TimeSheetRecord: payload.sapTimeSheetRecord,
  TimeSheetDate: payload.date,
  TimeSheetOperation: toOperation(payload.action),
  TimeSheetIsReleasedOnSave: payload.releaseOnSave,
  TimeSheetIsExecutedInTestRun: payload.testRun,
  TimeSheetDataFields: {
    WBSElement: payload.wbsElement,
    InternalOrder: payload.internalOrder,
    ActivityType: payload.activityType,
    WorkItem: payload.workItem,
    BillingControlCategory: payload.billingControlCategory,
    TimeSheetTaskType: payload.taskType,
    TimeSheetTaskLevel: payload.taskLevel,
    TimeSheetTaskComponent: payload.taskComponent,
    TimeSheetNote: payload.note,
    RecordedHours: payload.hours,
    RecordedQuantity: payload.quantity,
    HoursUnitOfMeasure: payload.hoursUnitOfMeasure,
    TimeSheetWrkLocCode: payload.workLocationCode,
    TimeSheetOvertimeCategory: payload.overtimeCategory
  }
});
