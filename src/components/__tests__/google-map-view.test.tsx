// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { pickGestureHandling } from "../google-map-view";

describe("pickGestureHandling", () => {
  it("returns 'auto' for mouse pointer regardless of device/orientation", () => {
    expect(pickGestureHandling("mouse", "desktop", "landscape")).toBe("auto");
    expect(pickGestureHandling("mouse", "desktop", "portrait")).toBe("auto");
    expect(pickGestureHandling("mouse", "tablet", "landscape")).toBe("auto");
    expect(pickGestureHandling("mouse", "mobile", "portrait")).toBe("auto");
  });

  it("returns 'cooperative' for touch on mobile portrait (never hijack list scroll)", () => {
    expect(pickGestureHandling("touch", "mobile", "portrait")).toBe(
      "cooperative",
    );
  });

  it("returns 'greedy' for touch on mobile landscape", () => {
    expect(pickGestureHandling("touch", "mobile", "landscape")).toBe("greedy");
  });

  it("returns 'greedy' for touch on tablet in both orientations", () => {
    expect(pickGestureHandling("touch", "tablet", "portrait")).toBe("greedy");
    expect(pickGestureHandling("touch", "tablet", "landscape")).toBe("greedy");
  });

  it("returns 'greedy' for touch on desktop (rare 2-in-1 hybrids)", () => {
    expect(pickGestureHandling("touch", "desktop", "landscape")).toBe("greedy");
  });
});
