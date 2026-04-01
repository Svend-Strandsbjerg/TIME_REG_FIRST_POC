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
import { withBlockMetadataDefaults } from '../domain/block-metadata';
import { clampToPlanningWindow } from '../domain/time-slot';

type DragOrigin = 'lane' | 'candidate-imported' | 'candidate-template' | 'candidate-changed-committed';

type PlaceBlockContext = {
  dragOrigin?: DragOrigin;
};

const DEBUG_SEEDED_CHANGED_COMMITTED_IDS = new Set(['demo-committed-move', 'demo-committed-remove', 'demo-committed-reschedule']);

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

  return withBlockMetadataDefaults(changeBlockState(normalized, 'uncommitted') as TimeBlock);
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

    return withBlockMetadataDefaults({
      ...block,
      ...normalizedByFoundation,
      extentMinutes: block.state === 'template' ? 30 : hasValidExtent ? Number(candidateExtent) : fallbackExtent
    });
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

export const placeBlockOnLane = (
  state: BoardState,
  blockId: TimeBlockId,
  laneId: DayLaneId,
  startTime: TimeOfDay,
  context?: PlaceBlockContext
): BoardState => {
  const block = state.blocks.find((candidate) => candidate.id === blockId);
  if (!block) {
    return state;
  }

  const existingPlacement = getPlacementForBlock(state, blockId);
  const committedPlacement = existingPlacement?.committedPlacement;
  const isChangedCommittedCandidateDrag = context?.dragOrigin === 'candidate-changed-committed';
  const shouldSnapToCommittedBaseline =
    block.state === 'committed' &&
    (existingPlacement?.laneId === 'unplanned' || isChangedCommittedCandidateDrag) &&
    committedPlacement?.laneId === laneId;

  const resolvedStartTime = shouldSnapToCommittedBaseline ? committedPlacement.startTime : startTime;

  if (DEBUG_SEEDED_CHANGED_COMMITTED_IDS.has(blockId)) {
    console.info('[restore-debug][drop-mutation]', {
      blockId,
      dragOrigin: context?.dragOrigin,
      requestedDrop: { laneId, startTime },
      placementBefore: existingPlacement
        ? { laneId: existingPlacement.laneId, startTime: existingPlacement.startTime, committedPlacement: existingPlacement.committedPlacement }
        : null,
      shouldSnapToCommittedBaseline,
      resolvedStartTime
    });
  }

  if (block.state !== 'template') {
    return appendPlacement(state, blockId, laneId, resolvedStartTime);
  }

  const spawnedBlock = createSpawnedBlockFromTemplate(state, block);
  return appendPlacement(
    {
      ...state,
      blocks: state.blocks.concat(spawnedBlock)
    },
    spawnedBlock.id,
    laneId,
    resolvedStartTime
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

  return placeBlockOnLane(state, blockId, laneId, importedPlacement.importedStartTime, { dragOrigin: 'candidate-imported' });
};

export const updateBlockDetails = (state: BoardState, blockId: TimeBlockId, updates: BlockDetailsUpdate): BoardState => ({
  ...state,
  blocks: state.blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          metadata: withMergedBlockMetadata(block.metadata, updates)
        }
      : block
  )
});

type BlockDetailsUpdate = {
  description?: string;
  taskType?: string;
  taskComponent?: string;
  activityType?: string;
  billingControlCategory?: string;
  overtimeCategory?: string;
  wbsElement?: string;
  internalOrder?: string;
};

const withMergedBlockMetadata = (metadata: TimeBlock['metadata'], updates: BlockDetailsUpdate): Record<string, unknown> => {
  const current = (metadata ?? {}) as Record<string, unknown>;

  return {
    ...current,
    ...updates
  };
};

export const updateBlockDescription = (state: BoardState, blockId: TimeBlockId, description: string): BoardState =>
  updateBlockDetails(state, blockId, { description });

const cloneMetadataSafely = (metadata: TimeBlock['metadata']): Record<string, unknown> => {
  if (!metadata) {
    return {};
  }

  try {
    return structuredClone(metadata) as Record<string, unknown>;
  } catch {
    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  }
};

const createCopiedBlockId = (state: BoardState, sourceBlockId: TimeBlockId): TimeBlockId => {
  const prefix = `copy-${sourceBlockId}-`;
  const existingIndexes = state.blocks
    .map((block) => {
      if (!block.id.startsWith(prefix)) {
        return 0;
      }

      const suffix = Number(block.id.slice(prefix.length));
      return Number.isFinite(suffix) && suffix > 0 ? suffix : 0;
    })
    .filter((value) => value > 0);

  const nextIndex = existingIndexes.length > 0 ? Math.max(...existingIndexes) + 1 : 1;
  return `${prefix}${nextIndex}`;
};

export const createDraggedBlockCopy = (
  state: BoardState,
  sourceBlockId: TimeBlockId
): { state: BoardState; copiedBlockId: TimeBlockId } | null => {
  const sourceBlock = state.blocks.find((candidate) => candidate.id === sourceBlockId);
  if (!sourceBlock) {
    return null;
  }

  const copiedBlockId = createCopiedBlockId(state, sourceBlockId);
  const sourceMetadata = cloneMetadataSafely(sourceBlock.metadata);

  const instantiated = instantiateBlockFromSourceSafe(sourceBlock, {
    id: copiedBlockId,
    state: 'uncommitted',
    extentMinutes: sourceBlock.extentMinutes,
    metadata: sourceMetadata
  }) as Partial<TimeBlock>;

  const copiedBlock = withBlockMetadataDefaults({
    ...sourceBlock,
    ...instantiated,
    id: copiedBlockId,
    state: 'uncommitted',
    extentMinutes: sourceBlock.extentMinutes,
    metadata: {
      ...sourceMetadata,
      ...(instantiated.metadata ?? {})
    }
  });

  return {
    state: {
      ...state,
      blocks: state.blocks.concat(copiedBlock)
    },
    copiedBlockId
  };
};

export const discardBlockById = (state: BoardState, blockId: TimeBlockId): BoardState =>
  withQueueProjectionApplied({
    ...state,
    blocks: state.blocks.filter((block) => block.id !== blockId),
    placements: state.placements.filter((placement) => placement.blockId !== blockId)
  });
