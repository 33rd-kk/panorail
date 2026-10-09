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

  describe("host buttons", () => {
    const hostButtons = () => [...document.querySelectorAll<HTMLButtonElement>(".pswp__button--panorail-host")]

    it("are absent unless asked for", () => {
      handle = openViewer({ items: list(3), index: 0 })
      expect(hostButtons()).toEqual([])
    })

    it("sit in the bar in the host's order, before the viewer's own buttons", () => {
      handle = openViewer({
        items: list(3),
        index: 0,
        panel: { mount: () => {} },
        buttons: [
          { label: "first", mount: () => {} },
          { label: "second", mount: () => {} },
        ],
      })
      const bar = [...document.querySelector(".pswp__top-bar")!.children]
      const [first, second] = hostButtons()
      expect(first.getAttribute("aria-label")).toBe("first")
      expect(first.title).toBe("first")
      expect(second.getAttribute("aria-label")).toBe("second")
      const at = (el: Element | null) => bar.indexOf(el!)
      expect(at(document.querySelector(".pswp__panorail-counter"))).toBeLessThan(at(first))
      expect(at(first)).toBeLessThan(at(second))
      expect(at(second)).toBeLessThan(at(document.querySelector(".pswp__button--panorail-panel-toggle")))
      expect(at(second)).toBeLessThan(at(document.querySelector(".pswp__button--panorail-download")))
    })

    it("hand the button to the host and clean up after it", () => {
      const cleanup = vi.fn()
      const mount = vi.fn((el: HTMLButtonElement) => {
        el.append(document.createElement("svg"))
        return cleanup
      })
      handle = openViewer({ items: list(3), index: 0, buttons: [{ label: "eye", mount }] })
      expect(mount).toHaveBeenCalledTimes(1)
      const [button] = hostButtons()
      expect(mount.mock.calls[0][0]).toBe(button)
      expect(button.tagName).toBe("BUTTON")
      expect(button.type).toBe("button")
      handle.destroy()
      expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it("clean up when the viewer closes itself too", () => {
      const cleanup = vi.fn()
      handle = openViewer({ items: list(3), index: 0, buttons: [{ label: "eye", mount: () => cleanup }] })
      vi.runAllTimers()
      handle.close()
      vi.runAllTimers()
      expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it("report clicks while open, and none once closing", () => {
      const onClick = vi.fn()
      handle = openViewer({ items: list(3), index: 0, buttons: [{ label: "eye", onClick, mount: () => {} }] })
      const [button] = hostButtons()
      button.click()
      expect(onClick).toHaveBeenCalledTimes(1)
      vi.runAllTimers()
      handle.close()
      button.click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("veil", () => {
    const images = () => [...document.querySelectorAll<HTMLImageElement>(".pswp__img")]
    const veiled = () => images().filter((img) => img.classList.contains("panorail-veiled")).map((img) => img.alt)
    const named = (n: number) => Array.from({ length: n }, (_, i) => ({ src: `/img/${i}.png`, name: `${i}` }))
    // PhotoSwipe loads an image only once it has a size on screen; jsdom's viewport has none.
    beforeEach(() => {
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1024)
      vi.spyOn(window, "innerHeight", "get").mockReturnValue(768)
    })
    afterEach(() => vi.restoreAllMocks())

    it("covers nothing unless asked for", () => {
      handle = openViewer({ items: named(3), index: 1 })
      vi.runAllTimers()
      expect(images().length).toBeGreaterThan(0)
      expect(veiled()).toEqual([])
    })

    it("covers the images it picks, including the ones next to the current one", () => {
      handle = openViewer({ items: named(3), index: 1, veil: (item) => item.src !== "/img/1.png" })
      vi.runAllTimers()
      expect(veiled().sort()).toEqual(["0", "2"])
    })

    it("is in place before the image starts loading", () => {
      let veiledAtLoad: boolean | undefined
      const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")!
      const spy = vi.spyOn(HTMLImageElement.prototype, "src", "set").mockImplementation(function (this: HTMLImageElement, v) {
        veiledAtLoad ??= this.classList.contains("panorail-veiled")
        src.set!.call(this, v)
      })
      handle = openViewer({ items: named(1), index: 0, veil: () => true })
      vi.runAllTimers()
      spy.mockRestore()
      expect(veiledAtLoad).toBe(true)
    })

    it("changes on the images already loaded", () => {
      handle = openViewer({ items: named(3), index: 1 })
      vi.runAllTimers()
      handle.setVeil(() => true)
      expect(veiled().sort()).toEqual(["0", "1", "2"])
      handle.setVeil((item) => item.name === "1")
      expect(veiled()).toEqual(["1"])
      handle.setVeil()
      expect(veiled()).toEqual([])
    })

    it("covers the image when the host's veil throws", () => {
      handle = openViewer({
        items: named(1),
        index: 0,
        veil: () => {
          throw new Error("boom")
        },
      })
      vi.runAllTimers()
      expect(veiled()).toEqual(["0"])
    })
  })

  it("never renders html carried on an item", () => {
    const items = [{ src: "/a.png", type: "html", html: '<b class="injected">x</b>' }] as never
    handle = openViewer({ items, index: 0 })
    vi.runAllTimers()
    expect(document.querySelector(".injected")).toBeNull()
  })

  it("hides the save button for a script URL", () => {
    handle = openViewer({ items: [{ src: "javascript:alert(1)", downloadName: "a.png" }], index: 0 })
    const link = document.querySelector<HTMLAnchorElement>(".pswp__button--panorail-download")!
    expect(link.hidden).toBe(true)
    expect(link.hasAttribute("href")).toBe(false)
  })

  it("links the save button to a normal image", () => {
    handle = openViewer({ items: [{ src: "/a.png", downloadName: "a.png" }], index: 0 })
    const link = document.querySelector<HTMLAnchorElement>(".pswp__button--panorail-download")!
    expect(link.hidden).toBe(false)
    expect(link.getAttribute("href")).toBe("/a.png")
  })
})
