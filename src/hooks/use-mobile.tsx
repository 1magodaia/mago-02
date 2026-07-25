import * as React from "react";
import { recordDeviceChange, type TelemetrySource } from "@/lib/device-telemetry";

const MOBILE_MAX = 767;   // < 768 → mobile
const TABLET_MAX = 1024;  // 768–1024 → tablet, > 1024 → desktop

export type DeviceKind = "mobile" | "tablet" | "desktop";
export type PointerKind = "touch" | "mouse";
export type Orientation = "portrait" | "landscape";

export function readSnapshot() {
  if (typeof window === "undefined") {
    return {
      device: "desktop" as DeviceKind,
      pointer: "mouse" as PointerKind,
      orientation: "landscape" as Orientation,
      width: 1280,
      height: 800,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const device: DeviceKind =
    w <= MOBILE_MAX ? "mobile" : w <= TABLET_MAX ? "tablet" : "desktop";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  // hasTouch as fallback (some hybrid devices report "fine")
  const hasTouch =
    "ontouchstart" in window || (navigator as any).maxTouchPoints > 0;
  const pointer: PointerKind = coarse || hasTouch ? "touch" : "mouse";
  const orientation: Orientation = h >= w ? "portrait" : "landscape";
  return { device, pointer, orientation, width: w, height: h };
}

export function useDevice() {
  const [snap, setSnap] = React.useState(readSnapshot);

  React.useEffect(() => {
    const update = (source: TelemetrySource) => {
      const next = readSnapshot();
      recordDeviceChange(source, next);
      setSnap(next);
    };
    // Initial record so telemetry has a baseline.
    recordDeviceChange("initial", readSnapshot());
    const onResize = () => update("resize");
    const onOrientation = () => update("orientationchange");
    const onPointer = () => update("matchmedia");
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientation);
    const mqPointer = window.matchMedia("(pointer: coarse)");
    mqPointer.addEventListener?.("change", onPointer);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
      mqPointer.removeEventListener?.("change", onPointer);
    };
  }, []);

  // Reflect device state on <html> so CSS can react globally
  // (e.g. [data-device="mobile"][data-orientation="landscape"] .hero { ... })
  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.device = snap.device;
    root.dataset.pointer = snap.pointer;
    root.dataset.orientation = snap.orientation;
  }, [snap.device, snap.pointer, snap.orientation]);

  return snap;
}

// Backwards-compatible helpers
export function useIsMobile() {
  return useDevice().device === "mobile";
}
export function useIsTablet() {
  return useDevice().device === "tablet";
}
export function useIsTouch() {
  return useDevice().pointer === "touch";
}
export function useOrientation() {
  return useDevice().orientation;
}
