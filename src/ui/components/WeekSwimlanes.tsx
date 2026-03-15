import type { DayLaneView } from '../../core/application/board-queries';
import { DayLaneColumn } from './DayLaneColumn';

type Props = {
  lanes: DayLaneView[];
  onDropBlock: (blockId: string, laneId: string, startTime: string) => void;
  onResizeTop: (blockId: string, slotDelta: number) => void;
  onResizeBottom: (blockId: string, slotDelta: number) => void;
};

export const WeekSwimlanes = ({ lanes, onDropBlock, onResizeBottom, onResizeTop }: Props) => (
  <section className="week-grid">
    {lanes.map((lane) => (
      <DayLaneColumn
        key={lane.lane.id}
        lane={lane}
        onDropBlock={onDropBlock}
        onResizeBottom={onResizeBottom}
        onResizeTop={onResizeTop}
      />
    ))}
  </section>
);
