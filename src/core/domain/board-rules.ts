import type { BoardState, DayLaneId, PlacedBlock, TimeBlockId } from './board-types';

export const getPlacementForBlock = (state: BoardState, blockId: TimeBlockId) =>
  state.placements.find((placement) => placement.blockId === blockId);

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
    );
};

export const appendPlacement = (state: BoardState, blockId: TimeBlockId, laneId: DayLaneId): BoardState => {
  const existing = getPlacementForBlock(state, blockId);
  const laneSize = state.placements.filter((placement) => placement.laneId === laneId).length;

  const nextPlacements = existing
    ? state.placements.map((placement) =>
        placement.blockId === blockId ? { ...placement, laneId, order: laneSize } : placement
      )
    : state.placements.concat({
        id: `placement-${blockId}`,
        blockId,
        laneId,
        order: laneSize
      });

  return {
    ...state,
    placements: normalizeLaneOrders(nextPlacements)
  };
};

export const removePlacement = (state: BoardState, blockId: TimeBlockId): BoardState => ({
  ...state,
  placements: normalizeLaneOrders(state.placements.filter((placement) => placement.blockId !== blockId))
});
