export function scheduleBoardFullSync(run: () => Promise<unknown>) {
  setTimeout(() => {
    void run().catch(() => {
      // persisted through job state
    });
  }, 0);
}
