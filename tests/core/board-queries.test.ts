import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import { createBoardWeek, placeBlockOnLane } from '../../src/core/application/board-service';
import type { TimeBlock } from '../../src/core/domain/board-types';

const blocks: TimeBlock[] = [
  { id: 'template-1', title: 'Template PSP', extentMinutes: 60, source: 'mock-api', state: 'template' },
  { id: 'imported-1', title: 'Imported Signal', extentMinutes: 90, source: 'external-api', state: 'imported' }
];

describe('board queries', () => {
  it('exposes template/imported state values for UI color mapping', () => {
    const board = createBoardWeek(blocks);
    const view = buildPlanningView(board);

    expect(view.availableBlocks.find((card) => card.block.id === 'template-1')?.state).toBe('template');
    expect(view.availableBlocks.find((card) => card.block.id === 'imported-1')?.state).toBe('imported');
  });

  it('marks template candidates and spawned blocks with source metadata', () => {
    const board = placeBlockOnLane(createBoardWeek(blocks), 'template-1', 'lane-monday', '08:30');
    const view = buildPlanningView(board);

    expect(view.availableBlocks.some((card) => card.block.id === 'template-1' && card.isTemplate)).toBe(true);

    const spawned = view.lanes.flatMap((lane) => lane.placedBlocks).find((card) => card.templateSourceBlockId === 'template-1');
    expect(spawned?.state).toBe('uncommitted');
    expect(spawned?.interval).toBe('08:30 - 09:30');
  });
});
