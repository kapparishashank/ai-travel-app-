export type OfflineMutationStatus = 'pending' | 'synced' | 'failed' | 'conflict';

export type OfflineMutation<TPayload = unknown> = {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: string;
  baseUpdatedAt?: string | null;
  attempts: number;
  lastError?: string | null;
  status: OfflineMutationStatus;
};

export type OfflineSyncResult = {
  attempted: number;
  synced: number;
  failed: number;
  conflicts: number;
  remaining: number;
};
