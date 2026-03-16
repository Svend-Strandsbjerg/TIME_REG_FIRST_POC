import type { TimeBlockCardView } from '../../core/application/board-queries';
import { hasBlockPayload, readBlockPayload } from '../adapters/dnd-adapter';
import { TimeBlockCard } from './TimeBlockCard';

type Props = {
  importedCandidates: TimeBlockCardView[];
  templateCandidates: TimeBlockCardView[];
  changedCommittedCandidates: TimeBlockCardView[];
  onReturnBlock: (blockId: string) => void;
  onAutoPlaceImported: (blockId: string) => void;
};

export const AvailableBlocksPanel = ({
  importedCandidates,
  templateCandidates,
  changedCommittedCandidates,
  onAutoPlaceImported,
  onReturnBlock
}: Props) => {
  console.info('[candidate-panel] rendered candidate counts', {
    imported: importedCandidates.length,
    templates: templateCandidates.length,
    changedCommitted: changedCommittedCandidates.length
  });

  return (
    <section
      className="panel"
      onDragOver={(event) => {
        if (!hasBlockPayload(event)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const payload = readBlockPayload(event);
        if (payload?.fromLaneId) {
          onReturnBlock(payload.blockId);
        }
      }}
    >
      <h2>Candidate blocks</h2>
      <p className="drop-hint">Drop a planned block here to return it to the pool.</p>

      <div className="candidate-section">
        <h3>Imported candidates</h3>
        <p className="drop-hint">Blue imported blocks support drag/drop and double-click auto-placement.</p>
        {importedCandidates.length === 0 ? <p>No imported candidates.</p> : null}
        <div className="panel-blocks">
          {importedCandidates.map((card) => (
            <TimeBlockCard key={card.block.id} card={card} onDoubleClick={onAutoPlaceImported} visualContext="candidate" />
          ))}
        </div>
      </div>

      <div className="candidate-section">
        <h3>PSP templates</h3>
        <p className="drop-hint">Purple PSP templates are reusable and spawn red 30-minute planning blocks when placed.</p>
        {templateCandidates.length === 0 ? <p>No template candidates.</p> : null}
        <div className="panel-blocks">
          {templateCandidates.map((card) => (
            <TimeBlockCard key={card.block.id} card={card} visualContext="candidate" />
          ))}
        </div>
      </div>

      <div className="candidate-section">
        <h3>Changed committed entries</h3>
        <p className="drop-hint">Committed entries removed from baseline remain here as red change candidates.</p>
        {changedCommittedCandidates.length === 0 ? <p>No changed committed entries.</p> : null}
        <div className="panel-blocks">
          {changedCommittedCandidates.map((card) => (
            <TimeBlockCard key={card.block.id} card={card} visualContext="candidate" />
          ))}
        </div>
      </div>
    </section>
  );
};
