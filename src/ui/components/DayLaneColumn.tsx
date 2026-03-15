import type { DayLaneView } from '../../core/application/board-queries';
import { readBlockPayload } from '../adapters/dnd-adapter';
import { TimeBlockCard } from './TimeBlockCard';

type Props = {
  lane: DayLaneView;
  onDropBlock: (blockId: string, laneId: string) => void;
};

export const DayLaneColumn = ({ lane, onDropBlock }: Props) => (
  <section
    className="lane"
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => {
      event.preventDefault();
      const payload = readBlockPayload(event);
      if (payload) {
        onDropBlock(payload.blockId, lane.lane.id);
      }
    }}
  >
    <header>
      <h3>{lane.lane.label}</h3>
      <span>{lane.totalHours}h</span>
    </header>
    <span className="lane-summary">{lane.placedBlocks.length} planned</span>
    {lane.placedBlocks.length === 0 ? <p className="drop-hint">Drop blocks here</p> : null}
    <div className="lane-blocks">
      {lane.placedBlocks.map((card) => (
        <TimeBlockCard key={card.block.id} card={card} fromLaneId={lane.lane.id} />
      ))}
    </div>
  </section>
);
