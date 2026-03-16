import { createTimeBlockFromActivityInstance } from '../../core/domain/activity-to-block';
import type { Activity, ActivityInstance } from '../../core/domain/activity-types';
import type { TimeBlock } from '../../core/domain/board-types';
import type { InboundBlockSource } from './api-block-source';

const ACTIVITIES: Activity[] = [
  { id: 'activity-1', source: 'calendar', title: 'Weekly customer status sync' },
  { id: 'activity-2', source: 'manual', title: 'PSP-1001 Internal project work' },
  { id: 'activity-3', source: 'project-task', title: 'Outlook meeting: Wednesday 08:30–09:30' },
  { id: 'activity-4', source: 'manual', title: 'PSP-2003 Customer follow-up' },
  { id: 'activity-5', source: 'project-task', title: 'Azure task work: Tuesday 13:00–15:00' },
  { id: 'activity-6', source: 'manual', title: 'PSP-3007 Support / incident handling' },
  { id: 'activity-7', source: 'calendar', title: 'Scrum/tool-derived work item: Thursday 10:00–11:30' },
  { id: 'activity-8', source: 'calendar', title: 'Committed architecture review (changed)' },
  { id: 'activity-9', source: 'calendar', title: 'Committed customer follow-up (removed)' },
  { id: 'activity-10', source: 'calendar', title: 'Committed support triage (changed)' }
];

const INSTANCES: ActivityInstance[] = [
  { id: 'instance-1', activityId: 'activity-1', suggestedDurationMinutes: 60 },
  { id: 'instance-2', activityId: 'activity-2', suggestedDurationMinutes: 30 },
  { id: 'instance-3', activityId: 'activity-3', suggestedDurationMinutes: 60 },
  { id: 'instance-4', activityId: 'activity-4', suggestedDurationMinutes: 30 },
  { id: 'instance-5', activityId: 'activity-5', suggestedDurationMinutes: 120 },
  { id: 'instance-6', activityId: 'activity-6', suggestedDurationMinutes: 30 },
  { id: 'instance-7', activityId: 'activity-7', suggestedDurationMinutes: 90 },
  { id: 'instance-8', activityId: 'activity-8', suggestedDurationMinutes: 60 },
  { id: 'instance-9', activityId: 'activity-9', suggestedDurationMinutes: 60 },
  { id: 'instance-10', activityId: 'activity-10', suggestedDurationMinutes: 90 }
];

const createMockBlocks = (): TimeBlock[] => {
  const activityById = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));

  return INSTANCES.map((instance) => {
    const activity = activityById.get(instance.activityId);
    if (!activity) {
      throw new Error(`Missing activity for instance: ${instance.id}`);
    }

    const block = createTimeBlockFromActivityInstance(activity, instance, 'mock-api');

    if (instance.id === 'instance-1') {
      return {
        ...block,
        state: 'committed',
        metadata: {
          ...block.metadata,
          committedPlacement: {
            laneId: 'lane-monday',
            startTime: '11:00',
            extentMinutes: 60
          }
        }
      };
    }

    if (instance.id === 'instance-2') {
      return {
        ...block,
        state: 'template',
        metadata: {
          ...block.metadata,
          pspElement: 'PSP-1001'
        }
      };
    }

    if (instance.id === 'instance-3') {
      return {
        ...block,
        source: 'external-api',
        state: 'imported',
        metadata: {
          ...block.metadata,
          importedFrom: 'outlook-calendar',
          importedDayKey: 'wednesday',
          importedStartTime: '08:30',
          importedEndTime: '09:30',
          description: 'Outlook import: weekly meeting with delivery timeline, risks, and next actions.'
        }
      };
    }

    if (instance.id === 'instance-4') {
      return {
        ...block,
        state: 'template',
        metadata: {
          ...block.metadata,
          pspElement: 'PSP-2003'
        }
      };
    }

    if (instance.id === 'instance-5') {
      return {
        ...block,
        source: 'external-api',
        state: 'imported',
        metadata: {
          ...block.metadata,
          importedFrom: 'azure-workitem',
          importedDayKey: 'tuesday',
          importedStartTime: '13:00',
          importedEndTime: '15:00',
          description: 'Azure import: implement and validate API retry handling for background sync tasks.'
        }
      };
    }

    if (instance.id === 'instance-6') {
      return {
        ...block,
        state: 'template',
        metadata: {
          ...block.metadata,
          pspElement: 'PSP-3007'
        }
      };
    }

    if (instance.id === 'instance-7') {
      return {
        ...block,
        source: 'external-api',
        state: 'imported',
        metadata: {
          ...block.metadata,
          importedFrom: 'scrum-tool',
          importedDayKey: 'thursday',
          importedStartTime: '10:00',
          importedEndTime: '11:30',
          description: 'Scrum import: complete tool-derived backlog item preparation and handover notes.'
        }
      };
    }

    if (instance.id === 'instance-8') {
      return {
        ...block,
        state: 'committed',
        metadata: {
          ...block.metadata,
          committedPlacement: {
            laneId: 'lane-monday',
            startTime: '08:30',
            extentMinutes: 60
          }
        }
      };
    }

    if (instance.id === 'instance-9') {
      return {
        ...block,
        state: 'committed',
        metadata: {
          ...block.metadata,
          committedPlacement: {
            laneId: 'lane-tuesday',
            startTime: '10:00',
            extentMinutes: 60
          }
        }
      };
    }

    if (instance.id === 'instance-10') {
      return {
        ...block,
        state: 'committed',
        metadata: {
          ...block.metadata,
          committedPlacement: {
            laneId: 'lane-thursday',
            startTime: '14:00',
            extentMinutes: 90
          }
        }
      };
    }

    return block;
  });
};

export class MockBlockSource implements InboundBlockSource {
  async listTimeRegistrationCandidates(): Promise<TimeBlock[]> {
    return createMockBlocks();
  }
}
