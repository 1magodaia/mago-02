// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordDeviceChange,
  getDeviceTelemetry,
  clearDeviceTelemetry,
  subscribeDeviceTelemetry,
} from "../device-telemetry";

function installMatchMedia(coarse: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: q.includes("pointer: coarse") ? coarse : false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  clearDeviceTelemetry();
  installMatchMedia(false);
});

describe("device-telemetry", () => {
  it("records initial snapshot and diffs subsequent changes", () => {
    recordDeviceChange("initial", {
      device: "desktop",
      pointer: "mouse",
      orientation: "landscape",
      width: 1440,
      height: 900,
    });
    recordDeviceChange("resize", {
      device: "mobile",
      pointer: "mouse",
      orientation: "portrait",
      width: 390,
      height: 844,
    });
    const events = getDeviceTelemetry();
    expect(events).toHaveLength(2);
    expect(events[1].changed).toEqual(
      expect.arrayContaining(["device", "orientation", "width", "height"]),
    );
    expect(events[1].source).toBe("resize");
  });

  it("skips no-op events (no change, no inconsistencies) except 'initial'", () => {
    const snap = {
      device: "desktop" as const,
      pointer: "mouse" as const,
      orientation: "landscape" as const,
      width: 1440,
      height: 900,
    };
    recordDeviceChange("initial", snap);
    const evt = recordDeviceChange("resize", snap);
    expect(evt).toBeNull();
    expect(getDeviceTelemetry()).toHaveLength(1);
  });

  it("flags inconsistency when matchMedia says coarse but snapshot is mouse", () => {
    installMatchMedia(true);
    const evt = recordDeviceChange("matchmedia", {
      device: "tablet",
      pointer: "mouse",
      orientation: "landscape",
      width: 1024,
      height: 768,
    });
    expect(evt?.inconsistencies.length).toBeGreaterThan(0);
    expect(evt?.inconsistencies[0]).toMatch(/pointer:coarse/);
  });

  it("flags inconsistency when viewport dimensions disagree with orientation", () => {
    const evt = recordDeviceChange("initial", {
      device: "mobile",
      pointer: "touch",
      orientation: "landscape", // wrong: h > w
      width: 400,
      height: 900,
    });
    expect(evt?.inconsistencies.some((s) => s.includes("portrait"))).toBe(true);
  });

  it("notifies subscribers", () => {
    const received: string[] = [];
    const off = subscribeDeviceTelemetry((e) => received.push(e.source));
    recordDeviceChange("initial", {
      device: "desktop",
      pointer: "mouse",
      orientation: "landscape",
      width: 1440,
      height: 900,
    });
    off();
    recordDeviceChange("resize", {
      device: "mobile",
      pointer: "mouse",
      orientation: "portrait",
      width: 390,
      height: 844,
    });
    expect(received).toEqual(["initial"]);
  });
});
