import type {
  BoardState,
  DayKey,
  DayLane,
  DayLaneId,
  PlacementSlot,
  PlacedBlock,
  Queue,
  QueueItem,
  QueueOperation,
  TimeBlock,
  TimeBlockId,
  TimeOfDay
} from './board-types';
import {
  clampToPlanningWindow,
  deriveEndTime,
  isWithinPlanningWindow,
  PLANNING_WINDOW_END,
  PLANNING_WINDOW_START,
  shiftTimeByMinutes,
  SLOT_MINUTES,
  toMinutesOfDay
} from './time-slot';

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

const buildQueueItem = (
  queueId: string,
  block: TimeBlock,
  slot: PlacementSlot,
  operation: QueueOperation,
  reason: string
): QueueItem => {
  const startTime = slot.timeSlot;
  const endTime = deriveEndTime(startTime, block.extentMinutes);

  return {
  id: `queue-item-${block.id}`,
  queueId,
  blockId: block.id,
  title: block.title,
  dayKey: slot.dayKey,
  startTime,
  endTime,
  interval: `${startTime} - ${endTime}`,
  operation,
  reason
};
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
    return buildQueueItem(
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
    return buildQueueItem(state.queue.id, block, committed.slot, 'delete', 'Committed block was removed from its committed slot.');
  }

  return buildQueueItem(
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

const restoreCommittedPlacementIfNeeded = (
  block: TimeBlock,
  placement: PlacedBlock,
  targetLaneId: DayLaneId,
  startTime: TimeOfDay
): { laneId: DayLaneId; startTime: TimeOfDay } => {
  if (block.state === 'committed' && placement.laneId === 'unplanned' && placement.committedPlacement) {
    return {
      laneId: placement.committedPlacement.laneId,
      startTime: placement.committedPlacement.startTime
    };
  }

  return {
    laneId: targetLaneId,
    startTime: clampToPlanningWindow(startTime)
  };
};

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

        const target = restoreCommittedPlacementIfNeeded(block, placement, laneId, startTime);
        return { ...placement, laneId: target.laneId, startTime: target.startTime };
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

const MINIMUM_EXTENT_MINUTES = SLOT_MINUTES;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const resizePlacedBlock = (state: BoardState, blockId: TimeBlockId, instruction: ResizeInstruction): BoardState => {
  const block = getBlockById(state, blockId);
  const placement = getPlacementForBlock(state, blockId);

  if (!block || !placement) {
    return state;
  }

  const requestedDelta = Math.round(instruction.slotDelta) * SLOT_MINUTES;
  if (requestedDelta === 0) {
    return state;
  }

  const planningStart = toMinutesOfDay(PLANNING_WINDOW_START);
  const planningEnd = toMinutesOfDay(PLANNING_WINDOW_END);
  const currentStart = toMinutesOfDay(placement.startTime);
  const currentEnd = currentStart + block.extentMinutes;
  const maxRetract = block.extentMinutes - MINIMUM_EXTENT_MINUTES;

  let nextStart = placement.startTime;
  let nextExtent = block.extentMinutes;

  if (instruction.edge === 'bottom') {
    const maxExtend = planningEnd - currentEnd;
    const boundedDelta = clamp(requestedDelta, -maxRetract, maxExtend);
    nextExtent = block.extentMinutes + boundedDelta;
  } else {
    const maxExtendUpward = currentStart - planningStart;
    const boundedDelta = clamp(requestedDelta, -maxExtendUpward, maxRetract);
    nextStart = shiftTimeByMinutes(placement.startTime, boundedDelta);
    nextExtent = block.extentMinutes - boundedDelta;
  }

  if (!isWithinPlanningWindow(nextStart, nextExtent)) {
    return state;
  }

  if (nextStart === placement.startTime && nextExtent === block.extentMinutes) {
    return state;
  }

  return withQueueProjection({
    ...state,
    blocks: state.blocks.map((candidate) =>
      candidate.id === block.id
        ? {
            ...candidate,
            extentMinutes: nextExtent
          }
        : candidate
    ),
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

export const createCommittedPlacement = (
  laneId: DayLaneId,
  startTime: TimeOfDay,
  extentMinutes: number | undefined,
  laneById: Map<DayLaneId, DayLane>
): { laneId: DayLaneId; startTime: TimeOfDay; slot: { dayKey: DayKey; timeSlot: string }; extentMinutes?: number } => ({
  laneId,
  startTime,
  slot: buildSlot(laneById, laneId, startTime),
  extentMinutes
});

export const withQueueProjectionApplied = withQueueProjection;
