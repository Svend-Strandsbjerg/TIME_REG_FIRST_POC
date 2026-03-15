export type ActivityId = string;
export type ActivityInstanceId = string;

export type ActivitySource = 'calendar' | 'project-task' | 'favorite' | 'ai' | 'manual';

export type Activity = {
  id: ActivityId;
  source: ActivitySource;
  title: string;
  metadata?: Record<string, unknown>;
};

export type ActivityInstance = {
  id: ActivityInstanceId;
  activityId: ActivityId;
  suggestedDurationMinutes: number;
  metadata?: Record<string, unknown>;
};
