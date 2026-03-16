import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../src/core/application/board-queries';
import { createBoardWeek, placeBlockOnLane, returnBlockToPool } from '../src/core/application/board-service';
import type { TimeBlock } from '../src/core/domain/board-types';

const committedBlock: TimeBlock = {
  id: 'committed-1',
  title: 'Committed entry',
  source: 'mock-api',
  state: 'committed',
  extentMinutes: 60,
  metadata: {
    committedPlacement: {
      laneId: 'lane-tuesday',
      startTime: '10:00',
      extentMinutes: 60
    }
  }
};

describe('committed restore flow', () => {
  it('removes restored committed entries from changed committed candidates immediately', () => {
    const initial = createBoardWeek([committedBlock]);

    const removed = returnBlockToPool(initial, committedBlock.id);
    const removedView = buildPlanningView(removed);
    expect(removedView.changedCommittedCandidates.map((card) => card.block.id)).toContain(committedBlock.id);

    const restored = placeBlockOnLane(removed, committedBlock.id, 'lane-tuesday', '08:00');
    const restoredPlacement = restored.placements.find((placement) => placement.blockId === committedBlock.id);
    const restoredView = buildPlanningView(restored);

    expect(restoredPlacement?.laneId).toBe('lane-tuesday');
    expect(restoredPlacement?.startTime).toBe('10:00');
    expect(restoredView.changedCommittedCandidates.map((card) => card.block.id)).not.toContain(committedBlock.id);
    expect(
      restoredView.lanes
        .flatMap((lane) => lane.placedBlocks)
        .filter((card) => card.block.id === committedBlock.id)
        .map((card) => card.visualState)
    ).toEqual(['committed']);
  });

  it('snaps changed committed candidate drops to baseline start time when dropped on baseline lane', () => {
    const initial = createBoardWeek([committedBlock]);
    const removed = returnBlockToPool(initial, committedBlock.id);

    const restoredFromCandidate = placeBlockOnLane(removed, committedBlock.id, 'lane-tuesday', '08:00', {
      dragOrigin: 'candidate-changed-committed'
    });

    const restoredPlacement = restoredFromCandidate.placements.find((placement) => placement.blockId === committedBlock.id);
    const restoredView = buildPlanningView(restoredFromCandidate);

    expect(restoredPlacement?.laneId).toBe('lane-tuesday');
    expect(restoredPlacement?.startTime).toBe('10:00');
    expect(restoredView.changedCommittedCandidates.map((card) => card.block.id)).not.toContain(committedBlock.id);
  });
});
