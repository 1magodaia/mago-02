import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BookmarkCheck, CheckCircle2, Clock, Download, Trash2 } from "lucide-react";
import {
  exportToCsv,
  getContacted,
  getFavorites,
  getHistory,
  toggleContacted,
  toggleFavorite,
  type SavedLead,
  type SearchHistoryEntry,
} from "@/lib/storage";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Meus Leads — Busca Mágica" },
      { name: "description", content: "Favoritos, contatados e histórico de buscas do Busca Mágica, salvo localmente no seu navegador." },
      { property: "og:title", content: "Meus Leads — Busca Mágica" },
      { property: "og:description", content: "Painel de leads favoritos, contatados e histórico de buscas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadsPage,
});

function SavedList({
  title,
  icon,
  items,
  onRemove,
  emptyText,
  filename,
}: {
  title: string;
  icon: React.ReactNode;
  items: SavedLead[];
  onRemove: (l: SavedLead) => void;
  emptyText: string;
  filename: string;
}) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
          {icon} {title} <span className="text-muted-foreground">({items.length})</span>
        </h2>
        <button
          onClick={() =>
            exportToCsv(
              items.map((l) => ({
                nome: l.name,
                endereco: l.address,
                telefone: l.phone ?? "",
                whatsapp: l.phone ? `https://wa.me/${(l.phone.startsWith("+") ? l.phone : `55${l.phone}`).replace(/\D/g, "")}` : "",
                tem_site: l.website ? "sim" : "nao",
                site: l.website ?? "",
                google_maps: l.google_maps_uri ?? "",
                faixa_preco_google: l.price_level == null ? "nao_informado" : "$".repeat(Math.max(1, l.price_level)),
                salvo_em: l.saved_at,
              })),
              filename,
            )
          }
          disabled={items.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-elevated hover:brightness-110 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Baixar lista (CSV)
        </button>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((l) => (
            <li key={l.place_id} className="flex items-center justify-between gap-2 rounded-xl bg-glass p-3 ring-1 ring-border">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{l.name}</div>
                <div className="truncate text-xs text-muted-foreground">{l.address}</div>
                <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                  {l.phone && <span>{l.phone}</span>}
                  {l.website && (
                    <a href={l.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      site
                    </a>
                  )}
                  {l.google_maps_uri && (
                    <a href={l.google_maps_uri} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      maps
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemove(l)}
                className="rounded-md bg-glass p-1.5 text-muted-foreground ring-1 ring-border hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LeadsPage() {
  const [favs, setFavs] = useState<SavedLead[]>([]);
  const [done, setDone] = useState<SavedLead[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setFavs(getFavorites());
    setDone(getContacted());
    setHistory(getHistory());
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="text-lg font-extrabold text-foreground">Meus leads</h1>
        <span />
      </nav>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6 lg:grid-cols-2">
        <SavedList
          title="Favoritos"
          icon={<BookmarkCheck className="h-4 w-4" />}
          items={favs}
          filename="favoritos.csv"
          emptyText="Ainda sem favoritos. Clique no ícone de marcador nos cards da busca."
          onRemove={(l) => setFavs(toggleFavorite(l))}
        />
        <SavedList
          title="Contatados"
          icon={<CheckCircle2 className="h-4 w-4" />}
          items={done}
          filename="contatados.csv"
          emptyText="Ainda sem contatados. Marque os leads que você já abordou."
          onRemove={(l) => setDone(toggleContacted(l))}
        />

        <section className="glass-panel rounded-2xl p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <Clock className="h-4 w-4" /> Histórico de buscas
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma busca ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <span className="font-semibold text-foreground">{h.query}</span>
                    <span className="text-muted-foreground"> em {h.region} · raio {h.radiusKm}km</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{h.count} resultados</span>
                    <span>{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-muted-foreground lg:col-span-2">
          Estes dados ficam salvos apenas neste navegador (localStorage). Limpar o cache remove tudo.
        </p>
      </main>
    </div>
  );
}
