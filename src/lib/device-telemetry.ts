/**
 * Device telemetry — buffer local em memória de mudanças de
 * data-device / data-pointer / data-orientation, com detecção
 * de inconsistências entre o resultado do matchMedia e os
 * eventos reais (resize/orientationchange).
 *
 * - Sem backend: apenas buffer em memória + console.debug em DEV.
 * - Exposto via getDeviceTelemetry() para inspeção manual
 *   (ex.: no console do navegador `window.__bmDeviceTelemetry()`).
 */
import type { DeviceKind, Orientation, PointerKind } from "@/hooks/use-mobile";

export type DeviceSnapshot = {
  device: DeviceKind;
  pointer: PointerKind;
  orientation: Orientation;
  width: number;
  height: number;
};

export type TelemetrySource =
  | "initial"
  | "resize"
  | "orientationchange"
  | "matchmedia"
  | "manual";

export type DeviceChangeEvent = {
  at: number;
  source: TelemetrySource;
  prev: DeviceSnapshot | null;
  next: DeviceSnapshot;
  changed: Array<keyof DeviceSnapshot>;
  /**
   * Inconsistências detectadas neste ponto: por exemplo, o matchMedia
   * reporta `pointer: coarse` mas o snapshot anterior ainda tinha
   * `pointer: mouse` — ou o inverso (evento chegou mas media não bate).
   */
  inconsistencies: string[];
};

const MAX_EVENTS = 100;
const buffer: DeviceChangeEvent[] = [];
const listeners = new Set<(e: DeviceChangeEvent) => void>();

function diffKeys(
  a: DeviceSnapshot | null,
  b: DeviceSnapshot,
): Array<keyof DeviceSnapshot> {
  if (!a) return ["device", "pointer", "orientation", "width", "height"];
  const keys: Array<keyof DeviceSnapshot> = [];
  (Object.keys(b) as Array<keyof DeviceSnapshot>).forEach((k) => {
    if (a[k] !== b[k]) keys.push(k);
  });
  return keys;
}

function detectInconsistencies(
  source: TelemetrySource,
  next: DeviceSnapshot,
): string[] {
  const out: string[] = [];
  if (typeof window === "undefined") return out;
  try {
    const mmCoarse = window.matchMedia("(pointer: coarse)").matches;
    const wantsTouch = mmCoarse;
    const isTouch = next.pointer === "touch";
    // Ignora o caso "hasTouch=true mas coarse=false" (híbridos legítimos).
    if (wantsTouch && !isTouch) {
      out.push(
        `matchMedia(pointer:coarse)=true, mas snapshot.pointer=${next.pointer}`,
      );
    }
    const isPortrait = next.height >= next.width;
    if (isPortrait && next.orientation !== "portrait") {
      out.push(
        `viewport ${next.width}x${next.height} sugere portrait, snapshot=${next.orientation}`,
      );
    }
    if (!isPortrait && next.orientation !== "landscape") {
      out.push(
        `viewport ${next.width}x${next.height} sugere landscape, snapshot=${next.orientation}`,
      );
    }
    // Se um orientationchange chegou sem mudança real de dimensão vs último buffer.
    if (source === "orientationchange") {
      const prev = buffer.length ? buffer[buffer.length - 1].next : null;
      if (prev && prev.orientation === next.orientation) {
        out.push(
          "orientationchange disparou mas snapshot.orientation não mudou",
        );
      }
    }
  } catch {
    // matchMedia pode não existir em ambientes exóticos — ignora.
  }
  return out;
}

export function recordDeviceChange(
  source: TelemetrySource,
  next: DeviceSnapshot,
): DeviceChangeEvent | null {
  const prev = buffer.length ? buffer[buffer.length - 1].next : null;
  const changed = diffKeys(prev, next);
  const inconsistencies = detectInconsistencies(source, next);
  // Descarta eventos sem mudança e sem inconsistências (evita ruído).
  if (changed.length === 0 && inconsistencies.length === 0 && source !== "initial") {
    return null;
  }
  const evt: DeviceChangeEvent = {
    at: Date.now(),
    source,
    prev,
    next,
    changed,
    inconsistencies,
  };
  buffer.push(evt);
  if (buffer.length > MAX_EVENTS) buffer.shift();
  if (import.meta.env?.DEV) {
    const tag = inconsistencies.length ? "⚠ device" : "device";
    // eslint-disable-next-line no-console
    console.debug(`[${tag}] ${source}`, {
      changed,
      next,
      inconsistencies,
    });
  }
  listeners.forEach((cb) => {
    try {
      cb(evt);
    } catch {
      /* consumer bug — não derruba o hook */
    }
  });
  return evt;
}

export function getDeviceTelemetry(): DeviceChangeEvent[] {
  return buffer.slice();
}

export function clearDeviceTelemetry(): void {
  buffer.length = 0;
}

export function subscribeDeviceTelemetry(
  cb: (e: DeviceChangeEvent) => void,
): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Expõe no window em DEV para inspeção manual.
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  (window as unknown as Record<string, unknown>).__bmDeviceTelemetry =
    getDeviceTelemetry;
}
