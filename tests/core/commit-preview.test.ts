import { describe, expect, it } from 'vitest';
import type { QueueItem } from '../../src/core/domain/board-types';
import { mapQueueToCommitRecords } from '../../src/core/application/commit-preview';

const buildQueueItem = (id: string, queueId: string, operation: QueueItem['operation']): QueueItem => ({
  id,
  queueId,
  operation,
  payload: {
    userExternalId: 'worker-1',
    companyCode: '1010',
    date: '2026-03-31',
    action: operation,
    hours: 2,
    taskType: 'TASK',
    taskComponent: 'NORMAL',
    activityType: 'DEV',
    billingControlCategory: 'B1',
    overtimeCategory: 'OT1',
    wbsElement: 'PSP-9009',
    internalOrder: 'ORD-123',
    note: 'From queue payload',
    blockId: `block-${id}`,
    title: `Entry ${id}`,
    startTime: '08:00',
    endTime: '10:00',
    source: 'mock-api'
  },
  metadata: {
    reason: 'test'
  },
  routing: {
    payloadType: 'time-registration-entry',
    adapterKey: 'sap-time-entry',
    targetSystem: 'sap',
    operation,
    idempotencyKey: `${queueId}:${id}`
  }
});

describe('mapQueueToCommitRecords', () => {
  it('groups queue items by queueId', () => {
    const records = mapQueueToCommitRecords([
      buildQueueItem('1', 'queue-a', 'create'),
      buildQueueItem('2', 'queue-b', 'update'),
      buildQueueItem('3', 'queue-a', 'delete')
    ]);

    expect(records).toHaveLength(2);
    expect(records.find((record) => record.queueId === 'queue-a')?.entries).toHaveLength(2);
    expect(records.find((record) => record.queueId === 'queue-b')?.entries).toHaveLength(1);
  });

  it('maps queue payloads into WorkforceTimesheetRequest entries', () => {
    const [record] = mapQueueToCommitRecords([buildQueueItem('1', 'queue-a', 'create')]);

    expect(record.entries[0]).toMatchObject({
      PersonWorkAgreementExternalID: 'worker-1',
      CompanyCode: '1010',
      TimeSheetDate: '2026-03-31',
      TimeSheetOperation: 'C',
      TimeSheetDataFields: {
        TimeSheetTaskType: 'TASK',
        TimeSheetTaskComponent: 'NORMAL',
        ActivityType: 'DEV',
        BillingControlCategory: 'B1',
        TimeSheetOvertimeCategory: 'OT1',
        WBSElement: 'PSP-9009',
        InternalOrder: 'ORD-123',
        TimeSheetNote: 'From queue payload'
      }
    });
  });
});
