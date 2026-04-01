import { describe, expect, it, vi } from 'vitest';
import type { CommitRecord } from '../../src/core/application/commit-preview';
import {
  prepareCommitRecordForSubmission,
  validateCommitRecordForSubmission
} from '../../src/core/application/commit-submission';
import { simulateCommitRecordSend } from '../../src/core/application/commit-send-simulation';

const buildValidRecord = (overrides?: Partial<CommitRecord['entries'][number]>): CommitRecord => ({
  queueId: 'queue-1',
  entries: [
    {
      PersonWorkAgreementExternalID: 'worker-1',
      CompanyCode: '1010',
      TimeSheetRecord: '4711',
      TimeSheetDate: '2026-03-31',
      TimeSheetOperation: 'U',
      TimeSheetDataFields: {
        TimeSheetTaskComponent: 'NORMAL',
        RecordedHours: 2,
        WBSElement: 'WBS-1'
      },
      ...overrides
    }
  ]
});

describe('validateCommitRecordForSubmission', () => {
  it('passes a valid commit record', () => {
    const result = validateCommitRecordForSubmission(buildValidRecord({ TimeSheetOperation: 'C', TimeSheetRecord: undefined }));

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails when userExternalId is missing', () => {
    const result = validateCommitRecordForSubmission(buildValidRecord({ PersonWorkAgreementExternalID: '' }));
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'MISSING_USER_EXTERNAL_ID')).toBe(true);
  });

  it('fails when companyCode is missing', () => {
    const result = validateCommitRecordForSubmission(buildValidRecord({ CompanyCode: '' }));
    expect(result.issues.some((issue) => issue.code === 'MISSING_COMPANY_CODE')).toBe(true);
  });

  it('fails when date is missing or not canonical', () => {
    const missingDate = validateCommitRecordForSubmission(buildValidRecord({ TimeSheetDate: '' }));
    const invalidDate = validateCommitRecordForSubmission(buildValidRecord({ TimeSheetDate: '03-31-2026' }));

    expect(missingDate.issues.some((issue) => issue.code === 'MISSING_DATE')).toBe(true);
    expect(invalidDate.issues.some((issue) => issue.code === 'INVALID_DATE_FORMAT')).toBe(true);
  });

  it('fails when taskComponent is missing', () => {
    const result = validateCommitRecordForSubmission(
      buildValidRecord({
        TimeSheetDataFields: {
          RecordedHours: 2,
          WBSElement: 'WBS-1'
        }
      })
    );
    expect(result.issues.some((issue) => issue.code === 'MISSING_TASK_COMPONENT')).toBe(true);
  });

  it('fails when create/update has no accounting target', () => {
    const result = validateCommitRecordForSubmission(
      buildValidRecord({
        TimeSheetOperation: 'C',
        TimeSheetRecord: undefined,
        TimeSheetDataFields: {
          TimeSheetTaskComponent: 'NORMAL',
          RecordedHours: 2
        }
      })
    );
    expect(result.issues.some((issue) => issue.code === 'MISSING_ACCOUNTING_TARGET')).toBe(true);
  });

  it('fails update/delete without sapTimeSheetRecord', () => {
    const updateResult = validateCommitRecordForSubmission(buildValidRecord({ TimeSheetOperation: 'U', TimeSheetRecord: '' }));
    const deleteResult = validateCommitRecordForSubmission(
      buildValidRecord({
        TimeSheetOperation: 'D',
        TimeSheetRecord: undefined,
        TimeSheetDataFields: { TimeSheetTaskComponent: 'NORMAL', WBSElement: 'WBS-1' }
      })
    );

    expect(updateResult.issues.some((issue) => issue.code === 'MISSING_SAP_TIMESHEET_RECORD')).toBe(true);
    expect(deleteResult.issues.some((issue) => issue.code === 'MISSING_SAP_TIMESHEET_RECORD')).toBe(true);
  });

  it('fails create/update when hours are not positive', () => {
    const zeroHours = validateCommitRecordForSubmission(
      buildValidRecord({
        TimeSheetOperation: 'C',
        TimeSheetRecord: undefined,
        TimeSheetDataFields: { TimeSheetTaskComponent: 'NORMAL', RecordedHours: 0, WBSElement: 'WBS-1' }
      })
    );
    const negativeHours = validateCommitRecordForSubmission(
      buildValidRecord({
        TimeSheetOperation: 'U',
        TimeSheetDataFields: { TimeSheetTaskComponent: 'NORMAL', RecordedHours: -2, WBSElement: 'WBS-1' }
      })
    );

    expect(zeroHours.issues.some((issue) => issue.code === 'INVALID_HOURS')).toBe(true);
    expect(negativeHours.issues.some((issue) => issue.code === 'INVALID_HOURS')).toBe(true);
  });
});

describe('prepareCommitRecordForSubmission', () => {
  it('returns explicit validation errors for invalid records', () => {
    const result = prepareCommitRecordForSubmission(buildValidRecord({ PersonWorkAgreementExternalID: '' }));

    expect(result.isReadyToSend).toBe(false);
    expect(result.validation.isValid).toBe(false);
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  it('reuses the exact preview entries for submission', () => {
    const record = buildValidRecord({ TimeSheetOperation: 'C', TimeSheetRecord: undefined });
    const result = prepareCommitRecordForSubmission(record);

    expect(result.isReadyToSend).toBe(true);
    expect(result.submission?.entries).toBe(record.entries);
  });
});

describe('simulateCommitRecordSend', () => {
  it('does not execute simulated send for invalid records', async () => {
    const sender = vi.fn().mockResolvedValue(undefined);

    const result = await simulateCommitRecordSend(buildValidRecord({ PersonWorkAgreementExternalID: '' }), {}, sender);

    expect(result.kind).toBe('validation-error');
    expect(sender).not.toHaveBeenCalled();
  });
});
