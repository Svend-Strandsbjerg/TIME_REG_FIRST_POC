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
  TimeBlockId
} from './board-types';
import { slotFromOrder } from './time-slot';

export const getPlacementForBlock = (state: BoardState, blockId: TimeBlockId) =>
  state.placements.find((placement) => placement.blockId === blockId);

export const getBlockById = (state: BoardState, blockId: TimeBlockId) => state.blocks.find((block) => block.id === blockId);

const normalizeLaneOrders = (placements: PlacedBlock[]): PlacedBlock[] => {
  const byLane = new Map<DayLaneId, PlacedBlock[]>();

  for (const placement of placements) {
    const existing = byLane.get(placement.laneId) ?? [];
    existing.push(placement);
    byLane.set(placement.laneId, existing);
  }

  return Array.from(byLane.values())
    .flatMap((lanePlacements) =>
      lanePlacements
        .sort((a, b) => a.order - b.order)
        .map((placement, order) => ({ ...placement, order }))
    )
    .sort((a, b) => a.laneId.localeCompare(b.laneId) || a.order - b.order);
};

const buildSlot = (laneLookup: Map<DayLaneId, DayLane>, laneId: DayLaneId, order: number): PlacementSlot => {
  const lane = laneLookup.get(laneId);
  if (!lane) {
    throw new Error(`Unknown lane id: ${laneId}`);
  }

  return {
    dayKey: lane.dayKey,
    timeSlot: slotFromOrder(order)
  };
};

const buildQueueItem = (
  queueId: string,
  block: TimeBlock,
  slot: PlacementSlot,
  operation: QueueOperation,
  reason: string
): QueueItem => ({
  id: `queue-item-${block.id}`,
  queueId,
  blockId: block.id,
  title: block.title,
  dayKey: slot.dayKey,
  timeSlot: slot.timeSlot,
  operation,
  reason
});

const laneLookupFromState = (state: BoardState) => new Map(state.lanes.map((lane) => [lane.id, lane]));

const queueItemForBlock = (state: BoardState, blockId: TimeBlockId): QueueItem | undefined => {
  const placement = getPlacementForBlock(state, blockId);
  const block = getBlockById(state, blockId);
  if (!block || !placement) {
    return undefined;
  }

  const laneLookup = laneLookupFromState(state);

  if (block.state === 'uncommitted') {
    return buildQueueItem(
      state.queue.id,
      block,
      buildSlot(laneLookup, placement.laneId, placement.order),
      'create',
      'Uncommitted block is placed and pending creation in target system.'
    );
  }

  if (block.state !== 'committed' || !placement.committedPlacement) {
    return undefined;
  }

  const committed = placement.committedPlacement;

  if (placement.laneId === committed.laneId && placement.order === committed.order) {
    return undefined;
  }

  if (placement.laneId === 'unplanned') {
    return buildQueueItem(state.queue.id, block, committed.slot, 'delete', 'Committed block was removed from its committed slot.');
  }

  return buildQueueItem(
    state.queue.id,
    block,
    buildSlot(laneLookup, placement.laneId, placement.order),
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
    items: queueItems.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.timeSlot.localeCompare(b.timeSlot))
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
  laneSize: number
): { laneId: DayLaneId; order: number } => {
  if (block.state === 'committed' && placement.laneId === 'unplanned' && placement.committedPlacement) {
    return {
      laneId: placement.committedPlacement.laneId,
      order: placement.committedPlacement.order
    };
  }

  return {
    laneId: targetLaneId,
    order: laneSize
  };
};

export const appendPlacement = (state: BoardState, blockId: TimeBlockId, laneId: DayLaneId): BoardState => {
  const existing = getPlacementForBlock(state, blockId);
  const block = getBlockById(state, blockId);
  if (!block) {
    return state;
  }

  const laneSize = state.placements.filter((placement) => placement.laneId === laneId).length;

  const nextPlacements = existing
    ? state.placements.map((placement) => {
        if (placement.blockId !== blockId) {
          return placement;
        }

        const target = restoreCommittedPlacementIfNeeded(block, placement, laneId, laneSize);
        return { ...placement, laneId: target.laneId, order: target.order };
      })
    : state.placements.concat({
        id: `placement-${blockId}`,
        blockId,
        laneId,
        order: laneSize
      });

  return withQueueProjection({
    ...state,
    placements: normalizeLaneOrders(nextPlacements)
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
          placement.blockId === blockId ? { ...placement, laneId: 'unplanned', order: 0 } : placement
        )
      : state.placements.filter((placement) => placement.blockId !== blockId);

  return withQueueProjection({
    ...state,
    placements: normalizeLaneOrders(nextPlacements)
  });
};

export const createCommittedPlacement = (
  laneId: DayLaneId,
  order: number,
  laneById: Map<DayLaneId, DayLane>
): { laneId: DayLaneId; order: number; slot: { dayKey: DayKey; timeSlot: string } } => ({
  laneId,
  order,
  slot: buildSlot(laneById, laneId, order)
});

export const withQueueProjectionApplied = withQueueProjection;
