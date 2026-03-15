import { useEffect, useState } from 'react';

type Props = {
  isOpen: boolean;
  blockTitle?: string;
  initialDescription?: string;
  onSave: (description: string) => void;
  onCancel: () => void;
};

export const DescriptionModal = ({ isOpen, blockTitle, initialDescription, onSave, onCancel }: Props) => {
  const [draft, setDraft] = useState(initialDescription ?? '');

  useEffect(() => {
    if (isOpen) {
      setDraft(initialDescription ?? '');
    }
  }, [initialDescription, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit block description" onClick={(event) => event.stopPropagation()}>
        <h2>Edit description</h2>
        {blockTitle ? <p className="modal-subtitle">{blockTitle}</p> : null}
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} placeholder="Enter description" />
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
