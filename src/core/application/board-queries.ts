import { formatInterval } from '../domain/board-rules';
import { deriveEndTime, generatePlanningSlots, toMinutesOfDay } from '../domain/time-slot';
import type { BlockState, BoardState, DayLane, QueueItem, TimeBlock, TimeEntryDraft, TimeOfDay } from '../domain/board-types';

export type TimeBlockCardView = {
  block: TimeBlock;
  state: BlockState;
  visualState: BlockState;
  isTemplate: boolean;
  templateSourceBlockId?: string;
  startTime?: TimeOfDay;
  endTime?: TimeOfDay;
  interval?: string;
  topOffsetMinutes?: number;
  heightMinutes?: number;
  layoutColumn?: number;
  layoutColumnCount?: number;
};

export type DayLaneView = {
  lane: DayLane;
  placedBlocks: TimeBlockCardView[];
  totalHours: number;
  slots: TimeOfDay[];
};

export type WeeklyBoardView = {
  importedCandidates: TimeBlockCardView[];
  templateCandidates: TimeBlockCardView[];
  changedCommittedCandidates: TimeBlockCardView[];
  lanes: DayLaneView[];
  summary: {
    plannedBlocks: number;
    unplannedBlocks: number;
  };
  queue: {
    id: string;
    status: 'paused';
    items: QueueItem[];
  };
};

const overlaps = (a: TimeBlockCardView, b: TimeBlockCardView): boolean => {
  if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) {
    return false;
  }

  const aStart = toMinutesOfDay(a.startTime);
  const aEnd = toMinutesOfDay(a.endTime);
  const bStart = toMinutesOfDay(b.startTime);
  const bEnd = toMinutesOfDay(b.endTime);

  return aStart < bEnd && bStart < aEnd;
};

const withParallelLayout = (placedBlocks: TimeBlockCardView[]): TimeBlockCardView[] => {
  const sorted = placedBlocks
    .slice()
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || (a.endTime ?? '').localeCompare(b.endTime ?? ''));

  const groups: TimeBlockCardView[][] = [];

  for (const card of sorted) {
    const group = groups.find((candidate) => candidate.some((existing) => overlaps(existing, card)));
    if (group) {
      group.push(card);
    } else {
      groups.push([card]);
    }
  }

  return groups.flatMap((group) =>
    group.map((card, index) => ({
      ...card,
      layoutColumn: index,
      layoutColumnCount: group.length
    }))
  );
};

const isCommittedPlacementMatchingBaseline = (state: BoardState, blockId: string): boolean => {
  const block = state.blocks.find((candidate) => candidate.id === blockId);
  const placement = state.placements.find((candidate) => candidate.blockId === blockId);

  if (!block || block.state !== 'committed' || !placement?.committedPlacement || placement.laneId === 'unplanned') {
    return false;
  }

  const baseline = placement.committedPlacement;
  if (placement.laneId !== baseline.laneId || placement.startTime !== baseline.startTime) {
    return false;
  }

  return baseline.extentMinutes === undefined || baseline.extentMinutes === block.extentMinutes;
};

const isCommittedPlacementChangedFromBaseline = (state: BoardState, blockId: string): boolean => {
  const block = state.blocks.find((candidate) => candidate.id === blockId);
  const placement = state.placements.find((candidate) => candidate.blockId === blockId);

  if (!block || block.state !== 'committed' || !placement?.committedPlacement) {
    return false;
  }

  return !isCommittedPlacementMatchingBaseline(state, blockId);
};

const toCandidateCard = (block: TimeBlock): TimeBlockCardView => {
  const importedStartTime = typeof block.metadata?.importedStartTime === 'string' ? block.metadata.importedStartTime : undefined;
  const importedEndTime = typeof block.metadata?.importedEndTime === 'string' ? block.metadata.importedEndTime : undefined;
  const resolvedEndTime = importedStartTime ? importedEndTime ?? deriveEndTime(importedStartTime, block.extentMinutes) : undefined;

  return {
    block,
    state: block.state,
    visualState: block.state,
    isTemplate: block.state === 'template',
    templateSourceBlockId: typeof block.metadata?.templateSourceBlockId === 'string' ? block.metadata.templateSourceBlockId : undefined,
    startTime: block.state === 'imported' ? importedStartTime : undefined,
    endTime: block.state === 'imported' ? resolvedEndTime : undefined,
    interval: block.state === 'imported' && importedStartTime && resolvedEndTime ? formatInterval(importedStartTime, resolvedEndTime) : undefined
  };
};

export const buildPlanningView = (state: BoardState): WeeklyBoardView => {
  const slots = generatePlanningSlots();

  console.info('[buildPlanningView] state snapshot', {
    blockCount: state.blocks.length,
    placementCount: state.placements.length,
    seededBlocks: state.blocks
      .filter((block) => block.id.startsWith('demo-'))
      .map((block) => ({ id: block.id, state: block.state, metadata: block.metadata }))
  });
  const planningStartMinutes = toMinutesOfDay(slots[0] ?? '06:00');

  const placedBlockIds = new Set(state.placements.filter((placement) => placement.laneId !== 'unplanned').map((placement) => placement.blockId));
  const blockLookup = new Map(state.blocks.map((block) => [block.id, block]));

  const importedCandidates = state.blocks
    .filter((block) => block.state === 'imported' && !placedBlockIds.has(block.id))
    .map((block) => toCandidateCard(block));

  const templateCandidates = state.blocks
    .filter((block) => block.state === 'template')
    .map((block) => toCandidateCard(block));

  const changedCommittedCandidates = state.placements
    .filter((placement) => isCommittedPlacementChangedFromBaseline(state, placement.blockId))
    .map((placement) => blockLookup.get(placement.blockId))
    .filter((block): block is TimeBlock => block !== undefined && block.state === 'committed')
    .map((block) => ({
      ...toCandidateCard(block),
      visualState: 'uncommitted' as const
    }));

  console.info('[buildPlanningView] derived candidate ids', {
    importedCount: importedCandidates.length,
    importedIds: importedCandidates.map((card) => card.block.id),
    templateCount: templateCandidates.length,
    templateIds: templateCandidates.map((card) => card.block.id),
    changedCommittedCount: changedCommittedCandidates.length,
    changedCommittedIds: changedCommittedCandidates.map((card) => card.block.id)
  });

  const lanes = [...state.lanes]
    .sort((a, b) => a.order - b.order)
    .map((lane) => {
      const placements = state.placements
        .filter((placement) => placement.laneId === lane.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const placedBlocks: TimeBlockCardView[] = [];

      for (const placement of placements) {
        const block = blockLookup.get(placement.blockId);
        if (!block) {
          continue;
        }

        const endTime = deriveEndTime(placement.startTime, block.extentMinutes);
        const visualState =
          block.state === 'committed' && isCommittedPlacementMatchingBaseline(state, block.id) ? 'committed' : 'uncommitted';

        placedBlocks.push({
          block,
          state: block.state,
          visualState,
          isTemplate: block.state === 'template',
          templateSourceBlockId: typeof block.metadata?.templateSourceBlockId === 'string' ? block.metadata.templateSourceBlockId : undefined,
          startTime: placement.startTime,
          endTime,
          interval: formatInterval(placement.startTime, endTime),
          topOffsetMinutes: toMinutesOfDay(placement.startTime) - planningStartMinutes,
          heightMinutes: block.extentMinutes
        });
      }

      const withLayout = withParallelLayout(placedBlocks);
      const totalHours = withLayout.reduce((sum, card) => sum + card.block.extentMinutes / 60, 0);

      return {
        lane,
        placedBlocks: withLayout,
        totalHours: Number(totalHours.toFixed(2)),
        slots
      };
    });

  return {
    importedCandidates,
    templateCandidates,
    changedCommittedCandidates,
    lanes,
    summary: {
      plannedBlocks: placedBlockIds.size,
      unplannedBlocks: importedCandidates.length + templateCandidates.length + changedCommittedCandidates.length
    },
    queue: state.queue
  };
};

export const convertPlacedBlockToTimeEntryDraft = (state: BoardState): TimeEntryDraft[] => {
  const laneLookup = new Map(state.lanes.map((lane) => [lane.id, lane]));
  const blockLookup = new Map(state.blocks.map((block) => [block.id, block]));

  return state.placements
    .filter((placement) => placement.laneId !== 'unplanned')
    .slice()
    .sort((a, b) => a.laneId.localeCompare(b.laneId) || a.startTime.localeCompare(b.startTime))
    .map((placement, index) => {
      const lane = laneLookup.get(placement.laneId);
      const block = blockLookup.get(placement.blockId);

      if (!lane || !block) {
        return undefined;
      }

      return {
        technicalDraftId: `draft-${index + 1}-${placement.id}`,
        blockId: block.id,
        laneId: lane.id,
        dayKey: lane.dayKey,
        startTime: placement.startTime,
        title: block.title,
        extentMinutes: block.extentMinutes
      };
    })
    .filter((draft): draft is TimeEntryDraft => Boolean(draft));
};
