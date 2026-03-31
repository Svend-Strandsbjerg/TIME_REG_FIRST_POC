import type { WeeklyBoardView } from '../../core/application/board-queries';

type Props = {
  queue: WeeklyBoardView['queue'];
};

export const QueueLogPanel = ({ queue }: Props) => {
  const newestFirstItems = queue.items.slice().reverse();

  return (
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
        {newestFirstItems.map((item) => (
          <li key={item.id} className="queue-item">
            <strong>{item.payload.title}</strong>
            <span>queue ID: {item.queueId}</span>
            <span>item ID: {item.id}</span>
            <span>day: {item.payload.dayKey}</span>
            <span>interval: {item.payload.interval}</span>
            <span>operation: {item.operation}</span>
            <small>{item.metadata.reason}</small>
          </li>
        ))}
      </ul>
    </aside>
  );
};
