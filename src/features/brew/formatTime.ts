// The stopwatch's own reading, while it's running: fixed width so the
// digits don't shuffle as the tenths tick over.
export function formatElapsed(ms: number) {
  const totalDeciseconds = Math.floor(ms / 100);
  const seconds = Math.floor(totalDeciseconds / 10);
  const minutes = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  const decisecondsPart = totalDeciseconds % 10;
  return `${String(minutes).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}.${decisecondsPart}`;
}

// A brew's time read back afterwards, rather than watched. The same 28.8
// second shot used to appear as "0:25" on the dashboard row, "28.8s" on the
// recipe card, "28.8 s" on the attempt, and "00:28.8" on the timer — four
// spellings of one number, and the first of them rounded the tenths away
// that the whole step exists to capture.
//
// Tenths matter under a minute, which is where a shot lives; past that the
// minutes do, and "245.0 s" is not how anyone reads a French press. A whole
// number drops its ".0" — targets are set in whole seconds, and the same
// rule already governs formatRatio.
export function formatDuration(ms: number): string {
  const tenths = Math.round(ms / 100);
  if (tenths < 600) {
    const seconds = tenths / 10;
    return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} s`;
  }
  const totalSeconds = Math.round(tenths / 10);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
