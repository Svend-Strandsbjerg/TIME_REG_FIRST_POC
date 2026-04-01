import { useEffect, useState } from 'react';

export type BlockDetailsDraft = {
  description: string;
  taskType: string;
  taskComponent: string;
  activityType: string;
  billingControlCategory: string;
  overtimeCategory: string;
  wbsElement: string;
  internalOrder: string;
};

type Props = {
  isOpen: boolean;
  blockTitle?: string;
  initialDraft: BlockDetailsDraft;
  onSave: (draft: BlockDetailsDraft) => void;
  onCancel: () => void;
};

export const DescriptionModal = ({ isOpen, blockTitle, initialDraft, onSave, onCancel }: Props) => {
  const [draft, setDraft] = useState<BlockDetailsDraft>(initialDraft);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialDraft);
    }
  }, [initialDraft, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit block description" onClick={(event) => event.stopPropagation()}>
        <h2>Edit description</h2>
        {blockTitle ? <p className="modal-subtitle">{blockTitle}</p> : null}
        <textarea
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          rows={4}
          placeholder="Enter description"
        />
        <input
          value={draft.taskType}
          onChange={(event) => setDraft((current) => ({ ...current, taskType: event.target.value }))}
          placeholder="Task type"
        />
        <input
          value={draft.taskComponent}
          onChange={(event) => setDraft((current) => ({ ...current, taskComponent: event.target.value }))}
          placeholder="Task component"
        />
        <input
          value={draft.activityType}
          onChange={(event) => setDraft((current) => ({ ...current, activityType: event.target.value }))}
          placeholder="Activity type"
        />
        <input
          value={draft.billingControlCategory}
          onChange={(event) => setDraft((current) => ({ ...current, billingControlCategory: event.target.value }))}
          placeholder="Billing control category"
        />
        <input
          value={draft.overtimeCategory}
          onChange={(event) => setDraft((current) => ({ ...current, overtimeCategory: event.target.value }))}
          placeholder="Overtime category"
        />
        <input
          value={draft.wbsElement}
          onChange={(event) => setDraft((current) => ({ ...current, wbsElement: event.target.value }))}
          placeholder="WBS element"
        />
        <input
          value={draft.internalOrder}
          onChange={(event) => setDraft((current) => ({ ...current, internalOrder: event.target.value }))}
          placeholder="Internal order"
        />
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave(draft)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
