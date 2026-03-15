export type TimeBlockId = string;
export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
export type DayLaneId = string;
export type PlacementId = string;

export type BlockState = string;

export type TimeBlock = {
  id: TimeBlockId;
  title: string;
  durationMinutes: number;
  source: 'mock-api' | 'external-api';
  state: BlockState;
  metadata?: Record<string, unknown>;
};

export type DayLane = {
  id: DayLaneId;
  dayKey: DayKey;
  label: string;
  order: number;
};

export type PlacementSlot = {
  dayKey: DayKey;
  timeSlot: string;
};

export type CommittedPlacement = {
  laneId: DayLaneId;
  order: number;
  slot: PlacementSlot;
};

export type PlacedBlock = {
  id: PlacementId;
  blockId: TimeBlockId;
  laneId: DayLaneId;
  order: number;
  committedPlacement?: CommittedPlacement;
};

export type QueueOperation = 'create' | 'update' | 'delete';

export type QueueItem = {
  id: string;
  queueId: string;
  blockId: TimeBlockId;
  title: string;
  dayKey: DayKey;
  timeSlot: string;
  operation: QueueOperation;
  reason: string;
};

export type Queue = {
  id: string;
  status: 'paused';
  items: QueueItem[];
};

export type BoardState = {
  blocks: TimeBlock[];
  lanes: DayLane[];
  placements: PlacedBlock[];
  queue: Queue;
};

export type TimeEntryDraft = {
  technicalDraftId: string;
  blockId: TimeBlockId;
  laneId: DayLaneId;
  dayKey: DayKey;
  title: string;
  durationMinutes: number;
};
