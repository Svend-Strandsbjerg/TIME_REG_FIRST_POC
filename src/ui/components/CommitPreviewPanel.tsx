import { useMemo, useState } from 'react';
import type { QueueItem } from '../../core/domain/board-types';
import { mapQueueToCommitRecords, type CommitRecord } from '../../core/application/commit-preview';
import { ApiPayloadPreviewModal } from './ApiPayloadPreviewModal';

type Props = {
  queueItems: QueueItem[];
};

export const CommitPreviewPanel = ({ queueItems }: Props) => {
  const commitRecords = useMemo(() => mapQueueToCommitRecords(queueItems), [queueItems]);
  const [selectedRecord, setSelectedRecord] = useState<CommitRecord | undefined>(undefined);

  return (
    <section className="commit-preview-panel">
      <h3>API Commit Records</h3>
      {commitRecords.length === 0 ? <p className="drop-hint">No commit records available.</p> : null}
      <ul className="queue-items commit-record-items">
        {commitRecords.map((record) => (
          <li
            key={record.queueId}
            className="queue-item commit-record-item"
            onDoubleClick={() => setSelectedRecord(record)}
            title="Double-click to inspect API payload"
          >
            <strong>{record.queueId}</strong>
            <span>entries: {record.entries.length}</span>
          </li>
        ))}
      </ul>
      <ApiPayloadPreviewModal selectedRecord={selectedRecord} onClose={() => setSelectedRecord(undefined)} />
    </section>
  );
};
