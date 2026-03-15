import type { WeeklyBoardView } from '../../core/application/board-queries';
import { AvailableBlocksPanel } from './AvailableBlocksPanel';
import { QueueLogPanel } from './QueueLogPanel';
import { WeekSwimlanes } from './WeekSwimlanes';

type Props = {
  board: WeeklyBoardView;
  onPlaceBlock: (blockId: string, laneId: string, startTime: string) => void;
  onReturnBlock: (blockId: string) => void;
  onResizeTop: (blockId: string, slotDelta: number) => void;
  onResizeBottom: (blockId: string, slotDelta: number) => void;
  onAutoPlaceImported: (blockId: string) => void;
  onOpenDescriptionEditor: (blockId: string) => void;
};

export const TimeRegistrationBoard = ({
  board,
  onPlaceBlock,
  onReturnBlock,
  onResizeBottom,
  onResizeTop,
  onAutoPlaceImported,
  onOpenDescriptionEditor
}: Props) => (
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
        <p>
          Planned: {board.summary.plannedBlocks} | Unplanned: {board.summary.unplannedBlocks}
        </p>
      </header>
      <WeekSwimlanes
        lanes={board.lanes}
        onDropBlock={onPlaceBlock}
        onResizeBottom={onResizeBottom}
        onResizeTop={onResizeTop}
        onOpenDescriptionEditor={onOpenDescriptionEditor}
      />
    </section>
    <QueueLogPanel queue={board.queue} />
  </main>
);
