import type { TimeBlock } from '../../core/domain/board-types';

export interface InboundBlockSource {
  listTimeRegistrationCandidates(): Promise<TimeBlock[]>;
}

export class PlaceholderApiBlockSource implements InboundBlockSource {
  async listTimeRegistrationCandidates(): Promise<TimeBlock[]> {
    // TODO: replace with concrete inbound API adapter.
    return [];
  }
}
