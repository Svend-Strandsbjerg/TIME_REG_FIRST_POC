import type { TimeEntryDraft } from '../../core/domain/board-types';

export type SapTimeEntryPayload = {
  workDateKey: string;
  activityDescription: string;
  minutes: number;
};

export const toSapTimeEntryPayload = (draft: TimeEntryDraft): SapTimeEntryPayload => ({
  workDateKey: draft.dayKey,
  activityDescription: draft.title,
  minutes: draft.durationMinutes
});

// TODO: extend field mapping once target SAP endpoint contract is finalized.
