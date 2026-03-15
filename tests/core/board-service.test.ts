import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import { createBoardWeek, placeBlockOnLane, returnBlockToPool } from '../../src/core/application/board-service';
import type { TimeBlock } from '../../src/core/domain/board-types';

const blocks: TimeBlock[] = [
  {
    id: 'b1',
    title: 'Meeting with Customer A',
    durationMinutes: 60,
    source: 'mock-api',
    state: 'committed',
    metadata: {
      committedPlacement: {
        laneId: 'lane-monday',
        order: 0
      }
    }
  },
  { id: 'b2', title: 'Internal workshop', durationMinutes: 120, source: 'mock-api', state: 'uncommitted' }
];

describe('board-service queue simulation', () => {
  it('creates a single paused queue', () => {
    const board = createBoardWeek(blocks);

    expect(board.queue.id).toBe('planning-queue');
    expect(board.queue.status).toBe('paused');
  });

  it('exposes block state through the planning read model', () => {
    const board = createBoardWeek(blocks);
    const view = buildPlanningView(board);

    const mondayLane = view.lanes.find((lane) => lane.lane.id === 'lane-monday');
    expect(mondayLane?.placedBlocks[0]).toMatchObject({
      state: 'committed'
    });

    expect(view.availableBlocks[0]).toMatchObject({
      state: 'uncommitted'
    });
  });

  it('placing an uncommitted item into a lane creates a queue item with required fields', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b2', 'lane-tuesday');

    expect(placed.queue.items).toHaveLength(1);
    expect(placed.queue.items[0]).toMatchObject({
      queueId: 'planning-queue',
      blockId: 'b2',
      dayKey: 'tuesday',
      timeSlot: '09:00',
      operation: 'create'
    });
  });

  it('removing an uncommitted item removes its queue item', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b2', 'lane-tuesday');
    const returned = returnBlockToPool(placed, 'b2');

    expect(returned.queue.items).toHaveLength(0);
  });

  it('removing a committed item creates a delete queue item', () => {
    const board = createBoardWeek(blocks);
    const returned = returnBlockToPool(board, 'b1');

    expect(returned.queue.items).toHaveLength(1);
    expect(returned.queue.items[0]).toMatchObject({
      blockId: 'b1',
      dayKey: 'monday',
      timeSlot: '09:00',
      operation: 'delete'
    });
  });

  it('restoring committed item removes queue item and returns to committed position', () => {
    const board = createBoardWeek(blocks);
    const returned = returnBlockToPool(board, 'b1');
    const restored = placeBlockOnLane(returned, 'b1', 'lane-thursday');

    expect(restored.queue.items).toHaveLength(0);

    const mondayLane = buildPlanningView(restored).lanes.find((lane) => lane.lane.id === 'lane-monday');
    expect(mondayLane?.placedBlocks.map((item) => item.block.id)).toEqual(['b1']);
  });

  it('moving committed item to another slot creates an update queue item', () => {
    const board = createBoardWeek(blocks);
    const withUncommitted = placeBlockOnLane(board, 'b2', 'lane-monday');
    const movedCommitted = placeBlockOnLane(withUncommitted, 'b1', 'lane-monday');

    expect(movedCommitted.queue.items.find((item) => item.blockId === 'b1')).toMatchObject({
      dayKey: 'monday',
      timeSlot: '10:00',
      operation: 'update'
    });
  });

  it('calculates daily total hours from placed blocks', () => {
    const board = createBoardWeek(blocks);
    const withWorkshop = placeBlockOnLane(board, 'b2', 'lane-monday');
    const view = buildPlanningView(withWorkshop);

    const monday = view.lanes.find((lane) => lane.lane.id === 'lane-monday');
    expect(monday?.totalHours).toBe(3);
  });
});
