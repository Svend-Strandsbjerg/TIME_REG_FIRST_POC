import type { TimeBlockCardView } from '../../core/application/board-queries';
import { writeBlockPayload } from '../adapters/dnd-adapter';

type Props = {
  card: TimeBlockCardView;
  fromLaneId?: string;
};

const HEIGHT: Record<TimeBlockCardView['size'], string> = {
  small: '40px',
  medium: '56px',
  large: '72px',
  xlarge: '96px'
};

export const TimeBlockCard = ({ card, fromLaneId }: Props) => (
  <article
    draggable
    onDragStart={(event) => writeBlockPayload(event, { blockId: card.block.id, fromLaneId })}
    className="time-block-card"
    style={{ minHeight: HEIGHT[card.size] }}
  >
    <strong>{card.block.title}</strong>
    <span>{card.block.durationMinutes} min</span>
  </article>
);
