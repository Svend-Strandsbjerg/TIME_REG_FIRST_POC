import type { DragEvent } from 'react';
import { describe, expect, it } from 'vitest';
import { hasBlockPayload, readBlockPayload, writeBlockPayload, BLOCK_DRAG_MIME } from '../../src/ui/adapters/dnd-adapter';

type MockDataTransfer = {
  data: Map<string, string>;
  effectAllowed: string;
  setData: (type: string, value: string) => void;
  getData: (type: string) => string;
  clearData: () => void;
  types: string[];
};

const createMockDataTransfer = (): MockDataTransfer => {
  const data = new Map<string, string>();

  return {
    data,
    effectAllowed: 'none',
    setData: (type, value) => {
      data.set(type, value);
    },
    getData: (type) => data.get(type) ?? '',
    clearData: () => data.clear(),
    get types() {
      return [...data.keys()];
    }
  };
};

const createMockDragEvent = () => {
  const dataTransfer = createMockDataTransfer();
  return { dataTransfer } as unknown as DragEvent;
};

describe('dnd-adapter block payload contract', () => {
  it('writes app-specific payload and fallback drag types on dragstart', () => {
    const event = createMockDragEvent();

    writeBlockPayload(event, { blockId: 'block-123', fromLaneId: 'monday' });

    expect(event.dataTransfer.effectAllowed).toBe('move');
    expect(event.dataTransfer.getData(BLOCK_DRAG_MIME)).toContain('"blockId":"block-123"');
    expect(event.dataTransfer.getData('application/x-timesheet-drag-kind')).toBe('timesheet-block');
    expect(event.dataTransfer.getData('text/plain')).toBe('timesheet-block:block-123');
    expect(hasBlockPayload(event)).toBe(true);
  });

  it('reads back primary payload contract on drop', () => {
    const event = createMockDragEvent();

    event.dataTransfer.setData(
      BLOCK_DRAG_MIME,
      JSON.stringify({
        dragType: 'timesheet-block',
        blockId: 'block-456',
        fromLaneId: 'tuesday'
      })
    );

    expect(readBlockPayload(event)).toEqual({
      dragType: 'timesheet-block',
      blockId: 'block-456',
      fromLaneId: 'tuesday'
    });
  });

  it('supports legacy payload migration without dragType', () => {
    const event = createMockDragEvent();

    event.dataTransfer.setData('application/x-timesheet-block', JSON.stringify({ blockId: 'legacy-block', fromLaneId: 'wednesday' }));

    expect(readBlockPayload(event)).toEqual({
      dragType: 'timesheet-block',
      blockId: 'legacy-block',
      fromLaneId: 'wednesday'
    });
  });
});
