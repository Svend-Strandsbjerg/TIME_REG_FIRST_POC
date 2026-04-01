import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiPayloadPreviewModal } from '../../src/ui/components/ApiPayloadPreviewModal';
import type { CommitRecord } from '../../src/core/application/commit-preview';

describe('ApiPayloadPreviewModal', () => {
  it('renders provided payload entries', () => {
    const selectedRecord: CommitRecord = {
      queueId: 'queue-preview-1',
      entries: [
        {
          PersonWorkAgreementExternalID: 'worker-1',
          CompanyCode: '1010',
          TimeSheetDate: '2026-03-31',
          TimeSheetOperation: 'C',
          TimeSheetDataFields: {
            RecordedHours: 2
          }
        }
      ]
    };

    const html = renderToStaticMarkup(<ApiPayloadPreviewModal selectedRecord={selectedRecord} onClose={() => undefined} />);

    expect(html).toContain('API Payload Preview');
    expect(html).toContain('queue-preview-1');
    expect(html).toContain('PersonWorkAgreementExternalID');
    expect(html).toContain('worker-1');
  });
});
