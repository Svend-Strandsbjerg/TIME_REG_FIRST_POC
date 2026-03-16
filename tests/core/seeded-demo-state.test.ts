import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import { createBoardWeek } from '../../src/core/application/board-service';
import { MockBlockSource } from '../../src/integration/inbound/mock-block-source';
import { applySeededDemoState } from '../../src/integration/inbound/seeded-demo-state';

describe('seeded demo startup state', () => {
  it('initializes changed committed examples for update/delete validation', async () => {
    const blocks = await new MockBlockSource().listTimeRegistrationCandidates();
    const seeded = applySeededDemoState(createBoardWeek(blocks));
    const view = buildPlanningView(seeded);

    const mondayMoved = view.lanes
      .find((lane) => lane.lane.id === 'lane-monday')
      ?.placedBlocks.find((card) => card.block.id === 'block-activity-8-instance-8');

    const removedCandidate = view.changedCommittedCandidates.find((card) => card.block.id === 'block-activity-9-instance-9');
    const movedCandidate = view.changedCommittedCandidates.find((card) => card.block.id === 'block-activity-8-instance-8');
    const movedFridayCandidate = view.changedCommittedCandidates.find((card) => card.block.id === 'block-activity-10-instance-10');

    const fridayMoved = view.lanes
      .find((lane) => lane.lane.id === 'lane-friday')
      ?.placedBlocks.find((card) => card.block.id === 'block-activity-10-instance-10');

    expect(mondayMoved?.startTime).toBe('10:00');
    expect(mondayMoved?.visualState).toBe('uncommitted');
    expect(movedCandidate?.visualState).toBe('uncommitted');
    expect(removedCandidate?.visualState).toBe('uncommitted');
    expect(fridayMoved?.startTime).toBe('15:30');
    expect(fridayMoved?.visualState).toBe('uncommitted');
    expect(movedFridayCandidate?.visualState).toBe('uncommitted');

    const operationsByBlock = new Map(seeded.queue.items.map((item) => [item.blockId, item.operation]));
    expect(operationsByBlock.get('block-activity-8-instance-8')).toBe('update');
    expect(operationsByBlock.get('block-activity-9-instance-9')).toBe('delete');
    expect(operationsByBlock.get('block-activity-10-instance-10')).toBe('update');
  });
});
