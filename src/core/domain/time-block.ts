export const durationToSize = (durationMinutes: number): 'small' | 'medium' | 'large' | 'xlarge' => {
  if (durationMinutes <= 30) {
    return 'small';
  }
  if (durationMinutes <= 60) {
    return 'medium';
  }
  if (durationMinutes <= 120) {
    return 'large';
  }
  return 'xlarge';
};
