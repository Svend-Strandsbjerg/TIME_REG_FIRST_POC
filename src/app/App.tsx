import { useEffect, useMemo, useState } from 'react';
import { buildPlanningView, convertPlacedBlockToTimeEntryDraft } from '../core/application/board-queries';
import {
  autoPlaceImportedBlock,
  createBoardWeek,
  createDraggedBlockCopy,
  discardBlockById,
  placeBlockOnLane,
  resizeBlockFromBottom,
  resizeBlockFromTop,
  returnBlockToPool,
  updateBlockDetails
} from '../core/application/board-service';
import type { BoardState } from '../core/domain/board-types';
import { toQueueReadyEntries } from '../integration/async/queue-handoff';
import { SAPWorkforceBlockSource } from '../integration/inbound/sap-workforce-block-source';
import { applySeededDemoState, withSeededStartupBlocks } from '../integration/inbound/seeded-demo-state';
import { TimeRegistrationBoard } from '../ui/components/TimeRegistrationBoard';
import { DescriptionModal, type BlockDetailsDraft } from '../ui/components/DescriptionModal';

type DescriptionEditorState = {
  blockId: string;
};

export const App = () => {
  const [state, setState] = useState<BoardState | null>(null);
  const [descriptionEditor, setDescriptionEditor] = useState<DescriptionEditorState | null>(null);
  const [hideWeekends, setHideWeekends] = useState(false);
  const [activeCopiedDragId, setActiveCopiedDragId] = useState<string | null>(null);

  useEffect(() => {
    const source = new SAPWorkforceBlockSource({
      mode: 'simulated',
      period: { startDate: '2026-03-30', endDate: '2026-04-05' },
      userContext: { userExternalId: 'person-1', companyCode: '1710' }
    });
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
  const queueReadyProjection = useMemo(
    () => (state ? toQueueReadyEntries(state.queue.items, 'planning-week-preview') : []),
    [state]
  );
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

  const blockDraft = useMemo<BlockDetailsDraft>(
    () => ({
      description: typeof selectedBlock?.metadata?.description === 'string' ? selectedBlock.metadata.description : '',
      taskType: typeof selectedBlock?.metadata?.taskType === 'string' ? selectedBlock.metadata.taskType : '',
      taskComponent: typeof selectedBlock?.metadata?.taskComponent === 'string' ? selectedBlock.metadata.taskComponent : '',
      activityType: typeof selectedBlock?.metadata?.activityType === 'string' ? selectedBlock.metadata.activityType : '',
      billingControlCategory:
        typeof selectedBlock?.metadata?.billingControlCategory === 'string' ? selectedBlock.metadata.billingControlCategory : '',
      overtimeCategory: typeof selectedBlock?.metadata?.overtimeCategory === 'string' ? selectedBlock.metadata.overtimeCategory : '',
      wbsElement:
        typeof selectedBlock?.metadata?.wbsElement === 'string'
          ? selectedBlock.metadata.wbsElement
          : typeof selectedBlock?.metadata?.pspElement === 'string'
            ? selectedBlock.metadata.pspElement
            : '',
      internalOrder: typeof selectedBlock?.metadata?.internalOrder === 'string' ? selectedBlock.metadata.internalOrder : ''
    }),
    [selectedBlock]
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
        onStartDrag={({ blockId, ctrlKey }) => {
          if (!ctrlKey) {
            return { blockId };
          }

          if (!state) {
            return { blockId };
          }

          const copyResult = createDraggedBlockCopy(state, blockId);
          if (!copyResult) {
            return { blockId };
          }

          setState(copyResult.state);
          setActiveCopiedDragId(copyResult.copiedBlockId);
          return {
            blockId: copyResult.copiedBlockId,
            copyMode: 'copy'
          };
        }}
        onEndDrag={({ dropEffect }) => {
          if (!activeCopiedDragId) {
            return;
          }

          if (dropEffect !== 'none') {
            setActiveCopiedDragId(null);
            return;
          }

          setState((current) => (current ? discardBlockById(current, activeCopiedDragId) : current));
          setActiveCopiedDragId(null);
        }}
      />
      <DescriptionModal
        isOpen={Boolean(descriptionEditor)}
        blockTitle={selectedBlock?.title}
        initialDraft={blockDraft}
        onCancel={() => setDescriptionEditor(null)}
        onSave={(draft) => {
          if (descriptionEditor) {
            setState((current) => (current ? updateBlockDetails(current, descriptionEditor.blockId, draft) : current));
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
