import {
  appendPlacement,
  createCommittedPlacement,
  getPlacementForBlock,
  removePlacement,
  resizePlacedBlock,
  withQueueProjectionApplied
} from '../domain/board-rules';
import { WEEK_LANES } from '../domain/day-lane';
import type { BoardState, DayLaneId, PlacedBlock, TimeBlock, TimeBlockId, TimeOfDay } from '../domain/board-types';
import { clampToPlanningWindow } from '../domain/time-slot';

type CommittedMetadata = {
  laneId: DayLaneId;
  startTime: TimeOfDay;
  extentMinutes?: number;
};

const parseCommittedMetadata = (block: TimeBlock): CommittedMetadata | undefined => {
  const candidate = block.metadata?.committedPlacement;
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const laneId = Reflect.get(candidate, 'laneId');
  const startTime = Reflect.get(candidate, 'startTime');
  const extentMinutes = Reflect.get(candidate, 'extentMinutes');

  if (typeof laneId !== 'string' || typeof startTime !== 'string') {
    return undefined;
  }

  if (extentMinutes !== undefined && typeof extentMinutes !== 'number') {
    return undefined;
  }

  return { laneId, startTime: clampToPlanningWindow(startTime), extentMinutes };
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
      startTime: committedPlacement.startTime,
      committedPlacement: createCommittedPlacement(
        committedPlacement.laneId,
        committedPlacement.startTime,
        committedPlacement.extentMinutes,
        laneById
      )
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

export const placeBlockOnLane = (state: BoardState, blockId: TimeBlockId, laneId: DayLaneId, startTime: TimeOfDay): BoardState =>
  appendPlacement(state, blockId, laneId, startTime);

export const movePlacedBlock = (state: BoardState, blockId: TimeBlockId, targetLaneId: DayLaneId, startTime: TimeOfDay): BoardState =>
  appendPlacement(state, blockId, targetLaneId, startTime);

export const returnBlockToPool = (state: BoardState, blockId: TimeBlockId): BoardState => removePlacement(state, blockId);

export const movePlacedBlockWithinLane = (state: BoardState, blockId: TimeBlockId, startTime: TimeOfDay): BoardState => {
  const placement = getPlacementForBlock(state, blockId);
  if (!placement) {
    return state;
  }

  return appendPlacement(state, blockId, placement.laneId, startTime);
};

export const resizeBlockFromBottom = (state: BoardState, blockId: TimeBlockId, slotDelta: number): BoardState =>
  resizePlacedBlock(state, blockId, { edge: 'bottom', slotDelta });

export const resizeBlockFromTop = (state: BoardState, blockId: TimeBlockId, slotDelta: number): BoardState =>
  resizePlacedBlock(state, blockId, { edge: 'top', slotDelta });
