import type { Activity, ActivityInstance } from './activity-types';
import type { TimeBlock } from './board-types';

export const createTimeBlockFromActivityInstance = (
  activity: Activity,
  instance: ActivityInstance,
  source: TimeBlock['source'] = 'mock-api'
): TimeBlock => ({
  id: `block-${activity.id}-${instance.id}`,
  title: activity.title,
  extentMinutes: instance.suggestedDurationMinutes,
  source,
  state: 'uncommitted',
  metadata: {
    activityId: activity.id,
    activitySource: activity.source,
    activityInstanceId: instance.id,
    activityMetadata: activity.metadata ?? {},
    instanceMetadata: instance.metadata ?? {}
  }
});
