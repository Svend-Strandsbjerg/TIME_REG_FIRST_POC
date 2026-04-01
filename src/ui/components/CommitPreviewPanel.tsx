import { useMemo, useState } from 'react';
import type { QueueItem } from '../../core/domain/board-types';
import { mapQueueToCommitRecords, type CommitRecord } from '../../core/application/commit-preview';
import {
  simulateSendToSAP,
  transitionCommitRecordSendState,
  type CommitRecordSendState
} from '../../core/application/commit-send-simulation';
import { ApiPayloadPreviewModal } from './ApiPayloadPreviewModal';

type Props = {
  queueItems: QueueItem[];
};

export const CommitPreviewPanel = ({ queueItems }: Props) => {
  const commitRecords = useMemo(() => mapQueueToCommitRecords(queueItems), [queueItems]);
  const [selectedRecord, setSelectedRecord] = useState<CommitRecord | undefined>(undefined);
  const [sendStates, setSendStates] = useState<Record<string, CommitRecordSendState>>({});

  const sendStateFor = (queueId: string): CommitRecordSendState => sendStates[queueId] ?? 'idle';

  const handleSendToSap = async (record: CommitRecord) => {
    setSendStates((current) => ({
      ...current,
      [record.queueId]: transitionCommitRecordSendState(current[record.queueId] ?? 'idle', 'start')
    }));

    try {
      await simulateSendToSAP(record.entries);
      setSendStates((current) => ({
        ...current,
        [record.queueId]: transitionCommitRecordSendState('sending', 'succeed')
      }));
    } catch {
      setSendStates((current) => ({
        ...current,
        [record.queueId]: transitionCommitRecordSendState('sending', 'fail')
      }));
    }
  };

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
            <div className="commit-record-actions">
              <button
                type="button"
                onClick={() => void handleSendToSap(record)}
                disabled={sendStateFor(record.queueId) === 'sending'}
              >
                {sendStateFor(record.queueId) === 'sending'
                  ? 'Sending...'
                  : sendStateFor(record.queueId) === 'error'
                    ? 'Retry Send to SAP'
                    : 'Send to SAP'}
              </button>
              <span className={`send-state send-state--${sendStateFor(record.queueId)}`}>
                {sendStateFor(record.queueId) === 'idle' ? 'Idle' : null}
                {sendStateFor(record.queueId) === 'sending' ? 'Sending to SAP...' : null}
                {sendStateFor(record.queueId) === 'success' ? 'Sent successfully' : null}
                {sendStateFor(record.queueId) === 'error' ? 'Failed to send' : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <ApiPayloadPreviewModal selectedRecord={selectedRecord} onClose={() => setSelectedRecord(undefined)} />
    </section>
  );
};
