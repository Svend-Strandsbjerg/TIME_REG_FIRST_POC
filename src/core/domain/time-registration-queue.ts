import type { DayKey, QueueOperation, QueueRoutingHints, TimeBlock, TimeRegistrationQueuePayload, TimeOfDay } from './board-types';
import { deriveEndTime } from './time-slot';

const formatInterval = (startTime: TimeOfDay, endTime: TimeOfDay): string => `${startTime} - ${endTime}`;

export const buildTimeRegistrationQueuePayload = (
  block: TimeBlock,
  placement: { dayKey: DayKey; startTime: TimeOfDay }
): TimeRegistrationQueuePayload => {
  const endTime = deriveEndTime(placement.startTime, block.extentMinutes);

  return {
    blockId: block.id,
    title: block.title,
    dayKey: placement.dayKey,
    startTime: placement.startTime,
    endTime,
    interval: formatInterval(placement.startTime, endTime),
    extentMinutes: block.extentMinutes,
    source: block.source
  };
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
  idempotencyKey: `${queueId}:${payload.blockId}:${payload.dayKey}:${payload.startTime}:${operation}`
});
