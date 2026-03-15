import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import {
  createBoardWeek,
  placeBlockOnLane,
  resizeBlockFromBottom,
  resizeBlockFromTop,
  returnBlockToPool
} from '../../src/core/application/board-service';
import { deriveEndTime } from '../../src/core/domain/time-slot';
import type { TimeBlock } from '../../src/core/domain/board-types';

const blocks: TimeBlock[] = [
  {
    id: 'b1',
    title: 'Meeting with Customer A',
    extentMinutes: 60,
    source: 'mock-api',
    state: 'committed',
    metadata: {
      committedPlacement: {
        laneId: 'lane-monday',
        startTime: '08:30',
        extentMinutes: 60
      }
    }
  },
  { id: 'b2', title: 'Internal workshop', extentMinutes: 120, source: 'mock-api', state: 'uncommitted' }
];

describe('board-service queue simulation', () => {
  it('creates a single paused queue', () => {
    const board = createBoardWeek(blocks);

    expect(board.queue.id).toBe('planning-queue');
    expect(board.queue.status).toBe('paused');
  });

  it('placing an uncommitted item into a lane creates a queue item with actual time', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b2', 'lane-tuesday', '10:00');

    expect(placed.queue.items).toHaveLength(1);
    expect(placed.queue.items[0]).toMatchObject({
      queueId: 'planning-queue',
      blockId: 'b2',
      dayKey: 'tuesday',
      timeSlot: '10:00',
      operation: 'create'
    });
  });

  it('moving committed item to another day/time creates an update queue item', () => {
    const board = createBoardWeek(blocks);
    const movedCommitted = placeBlockOnLane(board, 'b1', 'lane-tuesday', '10:00');

    expect(movedCommitted.queue.items.find((item) => item.blockId === 'b1')).toMatchObject({
      dayKey: 'tuesday',
      timeSlot: '10:00',
      operation: 'update'
    });
  });

  it('restoring committed item returns to committed day/time baseline', () => {
    const board = createBoardWeek(blocks);
    const returned = returnBlockToPool(board, 'b1');
    const restored = placeBlockOnLane(returned, 'b1', 'lane-thursday', '11:00');

    expect(restored.queue.items).toHaveLength(0);

    const mondayLane = buildPlanningView(restored).lanes.find((lane) => lane.lane.id === 'lane-monday');
    expect(mondayLane?.placedBlocks[0]).toMatchObject({
      startTime: '08:30'
    });
  });

  it('derives end time from start time + extent', () => {
    expect(deriveEndTime('08:30', 90)).toBe('10:00');
  });

  it('bottom-edge extend only changes extent and end time', () => {
    const board = createBoardWeek(blocks);
    const resized = resizeBlockFromBottom(board, 'b1', 1);
    const view = buildPlanningView(resized);
    const mondayBlock = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks[0];

    expect(mondayBlock?.startTime).toBe('08:30');
    expect(mondayBlock?.block.extentMinutes).toBe(90);
    expect(mondayBlock?.endTime).toBe('10:00');
  });

  it('bottom-edge retract reduces extent and keeps start', () => {
    const board = createBoardWeek(blocks);
    const extended = resizeBlockFromBottom(board, 'b1', 2);
    const retracted = resizeBlockFromBottom(extended, 'b1', -1);
    const view = buildPlanningView(retracted);
    const mondayBlock = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks[0];

    expect(mondayBlock?.startTime).toBe('08:30');
    expect(mondayBlock?.block.extentMinutes).toBe(90);
    expect(mondayBlock?.endTime).toBe('10:00');
  });

  it('top-edge extend moves start upward and increases extent', () => {
    const board = createBoardWeek(blocks);
    const resized = resizeBlockFromTop(board, 'b1', -1);
    const view = buildPlanningView(resized);
    const mondayBlock = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks[0];

    expect(mondayBlock?.startTime).toBe('08:00');
    expect(mondayBlock?.block.extentMinutes).toBe(90);
    expect(mondayBlock?.endTime).toBe('09:30');
  });

  it('top-edge retract moves start downward and reduces extent', () => {
    const board = createBoardWeek(blocks);
    const extended = resizeBlockFromTop(board, 'b1', -1);
    const retracted = resizeBlockFromTop(extended, 'b1', 1);
    const view = buildPlanningView(retracted);
    const mondayBlock = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks[0];

    expect(mondayBlock?.startTime).toBe('08:30');
    expect(mondayBlock?.block.extentMinutes).toBe(60);
    expect(mondayBlock?.endTime).toBe('09:30');
  });

  it('enforces minimum extent of 30 minutes while retracting', () => {
    const board = createBoardWeek(blocks);
    const retracted = resizeBlockFromBottom(board, 'b1', -3);
    const view = buildPlanningView(retracted);
    const mondayBlock = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks[0];

    expect(mondayBlock?.block.extentMinutes).toBe(30);
    expect(mondayBlock?.startTime).toBe('08:30');
    expect(mondayBlock?.endTime).toBe('09:00');
  });

  it('respects 06:00 planning boundary for top-edge extension', () => {
    const board = createBoardWeek(blocks);
    const moved = placeBlockOnLane(board, 'b1', 'lane-monday', '06:00');
    const resized = resizeBlockFromTop(moved, 'b1', -2);
    const view = buildPlanningView(resized);
    const mondayBlock = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks.find((block) => block.block.id === 'b1');

    expect(mondayBlock?.startTime).toBe('06:00');
    expect(mondayBlock?.block.extentMinutes).toBe(60);
    expect(mondayBlock?.endTime).toBe('07:00');
  });

  it('respects 18:00 planning boundary for bottom-edge extension', () => {
    const board = createBoardWeek(blocks);
    const moved = placeBlockOnLane(board, 'b1', 'lane-monday', '17:00');
    const resized = resizeBlockFromBottom(moved, 'b1', 2);
    const view = buildPlanningView(resized);
    const mondayBlock = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks.find((block) => block.block.id === 'b1');

    expect(mondayBlock?.startTime).toBe('17:00');
    expect(mondayBlock?.block.extentMinutes).toBe(60);
    expect(mondayBlock?.endTime).toBe('18:00');
  });

  it('updates totals and queue projection when committed extent changes at baseline slot', () => {
    const board = createBoardWeek(blocks);
    const resized = resizeBlockFromBottom(board, 'b1', 1);
    const monday = buildPlanningView(resized).lanes.find((lane) => lane.lane.id === 'lane-monday');

    expect(monday?.totalHours).toBe(1.5);
    expect(resized.queue.items.find((item) => item.blockId === 'b1')).toMatchObject({
      operation: 'update',
      dayKey: 'monday',
      timeSlot: '08:30'
    });
  });
});
