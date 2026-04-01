export type CanonicalDate = string;

export type TimeRegistrationPeriod = {
  startDate: CanonicalDate; // YYYY-MM-DD
  endDate: CanonicalDate; // YYYY-MM-DD
};

export type TimeRegistrationReadUserContext = {
  userExternalId: string;
  companyCode: string;
};

export type TimeRegistrationCommittedEntry = {
  sapTimeSheetRecord: string;
  userExternalId: string;
  companyCode: string;
  date: CanonicalDate; // YYYY-MM-DD
  hours?: number;
  quantity?: number;
  wbsElement?: string;
  internalOrder?: string;
  activityType?: string;
  workItem?: string;
  billingControlCategory?: string;
  taskType?: string;
  taskLevel?: string;
  taskComponent?: string;
  note?: string;
  hoursUnitOfMeasure?: string;
  workLocationCode?: string;
  overtimeCategory?: string;
  status?: string;
  predecessorRecord?: string;
};
