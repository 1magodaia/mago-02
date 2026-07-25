import { createFileRoute, notFound } from "@tanstack/react-router";
import { LeadResultCard } from "@/components/lead-result-card";
import type { ScoredLead } from "@/lib/scoring";

/**
 * Rota interna de preview para checagens visuais/automatizadas do
 * LeadResultCard (áreas de toque, sobreposição no scroll, badges).
 * Bloqueada em build de produção — só existe em dev/preview.
 */
export const Route = createFileRoute("/dev/lead-preview")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: DevLeadPreview,
});

function make(overrides: Partial<ScoredLead>): ScoredLead {
  return {
    place_id: overrides.place_id ?? "test-1",
    name: overrides.name ?? "Salão Fixture",
    address: overrides.address ?? "Rua Teste 123, Curitiba",
    lat: null, lng: null, phone: null,
    website: null, rating: 4.6, user_ratings_total: 42,
    business_status: "OPERATIONAL", types: [],
    google_maps_uri: null, latest_review_at: null, reviews: [],
    collected_at: new Date().toISOString(), price_level: null,
    opportunity_score: 55, status: "warm", tier: "medium",
    tier_suggestion: "Fixture", reasons: [],
    ...overrides,
  };
}

const FIXTURES: ScoredLead[] = [
  make({ place_id: "ig-only", name: "Só Instagram", website: "https://instagram.com/salaofixture" }),
  make({ place_id: "fb-only", name: "Só Facebook", website: "https://facebook.com/salaofixture" }),
  make({ place_id: "site-plus-ig", name: "Site + Instagram", website: "https://salaofixture.com.br" }),
  make({ place_id: "wrapped", name: "Instagram via l.facebook", website: "https://l.facebook.com/l.php?u=https%3A%2F%2Finstagram.com%2Fsalao" }),
];

function DevLeadPreview() {
  return (
    <div className="min-h-dvh bg-background p-4">
      <h1 className="mb-4 text-lg font-bold text-foreground">Lead card preview (dev-only)</h1>
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        {FIXTURES.map((l) => (
          <LeadResultCard key={l.place_id} lead={l} />
        ))}
        {/* Spacer para permitir scroll e checar overlap com header/FAB */}
        <div style={{ height: "120vh" }} />
      </div>
    </div>
  );
}
