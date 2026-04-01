import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import {
  autoPlaceImportedBlock,
  createBoardWeek,
  createDraggedBlockCopy,
  discardBlockById,
  placeBlockOnLane,
  resizeBlockFromBottom,
  resizeBlockFromTop,
  returnBlockToPool,
  updateBlockDescription,
  updateBlockDetails
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
      operation: 'create',
      payload: {
        blockId: 'b2',
        date: '2026-03-31',
        startTime: '10:00',
        endTime: '12:00'
      }
    });
  });

  it('moving committed item to another day/time creates an update queue item', () => {
    const board = createBoardWeek(blocks);
    const movedCommitted = placeBlockOnLane(board, 'b1', 'lane-tuesday', '10:00');

    expect(movedCommitted.queue.items.find((item) => item.payload.blockId === 'b1')).toMatchObject({
      operation: 'update',
      payload: {
        date: '2026-03-31',
        startTime: '10:00',
        endTime: '11:00'
      }
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

    expect(restored.queue.items.find((item) => item.payload.blockId === 'b1')).toBeUndefined();
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
    const item = placed.queue.items.find((candidate) => candidate.payload.blockId === 'b3');

    expect(placed.blocks.find((block) => block.id === 'b3')?.state).toBe('imported');
    expect(item).toMatchObject({
      operation: 'create',
      payload: {
        date: '2026-03-31',
        startTime: '09:00',
        endTime: '10:30'
      }
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

  it('description updates are persisted in block payload metadata', () => {
    const board = createBoardWeek(blocks);
    const updated = updateBlockDescription(board, 'b3', 'Updated planner description');

    expect(updated.blocks.find((block) => block.id === 'b3')?.metadata?.description).toBe('Updated planner description');
  });

  it('block detail editor updates additional classification fields on block metadata', () => {
    const board = createBoardWeek(blocks);
    const updated = updateBlockDetails(board, 'b3', {
      description: 'Updated planner description',
      taskType: 'TASK',
      taskComponent: 'NORMAL',
      activityType: 'DEV',
      billingControlCategory: 'B1',
      overtimeCategory: 'OT1',
      wbsElement: 'PSP-9009',
      internalOrder: 'ORD-123'
    });

    const metadata = updated.blocks.find((block) => block.id === 'b3')?.metadata as Record<string, unknown>;

    expect(metadata.description).toBe('Updated planner description');
    expect(metadata.taskType).toBe('TASK');
    expect(metadata.taskComponent).toBe('NORMAL');
    expect(metadata.activityType).toBe('DEV');
    expect(metadata.billingControlCategory).toBe('B1');
    expect(metadata.overtimeCategory).toBe('OT1');
    expect(metadata.wbsElement).toBe('PSP-9009');
    expect(metadata.internalOrder).toBe('ORD-123');
  });

  it('defaults task component onto PSP/template blocks during board initialization', () => {
    const board = createBoardWeek([
      {
        id: 'template-1',
        title: 'PSP template',
        extentMinutes: 30,
        source: 'mock-api',
        state: 'template',
        metadata: {
          pspElement: 'PSP-1001'
        }
      }
    ]);

    const metadata = board.blocks[0]?.metadata as Record<string, unknown>;
    expect(metadata.taskComponent).toBe('NORMAL');
  });

  it('queue item payload is solution-specific and does not use legacy scheduling fields', () => {
    const board = createBoardWeek(blocks);
    const placed = placeBlockOnLane(board, 'b2', 'lane-tuesday', '10:00');
    const queueItem = placed.queue.items[0];

    expect(queueItem?.payload).toMatchObject({
      userExternalId: 'demo.worker',
      companyCode: '1010',
      blockId: 'b2',
      title: 'Internal workshop',
      date: '2026-03-31',
      startTime: '10:00',
      action: 'create'
    });
    expect(queueItem).not.toHaveProperty('scheduling');
    expect(queueItem?.payload).not.toHaveProperty('TimeSheetOperation');
    expect(queueItem?.routing).toMatchObject({
      payloadType: 'time-registration-entry',
      adapterKey: 'sap-time-entry',
      targetSystem: 'sap',
      operation: 'create'
    });
  });

  it('ctrl-drag copy creates a new uncommitted block id without mutating the source block metadata', () => {
    const board = createBoardWeek(blocks);
    const sourceBefore = board.blocks.find((block) => block.id === 'b3');
    const copyResult = createDraggedBlockCopy(board, 'b3');

    expect(copyResult).not.toBeNull();
    const copiedBlockId = copyResult?.copiedBlockId ?? '';
    const copiedBlock = copyResult?.state.blocks.find((block) => block.id === copiedBlockId);
    const sourceAfter = copyResult?.state.blocks.find((block) => block.id === 'b3');

    expect(copiedBlockId).toMatch(/^copy-b3-\d+$/);
    expect(copiedBlock?.state).toBe('uncommitted');
    expect(copiedBlock?.extentMinutes).toBe(sourceBefore?.extentMinutes);
    expect(copiedBlock?.metadata).toMatchObject(sourceBefore?.metadata as Record<string, unknown>);
    expect(copiedBlock?.metadata).not.toBe(sourceBefore?.metadata);
    expect(sourceAfter?.metadata).toEqual(sourceBefore?.metadata);
  });

  it('ctrl-drag copy does not create queue entries until the copied block is dropped', () => {
    const board = createBoardWeek(blocks);
    const copyResult = createDraggedBlockCopy(board, 'b3');
    if (!copyResult) {
      throw new Error('Expected copied block result');
    }

    expect(copyResult.state.queue.items).toHaveLength(0);

    const dropped = placeBlockOnLane(copyResult.state, copyResult.copiedBlockId, 'lane-thursday', '11:00');
    const queueItem = dropped.queue.items.find((item) => item.payload.blockId === copyResult.copiedBlockId);

    expect(queueItem).toMatchObject({
      operation: 'create',
      payload: {
        startTime: '11:00'
      }
    });
  });

  it('discarding a canceled ctrl-drag copy removes the copied block and leaves source placement unchanged', () => {
    const board = placeBlockOnLane(createBoardWeek(blocks), 'b3', 'lane-tuesday', '09:00');
    const sourcePlacementBefore = board.placements.find((placement) => placement.blockId === 'b3');
    const copyResult = createDraggedBlockCopy(board, 'b3');
    if (!copyResult) {
      throw new Error('Expected copied block result');
    }

    const discarded = discardBlockById(copyResult.state, copyResult.copiedBlockId);
    const sourcePlacementAfter = discarded.placements.find((placement) => placement.blockId === 'b3');

    expect(discarded.blocks.some((block) => block.id === copyResult.copiedBlockId)).toBe(false);
    expect(discarded.placements.some((placement) => placement.blockId === copyResult.copiedBlockId)).toBe(false);
    expect(sourcePlacementAfter).toEqual(sourcePlacementBefore);
  });
});
