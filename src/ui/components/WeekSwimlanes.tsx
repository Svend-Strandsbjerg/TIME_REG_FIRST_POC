import type { DayLaneView } from '../../core/application/board-queries';
import { DayLaneColumn } from './DayLaneColumn';

type Props = {
  lanes: DayLaneView[];
  onDropBlock: (
    blockId: string,
    laneId: string,
    startTime: string,
    dragOrigin?: 'lane' | 'candidate-imported' | 'candidate-template' | 'candidate-changed-committed'
  ) => void;
  onResizeTop: (blockId: string, slotDelta: number) => void;
  onResizeBottom: (blockId: string, slotDelta: number) => void;
  onOpenDescriptionEditor: (blockId: string) => void;
  onStartDrag: (args: {
    blockId: string;
    dragOrigin?: 'lane' | 'candidate-imported' | 'candidate-template' | 'candidate-changed-committed';
    fromLaneId?: string;
    ctrlKey: boolean;
  }) => {
    blockId: string;
    copyMode?: 'copy';
  };
  onEndDrag: (args: { blockId: string; dropEffect: DataTransfer['dropEffect'] }) => void;
};

export const WeekSwimlanes = ({ lanes, onDropBlock, onResizeBottom, onResizeTop, onOpenDescriptionEditor, onStartDrag, onEndDrag }: Props) => (
  <section className="week-grid" style={{ gridTemplateColumns: `repeat(${Math.max(lanes.length, 1)}, minmax(190px, 1fr))` }}>
    {lanes.map((lane) => (
      <DayLaneColumn
        key={lane.lane.id}
        lane={lane}
        onDropBlock={onDropBlock}
        onResizeBottom={onResizeBottom}
        onResizeTop={onResizeTop}
        onOpenDescriptionEditor={onOpenDescriptionEditor}
        onStartDrag={onStartDrag}
        onEndDrag={onEndDrag}
      />
    ))}
  </section>
);
