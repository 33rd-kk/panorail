export interface ViewerItem {
  src: string
  /** Tried once if `src` fails to load. */
  fallbackSrc?: string
  /** Shown as the caption, and used as the image's alt text. */
  name?: string
  /** When set, a save button downloads the image under this filename. */
  downloadName?: string
  referrerPolicy?: ReferrerPolicy
  /** Natural size, if known. Without it the size is measured once the image loads. */
  width?: number
  height?: number
}

/** How close to the end of the list the viewer asks for the next page. */
export const LOAD_MORE_THRESHOLD = 2

export function shouldLoadMore(
  index: number,
  length: number,
  hasMore: boolean,
  inFlight: boolean,
  threshold = LOAD_MORE_THRESHOLD
): boolean {
  return hasMore && !inFlight && index >= length - 1 - threshold
}

/**
 * Indices whose slide must be rebuilt after the list is replaced: anything
 * that is new, or that now shows a different image.
 */
export function changedIndices(prev: readonly ViewerItem[], next: readonly ViewerItem[]): number[] {
  const out: number[] = []
  const len = Math.max(prev.length, next.length)
  for (let i = 0; i < len; i++) {
    if (prev[i]?.src !== next[i]?.src) out.push(i)
  }
  return out
}

/**
 * Tracks which images have switched to their fallback, so each item gets
 * exactly one retry however many times its slide is rebuilt.
 */
export class FallbackTracker {
  private used = new Set<string>()

  /** The source to load for `item`, or `null` once there is nothing left to try. */
  nextSource(item: ViewerItem, failed: boolean): string | null {
    const usingFallback = this.used.has(item.src)
    if (!failed) return usingFallback ? item.fallbackSrc! : item.src
    if (usingFallback || !item.fallbackSrc) return null
    this.used.add(item.src)
    return item.fallbackSrc
  }

  current(item: ViewerItem): string {
    return this.used.has(item.src) && item.fallbackSrc ? item.fallbackSrc : item.src
  }
}
