import type { TimeBlockCardView } from '../../core/application/board-queries';
import { extentToCalendarHeight } from '../../core/domain/time-block';
import { writeBlockPayload } from '../adapters/dnd-adapter';

type Props = {
  card: TimeBlockCardView;
  fromLaneId?: string;
  onExtendUpward?: (blockId: string) => void;
  onExtendDownward?: (blockId: string) => void;
};

export const TimeBlockCard = ({ card, fromLaneId, onExtendDownward, onExtendUpward }: Props) => (
  <article
    draggable
    onDragStart={(event) => writeBlockPayload(event, { blockId: card.block.id, fromLaneId })}
    className={`time-block-card time-block-card--${card.state}`}
    style={card.heightMinutes ? { height: `${extentToCalendarHeight(card.heightMinutes)}px` } : undefined}
  >
    <strong>{card.block.title}</strong>
    <span>{card.block.extentMinutes} min</span>
    {card.startTime && card.endTime ? (
      <small>
        {card.startTime}–{card.endTime}
      </small>
    ) : null}
    {onExtendDownward || onExtendUpward ? (
      <div className="resize-actions">
        <button type="button" onClick={() => onExtendUpward?.(card.block.id)}>
          ↑ +30m
        </button>
        <button type="button" onClick={() => onExtendDownward?.(card.block.id)}>
          ↓ +30m
        </button>
      </div>
    ) : null}
  </article>
);
