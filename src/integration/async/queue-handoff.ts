import type { QueueOperation, TimeEntryDraft, TimeRegistrationQueuePayload } from '../../core/domain/board-types';
import { buildQueueRoutingHints, createDefaultTimeRegistrationUserContext } from '../../core/domain/time-registration-queue';
import type { TimeRegistrationUserContext } from '../../core/domain/time-registration-payload';
import { deriveEndTime } from '../../core/domain/time-slot';

export type QueueReadyTimeEntry = {
  queueContextId: string;
  sequence: number;
  operation: QueueOperation;
  payload: TimeRegistrationQueuePayload;
  metadata: {
    source: 'planning-board';
  };
  routing: ReturnType<typeof buildQueueRoutingHints>;
};

const toTimeRegistrationPayload = (
  draft: TimeEntryDraft,
  operation: QueueOperation,
  userContext: TimeRegistrationUserContext
): TimeRegistrationQueuePayload => {
  const endTime = deriveEndTime(draft.startTime, draft.extentMinutes);
  const dayOffset: Record<TimeEntryDraft['dayKey'], number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6
  };

  const baseDate = new Date(`${userContext.weekStartDate}T00:00:00Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset[draft.dayKey]);

  return {
    userExternalId: userContext.userExternalId,
    companyCode: userContext.companyCode,
    date: baseDate.toISOString().slice(0, 10),
    action: operation,
    hours: draft.extentMinutes / 60,
    note: draft.title,
    releaseOnSave: userContext.releaseOnSave,
    testRun: userContext.testRun,
    blockId: draft.blockId,
    title: draft.title,
    startTime: draft.startTime,
    endTime,
    source: 'mock-api'
  };
};

export const toQueueReadyEntries = (
  drafts: TimeEntryDraft[],
  queueContextId: string,
  userContext: TimeRegistrationUserContext = createDefaultTimeRegistrationUserContext()
): QueueReadyTimeEntry[] =>
  drafts.map((draft, index) => {
    const operation: QueueOperation = 'create';
    const payload = toTimeRegistrationPayload(draft, operation, userContext);
    return {
      queueContextId,
      sequence: index + 1,
      operation,
      payload,
      metadata: {
        source: 'planning-board'
      },
      routing: buildQueueRoutingHints(queueContextId, payload, operation)
    };
  });

// TODO: hand off QueueReadyTimeEntry[] into ASYNC_INTEGRATION_FOUNDATION queue contracts.
