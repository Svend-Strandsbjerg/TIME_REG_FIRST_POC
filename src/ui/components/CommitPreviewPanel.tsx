import { useMemo, useState } from 'react';
import type { QueueItem } from '../../core/domain/board-types';
import { mapQueueToCommitRecords, type CommitRecord } from '../../core/application/commit-preview';
import {
  simulateCommitRecordSend,
  transitionCommitRecordSendState,
  type CommitRecordSendState
} from '../../core/application/commit-send-simulation';
import type { CommitRecordValidationResult } from '../../core/application/commit-submission';
import { ApiPayloadPreviewModal } from './ApiPayloadPreviewModal';

type Props = {
  queueItems: QueueItem[];
};

export const CommitPreviewPanel = ({ queueItems }: Props) => {
  const commitRecords = useMemo(() => mapQueueToCommitRecords(queueItems), [queueItems]);
  const [selectedRecord, setSelectedRecord] = useState<CommitRecord | undefined>(undefined);
  const [sendStates, setSendStates] = useState<Record<string, CommitRecordSendState>>({});
  const [validationByQueueId, setValidationByQueueId] = useState<Record<string, CommitRecordValidationResult | undefined>>(
    {}
  );
  const [sendErrorsByQueueId, setSendErrorsByQueueId] = useState<Record<string, string | undefined>>({});

  const sendStateFor = (queueId: string): CommitRecordSendState => sendStates[queueId] ?? 'idle';

  const handleSendToSap = async (record: CommitRecord) => {
    const startState = transitionCommitRecordSendState(sendStateFor(record.queueId), 'start');
    setSendStates((current) => ({
      ...current,
      [record.queueId]: startState
    }));

    const result = await simulateCommitRecordSend(record);
    setValidationByQueueId((current) => ({
      ...current,
      [record.queueId]: result.preparation.validation
    }));

    if (result.kind === 'validation-error') {
      setSendStates((current) => ({
        ...current,
        [record.queueId]: transitionCommitRecordSendState(current[record.queueId] ?? 'idle', 'validate-fail')
      }));
      setSendErrorsByQueueId((current) => ({
        ...current,
        [record.queueId]: undefined
      }));
      return;
    }

    if (result.kind === 'send-error') {
      setSendStates((current) => ({
        ...current,
        [record.queueId]: transitionCommitRecordSendState('sending', 'fail')
      }));
      setSendErrorsByQueueId((current) => ({
        ...current,
        [record.queueId]: result.error.message
      }));
      return;
    }

    setSendStates((current) => ({
      ...current,
      [record.queueId]: transitionCommitRecordSendState('sending', 'succeed')
    }));
    setSendErrorsByQueueId((current) => ({
      ...current,
      [record.queueId]: undefined
    }));
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
                  : sendStateFor(record.queueId) === 'error' || sendStateFor(record.queueId) === 'validation-error'
                    ? 'Retry Send to SAP'
                    : 'Send to SAP'}
              </button>
              <span className={`send-state send-state--${sendStateFor(record.queueId)}`}>
                {sendStateFor(record.queueId) === 'idle' ? 'Idle' : null}
                {sendStateFor(record.queueId) === 'validation-error' ? 'Validation failed' : null}
                {sendStateFor(record.queueId) === 'sending' ? 'Sending to SAP...' : null}
                {sendStateFor(record.queueId) === 'success' ? 'Sent successfully' : null}
                {sendStateFor(record.queueId) === 'error' ? 'Failed to send' : null}
              </span>
            </div>
            {validationByQueueId[record.queueId] && !validationByQueueId[record.queueId]?.isValid ? (
              <div className="validation-errors" role="alert" aria-live="polite">
                <p>Cannot send until validation issues are resolved:</p>
                <ul>
                  {validationByQueueId[record.queueId]?.issues.map((issue) => (
                    <li key={`${record.queueId}-${issue.code}-${issue.message}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {sendErrorsByQueueId[record.queueId] ? (
              <p className="send-error-detail" role="alert">
                Send error: {sendErrorsByQueueId[record.queueId]}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <ApiPayloadPreviewModal selectedRecord={selectedRecord} onClose={() => setSelectedRecord(undefined)} />
    </section>
  );
};
