import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import {
  autoPlaceImportedBlock,
  createBoardWeek,
  placeBlockOnLane,
  resizeBlockFromBottom,
  resizeBlockFromTop,
  returnBlockToPool,
  updateBlockDescription
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
  { id: 'b2', title: 'Internal workshop', extentMinutes: 120, source: 'mock-api', state: 'uncommitted' },
  {
    id: 'b3',
    title: 'Outlook follow-up',
    extentMinutes: 90,
    source: 'external-api',
    state: 'imported',
    metadata: {
      importedDayKey: 'wednesday',
      importedStartTime: '08:30',
      importedEndTime: '10:00',
      description: 'Imported from Outlook with participant notes'
    }
  },
  {
    id: 'b4',
    title: 'Standard PSP planning',
    extentMinutes: 60,
    source: 'mock-api',
    state: 'template',
    metadata: { pspElement: 'PSP-STANDARD' }
  }
];

describe('board-service queue simulation', () => {
  it('creates a single paused queue', () => {
    const board = createBoardWeek(blocks);

    expect(board.queue.id.startsWith('queue-')).toBe(true);
    expect(board.queue.status).toBe('paused');
  });

  it('placing an uncommitted item into a lane creates a queue item with actual time', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b2', 'lane-tuesday', '10:00');

    expect(placed.queue.items).toHaveLength(1);
    expect(placed.queue.items[0]).toMatchObject({
      queueId: placed.queue.id,
      blockId: 'b2',
      dayKey: 'tuesday',
      startTime: '10:00',
      endTime: '12:00',
      interval: '10:00 - 12:00',
      operation: 'create'
    });
  });

  it('moving committed item to another day/time creates an update queue item', () => {
    const board = createBoardWeek(blocks);
    const movedCommitted = placeBlockOnLane(board, 'b1', 'lane-tuesday', '10:00');

    expect(movedCommitted.queue.items.find((item) => item.blockId === 'b1')).toMatchObject({
      dayKey: 'tuesday',
      startTime: '10:00',
      endTime: '11:00',
      interval: '10:00 - 11:00',
      operation: 'update'
    });
  });

  it('committed blocks moved away from baseline become red and return to yellow when restored exactly', () => {
    const board = createBoardWeek(blocks);
    const moved = placeBlockOnLane(board, 'b1', 'lane-thursday', '11:00');
    const movedCard = buildPlanningView(moved).lanes
      .find((lane) => lane.lane.id === 'lane-thursday')
      ?.placedBlocks.find((card) => card.block.id === 'b1');

    expect(movedCard?.visualState).toBe('uncommitted');

    const restored = placeBlockOnLane(moved, 'b1', 'lane-monday', '08:30');
    const restoredCard = buildPlanningView(restored).lanes
      .find((lane) => lane.lane.id === 'lane-monday')
      ?.placedBlocks.find((card) => card.block.id === 'b1');

    expect(restored.queue.items.find((item) => item.blockId === 'b1')).toBeUndefined();
    expect(restoredCard?.visualState).toBe('committed');
  });

  it('committed entry moved to candidates remains visible as red changed candidate', () => {
    const board = createBoardWeek(blocks);
    const returned = returnBlockToPool(board, 'b1');
    const view = buildPlanningView(returned);

    expect(view.changedCommittedCandidates.some((card) => card.block.id === 'b1')).toBe(true);
    expect(view.changedCommittedCandidates.find((card) => card.block.id === 'b1')?.visualState).toBe('uncommitted');
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

  it('placing an imported candidate creates a queue create item and keeps imported state', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b3', 'lane-tuesday', '09:00');
    const item = placed.queue.items.find((candidate) => candidate.blockId === 'b3');

    expect(placed.blocks.find((block) => block.id === 'b3')?.state).toBe('imported');
    expect(item).toMatchObject({
      dayKey: 'tuesday',
      startTime: '09:00',
      endTime: '10:30',
      interval: '09:00 - 10:30',
      operation: 'create'
    });
  });

  it('imported candidate auto-placed then returned appears again in imported candidates', () => {
    const board = createBoardWeek(blocks);
    const autoPlaced = autoPlaceImportedBlock(board, 'b3');
    const returned = returnBlockToPool(autoPlaced, 'b3');
    const view = buildPlanningView(returned);

    const importedCard = view.importedCandidates.find((card) => card.block.id === 'b3');
    expect(importedCard).toBeDefined();
    expect(importedCard?.interval).toBe('08:30 - 10:00');
  });

  it('placing a template keeps source candidate and creates red spawned placement with 30 minute extent', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b4', 'lane-monday', '08:30');
    const view = buildPlanningView(placed);

    expect(view.templateCandidates.some((card) => card.block.id === 'b4' && card.isTemplate)).toBe(true);

    const spawned = placed.blocks.find((block) => block.metadata?.templateSourceBlockId === 'b4');
    expect(spawned).toBeDefined();
    expect(spawned?.state).toBe('uncommitted');
    expect(spawned?.extentMinutes).toBe(30);

    const mondayCard = view.lanes.find((lane) => lane.lane.id === 'lane-monday')?.placedBlocks.find((card) => card.block.id === spawned?.id);
    expect(mondayCard?.visualState).toBe('uncommitted');
    expect(mondayCard?.interval).toBe('08:30 - 09:00');
  });

  it('double-click auto-place uses imported day/time metadata and renders red in swimlane', () => {
    const board = createBoardWeek(blocks);
    const placed = autoPlaceImportedBlock(board, 'b3');
    const lane = buildPlanningView(placed).lanes.find((candidate) => candidate.lane.dayKey === 'wednesday');
    const importedCard = lane?.placedBlocks.find((candidate) => candidate.block.id === 'b3');

    expect(importedCard?.startTime).toBe('08:30');
    expect(importedCard?.interval).toBe('08:30 - 10:00');
    expect(importedCard?.visualState).toBe('uncommitted');
  });


  it('initializes changed committed placements from current placement metadata while keeping baseline semantics', () => {
    const changedCommitted: TimeBlock = {
      id: 'changed-committed-1',
      title: 'Changed committed seed',
      extentMinutes: 60,
      source: 'mock-api',
      state: 'committed',
      metadata: {
        committedPlacement: {
          laneId: 'lane-monday',
          startTime: '08:30',
          extentMinutes: 60
        },
        currentPlacement: {
          laneId: 'lane-thursday',
          startTime: '10:30'
        }
      }
    };

    const board = createBoardWeek([changedCommitted]);
    const view = buildPlanningView(board);
    const placed = view.lanes.find((lane) => lane.lane.id === 'lane-thursday')?.placedBlocks.find((card) => card.block.id === 'changed-committed-1');

    expect(placed?.startTime).toBe('10:30');
    expect(placed?.visualState).toBe('uncommitted');
    expect(board.queue.items.find((item) => item.blockId === 'changed-committed-1')?.operation).toBe('update');

    const restored = placeBlockOnLane(board, 'changed-committed-1', 'lane-monday', '08:30');
    const restoredView = buildPlanningView(restored);
    const restoredPlacement = restoredView.lanes
      .find((lane) => lane.lane.id === 'lane-monday')
      ?.placedBlocks.find((card) => card.block.id === 'changed-committed-1');

    expect(restoredPlacement?.visualState).toBe('committed');
    expect(restored.queue.items.find((item) => item.blockId === 'changed-committed-1')).toBeUndefined();
  });

  it('description updates are persisted in block payload metadata', () => {
    const board = createBoardWeek(blocks);
    const updated = updateBlockDescription(board, 'b3', 'Updated planner description');

    expect(updated.blocks.find((block) => block.id === 'b3')?.metadata?.description).toBe('Updated planner description');
  });
});
