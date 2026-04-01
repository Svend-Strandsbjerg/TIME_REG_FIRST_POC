import type { DragEvent } from 'react';

export type BlockDragPayload = {
  dragType: 'timesheet-block';
  blockId: string;
  fromLaneId?: string;
  dragOrigin?: 'lane' | 'candidate-imported' | 'candidate-template' | 'candidate-changed-committed';
  copyMode?: 'copy';
};

export const BLOCK_DRAG_MIME = 'application/x-timesheet-block+json';
const BLOCK_DRAG_KIND_MIME = 'application/x-timesheet-drag-kind';
const BLOCK_DRAG_TEXT_MIME = 'text/plain';
const BLOCK_DRAG_TEXT_PREFIX = 'timesheet-block:';

const isBlockDragPayload = (value: unknown): value is BlockDragPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<BlockDragPayload>;
  return payload.dragType === 'timesheet-block' && typeof payload.blockId === 'string' && payload.blockId.length > 0;
};

export const writeBlockPayload = (event: DragEvent, payload: Omit<BlockDragPayload, 'dragType'>) => {
  const dragPayload: BlockDragPayload = { dragType: 'timesheet-block', ...payload };
  const serializedPayload = JSON.stringify(dragPayload);

  event.dataTransfer.clearData();
  event.dataTransfer.setData(BLOCK_DRAG_MIME, serializedPayload);
  event.dataTransfer.setData(BLOCK_DRAG_KIND_MIME, 'timesheet-block');
  event.dataTransfer.setData(BLOCK_DRAG_TEXT_MIME, `${BLOCK_DRAG_TEXT_PREFIX}${payload.blockId}`);
  event.dataTransfer.effectAllowed = payload.copyMode === 'copy' ? 'copyMove' : 'move';
};

const parseJsonPayload = (raw: string): BlockDragPayload | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return isBlockDragPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const readBlockPayload = (event: DragEvent): BlockDragPayload | null => {
  const fromPrimaryMime = parseJsonPayload(event.dataTransfer.getData(BLOCK_DRAG_MIME));
  if (fromPrimaryMime) {
    return fromPrimaryMime;
  }

  const legacyRaw = event.dataTransfer.getData('application/x-timesheet-block');
  const legacyParsed = parseJsonPayload(legacyRaw);
  if (legacyParsed) {
    return legacyParsed;
  }

  if (legacyRaw) {
    try {
      const maybeLegacy = JSON.parse(legacyRaw || '{}') as { blockId?: string; fromLaneId?: string };
      if (typeof maybeLegacy.blockId === 'string' && maybeLegacy.blockId.length > 0) {
        return {
          dragType: 'timesheet-block',
          blockId: maybeLegacy.blockId,
          fromLaneId: maybeLegacy.fromLaneId,
          dragOrigin: maybeLegacy.fromLaneId ? 'lane' : undefined
        };
      }
    } catch {
      return null;
    }
  }

  return null;
};

export const hasBlockPayload = (event: DragEvent): boolean => {
  const dragTypes = new Set(event.dataTransfer.types);

  return dragTypes.has(BLOCK_DRAG_MIME) || dragTypes.has('application/x-timesheet-block') || dragTypes.has(BLOCK_DRAG_KIND_MIME);
};
