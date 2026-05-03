export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWebScheduler } = await import(
      "@/src/server/scheduler/webScheduler"
    );
    await startWebScheduler();
  }
}
