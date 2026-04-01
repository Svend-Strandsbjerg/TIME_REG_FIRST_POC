import type { TimeBlock } from './board-types';

export type BlockClassificationFields = {
  description?: string;
  taskType?: string;
  taskComponent?: string;
  activityType?: string;
  billingControlCategory?: string;
  overtimeCategory?: string;
  wbsElement?: string;
  internalOrder?: string;
};

export const BLOCK_DEFAULT_TASK_COMPONENT = 'NORMAL';

const readString = (metadata: Record<string, unknown>, key: string): string | undefined => {
  const value = metadata[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const shouldDefaultTaskComponent = (block: TimeBlock, metadata: Record<string, unknown>): boolean =>
  block.state === 'template' ||
  typeof metadata.pspElement === 'string' ||
  typeof metadata.wbsElement === 'string' ||
  typeof metadata.internalOrder === 'string';

export const withBlockMetadataDefaults = (block: TimeBlock): TimeBlock => {
  const metadata = (block.metadata ?? {}) as Record<string, unknown>;

  if (readString(metadata, 'taskComponent') || !shouldDefaultTaskComponent(block, metadata)) {
    return block;
  }

  return {
    ...block,
    metadata: {
      ...metadata,
      taskComponent: BLOCK_DEFAULT_TASK_COMPONENT
    }
  };
};

