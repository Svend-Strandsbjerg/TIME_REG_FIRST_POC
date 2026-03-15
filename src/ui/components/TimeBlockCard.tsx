import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TimeBlockCardView } from '../../core/application/board-queries';
import { extentToCalendarHeight } from '../../core/domain/time-block';
import { SLOT_MINUTES } from '../../core/domain/time-slot';
import { writeBlockPayload } from '../adapters/dnd-adapter';

type Props = {
  card: TimeBlockCardView;
  fromLaneId?: string;
  onResizeTop?: (blockId: string, slotDelta: number) => void;
  onResizeBottom?: (blockId: string, slotDelta: number) => void;
  onDoubleClick?: (blockId: string) => void;
  visualContext?: 'candidate' | 'placed';
};

const SLOT_HEIGHT_PX = extentToCalendarHeight(SLOT_MINUTES);

export const TimeBlockCard = ({ card, fromLaneId, onDoubleClick, onResizeBottom, onResizeTop, visualContext = 'candidate' }: Props) => {
  const isResizingRef = useRef(false);

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>, edge: 'top' | 'bottom') => {
    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    const originY = event.clientY;
    const handle = event.currentTarget;
    let latestDelta = 0;

    isResizingRef.current = true;
    handle.setPointerCapture(pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      latestDelta = Math.round((moveEvent.clientY - originY) / SLOT_HEIGHT_PX);
    };

    const onPointerUp = () => {
      if (latestDelta !== 0) {
        if (edge === 'top') {
          onResizeTop?.(card.block.id, latestDelta);
        } else {
          onResizeBottom?.(card.block.id, latestDelta);
        }
      }

      isResizingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <article
      draggable
      onDragStart={(event) => {
        if (isResizingRef.current) {
          event.preventDefault();
          return;
        }
        writeBlockPayload(event, { blockId: card.block.id, fromLaneId });
      }}
      onDoubleClick={() => onDoubleClick?.(card.block.id)}
      className={`time-block-card time-block-card--${card.state} time-block-card--${visualContext}`}
      style={card.heightMinutes ? { height: `${extentToCalendarHeight(card.heightMinutes)}px` } : undefined}
    >
      {(onResizeTop || onResizeBottom) && (
        <div
          className="resize-handle resize-handle--top"
          onPointerDown={(event) => beginResize(event, 'top')}
          aria-label="Resize block from top"
          role="separator"
        />
      )}
      <strong>{card.block.title}</strong>
      {card.isTemplate ? <small>Reusable template</small> : null}
      {card.templateSourceBlockId ? <small>From template: {card.templateSourceBlockId}</small> : null}
      <span>{card.interval ?? 'Interval TBD'}</span>
      {(onResizeTop || onResizeBottom) && (
        <div
          className="resize-handle resize-handle--bottom"
          onPointerDown={(event) => beginResize(event, 'bottom')}
          aria-label="Resize block from bottom"
          role="separator"
        />
      )}
    </article>
  );
};
