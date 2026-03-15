import type { DayLaneView } from '../../core/application/board-queries';
import { readBlockPayload } from '../adapters/dnd-adapter';
import { TimeBlockCard } from './TimeBlockCard';

type Props = {
  lane: DayLaneView;
  onDropBlock: (blockId: string, laneId: string, startTime: string) => void;
  onResizeTop: (blockId: string, slotDelta: number) => void;
  onResizeBottom: (blockId: string, slotDelta: number) => void;
};

export const DayLaneColumn = ({ lane, onDropBlock, onResizeBottom, onResizeTop }: Props) => (
  <section className="lane">
    <header>
      <h3>{lane.lane.label}</h3>
      <span>{lane.totalHours}h</span>
    </header>
    <span className="lane-summary">{lane.placedBlocks.length} planned</span>
    <div className="time-lane-grid">
      {lane.slots.map((slot) => (
        <div
          key={`${lane.lane.id}-${slot}`}
          className="time-slot-row"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const payload = readBlockPayload(event);
            if (payload) {
              onDropBlock(payload.blockId, lane.lane.id, slot);
            }
          }}
        >
          <span>{slot}</span>
        </div>
      ))}

      {lane.placedBlocks.map((card) => (
        <div
          key={card.block.id}
          className="lane-block-placement"
          style={{ top: `${(card.topOffsetMinutes ?? 0) * 2}px` }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const payload = readBlockPayload(event);
            if (payload && card.startTime) {
              onDropBlock(payload.blockId, lane.lane.id, card.startTime);
            }
          }}
        >
          <TimeBlockCard
            card={card}
            fromLaneId={lane.lane.id}
            onResizeBottom={onResizeBottom}
            onResizeTop={onResizeTop}
          />
        </div>
      ))}
    </div>
  </section>
);
