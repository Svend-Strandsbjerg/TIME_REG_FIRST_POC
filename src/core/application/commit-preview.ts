import type { QueueItem } from '../domain/board-types';
import { mapTimeRegistrationPayloadToWorkforceTimesheetRequest, type WorkforceTimesheetRequest } from '../../integration/sap/sap-time-entry-mapper';

export type CommitRecord = {
  queueId: string;
  entries: WorkforceTimesheetRequest[];
};

export const mapQueueToCommitRecords = (queueItems: QueueItem[]): CommitRecord[] => {
  const grouped = new Map<string, WorkforceTimesheetRequest[]>();

  for (const item of queueItems) {
    const entries = grouped.get(item.queueId) ?? [];
    entries.push(mapTimeRegistrationPayloadToWorkforceTimesheetRequest(item.payload));
    grouped.set(item.queueId, entries);
  }

  return Array.from(grouped.entries()).map(([queueId, entries]) => ({
    queueId,
    entries
  }));
};

export const formatCommitRecordEntries = (record: CommitRecord): string => JSON.stringify(record.entries, null, 2);
