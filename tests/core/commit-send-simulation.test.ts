import { describe, expect, it, vi } from 'vitest';
import type { WorkforceTimesheetRequest } from '../../src/integration/sap/sap-time-entry-mapper';
import {
  simulateSendToSAP,
  transitionCommitRecordSendState
} from '../../src/core/application/commit-send-simulation';

const sampleEntries: WorkforceTimesheetRequest[] = [
  {
    PersonWorkAgreementExternalID: 'worker-1',
    CompanyCode: '1010',
    TimeSheetDate: '2026-03-31',
    TimeSheetOperation: 'C',
    TimeSheetDataFields: {
      RecordedHours: 2
    }
  }
];

describe('transitionCommitRecordSendState', () => {
  it('supports the happy path idle -> sending -> success', () => {
    const sending = transitionCommitRecordSendState('idle', 'start');
    const success = transitionCommitRecordSendState(sending, 'succeed');

    expect(sending).toBe('sending');
    expect(success).toBe('success');
  });

  it('supports failure and retry transitions', () => {
    const sending = transitionCommitRecordSendState('idle', 'start');
    const error = transitionCommitRecordSendState(sending, 'fail');
    const retry = transitionCommitRecordSendState(error, 'start');

    expect(error).toBe('error');
    expect(retry).toBe('sending');
  });
});

describe('simulateSendToSAP', () => {
  it('uses commit record entries directly and resolves on success', async () => {
    const logger = { log: vi.fn() };

    await expect(simulateSendToSAP(sampleEntries, { delayMs: 1, shouldFail: false, logger })).resolves.toBeUndefined();
    expect(logger.log).toHaveBeenCalledWith('[SAP SIMULATION] Sending payload to SAP:', sampleEntries);
  });

  it('rejects when simulated failure is requested', async () => {
    await expect(simulateSendToSAP(sampleEntries, { delayMs: 1, shouldFail: true })).rejects.toThrow(
      'Simulated SAP send failure'
    );
  });
});
