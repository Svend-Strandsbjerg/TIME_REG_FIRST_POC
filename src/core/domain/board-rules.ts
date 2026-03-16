import { buildQueueItem, createQueueId as createFoundationQueueId, createQueueItemId } from '@strandsbjerg/async-integration-foundation';
import { changeBlockExtent, resizePlacement } from '@strandsbjerg/block-engine-foundation';
import type {
  BoardState,
  DayKey,
  DayLane,
  DayLaneId,
  PlacementSlot,
  Queue,
  QueueId,
  QueueItem,
  QueueOperation,
  TimeBlock,
  TimeBlockId,
  TimeOfDay
} from './board-types';
import { clampToPlanningWindow, PLANNING_WINDOW_END, PLANNING_WINDOW_START, SLOT_MINUTES } from './time-slot';

export const getPlacementForBlock = (state: BoardState, blockId: TimeBlockId) =>
  state.placements.find((placement) => placement.blockId === blockId);

export const getBlockById = (state: BoardState, blockId: TimeBlockId) => state.blocks.find((block) => block.id === blockId);

const buildSlot = (laneLookup: Map<DayLaneId, DayLane>, laneId: DayLaneId, startTime: TimeOfDay): PlacementSlot => {
  const lane = laneLookup.get(laneId);
  if (!lane) {
    throw new Error(`Unknown lane id: ${laneId}`);
  }

  return {
    dayKey: lane.dayKey,
    timeSlot: startTime
  };
};


export const formatInterval = (startTime: TimeOfDay, endTime: TimeOfDay): string => `${startTime} - ${endTime}`;

const buildQueueItemFromFoundation = (
  queueId: QueueId,
  block: TimeBlock,
  slot: PlacementSlot,
  operation: QueueOperation,
  reason: string
): QueueItem => {
  const queueItemId = createQueueItemId({
    queueId,
    blockId: block.id,
    operation,
    dayKey: slot.dayKey,
    startTime: slot.timeSlot
  });

  return buildQueueItem({
    id: queueItemId,
    queueId,
    block,
    slot,
    operation,
    reason
  }) as QueueItem;
};

const laneLookupFromState = (state: BoardState) => new Map(state.lanes.map((lane) => [lane.id, lane]));

const queueItemForBlock = (state: BoardState, blockId: TimeBlockId): QueueItem | undefined => {
  const placement = getPlacementForBlock(state, blockId);
  const block = getBlockById(state, blockId);
  if (!block || !placement) {
    return undefined;
  }

  const laneLookup = laneLookupFromState(state);

  if (block.state === 'uncommitted' || block.state === 'imported') {
    return buildQueueItemFromFoundation(
      state.queue.id,
      block,
      buildSlot(laneLookup, placement.laneId, placement.startTime),
      'create',
      'Candidate block is placed and pending creation in target system.'
    );
  }

  if (block.state !== 'committed' || !placement.committedPlacement) {
    return undefined;
  }

  const committed = placement.committedPlacement;

  if (placement.laneId === committed.laneId && placement.startTime === committed.startTime) {
    const baselineExtent = committed.extentMinutes;
    if (baselineExtent === undefined || baselineExtent === block.extentMinutes) {
      return undefined;
    }
  }

  if (placement.laneId === 'unplanned') {
    return buildQueueItemFromFoundation(
      state.queue.id,
      block,
      committed.slot,
      'delete',
      'Committed block was removed from its committed slot.'
    );
  }

  return buildQueueItemFromFoundation(
    state.queue.id,
    block,
    buildSlot(laneLookup, placement.laneId, placement.startTime),
    'update',
    'Committed block moved away from its committed slot.'
  );
};

const reprojectQueue = (state: BoardState): Queue => {
  const queueItems = state.blocks
    .map((block) => queueItemForBlock(state, block.id))
    .filter((item): item is QueueItem => Boolean(item));

  return {
    ...state.queue,
    items: queueItems.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.startTime.localeCompare(b.startTime))
  };
};

const withQueueProjection = (state: BoardState): BoardState => ({
  ...state,
  queue: reprojectQueue(state)
});

export const appendPlacement = (state: BoardState, blockId: TimeBlockId, laneId: DayLaneId, startTime: TimeOfDay): BoardState => {
  const existing = getPlacementForBlock(state, blockId);
  const block = getBlockById(state, blockId);
  if (!block) {
    return state;
  }

  const nextPlacements = existing
    ? state.placements.map((placement) => {
        if (placement.blockId !== blockId) {
          return placement;
        }

        return { ...placement, laneId, startTime: clampToPlanningWindow(startTime) };
      })
    : state.placements.concat({
        id: `placement-${blockId}`,
        blockId,
        laneId,
        startTime: clampToPlanningWindow(startTime)
      });

  return withQueueProjection({
    ...state,
    placements: nextPlacements
  });
};

export const removePlacement = (state: BoardState, blockId: TimeBlockId): BoardState => {
  const existing = getPlacementForBlock(state, blockId);
  const block = getBlockById(state, blockId);
  if (!existing || !block) {
    return state;
  }

  const nextPlacements =
    block.state === 'committed'
      ? state.placements.map((placement) =>
          placement.blockId === blockId ? { ...placement, laneId: 'unplanned', startTime: '06:00' } : placement
        )
      : state.placements.filter((placement) => placement.blockId !== blockId);

  return withQueueProjection({
    ...state,
    placements: nextPlacements
  });
};

type ResizeInstruction = {
  edge: 'top' | 'bottom';
  slotDelta: number;
};

export const resizePlacedBlock = (state: BoardState, blockId: TimeBlockId, instruction: ResizeInstruction): BoardState => {
  const block = getBlockById(state, blockId);
  const placement = getPlacementForBlock(state, blockId);

  if (!block || !placement) {
    return state;
  }

  const resizeResult = resizePlacement({
    startTime: placement.startTime,
    extentMinutes: block.extentMinutes,
    edge: instruction.edge,
    slotDelta: instruction.slotDelta,
    slotMinutes: SLOT_MINUTES,
    minimumExtentMinutes: SLOT_MINUTES,
    planningWindow: {
      start: PLANNING_WINDOW_START,
      end: PLANNING_WINDOW_END
    }
  });
  const nextStart = resizeResult.startTime;
  const nextExtent = resizeResult.extentMinutes;

  if (nextStart === placement.startTime && nextExtent === block.extentMinutes) {
    return state;
  }

  return withQueueProjection({
    ...state,
    blocks: state.blocks.map((candidate) => (candidate.id === block.id ? (changeBlockExtent(candidate, nextExtent) as TimeBlock) : candidate)),
    placements: state.placements.map((candidate) =>
      candidate.blockId === blockId
        ? {
            ...candidate,
            startTime: nextStart
          }
        : candidate
    )
  });
};

export const createQueueId = (scope = 'weekly-planning'): QueueId => createFoundationQueueId(scope);

export const createCommittedPlacement = (
  laneId: DayLaneId,
  startTime: TimeOfDay,
  extentMinutes: number | undefined,
  laneById: Map<DayLaneId, DayLane>
): { laneId: DayLaneId; startTime: TimeOfDay; slot: { dayKey: DayKey; timeSlot: string }; extentMinutes?: number } => {
  const lane = laneById.get(laneId);
  if (!lane) {
    throw new Error(`Unknown lane id: ${laneId}`);
  }

  return {
    laneId,
    startTime,
    extentMinutes,
    slot: {
      dayKey: lane.dayKey,
      timeSlot: startTime
    }
  };
};

export const withQueueProjectionApplied = withQueueProjection;
