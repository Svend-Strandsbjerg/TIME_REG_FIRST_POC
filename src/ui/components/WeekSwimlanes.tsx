import type { DayLaneView } from '../../core/application/board-queries';
import { DayLaneColumn } from './DayLaneColumn';

type Props = {
  lanes: DayLaneView[];
  onDropBlock: (blockId: string, laneId: string, startTime: string) => void;
  onResizeTop: (blockId: string, slotDelta: number) => void;
  onResizeBottom: (blockId: string, slotDelta: number) => void;
  onOpenDescriptionEditor: (blockId: string) => void;
};

export const WeekSwimlanes = ({ lanes, onDropBlock, onResizeBottom, onResizeTop, onOpenDescriptionEditor }: Props) => (
  <section className="week-grid" style={{ gridTemplateColumns: `repeat(${Math.max(lanes.length, 1)}, minmax(190px, 1fr))` }}>
    {lanes.map((lane) => (
      <DayLaneColumn
        key={lane.lane.id}
        lane={lane}
        onDropBlock={onDropBlock}
        onResizeBottom={onResizeBottom}
        onResizeTop={onResizeTop}
        onOpenDescriptionEditor={onOpenDescriptionEditor}
      />
    ))}
  </section>
);
