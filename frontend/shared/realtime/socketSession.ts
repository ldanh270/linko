const resetListeners = new Set<() => void>()

/** Register teardown for state owned by the authenticated socket session. */
export function subscribeSocketReset(listener: () => void): () => void {
  resetListeners.add(listener)
  return () => { resetListeners.delete(listener) }
}

/** Clear account-scoped stores before disconnecting or replacing the transport. */
export function resetSocketSession(): void { resetListeners.forEach((reset) => reset()) }
