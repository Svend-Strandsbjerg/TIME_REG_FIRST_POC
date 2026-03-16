import type { BoardState, TimeBlock } from '../../core/domain/board-types';

const STARTUP_DEMO_IMPORTED_BLOCKS: TimeBlock[] = [
  {
    id: 'demo-imported-outlook',
    title: 'Demo imported: Outlook weekly sync',
    source: 'external-api',
    state: 'imported',
    extentMinutes: 60,
    metadata: {
      importedFrom: 'outlook-calendar',
      importedDayKey: 'wednesday',
      importedStartTime: '08:30',
      importedEndTime: '09:30'
    }
  },
  {
    id: 'demo-imported-azure',
    title: 'Demo imported: Azure task follow-up',
    source: 'external-api',
    state: 'imported',
    extentMinutes: 120,
    metadata: {
      importedFrom: 'azure-workitem',
      importedDayKey: 'tuesday',
      importedStartTime: '13:00',
      importedEndTime: '15:00'
    }
  }
];

const STARTUP_DEMO_TEMPLATE_BLOCKS: TimeBlock[] = [
  {
    id: 'demo-template-psp-1001',
    title: 'Demo template: PSP-1001 Internal project work',
    source: 'mock-api',
    state: 'template',
    extentMinutes: 30,
    metadata: {
      pspElement: 'PSP-1001'
    }
  },
  {
    id: 'demo-template-psp-2003',
    title: 'Demo template: PSP-2003 Customer follow-up',
    source: 'mock-api',
    state: 'template',
    extentMinutes: 30,
    metadata: {
      pspElement: 'PSP-2003'
    }
  }
];

const mergeMissingBlocks = (blocks: TimeBlock[], required: TimeBlock[]): TimeBlock[] => {
  const existingIds = new Set(blocks.map((block) => block.id));
  const missingBlocks = required.filter((block) => !existingIds.has(block.id));
  return blocks.concat(missingBlocks);
};

export const withSeededStartupBlocks = (blocks: TimeBlock[]): TimeBlock[] => {
  const withImported = mergeMissingBlocks(blocks, STARTUP_DEMO_IMPORTED_BLOCKS);
  return mergeMissingBlocks(withImported, STARTUP_DEMO_TEMPLATE_BLOCKS);
};

export const applySeededDemoState = (state: BoardState): BoardState => state;
