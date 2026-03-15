import { createTimeBlockFromActivityInstance } from '../../core/domain/activity-to-block';
import type { Activity, ActivityInstance } from '../../core/domain/activity-types';
import type { TimeBlock } from '../../core/domain/board-types';
import type { InboundBlockSource } from './api-block-source';

const ACTIVITIES: Activity[] = [
  { id: 'activity-1', source: 'calendar', title: 'Meeting with Customer A' },
  { id: 'activity-2', source: 'manual', title: 'Internal workshop' },
  { id: 'activity-3', source: 'project-task', title: 'Support task' },
  { id: 'activity-4', source: 'ai', title: 'Project work' },
  { id: 'activity-5', source: 'favorite', title: 'Architecture sync' }
];

const INSTANCES: ActivityInstance[] = [
  { id: 'instance-1', activityId: 'activity-1', suggestedDurationMinutes: 60 },
  { id: 'instance-2', activityId: 'activity-2', suggestedDurationMinutes: 120 },
  { id: 'instance-3', activityId: 'activity-3', suggestedDurationMinutes: 30 },
  { id: 'instance-4', activityId: 'activity-4', suggestedDurationMinutes: 180 },
  { id: 'instance-5', activityId: 'activity-5', suggestedDurationMinutes: 90 }
];

const createMockBlocks = (): TimeBlock[] => {
  const activityById = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));

  return INSTANCES.map((instance) => {
    const activity = activityById.get(instance.activityId);
    if (!activity) {
      throw new Error(`Missing activity for instance: ${instance.id}`);
    }

    return createTimeBlockFromActivityInstance(activity, instance, 'mock-api');
  });
};

export class MockBlockSource implements InboundBlockSource {
  async listTimeRegistrationCandidates(): Promise<TimeBlock[]> {
    return createMockBlocks();
  }
}
