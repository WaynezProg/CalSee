export type ConflictResolutionResult<T> =
  | { status: 'accepted'; value: T }
  | { status: 'conflict'; serverValue: T };

export function resolveLastWriteWins<T extends { updatedAt?: string | Date }>(
  clientValue: T,
  serverValue: T,
): ConflictResolutionResult<T> {
  const clientUpdatedAt = clientValue.updatedAt ? new Date(clientValue.updatedAt).getTime() : 0;
  const serverUpdatedAt = serverValue.updatedAt ? new Date(serverValue.updatedAt).getTime() : 0;

  if (serverUpdatedAt > clientUpdatedAt) {
    return { status: 'conflict', serverValue };
  }

  return { status: 'accepted', value: clientValue };
}
