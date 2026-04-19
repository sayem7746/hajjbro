import { Ritual } from '../types';

/** First incomplete ritual by order; if all complete, the last ritual in sequence. */
export function getCurrentRitual(
  list: Ritual[],
  isComplete: (id: string) => boolean
): Ritual {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const next = sorted.find((r) => !isComplete(r.id));
  return next ?? sorted[sorted.length - 1];
}
