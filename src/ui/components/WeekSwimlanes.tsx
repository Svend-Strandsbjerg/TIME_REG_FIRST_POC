import type { DayLaneView } from '../../core/application/board-queries';
import { DayLaneColumn } from './DayLaneColumn';

type Props = {
  lanes: DayLaneView[];
  onDropBlock: (blockId: string, laneId: string, startTime: string) => void;
  onExtendUpward: (blockId: string) => void;
  onExtendDownward: (blockId: string) => void;
};

export const WeekSwimlanes = ({ lanes, onDropBlock, onExtendDownward, onExtendUpward }: Props) => (
  <section className="week-grid">
    {lanes.map((lane) => (
      <DayLaneColumn
        key={lane.lane.id}
        lane={lane}
        onDropBlock={onDropBlock}
        onExtendDownward={onExtendDownward}
        onExtendUpward={onExtendUpward}
      />
    ))}
  </section>
);
