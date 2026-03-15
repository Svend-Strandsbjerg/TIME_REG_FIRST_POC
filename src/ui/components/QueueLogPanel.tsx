import type { WeeklyBoardView } from '../../core/application/board-queries';

type Props = {
  queue: WeeklyBoardView['queue'];
};

export const QueueLogPanel = ({ queue }: Props) => (
  <aside className="queue-panel">
    <h2>Queue / log</h2>
    <p>
      Queue ID: <strong>{queue.id}</strong>
    </p>
    <p>
      Status: <strong>{queue.status}</strong>
    </p>
    <p>Pending items: {queue.items.length}</p>
    {queue.items.length === 0 ? <p className="drop-hint">No pending queue changes.</p> : null}
    <ul className="queue-items">
      {queue.items.map((item) => (
        <li key={item.id} className="queue-item">
          <strong>{item.title}</strong>
          <span>
            {item.dayKey} — {item.timeSlot}
          </span>
          <span>operation: {item.operation}</span>
          <small>{item.reason}</small>
        </li>
      ))}
    </ul>
  </aside>
);
