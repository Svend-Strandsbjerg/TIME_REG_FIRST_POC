import { describe, expect, it, vi } from 'vitest';

vi.mock('block_engine_foundation', () => ({
  normalizeBlockExtent: vi.fn((block: any) => ({ ...block, extentMinutes: block.state === 'template' ? 30 : block.extentMinutes })),
  instantiateBlockFromSource: vi.fn((sourceBlock: any, options: any) => ({ ...sourceBlock, ...options })),
  resizePlacement: vi.fn(({ startTime, extentMinutes }: any) => ({ startTime, extentMinutes })),
  createPlacementSnapshot: vi.fn((snapshot: any) => snapshot),
  changeBlockState: vi.fn((block: any, state: any) => ({ ...block, state })),
  changeBlockExtent: vi.fn((block: any, extentMinutes: number) => ({ ...block, extentMinutes }))
}));

vi.mock('async_integration_foundation', () => ({
  createQueueId: vi.fn(() => 'queue-from-foundation'),
  createQueueItemId: vi.fn(({ blockId }: any) => `queue-item-${blockId}`),
  buildQueueItem: vi.fn(({ id, queueId, block, slot, operation, reason }: any) => ({
    id,
    queueId,
    blockId: block.id,
    title: block.title,
    dayKey: slot.dayKey,
    startTime: slot.timeSlot,
    endTime: slot.timeSlot,
    interval: `${slot.timeSlot} - ${slot.timeSlot}`,
    operation,
    reason
  }))
}));

import { createBoardWeek, placeBlockOnLane } from '../../src/core/application/board-service';
import type { TimeBlock } from '../../src/core/domain/board-types';

const blocks: TimeBlock[] = [
  {
    id: 'template-1',
    title: 'PSP Template',
    extentMinutes: 120,
    source: 'mock-api',
    state: 'template',
    metadata: { pspElement: 'PSP-A' }
  },
  {
    id: 'import-1',
    title: 'Imported',
    extentMinutes: 60,
    source: 'external-api',
    state: 'imported',
    metadata: { importedDayKey: 'monday', importedStartTime: '08:00' }
  }
];

describe('direct foundation runtime usage', () => {
  it('uses foundation queue id/item builders and block instantiation path', async () => {
    const board = createBoardWeek(blocks);
    expect(board.queue.id).toBe('queue-from-foundation');

    const placedTemplate = placeBlockOnLane(board, 'template-1', 'lane-monday', '09:00');
    expect(placedTemplate.blocks.some((block) => block.id.startsWith('spawn-template-1-'))).toBe(true);

    const placedImported = placeBlockOnLane(placedTemplate, 'import-1', 'lane-tuesday', '10:00');
    expect(placedImported.queue.items[0]?.id).toBe('queue-item-import-1');

    const asyncFoundation = await import('async_integration_foundation');
    expect(asyncFoundation.createQueueId).toHaveBeenCalled();
    expect(asyncFoundation.createQueueItemId).toHaveBeenCalled();
    expect(asyncFoundation.buildQueueItem).toHaveBeenCalled();

    const blockFoundation = await import('block_engine_foundation');
    expect(blockFoundation.normalizeBlockExtent).toHaveBeenCalled();
    expect(blockFoundation.instantiateBlockFromSource).toHaveBeenCalled();
    expect(blockFoundation.changeBlockState).toHaveBeenCalled();
  });
});
