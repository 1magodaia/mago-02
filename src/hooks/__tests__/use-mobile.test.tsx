// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { readSnapshot, useDevice } from "../use-mobile";

type MQListener = (e: MediaQueryListEvent) => void;

// --- matchMedia mock with dynamic evaluation of "(pointer: coarse)" ------
let pointerCoarse = false;
const listeners = new Map<string, Set<MQListener>>();

function installMatchMedia() {
  window.matchMedia = ((query: string) => {
    const evaluate = () => {
      if (query.includes("pointer: coarse")) return pointerCoarse;
      return false;
    };
    const set = listeners.get(query) ?? new Set();
    listeners.set(query, set);
    return {
      matches: evaluate(),
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: MQListener) => set.add(cb),
      removeEventListener: (_: string, cb: MQListener) => set.delete(cb),
      addListener: (cb: MQListener) => set.add(cb),
      removeListener: (cb: MQListener) => set.delete(cb),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

function setPointer(coarse: boolean) {
  pointerCoarse = coarse;
  for (const [query, set] of listeners) {
    if (!query.includes("pointer: coarse")) continue;
    set.forEach((cb) =>
      cb({ matches: coarse, media: query } as MediaQueryListEvent),
    );
  }
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

beforeEach(() => {
  pointerCoarse = false;
  listeners.clear();
  installMatchMedia();
  setViewport(1280, 800);
  // Reset html dataset between tests
  document.documentElement.removeAttribute("data-device");
  document.documentElement.removeAttribute("data-pointer");
  document.documentElement.removeAttribute("data-orientation");
});

afterEach(() => vi.restoreAllMocks());

describe("readSnapshot (pure)", () => {
  it("classifies mobile below 768px", () => {
    setViewport(390, 844);
    expect(readSnapshot().device).toBe("mobile");
  });

  it("classifies tablet in 768–1024 range", () => {
    setViewport(820, 1180);
    expect(readSnapshot().device).toBe("tablet");
  });

  it("classifies desktop above 1024px", () => {
    setViewport(1440, 900);
    expect(readSnapshot().device).toBe("desktop");
  });

  it("infers portrait vs landscape from ratio", () => {
    setViewport(400, 900);
    expect(readSnapshot().orientation).toBe("portrait");
    setViewport(900, 400);
    expect(readSnapshot().orientation).toBe("landscape");
  });

  it("returns touch when pointer:coarse matches", () => {
    setPointer(true);
    expect(readSnapshot().pointer).toBe("touch");
    setPointer(false);
    expect(readSnapshot().pointer).toBe("mouse");
  });
});

describe("useDevice (integration)", () => {
  it("reacts to resize (desktop → mobile) and mirrors to <html>", () => {
    setViewport(1440, 900);
    const { result } = renderHook(() => useDevice());
    expect(result.current.device).toBe("desktop");
    expect(document.documentElement.dataset.device).toBe("desktop");

    act(() => {
      setViewport(390, 844);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.device).toBe("mobile");
    expect(document.documentElement.dataset.device).toBe("mobile");
  });

  it("reacts to orientationchange", () => {
    setViewport(390, 844);
    const { result } = renderHook(() => useDevice());
    expect(result.current.orientation).toBe("portrait");

    act(() => {
      setViewport(844, 390);
      window.dispatchEvent(new Event("orientationchange"));
    });
    expect(result.current.orientation).toBe("landscape");
    expect(document.documentElement.dataset.orientation).toBe("landscape");
  });

  it("reacts to pointer:coarse media query changes", () => {
    const { result } = renderHook(() => useDevice());
    expect(result.current.pointer).toBe("mouse");

    act(() => setPointer(true));
    expect(result.current.pointer).toBe("touch");
    expect(document.documentElement.dataset.pointer).toBe("touch");

    act(() => setPointer(false));
    expect(result.current.pointer).toBe("mouse");
  });

  it("detects tablet + touch + landscape in combo", () => {
    setViewport(1024, 768);
    setPointer(true);
    const { result } = renderHook(() => useDevice());
    expect(result.current.device).toBe("tablet");
    expect(result.current.pointer).toBe("touch");
    expect(result.current.orientation).toBe("landscape");
  });
});
