// Runs saves one at a time, in the order they were requested, so an older save never lands
// after a newer one. schedule() debounces a save; flush() fires the waiting ones and resolves
// when everything has finished (used before publishing).
export function createSaveQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  const waiting = new Set<() => void>();

  const run = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = tail.then(fn);
    tail = next.catch(() => {});
    return next;
  };

  const schedule = (fn: () => Promise<unknown>, ms: number) => {
    const fire = () => {
      clearTimeout(timer);
      waiting.delete(fire);
      void run(fn).catch(() => {});
    };
    const timer = setTimeout(fire, ms);
    waiting.add(fire);
    return () => {
      clearTimeout(timer);
      waiting.delete(fire);
    };
  };

  const flush = async () => {
    for (const fire of [...waiting]) fire();
    await tail;
  };

  return { run, schedule, flush };
}
