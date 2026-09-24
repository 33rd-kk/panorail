import { describe, expect, it } from "vitest"
import { FallbackTracker, changedIndices, isSafeLinkUrl, shouldLoadMore } from "../src/items"

describe("shouldLoadMore", () => {
  it("asks once within the threshold of the end", () => {
    expect(shouldLoadMore(6, 10, true, false)).toBe(false)
    expect(shouldLoadMore(7, 10, true, false)).toBe(true)
    expect(shouldLoadMore(9, 10, true, false)).toBe(true)
  })

  it("does not ask while a page is in flight, or when there is none", () => {
    expect(shouldLoadMore(9, 10, true, true)).toBe(false)
    expect(shouldLoadMore(9, 10, false, false)).toBe(false)
  })
})

describe("changedIndices", () => {
  const a = { src: "a" }
  const b = { src: "b" }
  const c = { src: "c" }

  it("reports appended items", () => {
    expect(changedIndices([a, b], [a, b, c])).toEqual([2])
  })

  it("reports replaced and removed items", () => {
    expect(changedIndices([a, b, c], [a, c])).toEqual([1, 2])
  })

  it("reports nothing for the same list", () => {
    expect(changedIndices([a, b], [{ src: "a" }, { src: "b" }])).toEqual([])
  })
})

describe("FallbackTracker", () => {
  it("retries the fallback exactly once", () => {
    const t = new FallbackTracker()
    const item = { src: "a", fallbackSrc: "a2" }
    expect(t.current(item)).toBe("a")
    expect(t.nextSource(item, true)).toBe("a2")
    expect(t.current(item)).toBe("a2")
    expect(t.nextSource(item, true)).toBeNull()
  })

  it("gives up at once without a fallback", () => {
    expect(new FallbackTracker().nextSource({ src: "a" }, true)).toBeNull()
  })
})

describe("isSafeLinkUrl", () => {
  const base = "https://example.com/gallery/"
  it("allows web, blob, and image data URLs", () => {
    for (const url of ["https://cdn.example.com/a.png", "http://x/a.png", "/a.png", "a.png", "blob:https://example.com/1", "data:image/png;base64,AAAA"]) {
      expect(isSafeLinkUrl(url, base), url).toBe(true)
    }
  })
  it("rejects script and other data URLs", () => {
    for (const url of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "vbscript:x", "data:text/html,<script>alert(1)</script>"]) {
      expect(isSafeLinkUrl(url, base), url).toBe(false)
    }
  })
})
