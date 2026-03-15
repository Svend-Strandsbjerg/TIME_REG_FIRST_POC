export const slotFromOrder = (order: number): string => {
  const startHour = 9;
  const hour = startHour + order;
  return `${hour.toString().padStart(2, '0')}:00`;
};
