import type { TimeBlockCardView } from '../../core/application/board-queries';
import { readBlockPayload } from '../adapters/dnd-adapter';
import { TimeBlockCard } from './TimeBlockCard';

type Props = {
  blocks: TimeBlockCardView[];
  onReturnBlock: (blockId: string) => void;
};

export const AvailableBlocksPanel = ({ blocks, onReturnBlock }: Props) => (
  <section
    className="panel"
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => {
      event.preventDefault();
      const payload = readBlockPayload(event);
      if (payload?.fromLaneId) {
        onReturnBlock(payload.blockId);
      }
    }}
  >
    <h2>Unplanned candidates</h2>
    <p className="drop-hint">Drop a planned block here to return it to the pool.</p>
    {blocks.length === 0 ? <p>All blocks are planned.</p> : null}
    <div className="panel-blocks">
      {blocks.map((card) => (
        <TimeBlockCard key={card.block.id} card={card} />
      ))}
    </div>
  </section>
);
