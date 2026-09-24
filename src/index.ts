import PhotoSwipe from "photoswipe"
import type { SlideData } from "photoswipe"
import { FallbackTracker, changedIndices, shouldLoadMore, type ViewerItem } from "./items.js"

export type { ViewerItem } from "./items.js"
export { shouldLoadMore, changedIndices, FallbackTracker, LOAD_MORE_THRESHOLD } from "./items.js"

export interface ViewerLabels {
  close: string
  prev: string
  next: string
  zoom: string
  download: string
  error: string
}

export interface ViewerOptions {
  items: ViewerItem[]
  index: number
  /** More items exist past the end of `items`; `loadMore` fetches them. */
  hasMore?: boolean
  /** Fetch the next page, then hand it over with `setItems`. */
  loadMore?: () => Promise<void> | void
  onIndexChange?: (index: number) => void
  /** Called once the viewer has closed, whoever closed it. */
  onClose?: () => void
  labels?: Partial<ViewerLabels>
}

export interface ViewerHandle {
  /** Replace the list. Closes the viewer if the image on screen no longer exists. */
  setItems(items: ViewerItem[], hasMore?: boolean): void
  goTo(index: number): void
  readonly index: number
  close(): void
  /** Close without calling `onClose` -- for a parent that is already closing. */
  destroy(): void
}

const DEFAULT_LABELS: ViewerLabels = {
  close: "閉じる",
  prev: "前の画像",
  next: "次の画像",
  zoom: "拡大・縮小",
  download: "保存",
  error: "画像を読み込めませんでした",
}

const KEY_ZOOM_STEP = 1.25

const ICON_DOWNLOAD =
  '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>'

interface SizedSlideData extends SlideData {
  /** Width and height are a stand-in until the image reports its own. */
  panorailGuess?: boolean
}

/**
 * Opens a full-screen viewer over the page. Swipe or arrow keys move between
 * images, pinch / double-tap / wheel zoom, a vertical drag or Esc closes.
 */
export function openViewer(options: ViewerOptions): ViewerHandle {
  const labels = { ...DEFAULT_LABELS, ...options.labels }
  let items = options.items.slice()
  let hasMore = !!options.hasMore
  let loading = false
  let silent = false
  let closed = false
  let lastIndex = options.index

  // Shared with PhotoSwipe, which reads its length for the slide count, so it
  // is updated in place rather than replaced.
  const dataSource: ViewerItem[] = items.slice()
  const fallbacks = new FallbackTracker()
  // Measured sizes, by src, for images that arrived without one.
  const measured = new Map<string, { width: number; height: number }>()

  const pswp = new PhotoSwipe({
    dataSource: dataSource as SlideData[],
    index: Math.max(0, Math.min(options.index, items.length - 1)),
    loop: false,
    bgOpacity: 1,
    showHideAnimationType: "fade",
    wheelToZoom: true,
    imageClickAction: "zoom",
    clickToCloseNonZoomable: false,
    // Keys are taken below, ahead of anything else on the page.
    escKey: false,
    arrowKeys: false,
    maxZoomLevel: (zoom) => Math.max(zoom.fit * 4, 2),
    counter: false,
    closeTitle: labels.close,
    arrowPrevTitle: labels.prev,
    arrowNextTitle: labels.next,
    zoomTitle: labels.zoom,
    errorMsg: labels.error,
    mainClass: "panorail",
  })

  pswp.addFilter("itemData", (data, index) => {
    const item = dataSource[index]
    if (!item) return data
    const size = item.width && item.height ? item : measured.get(item.src)
    const out: SizedSlideData = { ...item, src: fallbacks.current(item), alt: item.name ?? "" }
    if (size?.width && size.height) {
      out.width = size.width
      out.height = size.height
    } else {
      // A guess the size of the screen keeps the slide sane until it loads.
      out.width = window.innerWidth
      out.height = window.innerHeight
      out.panorailGuess = true
    }
    return out
  })

  // Loads the image ourselves, for the referrer policy, the one-time fallback,
  // and the natural size of an image that came without one.
  pswp.on("contentLoadImage", (event) => {
    const { content } = event
    const item = dataSource[content.index]
    const img = content.element
    if (!item || !(img instanceof HTMLImageElement)) return
    event.preventDefault()

    if (item.referrerPolicy) img.referrerPolicy = item.referrerPolicy
    img.alt = item.name ?? ""
    img.decoding = "async"
    content.state = "loading"

    img.onload = () => {
      if ((content.data as SizedSlideData).panorailGuess && img.naturalWidth && img.naturalHeight) {
        const size = { width: img.naturalWidth, height: img.naturalHeight }
        measured.set(item.src, size)
        ;(content.data as SizedSlideData).panorailGuess = false
        content.width = size.width
        content.height = size.height
        if (content.slide) {
          content.slide.width = size.width
          content.slide.height = size.height
          content.slide.resize()
        }
      }
      content.onLoaded()
    }
    img.onerror = () => {
      const next = fallbacks.nextSource(item, true)
      if (next) img.src = next
      else content.onError()
    }
    img.src = fallbacks.current(item)
  })

  pswp.on("uiRegister", () => {
    pswp.ui?.registerElement({
      name: "panorail-counter",
      order: 5,
      isButton: false,
      appendTo: "bar",
      onInit: (el, p) => {
        const update = () => {
          el.textContent = `${p.currIndex + 1} / ${p.getNumItems()}${hasMore ? "+" : ""}`
        }
        p.on("change", update)
        update()
      },
    })
    pswp.ui?.registerElement({
      name: "panorail-download",
      order: 8,
      isButton: true,
      tagName: "a",
      title: labels.download,
      ariaLabel: labels.download,
      html: ICON_DOWNLOAD,
      onInit: (el, p) => {
        const link = el as HTMLAnchorElement
        const update = () => {
          const item = dataSource[p.currIndex]
          link.hidden = !item?.downloadName
          if (!item?.downloadName) return
          link.href = fallbacks.current(item)
          link.download = item.downloadName
        }
        p.on("change", update)
        update()
      },
    })
    pswp.ui?.registerElement({
      name: "panorail-caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      onInit: (el, p) => {
        const update = () => {
          const name = dataSource[p.currIndex]?.name ?? ""
          el.textContent = name
          el.hidden = !name
        }
        p.on("change", update)
        update()
      },
    })
  })

  const maybeLoadMore = async () => {
    if (!options.loadMore || !shouldLoadMore(pswp.currIndex, dataSource.length, hasMore, loading)) return
    loading = true
    try {
      await options.loadMore()
    } catch {
      // The parent owns the error; the viewer only has to stay usable.
    } finally {
      loading = false
    }
  }

  pswp.on("change", () => {
    // PhotoSwipe also fires this when a slide is rebuilt in place.
    if (pswp.currIndex !== lastIndex) {
      lastIndex = pswp.currIndex
      options.onIndexChange?.(pswp.currIndex)
    }
    void maybeLoadMore()
  })

  const zoomBy = (factor: number) => {
    const slide = pswp.currSlide
    if (!slide) return
    const { initial, max } = slide.zoomLevels
    slide.zoomTo(Math.max(initial, Math.min(max, slide.currZoomLevel * factor)), undefined, 200)
  }

  // Capture phase on window, so nothing underneath -- an expanded card that
  // also closes on Escape, say -- sees the keys the viewer uses.
  const onKey = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    let handled = true
    if (event.key === "Escape") requestClose()
    else if (event.key === "ArrowLeft") pswp.prev()
    else if (event.key === "ArrowRight") pswp.next()
    else if (event.key === "+" || event.key === "=") zoomBy(KEY_ZOOM_STEP)
    else if (event.key === "-") zoomBy(1 / KEY_ZOOM_STEP)
    else if (event.key === "0") pswp.currSlide?.zoomTo(pswp.currSlide.zoomLevels.initial, undefined, 200)
    else handled = false
    if (handled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  window.addEventListener("keydown", onKey, true)

  // "close" starts the closing animation; "destroy" is the end of it.
  pswp.on("close", () => {
    closed = true
    window.removeEventListener("keydown", onKey, true)
  })
  pswp.on("destroy", () => {
    window.removeEventListener("keydown", onKey, true)
    if (!silent) options.onClose?.()
  })

  // PhotoSwipe ignores close() while it is still opening; a list that empties
  // under a viewer that has just opened must still close it.
  let closeAfterOpen = false
  const requestClose = () => {
    if (closed) return
    if (pswp.opener.isOpening) closeAfterOpen = true
    else pswp.close()
  }
  pswp.on("openingAnimationEnd", () => {
    if (closeAfterOpen) pswp.close()
  })

  pswp.init()

  return {
    setItems(next, nextHasMore) {
      if (closed) return
      const prev = items
      items = next.slice()
      if (nextHasMore !== undefined) hasMore = nextHasMore
      if (pswp.currIndex >= items.length) {
        requestClose()
        return
      }
      dataSource.splice(0, dataSource.length, ...items)
      const current = pswp.currIndex
      for (const i of changedIndices(prev, items)) {
        // Only the slides on either side are built; the rest load when reached.
        if (Math.abs(i - current) <= 2) pswp.refreshSlideContent(i)
      }
      pswp.dispatch("change")
      void maybeLoadMore()
    },
    goTo(index) {
      if (!closed && index !== pswp.currIndex && index >= 0 && index < dataSource.length) pswp.goTo(index)
    },
    get index() {
      return pswp.currIndex
    },
    close: requestClose,
    destroy() {
      silent = true
      if (pswp.isDestroying && !pswp.element?.isConnected) return
      // Skip the closing animation: the parent is tearing down now.
      pswp.isDestroying = true
      closed = true
      pswp.destroy()
    },
  }
}
