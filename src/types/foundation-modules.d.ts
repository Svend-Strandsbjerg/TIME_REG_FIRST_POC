declare module 'block_engine_foundation' {
  export type BlockState = 'template' | 'imported' | 'uncommitted' | 'committed';

  export type Block = {
    id: string;
    title: string;
    extentMinutes: number;
    source: string;
    state: BlockState;
    metadata?: Record<string, unknown>;
  };

  export type PlacementSnapshot = {
    laneId: string;
    startTime: string;
    extentMinutes?: number;
  };

  export const normalizeBlockExtent: (block: Block, options?: { defaultExtentMinutes?: number }) => Block;
  export const instantiateBlockFromSource: (
    sourceBlock: Block,
    options: {
      id: string;
      state: BlockState;
      extentMinutes: number;
      metadata?: Record<string, unknown>;
    }
  ) => Block;
  export const resizePlacement: (request: {
    startTime: string;
    extentMinutes: number;
    edge: 'top' | 'bottom';
    slotDelta: number;
    slotMinutes: number;
    minimumExtentMinutes: number;
    planningWindow: {
      start: string;
      end: string;
    };
  }) => {
    startTime: string;
    extentMinutes: number;
  };
  export const createPlacementSnapshot: (request: PlacementSnapshot) => PlacementSnapshot;
  export const changeBlockState: (block: Block, state: BlockState) => Block;
  export const changeBlockExtent: (block: Block, extentMinutes: number) => Block;
}

declare module 'async_integration_foundation' {
  export const createQueueId: (scope?: string) => string;
  export const createQueueItemId: (request: {
    queueId: string;
    blockId: string;
    operation: 'create' | 'update' | 'delete';
    dayKey: string;
    startTime: string;
  }) => string;
  export const buildQueueItem: (request: {
    id: string;
    queueId: string;
    block: {
      id: string;
      title: string;
      extentMinutes: number;
    };
    slot: {
      dayKey: string;
      timeSlot: string;
    };
    operation: 'create' | 'update' | 'delete';
    reason: string;
  }) => {
    id: string;
    queueId: string;
    blockId: string;
    title: string;
    dayKey: string;
    startTime: string;
    endTime: string;
    interval: string;
    operation: 'create' | 'update' | 'delete';
    reason: string;
  };
}
