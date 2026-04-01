import type { TimeRegistrationPeriod, TimeRegistrationReadUserContext } from '../../core/domain/time-registration-committed-entry';
import { mapCommittedEntriesToTimeBlocks } from './workforce-timesheet-inbound';
import type { InboundBlockSource } from './api-block-source';
import {
  mapSAPResponseToCommittedEntries,
  readWorkforceTimesheetEntriesForPeriod,
  readWorkforceTimesheetEntriesForPeriodSimulated,
  type WorkforceTimesheetReadServiceDependencies
} from '../sap/workforce-timesheet-read';
import type { TimeBlock } from '../../core/domain/board-types';

export type SAPWorkforceBlockSourceOptions = {
  period: TimeRegistrationPeriod;
  userContext: TimeRegistrationReadUserContext;
  mode: 'simulated' | 'live';
  sapRead?: WorkforceTimesheetReadServiceDependencies;
};

export class SAPWorkforceBlockSource implements InboundBlockSource {
  constructor(private readonly options: SAPWorkforceBlockSourceOptions) {}

  async listTimeRegistrationCandidates(): Promise<TimeBlock[]> {
    const entries =
      this.options.mode === 'simulated'
        ? mapSAPResponseToCommittedEntries(
            await readWorkforceTimesheetEntriesForPeriodSimulated(this.options.period, this.options.userContext)
          )
        : await readWorkforceTimesheetEntriesForPeriod(this.options.period, this.options.userContext, this.requireLiveRead());

    return mapCommittedEntriesToTimeBlocks(entries);
  }

  private requireLiveRead(): WorkforceTimesheetReadServiceDependencies {
    if (!this.options.sapRead) {
      throw new Error('SAP live read dependencies are required when mode is live.');
    }
    return this.options.sapRead;
  }
}
