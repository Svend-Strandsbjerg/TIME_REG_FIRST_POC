import type { WorkforceTimesheetRequest } from '../../integration/sap/sap-time-entry-mapper';

export type CommitRecordSendState = 'idle' | 'sending' | 'success' | 'error';
export type CommitRecordSendEvent = 'start' | 'succeed' | 'fail' | 'reset';

type SimulateSendOptions = {
  delayMs?: number;
  shouldFail?: boolean;
  logger?: Pick<Console, 'log'>;
};

export const transitionCommitRecordSendState = (
  currentState: CommitRecordSendState,
  event: CommitRecordSendEvent
): CommitRecordSendState => {
  if (event === 'reset') {
    return 'idle';
  }

  if (event === 'start') {
    return 'sending';
  }

  if (currentState !== 'sending') {
    return currentState;
  }

  return event === 'succeed' ? 'success' : 'error';
};

export const simulateSendToSAP = (
  entries: WorkforceTimesheetRequest[],
  options: SimulateSendOptions = {}
): Promise<void> => {
  const delayMs = options.delayMs ?? 500 + Math.floor(Math.random() * 501);
  const shouldFail = options.shouldFail ?? Math.random() < 0.2;
  const logger = options.logger ?? console;

  logger.log('[SAP SIMULATION] Sending payload to SAP:', entries);

  return new Promise((resolve, reject) => {
    globalThis.setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Simulated SAP send failure'));
        return;
      }

      resolve();
    }, delayMs);
  });
};
