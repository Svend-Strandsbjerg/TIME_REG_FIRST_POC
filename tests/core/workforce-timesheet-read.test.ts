import { describe, expect, it, vi } from 'vitest';
import type { TimeRegistrationCommittedEntry } from '../../src/core/domain/time-registration-committed-entry';
import { mapCommittedEntriesToTimeBlocks } from '../../src/integration/inbound/workforce-timesheet-inbound';
import {
  buildWorkforceTimesheetPeriodFilter,
  mapSAPResponseToCommittedEntries,
  parseSapTimeSheetDateToCanonicalDate,
  readWorkforceTimesheetEntriesForPeriod
} from '../../src/integration/sap/workforce-timesheet-read';

describe('workforce timesheet inbound read', () => {
  it('builds an inclusive period filter for one week', () => {
    const filter = buildWorkforceTimesheetPeriodFilter(
      { startDate: '2026-03-30', endDate: '2026-04-05' },
      { userExternalId: "person'o1", companyCode: '1710' }
    );

    expect(filter).toBe(
      "PersonWorkAgreementExternalID eq 'person''o1' and CompanyCode eq '1710' and TimeSheetDate ge datetimeoffset'2026-03-30T00:00:00Z' and TimeSheetDate lt datetimeoffset'2026-04-06T00:00:00Z'"
    );
  });

  it('builds an inclusive period filter for two weeks', () => {
    const filter = buildWorkforceTimesheetPeriodFilter(
      { startDate: '2026-03-30', endDate: '2026-04-12' },
      { userExternalId: 'person-1', companyCode: '1710' }
    );

    expect(filter).toContain("TimeSheetDate ge datetimeoffset'2026-03-30T00:00:00Z'");
    expect(filter).toContain("TimeSheetDate lt datetimeoffset'2026-04-13T00:00:00Z'");
  });

  it('parses OData v2 and maps to canonical committed entries with typed fields', () => {
    const entries = mapSAPResponseToCommittedEntries({
      d: {
        results: [
          {
            PersonWorkAgreementExternalID: 'person-1',
            CompanyCode: '1710',
            TimeSheetRecord: 'TSR-101',
            TimeSheetDate: '/Date(1774828800000)/',
            TimeSheetStatus: '30',
            TimeSheetPredecessorRecord: 'TSR-100',
            TimeSheetDataFields: {
              WBSElement: 'PSP-1',
              TimeSheetNote: 'Implementation',
              RecordedHours: 7.5,
              RecordedQuantity: 2,
              HoursUnitOfMeasure: 'H'
            }
          }
        ]
      }
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      sapTimeSheetRecord: 'TSR-101',
      userExternalId: 'person-1',
      companyCode: '1710',
      status: '30',
      predecessorRecord: 'TSR-100',
      wbsElement: 'PSP-1',
      note: 'Implementation',
      hours: 7.5,
      quantity: 2,
      hoursUnitOfMeasure: 'H'
    });
    expect(typeof entries[0].hours).toBe('number');
    expect(entries[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles optional absent fields and drops records missing required identifiers', () => {
    const entries = mapSAPResponseToCommittedEntries({
      value: [
        {
          PersonWorkAgreementExternalID: 'person-1',
          CompanyCode: '1710',
          TimeSheetRecord: 'TSR-102',
          TimeSheetDate: '2026-04-02'
        },
        {
          PersonWorkAgreementExternalID: 'person-1',
          CompanyCode: '1710',
          TimeSheetDate: '2026-04-02'
        }
      ]
    });

    expect(entries).toEqual([
      {
        sapTimeSheetRecord: 'TSR-102',
        userExternalId: 'person-1',
        companyCode: '1710',
        date: '2026-04-02'
      }
    ]);
  });

  it('requests SAP read endpoint and preserves TimeSheetRecord for future operations', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          {
            PersonWorkAgreementExternalID: 'person-1',
            CompanyCode: '1710',
            TimeSheetRecord: 'TSR-500',
            TimeSheetDate: '2026-04-01',
            TimeSheetStatus: '20',
            TimeSheetDataFields: { RecordedHours: 8 }
          }
        ]
      })
    });

    const result = await readWorkforceTimesheetEntriesForPeriod(
      { startDate: '2026-03-30', endDate: '2026-04-05' },
      { userExternalId: 'person-1', companyCode: '1710' },
      { baseUrl: 'https://sap.example.test', fetchImpl: fetchMock as typeof fetch }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] ?? [])[0]).toContain('$filter=');
    expect(result[0]?.sapTimeSheetRecord).toBe('TSR-500');
    expect(result[0]?.status).toBe('20');
    expect(result[0]?.hours).toBe(8);
  });

  it('maps committed entries into board committed blocks', () => {
    const entries: TimeRegistrationCommittedEntry[] = [
      {
        sapTimeSheetRecord: 'TSR-700',
        userExternalId: 'person-1',
        companyCode: '1710',
        date: '2026-04-01',
        hours: 2,
        wbsElement: 'PSP-7',
        note: 'Customer workshop',
        status: '30'
      }
    ];

    const blocks = mapCommittedEntriesToTimeBlocks(entries);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      id: 'sap-committed-TSR-700',
      state: 'committed',
      source: 'external-api',
      extentMinutes: 120,
      metadata: {
        sapTimeSheetRecord: 'TSR-700',
        description: 'Customer workshop',
        timeSheetStatus: '30',
        committedPlacement: {
          laneId: 'lane-wednesday',
          startTime: '08:00',
          extentMinutes: 120
        }
      }
    });
  });

  it('converts several date formats to canonical date', () => {
    expect(parseSapTimeSheetDateToCanonicalDate('2026-04-01')).toBe('2026-04-01');
    expect(parseSapTimeSheetDateToCanonicalDate('2026-04-01T12:00:00Z')).toBe('2026-04-01');
    expect(parseSapTimeSheetDateToCanonicalDate('/Date(1775001600000)/')).toBe('2026-03-31');
  });
});
