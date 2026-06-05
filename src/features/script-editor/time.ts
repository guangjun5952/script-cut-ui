export function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatTimeRange(start: number, end: number): string {
  return `${formatTime(start)}-${formatTime(end)}`;
}

export function roundTime(value: number): number {
  return Number(Math.max(0, value).toFixed(2));
}
