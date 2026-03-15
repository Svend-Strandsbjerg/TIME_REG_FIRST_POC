import type { DayLaneView } from '../../core/application/board-queries';
import { DayLaneColumn } from './DayLaneColumn';

type Props = {
  lanes: DayLaneView[];
  onDropBlock: (blockId: string, laneId: string) => void;
};

export const WeekSwimlanes = ({ lanes, onDropBlock }: Props) => (
  <section className="week-grid">
    {lanes.map((lane) => (
      <DayLaneColumn key={lane.lane.id} lane={lane} onDropBlock={onDropBlock} />
    ))}
  </section>
);
