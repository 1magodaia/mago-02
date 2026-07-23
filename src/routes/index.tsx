import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Sparkles, Wand2, Filter } from "lucide-react";
import { analyzeLead, type AnalyzedLead } from "@/lib/analyze-lead";
import { MOCK_LEADS } from "@/lib/mock-leads";
import { LeadCard } from "@/components/lead-card";
import { VersionLog } from "@/components/version-log";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Busca Mágica — Encontre leads quentes de comércios locais" },
      {
        name: "description",
        content:
          "SaaS premium para marketers: localize comércios via Google Maps, audite presença digital e priorize leads sem site ou com redes inativas.",
      },
      { property: "og:title", content: "Busca Mágica — Leads quentes de comércios locais" },
      {
        property: "og:description",
        content:
          "Audite site, Instagram e WhatsApp de comércios em segundos. Priorize os leads com maior score de oportunidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type FilterKey = "all" | "no_site" | "ig_stale" | "no_whats";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "no_site", label: "Sem site" },
  { key: "ig_stale", label: "IG > 90d parado" },
  { key: "no_whats", label: "Sem WhatsApp" },
];

function Home() {
  const [city, setCity] = useState("São Paulo");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [searched, setSearched] = useState(true);

  const leads: AnalyzedLead[] = useMemo(() => {
    if (!searched) return [];
    let list = MOCK_LEADS.map(analyzeLead);
    if (category.trim()) {
      const q = category.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.category?.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q),
      );
    }
    if (filter === "no_site") list = list.filter((l) => !l.has_website);
    if (filter === "ig_stale")
      list = list.filter(
        (l) => (l.instagram_last_post_days ?? 0) > 90,
      );
    if (filter === "no_whats") list = list.filter((l) => !l.has_whatsapp);
    return list.sort((a, b) => a.score_lead - b.score_lead);
  }, [category, filter, searched]);

  const hotCount = leads.filter((l) => l.status === "red").length;

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/20 ring-1 ring-primary/40 neon-violet">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold tracking-tight">Busca</span>
            <span className="text-lg font-extrabold tracking-tight text-primary">Mágica</span>
          </div>
        </div>
        <span className="hidden rounded-full bg-glass px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border sm:inline-block">
          MVP · dados simulados
        </span>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-7xl px-6 pt-4 pb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Auditoria digital automática
          </div>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Encontre comércios que <span className="text-primary">precisam de você</span> — antes da concorrência.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Busca Mágica localiza negócios locais, audita site, Instagram e WhatsApp, e devolve um{" "}
            <span className="font-semibold text-foreground">Score de Oportunidade</span> pronto para prospecção.
          </p>
        </div>

        {/* SEARCH */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearched(true);
          }}
          className="glass-panel mt-8 grid gap-3 rounded-2xl p-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="flex items-center gap-2 rounded-xl bg-glass px-4 py-3 ring-1 ring-border focus-within:ring-primary/60">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cidade (ex: São Paulo)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl bg-glass px-4 py-3 ring-1 ring-border focus-within:ring-primary/60">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (padaria, barbearia...)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 hover:neon-violet"
          >
            <Wand2 className="h-4 w-4" />
            Buscar
          </button>
        </form>

        {/* FILTER CHIPS */}
        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground neon-violet"
                    : "bg-glass text-muted-foreground ring-1 ring-border hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums">{leads.length}</span>
            <span className="text-sm text-muted-foreground">leads em {city || "sua região"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive ring-4 ring-destructive/30" />
            <span className="text-sm">
              <span className="font-bold text-destructive">{hotCount}</span>{" "}
              <span className="text-muted-foreground">críticos (oportunidade alta)</span>
            </span>
          </div>
        </div>
      </section>

      {/* LEADS GRID */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {leads.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Nenhum lead com esse filtro. Ajuste os critérios.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead, i) => (
              <LeadCard key={`${lead.name}-${i}`} lead={lead} />
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-24 pt-8 text-center text-xs text-muted-foreground">
        Busca Mágica · Protocolo CACA v1.0.0 · Estruturado para integração Google Maps, Make e n8n
      </footer>

      <VersionLog />
    </div>
  );
}
