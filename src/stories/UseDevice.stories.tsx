import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { useDevice } from "@/hooks/use-mobile";
import {
  getDeviceTelemetry,
  subscribeDeviceTelemetry,
  type DeviceChangeEvent,
} from "@/lib/device-telemetry";
import { pickGestureHandling } from "@/components/google-map-view";

/**
 * Storybook demonstrativo do useDevice + efeitos no mapa.
 *
 * Como usar: no toolbar do Storybook, alterne o "Viewport" entre
 * Mobile / Tablet / Desktop (portrait / landscape). O painel mostra
 * em tempo real o snapshot detectado, o `gestureHandling` que o
 * GoogleMapView aplicaria e o buffer de telemetria com eventuais
 * inconsistências.
 */
function DeviceDemo() {
  const snap = useDevice();
  const [events, setEvents] = useState<DeviceChangeEvent[]>(getDeviceTelemetry());

  useEffect(() => {
    const off = subscribeDeviceTelemetry(() => setEvents(getDeviceTelemetry()));
    return () => {
      off();
    };
  }, []);

  const gesture = pickGestureHandling(snap.pointer, snap.device, snap.orientation);
  const inconsistent = events.filter((e) => e.inconsistencies.length > 0);

  return (
    <div className="min-h-dvh bg-background p-6 text-foreground">
      <h1 className="text-2xl font-bold">useDevice · demo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Alterne o viewport no toolbar do Storybook para ver as reações.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card title="Snapshot atual">
          <Row label="device" value={snap.device} />
          <Row label="pointer" value={snap.pointer} />
          <Row label="orientation" value={snap.orientation} />
          <Row label="width × height" value={`${snap.width} × ${snap.height}`} />
        </Card>
        <Card title="Efeito no Google Map">
          <Row label="gestureHandling" value={gesture} highlight />
          <p className="mt-2 text-xs text-muted-foreground">
            {gesture === "cooperative" &&
              "Exige 2 dedos p/ pan — protege scroll da lista em mobile portrait."}
            {gesture === "greedy" &&
              "Pan/zoom com 1 dedo — telas grandes ou paisagem."}
            {gesture === "auto" &&
              "Comportamento padrão com mouse — clique+drag, wheel zoom."}
          </p>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">
          Telemetria ({events.length}){" "}
          {inconsistent.length > 0 && (
            <span className="text-destructive">
              · {inconsistent.length} inconsistência(s)
            </span>
          )}
        </h2>
        <div className="mt-2 max-h-64 overflow-auto rounded border border-border bg-card p-2 font-mono text-xs">
          {events.slice(-20).reverse().map((e, i) => (
            <div key={i} className="border-b border-border/50 py-1">
              <span className="text-primary">{e.source}</span>{" "}
              <span className="text-muted-foreground">
                → {e.next.device}/{e.next.pointer}/{e.next.orientation} ·{" "}
                {e.next.width}×{e.next.height}
              </span>
              {e.inconsistencies.length > 0 && (
                <div className="text-destructive">
                  ⚠ {e.inconsistencies.join(" · ")}
                </div>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-muted-foreground">Nenhum evento ainda.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <code
        className={
          highlight
            ? "rounded bg-primary/20 px-2 py-0.5 font-semibold text-primary"
            : "text-foreground"
        }
      >
        {value}
      </code>
    </div>
  );
}

const meta: Meta<typeof DeviceDemo> = {
  title: "Hooks/useDevice",
  component: DeviceDemo,
};
export default meta;

type Story = StoryObj<typeof DeviceDemo>;

export const MobilePortrait: Story = {
  parameters: { viewport: { defaultViewport: "mobilePortrait" } },
};
export const MobileLandscape: Story = {
  parameters: { viewport: { defaultViewport: "mobileLandscape" } },
};
export const TabletPortrait: Story = {
  parameters: { viewport: { defaultViewport: "tabletPortrait" } },
};
export const TabletLandscape: Story = {
  parameters: { viewport: { defaultViewport: "tabletLandscape" } },
};
export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: "desktop" } },
};
