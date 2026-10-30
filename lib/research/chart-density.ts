import type { ChartBar } from "./chart-utils";
import type { ChartViewport } from "./chart-viewport";

/** A visual density target, not a promise to invent unavailable market bars. */
export const TARGET_VISIBLE_BARS = 50;

export type ChartBucket = {
  bar: ChartBar;
  firstTime: string;
  lastTime: string;
  underlyingCount: number;
  firstRawIndex: number;
  lastRawIndex: number;
};
export type DensityResult = {
  buckets: ChartBucket[];
  rawCount: number;
  target: number;
};

/**
 * Create at most 50 evenly-spaced, chronological OHLCV buckets from the
 * *currently visible* source-bar window. When >=50 real bars are available,
 * exactly 50 bars are rendered across the same chart width.
 *
 * Every input bar contributes exactly once (no sampling away highs or volume):
 * open=first, high=max, low=min, close=last, volume=sum.
 *
 * Re-bucket whenever the zoom viewport changes, revealing finer source bars
 * rather than enlarging 50 old aggregated points. Never interpolate missing
 * trades, create synthetic raw bars, or mix feeds.
 */
export function bucketVisibleChartBars(
  source: readonly ChartBar[],
  viewport: ChartViewport | null,
  target = TARGET_VISIBLE_BARS,
): DensityResult {
  if (!Number.isSafeInteger(target) || target < 1) throw new Error("Invalid chart density target.");
  const max = source.length - 1;
  if (max < 0) return { buckets: [], rawCount: 0, target };

  const start = viewport ? Math.min(max, Math.max(0, Math.ceil(viewport.start - 1e-8))) : 0;
  const end = viewport ? Math.min(max, Math.max(start, Math.floor(viewport.end + 1e-8))) : max;
  const rawCount = end - start + 1;
  const count = Math.min(target, rawCount);
  const buckets: ChartBucket[] = [];

  for (let bucket = 0; bucket < count; bucket++) {
    const firstIndex = start + Math.floor(bucket * rawCount / count);
    const lastIndex = start + Math.floor((bucket + 1) * rawCount / count) - 1;
    const first = source[firstIndex];
    const last = source[lastIndex];
    let high = -Infinity, low = Infinity, volume = 0;
    for (let j = firstIndex; j <= lastIndex; j++) {
      high = Math.max(high, source[j].high);
      low = Math.min(low, source[j].low);
      volume += source[j].volume;
    }
    buckets.push({
      bar: {
        time: first.time, open: first.open, high, low,
        close: last.close, volume,
      },
      firstTime: first.time, lastTime: last.time,
      underlyingCount: lastIndex - firstIndex + 1,
      firstRawIndex: firstIndex, lastRawIndex: lastIndex,
    });
  }
  return { buckets, rawCount, target };
}
