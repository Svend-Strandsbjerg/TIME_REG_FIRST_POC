declare module '@strandsbjerg/block-engine-foundation' {
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

declare module '@strandsbjerg/async-integration-foundation' {
  export const createQueueId: (scope?: string) => string;
  export const createQueueItemId: (request: {
    queueId: string;
    seed?: string;
  }) => string;
  export const buildQueueItem: (request: {
    queueId: string;
    itemId?: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    routing?: Record<string, unknown>;
  }) => {
    id: string;
    queueId: string;
    operation: 'create' | 'update' | 'delete';
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    routing: Record<string, unknown>;
  };
}
