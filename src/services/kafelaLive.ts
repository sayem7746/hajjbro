type Listener = () => void;

/** In-process pub/sub for kafela change signals (single Railway instance). */
const rooms = new Map<string, Set<Listener>>();

export function publishKafelaChange(kafelaId: string): void {
  const listeners = rooms.get(kafelaId);
  if (!listeners?.size) return;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore subscriber errors */
    }
  }
}

export function subscribeKafela(kafelaId: string, listener: Listener): () => void {
  let set = rooms.get(kafelaId);
  if (!set) {
    set = new Set();
    rooms.set(kafelaId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) rooms.delete(kafelaId);
  };
}
