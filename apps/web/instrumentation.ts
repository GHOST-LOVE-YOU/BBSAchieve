export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMirrorWorker } = await import("@/src/modules/mirroring/scheduling/worker");
    startMirrorWorker();
  }
}
