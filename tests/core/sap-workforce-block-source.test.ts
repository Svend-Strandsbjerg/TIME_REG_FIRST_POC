import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import { createBoardWeek } from '../../src/core/application/board-service';
import { SAPWorkforceBlockSource } from '../../src/integration/inbound/sap-workforce-block-source';
import { withSeededStartupBlocks } from '../../src/integration/inbound/seeded-demo-state';

describe('SAP workforce block source simulated inbound flow', () => {
  it('maps simulated SAP read response to committed blocks visible on board', async () => {
    const source = new SAPWorkforceBlockSource({
      mode: 'simulated',
      period: { startDate: '2026-03-30', endDate: '2026-04-05' },
      userContext: { userExternalId: 'person-1', companyCode: '1710' }
    });

    const blocks = await source.listTimeRegistrationCandidates();
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((block) => block.state === 'committed')).toBe(true);

    const board = createBoardWeek(withSeededStartupBlocks(blocks));
    const view = buildPlanningView(board);

    const committedPlacedCount = view.lanes
      .flatMap((lane) => lane.placedBlocks)
      .filter((card) => card.block.state === 'committed').length;

    expect(committedPlacedCount).toBeGreaterThan(0);
    expect(view.changedCommittedCandidates).toHaveLength(0);
  });
});
