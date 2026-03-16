import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import { createBoardWeek, placeBlockOnLane, resizeBlockFromBottom, returnBlockToPool } from '../../src/core/application/board-service';
import type { TimeBlock } from '../../src/core/domain/board-types';

const blocks: TimeBlock[] = [
  { id: 'template-1', title: 'Template PSP', extentMinutes: 60, source: 'mock-api', state: 'template', metadata: { pspElement: 'PSP-TPL' } },
  {
    id: 'imported-1',
    title: 'Imported Signal',
    extentMinutes: 90,
    source: 'external-api',
    state: 'imported',
    metadata: {
      importedDayKey: 'wednesday',
      importedStartTime: '08:30',
      description: 'Initial Outlook description'
    }
  },
  {
    id: 'committed-1',
    title: 'Committed baseline item',
    extentMinutes: 60,
    source: 'mock-api',
    state: 'committed',
    metadata: {
      committedPlacement: {
        laneId: 'lane-monday',
        startTime: '08:30',
        extentMinutes: 60
      }
    }
  }
];

describe('board queries', () => {
  it('exposes template/imported sections and imported interval labels', () => {
    const board = createBoardWeek(blocks);
    const view = buildPlanningView(board);

    expect(view.templateCandidates.find((card) => card.block.id === 'template-1')?.state).toBe('template');
    expect(view.importedCandidates.find((card) => card.block.id === 'imported-1')?.state).toBe('imported');
    expect(view.importedCandidates.find((card) => card.block.id === 'imported-1')?.interval).toBe('08:30 - 10:00');
  });

  it('template candidates do not expose interval before placement and default to 30 minutes', () => {
    const board = createBoardWeek(blocks);
    const view = buildPlanningView(board);

    const template = view.templateCandidates.find((card) => card.block.id === 'template-1');
    expect(template?.interval).toBeUndefined();
    expect(template?.block.extentMinutes).toBe(30);
  });

  it('marks template spawned blocks as red placed entries', () => {
    const board = placeBlockOnLane(createBoardWeek(blocks), 'template-1', 'lane-monday', '08:30');
    const view = buildPlanningView(board);

    const spawned = view.lanes.flatMap((lane) => lane.placedBlocks).find((card) => card.templateSourceBlockId === 'template-1');
    expect(spawned?.state).toBe('uncommitted');
    expect(spawned?.visualState).toBe('uncommitted');
    expect(spawned?.interval).toBe('08:30 - 09:00');
  });

  it('exposes changed committed entries in candidate list when returned from swimlane', () => {
    const board = returnBlockToPool(createBoardWeek(blocks), 'committed-1');
    const view = buildPlanningView(board);

    expect(view.changedCommittedCandidates.find((card) => card.block.id === 'committed-1')).toBeDefined();
    expect(view.changedCommittedCandidates.find((card) => card.block.id === 'committed-1')?.visualState).toBe('uncommitted');
  });

  it('keeps imported description payload in query model', () => {
    const view = buildPlanningView(createBoardWeek(blocks));
    expect(view.importedCandidates.find((card) => card.block.id === 'imported-1')?.block.metadata?.description).toBe(
      'Initial Outlook description'
    );
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

  it('removes changed committed entries from candidate list after restoring to baseline lane/time', () => {
    const board = createBoardWeek(blocks);
    const moved = placeBlockOnLane(board, 'committed-1', 'lane-tuesday', '10:00');
    const restored = placeBlockOnLane(moved, 'committed-1', 'lane-monday', '08:30');

    const changedView = buildPlanningView(moved);
    const restoredView = buildPlanningView(restored);

    expect(changedView.changedCommittedCandidates.find((card) => card.block.id === 'committed-1')).toBeDefined();
    expect(restoredView.changedCommittedCandidates.find((card) => card.block.id === 'committed-1')).toBeUndefined();
  });

  it('keeps side-by-side lane ordering stable when extents are resized', () => {
    const board = createBoardWeek(blocks);
    const withFirst = placeBlockOnLane(board, 'imported-1', 'lane-wednesday', '08:30');
    const withSecond = placeBlockOnLane(withFirst, 'template-1', 'lane-wednesday', '08:30');

    const initialView = buildPlanningView(withSecond);
    const spawnedId = withSecond.blocks.find((block) => block.metadata?.templateSourceBlockId === 'template-1')?.id;
    expect(spawnedId).toBeDefined();

    const resizedBoard = resizeBlockFromBottom(withSecond, spawnedId as string, 2);
    const resizedView = buildPlanningView(resizedBoard);

    const initialColumns = new Map(
      initialView.lanes
        .find((lane) => lane.lane.dayKey === 'wednesday')
        ?.placedBlocks.map((card) => [card.block.id, card.layoutColumn])
    );

    const resizedColumns = new Map(
      resizedView.lanes
        .find((lane) => lane.lane.dayKey === 'wednesday')
        ?.placedBlocks.map((card) => [card.block.id, card.layoutColumn])
    );

    expect(initialColumns.get('imported-1')).toBe(resizedColumns.get('imported-1'));
    expect(initialColumns.get(spawnedId as string)).toBe(resizedColumns.get(spawnedId as string));
  });
});
