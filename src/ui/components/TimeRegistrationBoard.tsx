import type { WeeklyBoardView } from '../../core/application/board-queries';
import { AvailableBlocksPanel } from './AvailableBlocksPanel';
import { QueueLogPanel } from './QueueLogPanel';
import { WeekSwimlanes } from './WeekSwimlanes';

type Props = {
  board: WeeklyBoardView;
  hideWeekends: boolean;
  hasHiddenWeekendNonCommittedBlocks: boolean;
  onToggleHideWeekends: (nextValue: boolean) => void;
  onPlaceBlock: (
    blockId: string,
    laneId: string,
    startTime: string,
    dragOrigin?: 'lane' | 'candidate-imported' | 'candidate-template' | 'candidate-changed-committed'
  ) => void;
  onReturnBlock: (blockId: string) => void;
  onResizeTop: (blockId: string, slotDelta: number) => void;
  onResizeBottom: (blockId: string, slotDelta: number) => void;
  onAutoPlaceImported: (blockId: string) => void;
  onOpenDescriptionEditor: (blockId: string) => void;
};

export const TimeRegistrationBoard = ({
  board,
  hideWeekends,
  hasHiddenWeekendNonCommittedBlocks,
  onToggleHideWeekends,
  onPlaceBlock,
  onReturnBlock,
  onResizeBottom,
  onResizeTop,
  onAutoPlaceImported,
  onOpenDescriptionEditor
}: Props) => {
  const visibleLanes = hideWeekends ? board.lanes.filter((lane) => lane.lane.dayKey !== 'saturday' && lane.lane.dayKey !== 'sunday') : board.lanes;

  return (
    <main className="layout">
      <AvailableBlocksPanel
        importedCandidates={board.importedCandidates}
        templateCandidates={board.templateCandidates}
        changedCommittedCandidates={board.changedCommittedCandidates}
        onAutoPlaceImported={onAutoPlaceImported}
        onReturnBlock={onReturnBlock}
      />
      <section className="board-section">
        <header className="summary">
          <h1>Weekly Timesheet Planning</h1>
          <label className="toggle-control">
            <input type="checkbox" checked={hideWeekends} onChange={(event) => onToggleHideWeekends(event.target.checked)} />
            <span>Hide weekends</span>
          </label>
          {hideWeekends && hasHiddenWeekendNonCommittedBlocks ? (
            <p className="hidden-weekend-warning">Weekend days are hidden, but uncommitted/imported blocks still exist on Saturday/Sunday.</p>
          ) : null}
        </header>
        <WeekSwimlanes
          lanes={visibleLanes}
          onDropBlock={onPlaceBlock}
          onResizeBottom={onResizeBottom}
          onResizeTop={onResizeTop}
          onOpenDescriptionEditor={onOpenDescriptionEditor}
        />
      </section>
      <QueueLogPanel queue={board.queue} />
    </main>
  );
};
