import { appendPlacement, createCommittedPlacement, getPlacementForBlock, removePlacement, withQueueProjectionApplied } from '../domain/board-rules';
import { WEEK_LANES } from '../domain/day-lane';
import type { BoardState, DayLaneId, PlacedBlock, TimeBlock, TimeBlockId } from '../domain/board-types';

type CommittedMetadata = {
  laneId: DayLaneId;
  order: number;
};

const withLaneOrdering = (placements: PlacedBlock[], laneId: DayLaneId): PlacedBlock[] => {
  const lanePlacements = placements
    .filter((placement) => placement.laneId === laneId)
    .sort((a, b) => a.order - b.order)
    .map((placement, order) => ({ ...placement, order }));

  return placements.filter((placement) => placement.laneId !== laneId).concat(lanePlacements);
};

const parseCommittedMetadata = (block: TimeBlock): CommittedMetadata | undefined => {
  const candidate = block.metadata?.committedPlacement;
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const laneId = Reflect.get(candidate, 'laneId');
  const order = Reflect.get(candidate, 'order');

  if (typeof laneId !== 'string' || typeof order !== 'number') {
    return undefined;
  }

  return { laneId, order };
};

const createInitialPlacements = (blocks: TimeBlock[]): PlacedBlock[] => {
  const laneById = new Map(WEEK_LANES.map((lane) => [lane.id, lane]));
  const placements: PlacedBlock[] = [];

  for (const block of blocks) {
    const committedPlacement = parseCommittedMetadata(block);
    if (block.state !== 'committed' || !committedPlacement || !laneById.has(committedPlacement.laneId)) {
      continue;
    }

    placements.push({
      id: `placement-${block.id}`,
      blockId: block.id,
      laneId: committedPlacement.laneId,
      order: committedPlacement.order,
      committedPlacement: createCommittedPlacement(committedPlacement.laneId, committedPlacement.order, laneById)
    });
  }

  return placements;
};

export const createBoardWeek = (blocks: TimeBlock[]): BoardState =>
  withQueueProjectionApplied({
    blocks,
    lanes: WEEK_LANES,
    placements: createInitialPlacements(blocks),
    queue: {
      id: 'planning-queue',
      status: 'paused',
      items: []
    }
  });

export const placeBlockOnLane = (state: BoardState, blockId: TimeBlockId, laneId: DayLaneId): BoardState =>
  appendPlacement(state, blockId, laneId);

export const movePlacedBlock = (state: BoardState, blockId: TimeBlockId, targetLaneId: DayLaneId): BoardState =>
  appendPlacement(state, blockId, targetLaneId);

export const returnBlockToPool = (state: BoardState, blockId: TimeBlockId): BoardState => removePlacement(state, blockId);

export const reorderPlacedBlock = (
  state: BoardState,
  blockId: TimeBlockId,
  laneId: DayLaneId,
  targetOrder: number
): BoardState => {
  const moving = getPlacementForBlock(state, blockId);
  if (!moving || moving.laneId !== laneId) {
    return state;
  }

  const lanePlacements = state.placements
    .filter((placement) => placement.laneId === laneId && placement.blockId !== blockId)
    .sort((a, b) => a.order - b.order);

  lanePlacements.splice(Math.max(0, Math.min(targetOrder, lanePlacements.length)), 0, moving);

  return withQueueProjectionApplied({
    ...state,
    placements: withLaneOrdering(
      state.placements
        .filter((placement) => placement.laneId !== laneId)
        .concat(lanePlacements.map((placement, order) => ({ ...placement, order }))),
      laneId
    )
  });
};
