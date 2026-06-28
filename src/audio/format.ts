/** Formata segundos como "m:ss" (clamp em 0 para valores inválidos). */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Progresso 0..100 de current/duration, com clamp e guarda de divisão. */
export function progressPercent(current: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, Math.min(100, (current / duration) * 100));
}
