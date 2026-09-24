import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { openViewer, type ViewerHandle } from "../src/index"

const list = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ src: `/img/${from + i}.png` }))

let handle: ViewerHandle | undefined
// PhotoSwipe closes over animation frames and timeouts.
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.runAllTimers()
  vi.useRealTimers()
  handle?.destroy()
  handle = undefined
  document.body.innerHTML = ""
})

describe("openViewer", () => {
  it("opens on the requested image and reports moves", () => {
    const onIndexChange = vi.fn()
    handle = openViewer({ items: list(5), index: 1, onIndexChange })
    expect(document.querySelector(".pswp")).not.toBeNull()
    expect(handle.index).toBe(1)
    expect(onIndexChange).not.toHaveBeenCalled()

    handle.goTo(3)
    expect(handle.index).toBe(3)
    expect(onIndexChange).toHaveBeenLastCalledWith(3)
  })

  it("asks for the next page near the end, once at a time", async () => {
    let resolve!: () => void
    const loadMore = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    handle = openViewer({ items: list(10), index: 0, hasMore: true, loadMore })
    expect(loadMore).not.toHaveBeenCalled()

    handle.goTo(8)
    handle.goTo(9)
    expect(loadMore).toHaveBeenCalledTimes(1)

    handle.setItems([...list(10), ...list(10, 10)], true)
    resolve()
    await vi.runAllTimersAsync()
    handle.goTo(10)
    handle.goTo(11)
    expect(handle.index).toBe(11)
  })

  it("closes when the image on screen is gone, and says so", () => {
    const onClose = vi.fn()
    handle = openViewer({ items: list(5), index: 3, onClose })
    handle.setItems(list(2))
    vi.runAllTimers()
    expect(onClose).toHaveBeenCalled()
  })

  it("stays quiet when the parent destroys it", () => {
    const onClose = vi.fn()
    handle = openViewer({ items: list(3), index: 0, onClose })
    handle.destroy()
    vi.runAllTimers()
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector(".pswp")).toBeNull()
  })

  it("keeps Escape from reaching the page underneath", () => {
    const underneath = vi.fn()
    window.addEventListener("keydown", underneath)
    handle = openViewer({ items: list(3), index: 0 })
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(underneath).not.toHaveBeenCalled()
    window.removeEventListener("keydown", underneath)
  })

  describe("panel", () => {
    const toggle = () => document.querySelector<HTMLElement>(".pswp__button--panorail-panel-toggle")
    const root = () => document.querySelector<HTMLElement>(".pswp")!

    it("is absent unless asked for", () => {
      handle = openViewer({ items: list(3), index: 0 })
      expect(toggle()).toBeNull()
      expect(document.querySelector(".pswp__panorail-panel")).toBeNull()
    })

    it("hands its element to the host and cleans up after it", () => {
      const cleanup = vi.fn()
      const mount = vi.fn(() => cleanup)
      handle = openViewer({ items: list(3), index: 0, panel: { mount } })
      expect(mount).toHaveBeenCalledTimes(1)
      expect(mount.mock.calls[0][0]).toBe(document.querySelector(".pswp__panorail-panel"))
      handle.destroy()
      expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it("starts as asked and toggles from the button and the i key", () => {
      const onToggle = vi.fn()
      handle = openViewer({ items: list(3), index: 0, panel: { open: true, onToggle, mount: () => {} } })
      expect(root().classList.contains("panorail--panel-open")).toBe(true)
      expect(toggle()!.getAttribute("aria-pressed")).toBe("true")

      toggle()!.click()
      expect(root().classList.contains("panorail--panel-open")).toBe(false)
      expect(onToggle).toHaveBeenLastCalledWith(false)

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "i" }))
      expect(root().classList.contains("panorail--panel-open")).toBe(true)
      expect(onToggle).toHaveBeenLastCalledWith(true)
    })

    it("opens and closes from the handle without reporting it", () => {
      const onToggle = vi.fn()
      handle = openViewer({ items: list(3), index: 0, panel: { onToggle, mount: () => {} } })
      handle.setPanelOpen(true)
      expect(root().classList.contains("panorail--panel-open")).toBe(true)
      handle.setPanelOpen(false)
      expect(root().classList.contains("panorail--panel-open")).toBe(false)
      expect(onToggle).not.toHaveBeenCalled()
    })

    it("keeps the wheel over the panel from zooming the image", () => {
      let panelEl!: HTMLElement
      handle = openViewer({ items: list(3), index: 0, panel: { open: true, mount: (el) => void (panelEl = el) } })
      const onRootWheel = vi.fn()
      root().addEventListener("wheel", onRootWheel)
      panelEl.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 100 }))
      expect(onRootWheel).not.toHaveBeenCalled()
    })

    it("leaves the i key alone without a panel", () => {
      const underneath = vi.fn()
      window.addEventListener("keydown", underneath)
      handle = openViewer({ items: list(3), index: 0 })
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "i" }))
      expect(underneath).toHaveBeenCalled()
      window.removeEventListener("keydown", underneath)
    })
  })
})
