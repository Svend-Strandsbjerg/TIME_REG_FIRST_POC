import { useEffect, useMemo, useState } from 'react';
import { buildPlanningView, convertPlacedBlockToTimeEntryDraft } from '../core/application/board-queries';
import { createBoardWeek, placeBlockOnLane, returnBlockToPool } from '../core/application/board-service';
import type { BoardState } from '../core/domain/board-types';
import { toQueueReadyEntries } from '../integration/async/queue-handoff';
import { MockBlockSource } from '../integration/inbound/mock-block-source';
import { TimeRegistrationBoard } from '../ui/components/TimeRegistrationBoard';

export const App = () => {
  const [state, setState] = useState<BoardState | null>(null);

  useEffect(() => {
    const source = new MockBlockSource();
    source.listTimeRegistrationCandidates().then((blocks) => {
      setState(createBoardWeek(blocks));
    });
  }, []);

  const planningView = useMemo(() => (state ? buildPlanningView(state) : null), [state]);
  const draftProjection = useMemo(() => (state ? convertPlacedBlockToTimeEntryDraft(state) : []), [state]);
  const queueReadyProjection = useMemo(
    () => toQueueReadyEntries(draftProjection, 'planning-week-preview'),
    [draftProjection]
  );

  if (!state || !planningView) {
    return <p>Loading planning board...</p>;
  }

  return (
    <>
      <TimeRegistrationBoard
        board={planningView}
        onPlaceBlock={(blockId, laneId) => setState((current) => (current ? placeBlockOnLane(current, blockId, laneId) : current))}
        onReturnBlock={(blockId) => setState((current) => (current ? returnBlockToPool(current, blockId) : current))}
      />
      <section className="draft-preview">
        <h2>Future integration projections</h2>
        <p>Time-entry drafts: {draftProjection.length}</p>
        <p>Queue-ready records: {queueReadyProjection.length}</p>
      </section>
    </>
  );
};
