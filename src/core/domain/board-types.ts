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
export type TimeOfDay = string;

export type TimeBlock = {
  id: TimeBlockId;
  title: string;
  extentMinutes: number;
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
  timeSlot: TimeOfDay;
};

export type CommittedPlacement = {
  laneId: DayLaneId;
  startTime: TimeOfDay;
  slot: PlacementSlot;
  extentMinutes?: number;
};

export type PlacedBlock = {
  id: PlacementId;
  blockId: TimeBlockId;
  laneId: DayLaneId;
  startTime: TimeOfDay;
  committedPlacement?: CommittedPlacement;
};

export type QueueOperation = 'create' | 'update' | 'delete';

export type QueueItem = {
  id: string;
  queueId: string;
  blockId: TimeBlockId;
  title: string;
  dayKey: DayKey;
  timeSlot: TimeOfDay;
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
  startTime: TimeOfDay;
  title: string;
  extentMinutes: number;
};
