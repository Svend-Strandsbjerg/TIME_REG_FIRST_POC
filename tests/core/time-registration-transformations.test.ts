import { describe, expect, it } from 'vitest';
import type { TimeBlock } from '../../src/core/domain/board-types';
import { buildTimeRegistrationQueuePayload } from '../../src/core/domain/time-registration-queue';
import {
  DEFAULT_TIME_REGISTRATION_TASK_COMPONENT,
  mapBlockToTimeRegistrationPayload
} from '../../src/core/domain/time-registration-payload';
import { mapTimeRegistrationPayloadToWorkforceTimesheetRequest } from '../../src/integration/sap/sap-time-entry-mapper';

const block: TimeBlock = {
  id: 'block-1',
  title: 'Feature implementation',
  extentMinutes: 90,
  source: 'mock-api',
  state: 'uncommitted',
  metadata: {
    pspElement: 'PSP-1001',
    description: 'Implement API transformation',
    internalOrder: 'ORD-55',
    activityType: 'DEV',
    workItem: 'WI-123',
    billingControlCategory: 'B1',
    taskType: 'TASK',
    taskLevel: 'L2',
    taskComponent: 'COMP-7',
    quantity: 2,
    hoursUnitOfMeasure: 'H',
    workLocationCode: 'REMOTE',
    overtimeCategory: 'OT1',
    sapTimeSheetRecord: 'TSR-9001'
  }
};

describe('time registration transformations', () => {
  it('maps block + placement + user context into TimeRegistrationPayload', () => {
    const payload = mapBlockToTimeRegistrationPayload(
      block,
      { dayKey: 'wednesday', startTime: '09:00', endTime: '10:30' },
      {
        action: 'create',
        userContext: {
          userExternalId: 'person-77',
          companyCode: '1710',
          weekStartDate: '2026-03-30',
          releaseOnSave: true,
          testRun: false
        }
      }
    );

    expect(payload).toMatchObject({
      userExternalId: 'person-77',
      companyCode: '1710',
      date: '2026-04-01',
      action: 'create',
      hours: 1.5,
      wbsElement: 'PSP-1001',
      taskType: 'TASK',
      taskComponent: 'COMP-7',
      note: 'Implement API transformation',
      sapTimeSheetRecord: 'TSR-9001',
      startTime: '09:00',
      endTime: '10:30'
    });
    expect(typeof payload.date).toBe('string');
    expect(typeof payload.userExternalId).toBe('string');
    expect(typeof payload.hours).toBe('number');
  });

  it('builds queue payload from block and preserves block-originated fields', () => {
    const payload = buildTimeRegistrationQueuePayload(
      block,
      { dayKey: 'monday', startTime: '08:00' },
      'update',
      {
        userExternalId: 'person-77',
        companyCode: '1710',
        weekStartDate: '2026-03-30',
        releaseOnSave: true,
        testRun: false
      }
    );

    expect(payload.action).toBe('update');
    expect(payload.wbsElement).toBe('PSP-1001');
    expect(payload.note).toBe('Implement API transformation');
    expect(payload.sapTimeSheetRecord).toBe('TSR-9001');
    expect(payload.taskType).toBe('TASK');
    expect(payload.taskComponent).toBe('COMP-7');
    expect(payload.activityType).toBe('DEV');
    expect(payload.billingControlCategory).toBe('B1');
    expect(payload.overtimeCategory).toBe('OT1');
    expect(payload.internalOrder).toBe('ORD-55');
    expect(payload.endTime).toBe('09:30');
  });

  it('defaults taskComponent to a visible POC value when block metadata does not provide type', () => {
    const payload = mapBlockToTimeRegistrationPayload(
      { ...block, metadata: { pspElement: 'PSP-1001' } },
      { dayKey: 'monday', startTime: '09:00', endTime: '10:30' },
      {
        action: 'create',
        userContext: {
          userExternalId: 'person-77',
          companyCode: '1710',
          weekStartDate: '2026-03-30'
        }
      }
    );

    expect(payload.taskComponent).toBe(DEFAULT_TIME_REGISTRATION_TASK_COMPONENT);
  });

  it('prefers metadata.note over description for payload note', () => {
    const payload = mapBlockToTimeRegistrationPayload(
      {
        ...block,
        metadata: {
          ...block.metadata,
          description: 'Description fallback',
          note: 'Planner note'
        }
      },
      { dayKey: 'monday', startTime: '09:00', endTime: '10:30' },
      {
        action: 'create',
        userContext: {
          userExternalId: 'person-77',
          companyCode: '1710',
          weekStartDate: '2026-03-30'
        }
      }
    );

    expect(payload.note).toBe('Planner note');
  });

  it('maps payload into WorkforceTimesheetRequest with operation mapping', () => {
    const createRequest = mapTimeRegistrationPayloadToWorkforceTimesheetRequest({
      userExternalId: 'person-77',
      companyCode: '1710',
      date: '2026-03-30',
      action: 'create',
      hours: 8,
      wbsElement: 'PSP-2003',
      taskType: 'WORK',
      taskComponent: 'NORMAL',
      activityType: 'DEV',
      billingControlCategory: 'B1',
      overtimeCategory: 'OT1',
      note: 'Customer workshop',
      blockId: 'block-2',
      title: 'Workshop',
      startTime: '08:00',
      endTime: '16:00',
      source: 'external-api'
    });

    expect(createRequest.TimeSheetOperation).toBe('C');
    expect(createRequest.TimeSheetDataFields.RecordedHours).toBe(8);
    expect(createRequest.TimeSheetDataFields.TimeSheetTaskType).toBe('WORK');
    expect(createRequest.TimeSheetDataFields.TimeSheetTaskComponent).toBe('NORMAL');
    expect(createRequest.TimeSheetDataFields.ActivityType).toBe('DEV');
    expect(createRequest.TimeSheetDataFields.BillingControlCategory).toBe('B1');
    expect(createRequest.TimeSheetDataFields.TimeSheetOvertimeCategory).toBe('OT1');
    expect(createRequest.TimeSheetDataFields.WBSElement).toBe('PSP-2003');

    const updateRequest = mapTimeRegistrationPayloadToWorkforceTimesheetRequest({
      userExternalId: 'person-77',
      companyCode: '1710',
      date: '2026-03-30',
      action: 'update',
      sapTimeSheetRecord: 'TSR-42',
      blockId: 'block-2',
      title: 'Workshop',
      startTime: '08:00',
      endTime: '16:00',
      source: 'external-api'
    });

    expect(updateRequest.TimeSheetOperation).toBe('U');
    expect(updateRequest.TimeSheetRecord).toBe('TSR-42');

    const deleteRequest = mapTimeRegistrationPayloadToWorkforceTimesheetRequest({
      userExternalId: 'person-77',
      companyCode: '1710',
      date: '2026-03-30',
      action: 'delete',
      sapTimeSheetRecord: 'TSR-43',
      blockId: 'block-3',
      title: 'Old entry',
      startTime: '08:00',
      endTime: '09:00',
      source: 'external-api'
    });

    expect(deleteRequest.TimeSheetOperation).toBe('D');
    expect(deleteRequest.TimeSheetRecord).toBe('TSR-43');
  });
});
