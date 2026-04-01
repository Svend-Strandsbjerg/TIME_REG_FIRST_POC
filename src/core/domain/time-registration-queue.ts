import type { DayKey, QueueOperation, QueueRoutingHints, TimeBlock, TimeRegistrationQueuePayload, TimeOfDay } from './board-types';
import type { TimeRegistrationUserContext } from './time-registration-payload';
import { mapBlockToTimeRegistrationPayload } from './time-registration-payload';
import { deriveEndTime } from './time-slot';

export const createDefaultTimeRegistrationUserContext = (): TimeRegistrationUserContext => ({
  userExternalId: 'demo.worker',
  companyCode: '1010',
  weekStartDate: '2026-03-30',
  releaseOnSave: false,
  testRun: true
});

export const buildTimeRegistrationQueuePayload = (
  block: TimeBlock,
  placement: { dayKey: DayKey; startTime: TimeOfDay },
  operation: QueueOperation,
  userContext: TimeRegistrationUserContext = createDefaultTimeRegistrationUserContext()
): TimeRegistrationQueuePayload => {
  const endTime = deriveEndTime(placement.startTime, block.extentMinutes);

  return mapBlockToTimeRegistrationPayload(
    block,
    { dayKey: placement.dayKey, startTime: placement.startTime, endTime },
    { action: operation, userContext }
  );
};

export const buildQueueRoutingHints = (
  queueId: string,
  payload: TimeRegistrationQueuePayload,
  operation: QueueOperation
): QueueRoutingHints => ({
  payloadType: 'time-registration-entry',
  adapterKey: 'sap-time-entry',
  targetSystem: 'sap',
  operation,
  idempotencyKey: `${queueId}:${payload.blockId}:${payload.date}:${payload.startTime}:${operation}`
});
