import { durationToSize } from '../domain/time-block';
import { slotFromOrder } from '../domain/time-slot';
import type { BoardState, DayLane, PlacementState, QueueItem, TimeBlock, TimeEntryDraft } from '../domain/board-types';

export type TimeBlockCardView = {
  block: TimeBlock;
  size: ReturnType<typeof durationToSize>;
  state: PlacementState;
  timeSlot?: string;
};

export type DayLaneView = {
  lane: DayLane;
  placedBlocks: TimeBlockCardView[];
  totalHours: number;
};

export type WeeklyBoardView = {
  availableBlocks: TimeBlockCardView[];
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

export const buildPlanningView = (state: BoardState): WeeklyBoardView => {
  const placedBlockIds = new Set(state.placements.filter((placement) => placement.laneId !== 'unplanned').map((placement) => placement.blockId));
  const blockLookup = new Map(state.blocks.map((block) => [block.id, block]));

  const availableBlocks = state.blocks
    .filter((block) => !placedBlockIds.has(block.id))
    .map((block) => ({ block, size: durationToSize(block.durationMinutes), state: 'uncommitted' as const }));

  const lanes = [...state.lanes]
    .sort((a, b) => a.order - b.order)
    .map((lane) => {
      const placements = state.placements
        .filter((placement) => placement.laneId === lane.id)
        .sort((a, b) => a.order - b.order);

      const placedBlocks: TimeBlockCardView[] = [];

      for (const placement of placements) {
        const block = blockLookup.get(placement.blockId);
        if (!block) {
          continue;
        }

        placedBlocks.push({
          block,
          size: durationToSize(block.durationMinutes),
          state: placement.state,
          timeSlot: slotFromOrder(placement.order)
        });
      }

      const totalHours = placedBlocks.reduce((sum, card) => sum + card.block.durationMinutes / 60, 0);

      return {
        lane,
        placedBlocks,
        totalHours: Number(totalHours.toFixed(2))
      };
    });

  return {
    availableBlocks,
    lanes,
    summary: {
      plannedBlocks: placedBlockIds.size,
      unplannedBlocks: availableBlocks.length
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
