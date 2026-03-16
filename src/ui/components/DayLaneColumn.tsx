import type { DragEvent } from 'react';
import type { DayLaneView } from '../../core/application/board-queries';
import { readBlockPayload } from '../adapters/dnd-adapter';
import { TimeBlockCard } from './TimeBlockCard';

type Props = {
  lane: DayLaneView;
  onDropBlock: (blockId: string, laneId: string, startTime: string) => void;
  onResizeTop: (blockId: string, slotDelta: number) => void;
  onResizeBottom: (blockId: string, slotDelta: number) => void;
  onOpenDescriptionEditor: (blockId: string) => void;
};

const SLOT_HEIGHT_PX = 60;

const resolveDropSlot = (event: DragEvent<HTMLDivElement>, slots: string[]) => {
  const laneRect = event.currentTarget.getBoundingClientRect();
  const pointerOffset = Math.max(0, event.clientY - laneRect.top);
  const slotIndex = Math.min(slots.length - 1, Math.max(0, Math.floor(pointerOffset / SLOT_HEIGHT_PX)));

  return slots[slotIndex] ?? slots[0] ?? '06:00';
};

export const DayLaneColumn = ({ lane, onDropBlock, onResizeBottom, onResizeTop, onOpenDescriptionEditor }: Props) => (
  <section className="lane">
    <header>
      <h3>{lane.lane.label}</h3>
      <span>{lane.totalHours}h</span>
    </header>
    <span className="lane-summary">{lane.placedBlocks.length} planned</span>
    <div
      className="time-lane-grid"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const payload = readBlockPayload(event);
        if (!payload) {
          return;
        }

        const slot = resolveDropSlot(event, lane.slots);
        onDropBlock(payload.blockId, lane.lane.id, slot);
      }}
    >
      {lane.slots.map((slot) => (
        <div key={`${lane.lane.id}-${slot}`} className="time-slot-row">
          <span>{slot}</span>
        </div>
      ))}

      {lane.placedBlocks.map((card) => {
        const columnCount = card.layoutColumnCount ?? 1;
        const columnWidth = 100 / columnCount;
        const leftOffset = (card.layoutColumn ?? 0) * columnWidth;

        return (
          <div
            key={card.block.id}
            className="lane-block-placement"
            style={{
              top: `${(card.topOffsetMinutes ?? 0) * 2}px`,
              left: `calc(36px + ${leftOffset}%)`,
              width: `calc((100% - 40px) * ${columnWidth / 100})`
            }}
          >
            <TimeBlockCard
              card={card}
              fromLaneId={lane.lane.id}
              onResizeBottom={onResizeBottom}
              onResizeTop={onResizeTop}
              onDoubleClick={onOpenDescriptionEditor}
              visualContext="placed"
            />
          </div>
        );
      })}
    </div>
  </section>
);
