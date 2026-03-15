import type { WeeklyBoardView } from '../../core/application/board-queries';
import { AvailableBlocksPanel } from './AvailableBlocksPanel';
import { QueueLogPanel } from './QueueLogPanel';
import { WeekSwimlanes } from './WeekSwimlanes';

type Props = {
  board: WeeklyBoardView;
  onPlaceBlock: (blockId: string, laneId: string) => void;
  onReturnBlock: (blockId: string) => void;
};

export const TimeRegistrationBoard = ({ board, onPlaceBlock, onReturnBlock }: Props) => (
  <main className="layout">
    <AvailableBlocksPanel blocks={board.availableBlocks} onReturnBlock={onReturnBlock} />
    <section className="board-section">
      <header className="summary">
        <h1>Weekly Timesheet Planning</h1>
        <p>
          Planned: {board.summary.plannedBlocks} | Unplanned: {board.summary.unplannedBlocks}
        </p>
      </header>
      <WeekSwimlanes lanes={board.lanes} onDropBlock={onPlaceBlock} />
    </section>
    <QueueLogPanel queue={board.queue} />
  </main>
);
