import { placeBlockOnLane, returnBlockToPool } from '../../core/application/board-service';
import type { BoardState } from '../../core/domain/board-types';

export const applySeededDemoState = (state: BoardState): BoardState => {
  const movedMonday = placeBlockOnLane(state, 'block-activity-8-instance-8', 'lane-monday', '10:00');
  const removedTuesday = returnBlockToPool(movedMonday, 'block-activity-9-instance-9');
  return placeBlockOnLane(removedTuesday, 'block-activity-10-instance-10', 'lane-friday', '15:30');
};
