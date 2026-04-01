import type { CommitRecord } from './commit-preview';
import type { WorkforceTimesheetRequest } from '../../integration/sap/sap-time-entry-mapper';

export type ValidationIssue = {
  code: string;
  message: string;
};

export type CommitRecordValidationResult = {
  queueId: string;
  isValid: boolean;
  issues: ValidationIssue[];
};

export type PreparedCommitRecordSubmission = {
  queueId: string;
  entries: WorkforceTimesheetRequest[];
};

export type PrepareCommitRecordForSubmissionResult = {
  queueId: string;
  isReadyToSend: boolean;
  validation: CommitRecordValidationResult;
  submission?: PreparedCommitRecordSubmission;
};

const isNonEmpty = (value: string | undefined): boolean => typeof value === 'string' && value.trim().length > 0;

const isCanonicalDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const validateEntry = (entry: WorkforceTimesheetRequest, index: number): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const entryRef = `entry[${index}]`;

  if (!isNonEmpty(entry.PersonWorkAgreementExternalID)) {
    issues.push({
      code: 'MISSING_USER_EXTERNAL_ID',
      message: `${entryRef}: userExternalId is required (PersonWorkAgreementExternalID).`
    });
  }

  if (!isNonEmpty(entry.CompanyCode)) {
    issues.push({
      code: 'MISSING_COMPANY_CODE',
      message: `${entryRef}: companyCode is required (CompanyCode).`
    });
  }

  if (!isNonEmpty(entry.TimeSheetDate)) {
    issues.push({
      code: 'MISSING_DATE',
      message: `${entryRef}: date is required (TimeSheetDate).`
    });
  } else if (!isCanonicalDate(entry.TimeSheetDate)) {
    issues.push({
      code: 'INVALID_DATE_FORMAT',
      message: `${entryRef}: date must be canonical YYYY-MM-DD (received ${entry.TimeSheetDate}).`
    });
  }

  if (!['C', 'U', 'D'].includes(entry.TimeSheetOperation)) {
    issues.push({
      code: 'INVALID_ACTION',
      message: `${entryRef}: action must map to create/update/delete (C/U/D).`
    });
  }

  if (!entry.TimeSheetDataFields || typeof entry.TimeSheetDataFields !== 'object') {
    issues.push({
      code: 'MISSING_DATA_FIELDS',
      message: `${entryRef}: SAP request payload is incomplete (missing TimeSheetDataFields).`
    });
    return issues;
  }

  if (!isNonEmpty(entry.TimeSheetDataFields.TimeSheetTaskComponent)) {
    issues.push({
      code: 'MISSING_TASK_COMPONENT',
      message: `${entryRef}: taskComponent is required (TimeSheetTaskComponent).`
    });
  }

  const requiresHours = entry.TimeSheetOperation === 'C' || entry.TimeSheetOperation === 'U';
  if (requiresHours) {
    const hours = entry.TimeSheetDataFields.RecordedHours;
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) {
      issues.push({
        code: 'INVALID_HOURS',
        message: `${entryRef}: create/update requires hours > 0 (RecordedHours).`
      });
    }
  }

  const requiresAccountingTarget = entry.TimeSheetOperation === 'C' || entry.TimeSheetOperation === 'U';
  if (requiresAccountingTarget) {
    const hasWbs = isNonEmpty(entry.TimeSheetDataFields.WBSElement);
    const hasInternalOrder = isNonEmpty(entry.TimeSheetDataFields.InternalOrder);

    // Scenario-specific POC assumption: currently one accounting target is mandatory
    // for create/update and either WBSElement or InternalOrder is accepted.
    if (!hasWbs && !hasInternalOrder) {
      issues.push({
        code: 'MISSING_ACCOUNTING_TARGET',
        message: `${entryRef}: create/update requires at least one accounting target (WBSElement or InternalOrder).`
      });
    }
  }

  const requiresExistingRecord = entry.TimeSheetOperation === 'U' || entry.TimeSheetOperation === 'D';
  if (requiresExistingRecord && !isNonEmpty(entry.TimeSheetRecord)) {
    issues.push({
      code: 'MISSING_SAP_TIMESHEET_RECORD',
      message: `${entryRef}: update/delete requires sapTimeSheetRecord (TimeSheetRecord).`
    });
  }

  return issues;
};

export const validateCommitRecordForSubmission = (record: CommitRecord): CommitRecordValidationResult => {
  const issues = record.entries.flatMap((entry, index) => validateEntry(entry, index));

  return {
    queueId: record.queueId,
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Final outbound gate in the POC before future real SAP POST integration.
 *
 * Validation responsibilities are split intentionally:
 * - Payload-level requirements are validated on their mapped SAP equivalents.
 * - SAP request-level structural completeness is validated on WorkforceTimesheetRequest.
 */
export const prepareCommitRecordForSubmission = (
  record: CommitRecord
): PrepareCommitRecordForSubmissionResult => {
  const validation = validateCommitRecordForSubmission(record);

  if (!validation.isValid) {
    return {
      queueId: record.queueId,
      isReadyToSend: false,
      validation
    };
  }

  return {
    queueId: record.queueId,
    isReadyToSend: true,
    validation,
    submission: {
      queueId: record.queueId,
      entries: record.entries
    }
  };
};
