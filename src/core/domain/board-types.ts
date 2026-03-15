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

export type TimeBlock = {
  id: TimeBlockId;
  title: string;
  durationMinutes: number;
  source: 'mock-api' | 'external-api';
  metadata?: Record<string, unknown>;
};

export type DayLane = {
  id: DayLaneId;
  dayKey: DayKey;
  label: string;
  order: number;
};

export type PlacedBlock = {
  id: PlacementId;
  blockId: TimeBlockId;
  laneId: DayLaneId;
  order: number;
};

export type BoardState = {
  blocks: TimeBlock[];
  lanes: DayLane[];
  placements: PlacedBlock[];
};

export type TimeEntryDraft = {
  technicalDraftId: string;
  blockId: TimeBlockId;
  laneId: DayLaneId;
  dayKey: DayKey;
  title: string;
  durationMinutes: number;
};
