import { describe, expect, it } from 'vitest';
import { buildPlanningView, convertPlacedBlockToTimeEntryDraft } from '../../src/core/application/board-queries';
import { createBoardWeek, movePlacedBlock, placeBlockOnLane, returnBlockToPool } from '../../src/core/application/board-service';
import type { TimeBlock } from '../../src/core/domain/board-types';

const blocks: TimeBlock[] = [
  { id: 'b1', title: 'Meeting with Customer A', durationMinutes: 60, source: 'mock-api' },
  { id: 'b2', title: 'Internal workshop', durationMinutes: 120, source: 'mock-api' }
];

describe('board-service', () => {
  it('creates weekly board with 7 lanes', () => {
    const board = createBoardWeek(blocks);
    expect(board.lanes).toHaveLength(7);
    expect(board.placements).toHaveLength(0);
  });

  it('places block in lane and removes it from available pool', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b1', 'lane-monday');
    const view = buildPlanningView(placed);

    expect(view.availableBlocks.map((item) => item.block.id)).toEqual(['b2']);
    expect(view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks).toHaveLength(1);
  });

  it('moves blocks between lanes and can return to pool', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b1', 'lane-monday');
    const moved = movePlacedBlock(placed, 'b1', 'lane-wednesday');
    const returned = returnBlockToPool(moved, 'b1');

    expect(buildPlanningView(moved).lanes.find((lane) => lane.lane.id === 'lane-wednesday')?.placedBlocks).toHaveLength(1);
    expect(buildPlanningView(returned).availableBlocks.map((item) => item.block.id)).toContain('b1');
  });

  it('keeps lane ordering stable when a placed block is moved out', () => {
    const board = createBoardWeek(blocks);
    const withFirst = placeBlockOnLane(board, 'b1', 'lane-monday');
    const withSecond = placeBlockOnLane(withFirst, 'b2', 'lane-monday');

    const moved = movePlacedBlock(withSecond, 'b1', 'lane-tuesday');
    const mondayLane = buildPlanningView(moved).lanes.find((lane) => lane.lane.id === 'lane-monday');

    expect(mondayLane?.placedBlocks.map((entry) => entry.block.id)).toEqual(['b2']);
  });

  it('converts placed blocks into draft entries', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b1', 'lane-friday');
    const drafts = convertPlacedBlockToTimeEntryDraft(placed);

    expect(drafts).toHaveLength(1);
    expect(drafts[0].dayKey).toBe('friday');
  });
});
