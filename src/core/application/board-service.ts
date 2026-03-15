import {
  appendPlacement,
  createCommittedPlacement,
  createQueueId,
  getPlacementForBlock,
  removePlacement,
  resizePlacedBlock,
  withQueueProjectionApplied
} from '../domain/board-rules';
import { WEEK_LANES } from '../domain/day-lane';
import type { BoardState, DayKey, DayLaneId, PlacedBlock, TimeBlock, TimeBlockId, TimeOfDay } from '../domain/board-types';
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

type ImportedPlacementMetadata = {
  importedDayKey: DayKey;
  importedStartTime: TimeOfDay;
  importedEndTime?: TimeOfDay;
};

const parseImportedPlacementMetadata = (block: TimeBlock): ImportedPlacementMetadata | undefined => {
  const importedDayKey = block.metadata?.importedDayKey;
  const importedStartTime = block.metadata?.importedStartTime;
  const importedEndTime = block.metadata?.importedEndTime;

  if (typeof importedDayKey !== 'string' || typeof importedStartTime !== 'string') {
    return undefined;
  }

  if (importedEndTime !== undefined && typeof importedEndTime !== 'string') {
    return undefined;
  }

  return {
    importedDayKey: importedDayKey as DayKey,
    importedStartTime: clampToPlanningWindow(importedStartTime),
    importedEndTime
  };
};

const laneIdByDayKey = new Map(WEEK_LANES.map((lane) => [lane.dayKey, lane.id]));

const normalizeTemplateExtent = (block: TimeBlock): TimeBlock =>
  block.state === 'template'
    ? {
        ...block,
        extentMinutes: 30
      }
    : block;

const createSpawnedBlockFromTemplate = (state: BoardState, templateBlock: TimeBlock): TimeBlock => {
  const siblingCount = state.blocks.filter((candidate) => candidate.metadata?.templateSourceBlockId === templateBlock.id).length;

  return {
    ...templateBlock,
    id: `spawn-${templateBlock.id}-${siblingCount + 1}`,
    extentMinutes: 30,
    state: 'uncommitted',
    metadata: {
      ...templateBlock.metadata,
      templateSourceBlockId: templateBlock.id,
      templatePspElement: templateBlock.metadata?.pspElement ?? templateBlock.title
    }
  };
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

export const createBoardWeek = (blocks: TimeBlock[]): BoardState => {
  const normalizedBlocks = blocks.map((block) => normalizeTemplateExtent(block));

  return withQueueProjectionApplied({
    blocks: normalizedBlocks,
    lanes: WEEK_LANES,
    placements: createInitialPlacements(normalizedBlocks),
    queue: {
      id: createQueueId(),
      status: 'paused',
      items: []
    }
  });
};

export const placeBlockOnLane = (state: BoardState, blockId: TimeBlockId, laneId: DayLaneId, startTime: TimeOfDay): BoardState => {
  const block = state.blocks.find((candidate) => candidate.id === blockId);
  if (!block) {
    return state;
  }

  if (block.state !== 'template') {
    return appendPlacement(state, blockId, laneId, startTime);
  }

  const spawnedBlock = createSpawnedBlockFromTemplate(state, block);
  return appendPlacement(
    {
      ...state,
      blocks: state.blocks.concat(spawnedBlock)
    },
    spawnedBlock.id,
    laneId,
    startTime
  );
};

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

export const autoPlaceImportedBlock = (state: BoardState, blockId: TimeBlockId): BoardState => {
  const block = state.blocks.find((candidate) => candidate.id === blockId);
  if (!block || block.state !== 'imported') {
    return state;
  }

  const importedPlacement = parseImportedPlacementMetadata(block);
  if (!importedPlacement) {
    return state;
  }

  const laneId = laneIdByDayKey.get(importedPlacement.importedDayKey);
  if (!laneId) {
    return state;
  }

  return placeBlockOnLane(state, blockId, laneId, importedPlacement.importedStartTime);
};

export const updateBlockDescription = (state: BoardState, blockId: TimeBlockId, description: string): BoardState => ({
  ...state,
  blocks: state.blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          metadata: {
            ...block.metadata,
            description
          }
        }
      : block
  )
});
