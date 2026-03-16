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
import {
  clampToPlanningWindow,
  deriveEndTime,
  PLANNING_WINDOW_END,
  PLANNING_WINDOW_START,
  SLOT_MINUTES,
  shiftTimeByMinutes
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

  buildQueueItem({
    id: queueItemId,
    queueId,
    block,
    slot,
    operation,
    reason
  });

  const startTime = slot.timeSlot;
  const endTime = deriveEndTime(startTime, block.extentMinutes);
  const interval = formatInterval(startTime, endTime);

  return {
    id: String(queueItemId),
    queueId,
    blockId: block.id,
    title: block.title,
    dayKey: slot.dayKey,
    startTime,
    endTime,
    interval,
    operation,
    reason
  };
};

const resizePlacementSafe = (
  placement: { startTime: TimeOfDay; extentMinutes: number },
  instruction: { edge: 'top' | 'bottom'; slotDelta: number }
): { startTime: TimeOfDay; extentMinutes: number } => {
  try {
    const resized = resizePlacement({
      startTime: placement.startTime,
      extentMinutes: placement.extentMinutes,
      edge: instruction.edge,
      slotDelta: instruction.slotDelta,
      slotMinutes: SLOT_MINUTES,
      minimumExtentMinutes: SLOT_MINUTES,
      planningWindow: {
        start: PLANNING_WINDOW_START,
        end: PLANNING_WINDOW_END
      }
    }) as { startTime?: TimeOfDay; extentMinutes?: number; start?: TimeOfDay; extent?: number };

    const nextStart = resized.startTime ?? resized.start ?? placement.startTime;
    const nextExtent = resized.extentMinutes ?? resized.extent ?? placement.extentMinutes;
    if (!nextStart || !Number.isFinite(nextExtent) || nextExtent <= 0) {
      throw new Error('invalid resize result');
    }

    return {
      startTime: clampToPlanningWindow(nextStart),
      extentMinutes: Math.max(SLOT_MINUTES, Math.round(nextExtent / SLOT_MINUTES) * SLOT_MINUTES)
    };
  } catch {
    const deltaMinutes = instruction.slotDelta * SLOT_MINUTES;
    if (instruction.edge === 'bottom') {
      return {
        startTime: placement.startTime,
        extentMinutes: Math.max(SLOT_MINUTES, placement.extentMinutes + deltaMinutes)
      };
    }

    const nextExtent = Math.max(SLOT_MINUTES, placement.extentMinutes - deltaMinutes);
    const appliedDelta = placement.extentMinutes - nextExtent;

    return {
      startTime: clampToPlanningWindow(shiftTimeByMinutes(placement.startTime, appliedDelta)),
      extentMinutes: nextExtent
    };
  }
};

const changeBlockExtentSafe = (block: TimeBlock, extentMinutes: number): TimeBlock => {
  try {
    const changed = changeBlockExtent(block, extentMinutes) as Partial<TimeBlock>;
    return {
      ...block,
      ...changed,
      extentMinutes
    };
  } catch {
    return {
      ...block,
      extentMinutes
    };
  }
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
    items: queueItems.sort((a, b) => a.id.localeCompare(b.id))
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

  const resizeResult = resizePlacementSafe({ startTime: placement.startTime, extentMinutes: block.extentMinutes }, instruction);
  const nextStart = resizeResult.startTime;
  const nextExtent = resizeResult.extentMinutes;

  if (nextStart === placement.startTime && nextExtent === block.extentMinutes) {
    return state;
  }

  return withQueueProjection({
    ...state,
    blocks: state.blocks.map((candidate) => (candidate.id === block.id ? changeBlockExtentSafe(candidate, nextExtent) : candidate)),
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

export const createQueueId = (scope = 'weekly-planning'): QueueId => {
  const generated = createFoundationQueueId(scope);
  return generated.startsWith('queue-') ? generated : `queue-${generated}`;
};

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
