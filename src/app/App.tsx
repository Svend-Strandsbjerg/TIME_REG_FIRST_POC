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
import { applySeededDemoState, withSeededStartupBlocks } from '../integration/inbound/seeded-demo-state';
import { TimeRegistrationBoard } from '../ui/components/TimeRegistrationBoard';
import { DescriptionModal } from '../ui/components/DescriptionModal';

type DescriptionEditorState = {
  blockId: string;
};

export const App = () => {
  const [state, setState] = useState<BoardState | null>(null);
  const [descriptionEditor, setDescriptionEditor] = useState<DescriptionEditorState | null>(null);
  const [hideWeekends, setHideWeekends] = useState(false);

  useEffect(() => {
    const source = new MockBlockSource();
    source.listTimeRegistrationCandidates().then((blocks) => {
      const startupState = applySeededDemoState(createBoardWeek(withSeededStartupBlocks(blocks)));
      const startupView = buildPlanningView(startupState);

      console.info('[startup-demo] startup state blocks', {
        blockCount: startupState.blocks.length,
        seededBlocks: startupState.blocks
          .filter((block) => block.id.startsWith('demo-'))
          .map((block) => ({ id: block.id, state: block.state, metadata: block.metadata }))
      });

      console.info('[startup-demo] candidate counts', {
        imported: startupView.importedCandidates.length,
        templates: startupView.templateCandidates.length,
        changedCommitted: startupView.changedCommittedCandidates.length,
        importedIds: startupView.importedCandidates.map((card) => card.block.id),
        templateIds: startupView.templateCandidates.map((card) => card.block.id),
        changedCommittedIds: startupView.changedCommittedCandidates.map((card) => card.block.id)
      });

      console.assert(startupView.importedCandidates.length > 0, '[startup-demo] expected imported candidates at startup');
      console.assert(startupView.templateCandidates.length > 0, '[startup-demo] expected PSP templates at startup');
      console.assert(startupView.changedCommittedCandidates.length === 0, '[startup-demo] expected no changed committed entries at startup');

      setState(startupState);
    });
  }, []);

  const planningView = useMemo(() => (state ? buildPlanningView(state) : null), [state]);
  const draftProjection = useMemo(() => (state ? convertPlacedBlockToTimeEntryDraft(state) : []), [state]);
  const queueReadyProjection = useMemo(() => toQueueReadyEntries(draftProjection, 'planning-week-preview'), [draftProjection]);
  const hasHiddenWeekendNonCommittedBlocks = useMemo(() => {
    if (!state) {
      return false;
    }

    const laneById = new Map(state.lanes.map((lane) => [lane.id, lane]));

    return state.placements.some((placement) => {
      const lane = laneById.get(placement.laneId);
      if (!lane || (lane.dayKey !== 'saturday' && lane.dayKey !== 'sunday')) {
        return false;
      }

      const block = state.blocks.find((candidate) => candidate.id === placement.blockId);
      if (!block) {
        return false;
      }

      return block.state !== 'committed';
    });
  }, [state]);

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
        hideWeekends={hideWeekends}
        hasHiddenWeekendNonCommittedBlocks={hasHiddenWeekendNonCommittedBlocks}
        onToggleHideWeekends={setHideWeekends}
        onPlaceBlock={(blockId, laneId, startTime, dragOrigin) =>
          setState((current) =>
            current ? placeBlockOnLane(current, blockId, laneId, startTime, { dragOrigin }) : current
          )
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
