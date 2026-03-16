import {
  changeBlockState,
  createPlacementSnapshot,
  instantiateBlockFromSource,
  normalizeBlockExtent
} from '@strandsbjerg/block-engine-foundation';
import {
  appendPlacement,
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

const normalizeBlockExtentSafe = (block: TimeBlock, defaultExtentMinutes: number): TimeBlock => {
  try {
    return normalizeBlockExtent(block, { defaultExtentMinutes }) as TimeBlock;
  } catch {
    return block;
  }
};

const createPlacementSnapshotSafe = (placement: {
  laneId: DayLaneId;
  startTime: TimeOfDay;
  extentMinutes?: number;
}): { laneId: DayLaneId; startTime: TimeOfDay; extentMinutes?: number } => {
  try {
    return createPlacementSnapshot(placement) as { laneId: DayLaneId; startTime: TimeOfDay; extentMinutes?: number };
  } catch {
    return placement;
  }
};

const instantiateBlockFromSourceSafe = (
  sourceBlock: TimeBlock,
  options: {
    id: string;
    state: 'uncommitted';
    extentMinutes: number;
    metadata: Record<string, unknown>;
  }
): Partial<TimeBlock> => {
  try {
    return instantiateBlockFromSource(sourceBlock, options) as Partial<TimeBlock>;
  } catch {
    return {
      ...sourceBlock,
      ...options
    };
  }
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

const createSpawnedBlockFromTemplate = (state: BoardState, templateBlock: TimeBlock): TimeBlock => {
  const siblingCount = state.blocks.filter((candidate) => candidate.metadata?.templateSourceBlockId === templateBlock.id).length;
  const spawnedId = `spawn-${templateBlock.id}-${siblingCount + 1}`;

  const instantiated = instantiateBlockFromSourceSafe(templateBlock, {
    id: spawnedId,
    state: 'uncommitted',
    extentMinutes: 30,
    metadata: {
      ...templateBlock.metadata,
      templateSourceBlockId: templateBlock.id,
      templatePspElement: templateBlock.metadata?.pspElement ?? templateBlock.title
    }
  }) as Partial<TimeBlock>;

  const normalized: TimeBlock = {
    ...templateBlock,
    ...instantiated,
    id: spawnedId,
    state: 'uncommitted',
    extentMinutes: 30,
    metadata: {
      ...templateBlock.metadata,
      ...instantiated.metadata,
      templateSourceBlockId: templateBlock.id,
      templatePspElement: templateBlock.metadata?.pspElement ?? templateBlock.title
    }
  };

  return changeBlockState(normalized, 'uncommitted') as TimeBlock;
};

const createInitialPlacements = (blocks: TimeBlock[]): PlacedBlock[] => {
  const laneById = new Map(WEEK_LANES.map((lane) => [lane.id, lane]));
  const placements: PlacedBlock[] = [];

  for (const block of blocks) {
    const committedPlacement = parseCommittedMetadata(block);
    if (block.state !== 'committed' || !committedPlacement || !laneById.has(committedPlacement.laneId)) {
      continue;
    }

    const snapshot = createPlacementSnapshotSafe({
      laneId: committedPlacement.laneId,
      startTime: committedPlacement.startTime,
      extentMinutes: committedPlacement.extentMinutes
    });

    const laneId = snapshot.laneId;
    const startTime = snapshot.startTime;
    const extentMinutes = snapshot.extentMinutes;
    const lane = laneById.get(laneId);
    if (!lane) {
      continue;
    }

    placements.push({
      id: `placement-${block.id}`,
      blockId: block.id,
      laneId,
      startTime,
      committedPlacement: {
        laneId,
        startTime,
        extentMinutes,
        slot: {
          dayKey: lane.dayKey,
          timeSlot: startTime
        }
      }
    });
  }

  return placements;
};

export const createBoardWeek = (blocks: TimeBlock[]): BoardState => {
  const normalizedBlocks = blocks.map((block) => {
    const defaultExtentMinutes = block.state === 'template' ? 30 : 60;
    const normalizedByFoundation = normalizeBlockExtentSafe(block, defaultExtentMinutes);
    const candidateExtent = normalizedByFoundation.extentMinutes;
    const hasValidExtent = Number.isFinite(candidateExtent) && Number(candidateExtent) > 0;

    const fallbackExtent = Number.isFinite(block.extentMinutes) && block.extentMinutes > 0 ? block.extentMinutes : defaultExtentMinutes;

    return {
      ...block,
      ...normalizedByFoundation,
      extentMinutes: block.state === 'template' ? 30 : hasValidExtent ? Number(candidateExtent) : fallbackExtent
    };
  });

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
