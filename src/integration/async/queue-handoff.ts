import type { QueueItem } from '../../core/domain/board-types';

export type QueueReadyTimeEntry = {
  queueContextId: string;
  sequence: number;
  operation: QueueItem['operation'];
  payload: QueueItem['payload'];
  metadata: {
    source: 'planning-board';
  };
  routing: QueueItem['routing'];
};

export const toQueueReadyEntries = (
  queueItems: QueueItem[],
  queueContextId: string
): QueueReadyTimeEntry[] =>
  queueItems.map((item, index) => {
    const operation = item.operation;
    return {
      queueContextId,
      sequence: index + 1,
      operation,
      payload: {
        ...item.payload,
        action: operation
      },
      metadata: {
        source: 'planning-board'
      },
      routing: {
        ...item.routing,
        operation
      }
    };
  });

// TODO: hand off QueueReadyTimeEntry[] into ASYNC_INTEGRATION_FOUNDATION queue contracts.
