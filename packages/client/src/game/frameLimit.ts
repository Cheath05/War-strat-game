// The frame-rate limit: the browser offers a frame for every refresh of the screen (60, 120,
// 144 a second...), and with a limit the battle skips the ones that come too soon.

export class FrameLimiter {
  /** Most frames drawn a second (0: every refresh of the screen). */
  cap = 0;
  private drawnAt = 0;

  /** Should the frame the browser offers at time t (ms) be drawn? */
  due(t: number): boolean {
    if (this.cap <= 0) return true;
    const gap = 1000 / this.cap;
    // A little slack for the jitter in the browser's frame times.
    if (t - this.drawnAt < gap - 1.5) return false;
    // Keep to the limit's beat, unless we have fallen well behind it.
    this.drawnAt = t - this.drawnAt > 2 * gap ? t : this.drawnAt + gap;
    return true;
  }
}
