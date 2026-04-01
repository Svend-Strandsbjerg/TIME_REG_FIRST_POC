import { describe, expect, it } from 'vitest';
import { buildPlanningView } from '../../src/core/application/board-queries';
import { createBoardWeek } from '../../src/core/application/board-service';
import { MockBlockSource } from '../../src/integration/inbound/mock-block-source';
import { applySeededDemoState, withSeededStartupBlocks } from '../../src/integration/inbound/seeded-demo-state';

describe('seeded demo startup state', () => {
  it('injects only imported and template demo candidates when source payload is partial', () => {
    const partialSource = [
      {
        id: 'source-imported-only',
        title: 'Imported already present',
        source: 'external-api' as const,
        state: 'imported' as const,
        extentMinutes: 60,
        metadata: {
          importedDayKey: 'monday' as const,
          importedStartTime: '09:00',
          importedEndTime: '10:00'
        }
      }
    ];

    const startupBlocks = withSeededStartupBlocks(partialSource);
    const startupState = applySeededDemoState(createBoardWeek(startupBlocks));
    const startupView = buildPlanningView(startupState);

    expect(startupView.importedCandidates.length).toBeGreaterThan(0);
    expect(startupView.templateCandidates.length).toBeGreaterThan(0);
    expect(startupView.changedCommittedCandidates).toHaveLength(0);

    expect(startupView.importedCandidates.some((card) => card.block.id === 'demo-imported-outlook')).toBe(true);
    expect(startupView.templateCandidates.some((card) => card.block.id === 'demo-template-psp-1001')).toBe(true);
    expect(startupView.changedCommittedCandidates).toEqual([]);
  });

  it('does not mutate startup state with changed committed demo operations', async () => {
    const blocks = await new MockBlockSource().listTimeRegistrationCandidates();
    expect(blocks.some((block) => block.state === 'committed')).toBe(false);

    const seeded = applySeededDemoState(createBoardWeek(withSeededStartupBlocks(blocks)));
    const view = buildPlanningView(seeded);

    expect(view.changedCommittedCandidates).toHaveLength(0);
    expect(seeded.queue.items).toHaveLength(0);
  });
});
