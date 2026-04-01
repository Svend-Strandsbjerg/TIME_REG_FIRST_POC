import { describe, expect, it } from 'vitest';
import { toQueueReadyEntries } from '../../src/integration/async/queue-handoff';
import type { QueueItem } from '../../src/core/domain/board-types';

describe('queue handoff', () => {
  const buildQueueItem = (operation: QueueItem['operation']): QueueItem => ({
    id: `item-${operation}`,
    queueId: 'planning-queue',
    operation,
    payload: {
      userExternalId: 'demo.worker',
      companyCode: '1010',
      date: '2026-03-30',
      action: 'create',
      hours: 1.5,
      note: 'Customer workshop',
      releaseOnSave: true,
      testRun: true,
      blockId: 'block-1',
      title: 'Customer workshop',
      startTime: '08:30',
      endTime: '10:00',
      source: 'mock-api'
    },
    metadata: {
      reason: 'test fixture'
    },
    routing: {
      payloadType: 'time-registration-entry',
      adapterKey: 'sap-time-entry',
      targetSystem: 'sap',
      operation: 'create',
      idempotencyKey: `idempotency-${operation}`
    }
  });

  it('keeps create operation unchanged in payload and routing hints', () => {
    const queueItems: QueueItem[] = [buildQueueItem('create')];

    const entries = toQueueReadyEntries(queueItems, 'queue-preview-1');

    expect(entries).toHaveLength(1);
    expect(entries[0].operation).toBe('create');
    expect(entries[0].payload.action).toBe('create');
    expect(entries[0].routing.operation).toBe('create');
  });

  it('preserves update and delete operations end-to-end', () => {
    const queueItems: QueueItem[] = [buildQueueItem('update'), buildQueueItem('delete')];

    const entries = toQueueReadyEntries(queueItems, 'queue-preview-1');

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.sequence)).toEqual([1, 2]);
    expect(entries[0].operation).toBe('update');
    expect(entries[0].payload.action).toBe('update');
    expect(entries[0].routing.operation).toBe('update');
    expect(entries[1].operation).toBe('delete');
    expect(entries[1].payload.action).toBe('delete');
    expect(entries[1].routing.operation).toBe('delete');
  });
});
