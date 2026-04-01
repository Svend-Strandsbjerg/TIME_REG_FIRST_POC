import type { TimeRegistrationPeriod, TimeRegistrationReadUserContext } from '../../core/domain/time-registration-committed-entry';
import { mapCommittedEntriesToTimeBlocks } from './workforce-timesheet-inbound';
import type { InboundBlockSource } from './api-block-source';
import { readWorkforceTimesheetEntriesForPeriod, type WorkforceTimesheetReadServiceDependencies } from '../sap/workforce-timesheet-read';
import type { TimeBlock } from '../../core/domain/board-types';

export type SAPWorkforceBlockSourceOptions = {
  period: TimeRegistrationPeriod;
  userContext: TimeRegistrationReadUserContext;
  sapRead: WorkforceTimesheetReadServiceDependencies;
};

export class SAPWorkforceBlockSource implements InboundBlockSource {
  constructor(private readonly options: SAPWorkforceBlockSourceOptions) {}

  async listTimeRegistrationCandidates(): Promise<TimeBlock[]> {
    const entries = await readWorkforceTimesheetEntriesForPeriod(
      this.options.period,
      this.options.userContext,
      this.options.sapRead
    );

    return mapCommittedEntriesToTimeBlocks(entries);
  }
}
