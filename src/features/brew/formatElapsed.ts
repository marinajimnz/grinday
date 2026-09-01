export function formatElapsed(ms: number) {
  const totalDeciseconds = Math.floor(ms / 100);
  const seconds = Math.floor(totalDeciseconds / 10);
  const minutes = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  const decisecondsPart = totalDeciseconds % 10;
  return `${String(minutes).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}.${decisecondsPart}`;
}
