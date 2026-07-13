export class CoordinatorAttentionIncompleteStateError extends Error {
  constructor(
    public readonly tripId: string,
    message = `Active trip ${tripId} has no recorded risk state.`,
  ) {
    super(message);
    this.name = "CoordinatorAttentionIncompleteStateError";
  }
}
