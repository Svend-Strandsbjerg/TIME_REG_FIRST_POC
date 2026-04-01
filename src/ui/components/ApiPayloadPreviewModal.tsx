import type { CommitRecord } from '../../core/application/commit-preview';
import { formatCommitRecordEntries } from '../../core/application/commit-preview';

type Props = {
  selectedRecord?: CommitRecord;
  onClose: () => void;
};

export const ApiPayloadPreviewModal = ({ selectedRecord, onClose }: Props) => {
  if (!selectedRecord) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--payload-preview"
        role="dialog"
        aria-modal="true"
        aria-label="API Payload Preview"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>API Payload Preview</h2>
        <p className="modal-subtitle">
          Queue ID: <strong>{selectedRecord.queueId}</strong> · Entries: <strong>{selectedRecord.entries.length}</strong>
        </p>
        <pre className="api-payload-json">{formatCommitRecordEntries(selectedRecord)}</pre>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
