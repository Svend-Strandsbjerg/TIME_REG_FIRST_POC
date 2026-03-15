import { appendPlacement, getPlacementForBlock, removePlacement } from '../domain/board-rules';
import { WEEK_LANES } from '../domain/day-lane';
import type { BoardState, DayLaneId, PlacedBlock, TimeBlock, TimeBlockId } from '../domain/board-types';

const withLaneOrdering = (placements: PlacedBlock[], laneId: DayLaneId): PlacedBlock[] => {
  const lanePlacements = placements
    .filter((placement) => placement.laneId === laneId)
    .sort((a, b) => a.order - b.order)
    .map((placement, order) => ({ ...placement, order }));

  return placements.filter((placement) => placement.laneId !== laneId).concat(lanePlacements);
};

export const createBoardWeek = (blocks: TimeBlock[]): BoardState => ({
  blocks,
  lanes: WEEK_LANES,
  placements: []
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

  return {
    ...state,
    placements: withLaneOrdering(
      state.placements
        .filter((placement) => placement.laneId !== laneId)
        .concat(lanePlacements.map((placement, order) => ({ ...placement, order }))),
      laneId
    )
  };
};
