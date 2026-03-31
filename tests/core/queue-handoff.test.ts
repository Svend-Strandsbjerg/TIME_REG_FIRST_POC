import { describe, expect, it } from 'vitest';
import { toQueueReadyEntries } from '../../src/integration/async/queue-handoff';
import type { TimeEntryDraft } from '../../src/core/domain/board-types';

describe('queue handoff', () => {
  it('creates solution-specific payloads with explicit routing hints', () => {
    const drafts: TimeEntryDraft[] = [
      {
        technicalDraftId: 'draft-1',
        blockId: 'block-1',
        laneId: 'lane-monday',
        dayKey: 'monday',
        startTime: '08:30',
        title: 'Customer workshop',
        extentMinutes: 90
      }
    ];

    const entries = toQueueReadyEntries(drafts, 'queue-preview-1');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      queueContextId: 'queue-preview-1',
      operation: 'create',
      payload: {
        blockId: 'block-1',
        title: 'Customer workshop',
        dayKey: 'monday',
        startTime: '08:30',
        endTime: '10:00',
        interval: '08:30 - 10:00',
        extentMinutes: 90
      },
      routing: {
        payloadType: 'time-registration-entry',
        adapterKey: 'sap-time-entry',
        targetSystem: 'sap',
        operation: 'create'
      }
    });
  });
});
