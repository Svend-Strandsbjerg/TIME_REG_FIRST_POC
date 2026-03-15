import type { TimeEntryDraft } from '../../core/domain/board-types';

export type QueueReadyTimeEntry = {
  queueContextId: string;
  sequence: number;
  payload: TimeEntryDraft;
};

export const toQueueReadyEntries = (drafts: TimeEntryDraft[], queueContextId: string): QueueReadyTimeEntry[] =>
  drafts.map((draft, index) => ({
    queueContextId,
    sequence: index + 1,
    payload: draft
  }));

// TODO: hand off QueueReadyTimeEntry[] into ASYNC_INTEGRATION_FOUNDATION queue contracts.
