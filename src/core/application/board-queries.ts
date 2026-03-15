import { deriveEndTime, generatePlanningSlots, toMinutesOfDay } from '../domain/time-slot';
import type { BlockState, BoardState, DayLane, QueueItem, TimeBlock, TimeEntryDraft, TimeOfDay } from '../domain/board-types';

export type TimeBlockCardView = {
  block: TimeBlock;
  state: BlockState;
  startTime?: TimeOfDay;
  endTime?: TimeOfDay;
  topOffsetMinutes?: number;
  heightMinutes?: number;
};

export type DayLaneView = {
  lane: DayLane;
  placedBlocks: TimeBlockCardView[];
  totalHours: number;
  slots: TimeOfDay[];
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
  const slots = generatePlanningSlots();
  const planningStartMinutes = toMinutesOfDay(slots[0] ?? '06:00');

  const placedBlockIds = new Set(state.placements.filter((placement) => placement.laneId !== 'unplanned').map((placement) => placement.blockId));
  const blockLookup = new Map(state.blocks.map((block) => [block.id, block]));

  const availableBlocks = state.blocks.filter((block) => !placedBlockIds.has(block.id)).map((block) => ({ block, state: block.state }));

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

        placedBlocks.push({
          block,
          state: block.state,
          startTime: placement.startTime,
          endTime: deriveEndTime(placement.startTime, block.extentMinutes),
          topOffsetMinutes: toMinutesOfDay(placement.startTime) - planningStartMinutes,
          heightMinutes: block.extentMinutes
        });
      }

      const totalHours = placedBlocks.reduce((sum, card) => sum + card.block.extentMinutes / 60, 0);

      return {
        lane,
        placedBlocks,
        totalHours: Number(totalHours.toFixed(2)),
        slots
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
