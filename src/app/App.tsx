import { useEffect, useMemo, useState } from 'react';
import { buildPlanningView, convertPlacedBlockToTimeEntryDraft } from '../core/application/board-queries';
import {
  autoPlaceImportedBlock,
  createBoardWeek,
  placeBlockOnLane,
  resizeBlockFromBottom,
  resizeBlockFromTop,
  returnBlockToPool,
  updateBlockDescription
} from '../core/application/board-service';
import type { BoardState } from '../core/domain/board-types';
import { toQueueReadyEntries } from '../integration/async/queue-handoff';
import { MockBlockSource } from '../integration/inbound/mock-block-source';
import { applySeededDemoState } from '../integration/inbound/seeded-demo-state';
import { TimeRegistrationBoard } from '../ui/components/TimeRegistrationBoard';
import { DescriptionModal } from '../ui/components/DescriptionModal';

type DescriptionEditorState = {
  blockId: string;
};

export const App = () => {
  const [state, setState] = useState<BoardState | null>(null);
  const [descriptionEditor, setDescriptionEditor] = useState<DescriptionEditorState | null>(null);

  useEffect(() => {
    const source = new MockBlockSource();
    source.listTimeRegistrationCandidates().then((blocks) => {
      setState(applySeededDemoState(createBoardWeek(blocks)));
    });
  }, []);

  const planningView = useMemo(() => (state ? buildPlanningView(state) : null), [state]);
  const draftProjection = useMemo(() => (state ? convertPlacedBlockToTimeEntryDraft(state) : []), [state]);
  const queueReadyProjection = useMemo(() => toQueueReadyEntries(draftProjection, 'planning-week-preview'), [draftProjection]);
  const selectedBlock = useMemo(
    () => state?.blocks.find((candidate) => candidate.id === descriptionEditor?.blockId),
    [descriptionEditor?.blockId, state]
  );

  if (!state || !planningView) {
    return <p>Loading planning board...</p>;
  }

  return (
    <>
      <TimeRegistrationBoard
        board={planningView}
        onPlaceBlock={(blockId, laneId, startTime) =>
          setState((current) => (current ? placeBlockOnLane(current, blockId, laneId, startTime) : current))
        }
        onReturnBlock={(blockId) => setState((current) => (current ? returnBlockToPool(current, blockId) : current))}
        onResizeTop={(blockId, slotDelta) =>
          setState((current) => (current ? resizeBlockFromTop(current, blockId, slotDelta) : current))
        }
        onResizeBottom={(blockId, slotDelta) =>
          setState((current) => (current ? resizeBlockFromBottom(current, blockId, slotDelta) : current))
        }
        onAutoPlaceImported={(blockId) =>
          setState((current) => (current ? autoPlaceImportedBlock(current, blockId) : current))
        }
        onOpenDescriptionEditor={(blockId) => setDescriptionEditor({ blockId })}
      />
      <DescriptionModal
        isOpen={Boolean(descriptionEditor)}
        blockTitle={selectedBlock?.title}
        initialDescription={typeof selectedBlock?.metadata?.description === 'string' ? selectedBlock.metadata.description : ''}
        onCancel={() => setDescriptionEditor(null)}
        onSave={(description) => {
          if (descriptionEditor) {
            setState((current) =>
              current ? updateBlockDescription(current, descriptionEditor.blockId, description) : current
            );
          }
          setDescriptionEditor(null);
        }}
      />
      <section className="draft-preview">
        <h2>Future integration projections</h2>
        <p>Time-entry drafts: {draftProjection.length}</p>
        <p>Queue-ready records: {queueReadyProjection.length}</p>
      </section>
    </>
  );
};
