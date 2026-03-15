import { describe, expect, it } from 'vitest';
import { createTimeBlockFromActivityInstance } from '../../src/core/domain/activity-to-block';
import type { Activity, ActivityInstance } from '../../src/core/domain/activity-types';

describe('activity-to-block', () => {
  it('creates a time block with activity context metadata', () => {
    const activity: Activity = {
      id: 'activity-100',
      source: 'calendar',
      title: 'Fuelomat workshop'
    };

    const instance: ActivityInstance = {
      id: 'instance-100',
      activityId: 'activity-100',
      suggestedDurationMinutes: 90
    };

    const block = createTimeBlockFromActivityInstance(activity, instance, 'external-api');

    expect(block.id).toBe('block-activity-100-instance-100');
    expect(block.durationMinutes).toBe(90);
    expect(block.state).toBe('uncommitted');
    expect(block.metadata).toMatchObject({
      activityId: 'activity-100',
      activityInstanceId: 'instance-100',
      activitySource: 'calendar'
    });
  });
});
