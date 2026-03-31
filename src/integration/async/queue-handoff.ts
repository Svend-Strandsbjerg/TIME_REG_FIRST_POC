import type { QueueOperation, TimeEntryDraft, TimeRegistrationQueuePayload } from '../../core/domain/board-types';
import { buildQueueRoutingHints } from '../../core/domain/time-registration-queue';
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

const toTimeRegistrationPayload = (draft: TimeEntryDraft): TimeRegistrationQueuePayload => {
  const endTime = deriveEndTime(draft.startTime, draft.extentMinutes);

  return {
    blockId: draft.blockId,
    title: draft.title,
    dayKey: draft.dayKey,
    startTime: draft.startTime,
    endTime,
    interval: `${draft.startTime} - ${endTime}`,
    extentMinutes: draft.extentMinutes,
    source: 'mock-api'
  };
};

export const toQueueReadyEntries = (drafts: TimeEntryDraft[], queueContextId: string): QueueReadyTimeEntry[] =>
  drafts.map((draft, index) => {
    const payload = toTimeRegistrationPayload(draft);
    return {
      queueContextId,
      sequence: index + 1,
      operation: 'create',
      payload,
      metadata: {
        source: 'planning-board'
      },
      routing: buildQueueRoutingHints(queueContextId, payload, 'create')
    };
  });

// TODO: hand off QueueReadyTimeEntry[] into ASYNC_INTEGRATION_FOUNDATION queue contracts.
