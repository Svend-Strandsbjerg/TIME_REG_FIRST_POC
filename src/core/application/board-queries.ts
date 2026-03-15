import { durationToSize } from '../domain/time-block';
import type { BoardState, DayLane, TimeBlock, TimeEntryDraft } from '../domain/board-types';

export type TimeBlockCardView = {
  block: TimeBlock;
  size: ReturnType<typeof durationToSize>;
};

export type DayLaneView = {
  lane: DayLane;
  placedBlocks: TimeBlockCardView[];
};

export type WeeklyBoardView = {
  availableBlocks: TimeBlockCardView[];
  lanes: DayLaneView[];
  summary: {
    plannedBlocks: number;
    unplannedBlocks: number;
  };
};

export const buildPlanningView = (state: BoardState): WeeklyBoardView => {
  const placedBlockIds = new Set(state.placements.map((placement) => placement.blockId));
  const blockLookup = new Map(state.blocks.map((block) => [block.id, block]));

  const availableBlocks = state.blocks
    .filter((block) => !placedBlockIds.has(block.id))
    .map((block) => ({ block, size: durationToSize(block.durationMinutes) }));

  const lanes = [...state.lanes]
    .sort((a, b) => a.order - b.order)
    .map((lane) => {
      const placements = state.placements
        .filter((placement) => placement.laneId === lane.id)
        .sort((a, b) => a.order - b.order);

      return {
        lane,
        placedBlocks: placements
          .map((placement) => blockLookup.get(placement.blockId))
          .filter((block): block is TimeBlock => Boolean(block))
          .map((block) => ({ block, size: durationToSize(block.durationMinutes) }))
      };
    });

  return {
    availableBlocks,
    lanes,
    summary: {
      plannedBlocks: state.placements.length,
      unplannedBlocks: availableBlocks.length
    }
  };
};

export const convertPlacedBlockToTimeEntryDraft = (state: BoardState): TimeEntryDraft[] => {
  const laneLookup = new Map(state.lanes.map((lane) => [lane.id, lane]));
  const blockLookup = new Map(state.blocks.map((block) => [block.id, block]));

  return state.placements
    .slice()
    .sort((a, b) => a.laneId.localeCompare(b.laneId) || a.order - b.order)
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
        title: block.title,
        durationMinutes: block.durationMinutes
      };
    })
    .filter((draft): draft is TimeEntryDraft => Boolean(draft));
};
