import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import { createBoardWeek, placeBlockOnLane } from '../../src/core/application/board-service';
import type { TimeBlock } from '../../src/core/domain/board-types';

const blocks: TimeBlock[] = [
  { id: 'template-1', title: 'Template PSP', extentMinutes: 60, source: 'mock-api', state: 'template' },
  {
    id: 'imported-1',
    title: 'Imported Signal',
    extentMinutes: 90,
    source: 'external-api',
    state: 'imported',
    metadata: { importedDayKey: 'wednesday', importedStartTime: '08:30' }
  }
];

describe('board queries', () => {
  it('exposes template/imported sections and interval labels', () => {
    const board = createBoardWeek(blocks);
    const view = buildPlanningView(board);

    expect(view.templateCandidates.find((card) => card.block.id === 'template-1')?.state).toBe('template');
    expect(view.importedCandidates.find((card) => card.block.id === 'imported-1')?.state).toBe('imported');
    expect(view.importedCandidates.find((card) => card.block.id === 'imported-1')?.interval).toBe('08:30 - 10:00');
  });

  it('marks template candidates and spawned blocks with source metadata', () => {
    const board = placeBlockOnLane(createBoardWeek(blocks), 'template-1', 'lane-monday', '08:30');
    const view = buildPlanningView(board);

    expect(view.templateCandidates.some((card) => card.block.id === 'template-1' && card.isTemplate)).toBe(true);

    const spawned = view.lanes.flatMap((lane) => lane.placedBlocks).find((card) => card.templateSourceBlockId === 'template-1');
    expect(spawned?.state).toBe('uncommitted');
    expect(spawned?.interval).toBe('08:30 - 09:30');
  });


  it('does not expose uncommitted (red) blocks in candidate sections', () => {
    const board = placeBlockOnLane(createBoardWeek(blocks), 'template-1', 'lane-monday', '09:00');
    const view = buildPlanningView(board);

    expect(view.importedCandidates.every((card) => card.state === 'imported')).toBe(true);
    expect(view.templateCandidates.every((card) => card.state === 'template')).toBe(true);
  });

  it('groups overlapping blocks for deterministic side-by-side rendering metadata', () => {
    const board = createBoardWeek(blocks);
    const withFirst = placeBlockOnLane(board, 'imported-1', 'lane-wednesday', '08:30');
    const withSecond = placeBlockOnLane(withFirst, 'template-1', 'lane-wednesday', '08:30');
    const view = buildPlanningView(withSecond);

    const overlapping = view.lanes
      .find((lane) => lane.lane.dayKey === 'wednesday')
      ?.placedBlocks.filter((card) => card.startTime === '08:30');

    expect(overlapping?.length).toBeGreaterThanOrEqual(2);
    expect(new Set(overlapping?.map((card) => card.layoutColumnCount))).toEqual(new Set([2]));
  });
});
