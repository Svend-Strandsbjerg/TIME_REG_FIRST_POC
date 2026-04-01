import type { WorkforceTimesheetRequest } from '../../integration/sap/sap-time-entry-mapper';
import type { CommitRecord } from './commit-preview';
import { prepareCommitRecordForSubmission, type PrepareCommitRecordForSubmissionResult } from './commit-submission';

export type CommitRecordSendState = 'idle' | 'validation-error' | 'sending' | 'success' | 'error';
export type CommitRecordSendEvent = 'start' | 'validate-fail' | 'succeed' | 'fail' | 'reset';

type SimulateSendOptions = {
  delayMs?: number;
  shouldFail?: boolean;
  logger?: Pick<Console, 'log'>;
};

export type SimulatedCommitRecordSendResult =
  | {
      kind: 'validation-error';
      preparation: PrepareCommitRecordForSubmissionResult;
    }
  | {
      kind: 'sent';
      preparation: PrepareCommitRecordForSubmissionResult;
    }
  | {
      kind: 'send-error';
      preparation: PrepareCommitRecordForSubmissionResult;
      error: Error;
    };

export const transitionCommitRecordSendState = (
  currentState: CommitRecordSendState,
  event: CommitRecordSendEvent
): CommitRecordSendState => {
  if (event === 'reset') {
    return 'idle';
  }

  if (event === 'validate-fail') {
    return 'validation-error';
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

export const simulateCommitRecordSend = async (
  record: CommitRecord,
  options: SimulateSendOptions = {},
  sendFn: (entries: WorkforceTimesheetRequest[], options?: SimulateSendOptions) => Promise<void> = simulateSendToSAP
): Promise<SimulatedCommitRecordSendResult> => {
  const preparation = prepareCommitRecordForSubmission(record);
  if (!preparation.isReadyToSend || !preparation.submission) {
    return {
      kind: 'validation-error',
      preparation
    };
  }

  try {
    await sendFn(preparation.submission.entries, options);
    return {
      kind: 'sent',
      preparation
    };
  } catch (error) {
    return {
      kind: 'send-error',
      preparation,
      error: error instanceof Error ? error : new Error('Unknown simulated send failure')
    };
  }
};
