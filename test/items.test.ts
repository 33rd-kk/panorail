import { describe, expect, it } from "vitest"
import { FallbackTracker, changedIndices, shouldLoadMore } from "../src/items"

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
