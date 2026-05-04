export function scheduleBoardFullSync(run: () => Promise<unknown>) {
  setTimeout(() => {
    void run().catch((error) => {
      console.error("scheduleBoardFullSync background run failed", error);
    });
  }, 0);
}
