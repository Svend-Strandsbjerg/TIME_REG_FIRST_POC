import type { DragEvent } from 'react';

export type BlockDragPayload = {
  blockId: string;
  fromLaneId?: string;
};

const MIME = 'application/x-timesheet-block';

export const writeBlockPayload = (event: DragEvent, payload: BlockDragPayload) => {
  event.dataTransfer.setData(MIME, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = 'move';
};

export const readBlockPayload = (event: DragEvent): BlockDragPayload | null => {
  const raw = event.dataTransfer.getData(MIME);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as BlockDragPayload;
  } catch {
    return null;
  }
};
